"""Calendario de quema armonizado con detecciones REALES de NASA FIRMS (vía GIBS).

Un proceso en segundo plano (activado con CALENDAR_BACKFILL=1) recorre el archivo
día por día y guarda el conteo mensual de detecciones dentro de Chihuahua para:
- MODIS Terra+Aqua (1 km), 2002-07 → hoy
- VIIRS NOAA-20 (375 m), 2020-01 → hoy

Con el traslape (2020 → hoy) se calcula el factor mensual kₘ = VIIRS / MODIS
(razón de sumas por mes calendario) con IC 95 % por bootstrap sobre años, y se
arma la serie armonizada: VIIRS desde 2020 y MODIS × kₘ antes.
"""

from __future__ import annotations

import asyncio
import calendar as cal
import json
import logging
import random
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from statistics import median
from typing import Any

import httpx

from app.services.nasa_fires import MODIS, VIIRS_N20, FireSource, detections_for_day

log = logging.getLogger("calendar_builder")

COUNTS_FILE = Path(__file__).resolve().parents[2] / "data" / "calendar_counts.json"
CAL_SOURCES: dict[str, FireSource] = {"viirs": VIIRS_N20, "modis": MODIS}  # VIIRS primero: kₘ disponible antes
MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
REFRESH_EVERY_S = 6 * 3600


def _load_counts() -> dict[str, dict[str, dict[str, Any]]]:
    if COUNTS_FILE.exists():
        return json.loads(COUNTS_FILE.read_text())
    return {k: {} for k in CAL_SOURCES}


def _save_counts(counts: dict[str, Any]) -> None:
    COUNTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = COUNTS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(counts))
    tmp.replace(COUNTS_FILE)


def _months_desc(first: date, today: date) -> list[date]:
    out, d = [], today.replace(day=1)
    while d >= first.replace(day=1):
        out.append(d)
        d = (d - timedelta(days=1)).replace(day=1)
    return out


async def _count_month(client: httpx.AsyncClient, src: FireSource, month: date, today: date) -> tuple[int, int]:
    last = min(date(month.year, month.month, cal.monthrange(month.year, month.month)[1]), today)
    days = [d for d in (month + timedelta(days=i) for i in range((last - month).days + 1)) if d >= src.first_day]
    sem = asyncio.Semaphore(3)

    async def one(d: date) -> int:
        async with sem:
            for attempt in range(3):
                try:
                    return len(await detections_for_day(client, src, d))
                except httpx.HTTPError:
                    await asyncio.sleep(2 * (attempt + 1))
            raise RuntimeError(f"{src.key} {d} failed")

    results = await asyncio.gather(*(one(d) for d in days))
    return sum(results), len(days)


async def backfill_once() -> None:
    """Completa los meses que faltan (del más reciente al más antiguo)."""
    counts = _load_counts()
    today = date.today()
    async with httpx.AsyncClient(timeout=30.0) as client:
        for key, src in CAL_SOURCES.items():
            store = counts.setdefault(key, {})
            for month in _months_desc(src.first_day, today):
                mk = month.strftime("%Y-%m")
                entry = store.get(mk)
                is_current = month == today.replace(day=1)
                if entry and entry.get("complete") and not is_current:
                    continue
                try:
                    n, ndays = await _count_month(client, src, month, today)
                except RuntimeError as exc:
                    log.warning("calendar backfill: %s", exc)
                    continue
                store[mk] = {"count": n, "days": ndays, "complete": not is_current}
                _save_counts(counts)
                await asyncio.sleep(0.2)  # ser amables con GIBS


async def backfill_loop() -> None:
    while True:
        try:
            await backfill_once()
        except Exception:  # noqa: BLE001 - el ciclo nunca debe morir
            log.exception("calendar backfill failed")
        await asyncio.sleep(REFRESH_EVERY_S)


def _bootstrap_ci(pairs: list[tuple[int, int]], n: int = 1000) -> tuple[float, float]:
    rng = random.Random(42)
    stats = []
    for _ in range(n):
        sample = [rng.choice(pairs) for _ in pairs]
        m = sum(p[1] for p in sample)
        if m:
            stats.append(sum(p[0] for p in sample) / m)
    if not stats:
        return (float("nan"), float("nan"))
    stats.sort()
    return (stats[int(0.025 * len(stats))], stats[min(len(stats) - 1, int(0.975 * len(stats)))])


def load_real_calendar() -> dict[str, Any] | None:
    counts = _load_counts()
    modis, viirs = counts.get("modis", {}), counts.get("viirs", {})
    if not modis:
        return None
    today = date.today()

    # kₘ por mes calendario con años de traslape completos (VIIRS y MODIS > 0).
    km, km_ci = [], []
    for m in range(1, 13):
        pairs = []
        for mk, v in viirs.items():
            y, mm = map(int, mk.split("-"))
            mo = modis.get(mk)
            if mm == m and v.get("complete") and mo and mo.get("complete") and mo["count"] > 0:
                pairs.append((v["count"], mo["count"]))
        if len(pairs) >= 2:
            km.append(round(sum(p[0] for p in pairs) / sum(p[1] for p in pairs), 2))
            lo, hi = _bootstrap_ci(pairs)
            km_ci.append([round(lo, 2), round(hi, 2)])
        else:
            km.append(None)
            km_ci.append(None)
    valid = [k for k in km if k]
    fallback_km = round(median(valid), 2) if valid else 1.0
    km_used = [k if k else fallback_km for k in km]

    first_year = MODIS.first_day.year
    rows = []
    for y in range(first_year, today.year + 1):
        months, sources = [], set()
        for m in range(1, 13):
            mk = f"{y}-{m:02d}"
            if date(y, m, 1) > today:
                months.append(None)
                continue
            v, mo = viirs.get(mk), modis.get(mk)
            if date(y, m, 1) >= VIIRS_N20.first_day and v:
                months.append(v["count"])
                sources.add("VIIRS")
            elif mo:
                months.append(round(mo["count"] * km_used[m - 1]))
                sources.add("MODIS × kₘ")
            else:
                months.append(None)
        if any(x is not None for x in months):
            rows.append(
                {
                    "year": y,
                    "sensor_source": " + ".join(sorted(sources)),
                    "months": months,
                    "annual_total": sum(x for x in months if x is not None),
                }
            )

    cur = today.replace(day=1)
    medians = []
    for m in range(1, 13):
        vals = [r["months"][m - 1] for r in rows if r["months"][m - 1] is not None and not (r["year"] == cur.year and m == cur.month)]
        medians.append(float(median(vals)) if vals else 0.0)
    cur_row = next((r for r in rows if r["year"] == cur.year), None)
    cur_val = cur_row["months"][cur.month - 1] if cur_row else None
    med = medians[cur.month - 1]

    expected = {k: len(_months_desc(s.first_day, today)) for k, s in CAL_SOURCES.items()}
    have = {k: sum(1 for e in counts.get(k, {}).values() if e.get("complete") or e.get("days")) for k in CAL_SOURCES}
    coverage = round(sum(have.values()) / sum(expected.values()), 3)

    return {
        "data_source": "nasa-firms-gibs",
        "source": "NASA FIRMS active fire detections (MODIS 1 km 2002–, VIIRS NOAA-20 375 m 2020–) via NASA GIBS, Chihuahua",
        "origin_filter": "Total",
        "start_year": first_year,
        "end_year": today.year,
        "month_labels": MONTH_LABELS,
        "km_factors": km_used,
        "km_ci95": km_ci,
        "monthly_medians": medians,
        "current_month": {
            "year": cur.year,
            "month": MONTH_LABELS[cur.month - 1],
            "value": cur_val or 0,
            "historical_median": med,
            "anomaly_pct": round(((cur_val or 0) - med) / med * 100, 1) if med else 0.0,
            "partial": True,
        },
        "rows": rows,
        "coverage": coverage,
        "updated": datetime.now(timezone.utc).isoformat(),
    }
