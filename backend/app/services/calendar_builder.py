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
import collections
import csv
import json
import logging
import random
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from statistics import median
from typing import Any

import httpx

from app.services.nasa_fires import (
    HARMONIZED_CSV,
    HARMONIZED_DB,
    HARMONIZED_REGION,
    MODIS,
    VIIRS_N20,
    FireSource,
    detections_for_day,
    harmonized_db,
    inside_chihuahua,
    region_filter,
)

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
                    pts = await detections_for_day(client, src, d)
                    # mismo recorte que los conteos ya guardados en calendar_counts.json (solo Chihuahua)
                    return sum(1 for p in pts if inside_chihuahua(p["lon"], p["lat"]))
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


_CSV_CALENDAR_CACHE: dict[str, dict[str, Any]] = {}


def _load_calendar_from_harmonized_csv(region: str | None = None) -> dict[str, Any] | None:
    """Calendario desde la base SQLite nacional (por región, "*" = México) o, si no existe, el CSV publicado."""
    region = HARMONIZED_REGION if region is None else region
    if region in _CSV_CALENDAR_CACHE:
        return _CSV_CALENDAR_CACHE[region]
    if not HARMONIZED_DB.exists() and (not HARMONIZED_CSV.exists() or region not in ("*", "", "Chihuahua")):
        return None  # el CSV publicado solo cubre el norte de Chihuahua

    by_year: dict[int, list[int | None]] = collections.defaultdict(lambda: [0] * 12)
    aqua_m: dict[int, list[int]] = collections.defaultdict(lambda: [0] * 12)
    snpp_m: dict[int, list[int]] = collections.defaultdict(lambda: [0] * 12)

    con = harmonized_db()
    if con is not None:
        # Base nacional: conteos por mes en SQL, filtrados a la región servida (HARMONIZED_REGION)
        clause, params = region_filter(con, region)
        # tabla `monthly` precalculada por csv_to_sqlite.py (n_aqua = Aqua no-low, n_snpp = SNPP in_calendar)
        q = (
            "SELECT CAST(substr(ym, 1, 4) AS INTEGER) y, CAST(substr(ym, 6, 2) AS INTEGER) m, SUM(n_calendar),"
            " SUM(CASE WHEN ym >= '2012' THEN n_aqua ELSE 0 END), SUM(CASE WHEN ym >= '2012' THEN n_snpp ELSE 0 END)"
            f" FROM monthly WHERE 1 = 1{clause} GROUP BY y, m"
        )
        with con:
            for y, m, n_cal, n_aqua, n_snpp in con.execute(q, params):
                by_year[y][m - 1] = n_cal
                aqua_m[y][m - 1] += n_aqua
                snpp_m[y][m - 1] += n_snpp
            first, last = con.execute("SELECT MIN(acq_date), MAX(acq_date) FROM hotspots").fetchone()
        con.close()
        first_d, last_d = date.fromisoformat(first), date.fromisoformat(last)
        # último mes completo: el mes de la última fecha solo si esa fecha es fin de mes
        last_full = last_d if last_d.day == cal.monthrange(last_d.year, last_d.month)[1] else last_d.replace(day=1) - timedelta(days=1)
        first_ym, last_ym = (first_d.year, first_d.month), (last_full.year, last_full.month)
        threshold_label = "per-region T* (calibration/thresholds.json)"
        region_label = ", " + (region if region not in ("", "*") else "Mexico")
    else:
        with HARMONIZED_CSV.open(encoding="utf-8", newline="") as fh:
            for r in csv.DictReader(fh):
                y, m, _ = map(int, r["acq_date"].split("-"))
                if r.get("in_calendar") == "1":
                    by_year[y][m - 1] = (by_year[y][m - 1] or 0) + 1
                if y >= 2012 and r.get("confidence") != "l":
                    if r.get("satellite") == "Aqua":
                        aqua_m[y][m - 1] += 1
                    elif r.get("satellite") == "SNPP" and r.get("in_calendar") == "1":
                        snpp_m[y][m - 1] += 1
        first_ym, last_ym = (2002, 7), (2026, 7)  # cobertura del CSV publicado (N. Chihuahua)
        threshold_label = "15 MW"
        region_label = ""  # el texto del CSV publicado no cambia

    # Meses fuera de la cobertura del archivo se marcan como None
    for y in range(first_ym[0], last_ym[0] + 1):
        for m_idx in range(12):
            if (y, m_idx + 1) < first_ym or (y, m_idx + 1) > last_ym:
                by_year[y][m_idx] = None

    km, km_ci = [], []
    for m in range(12):
        pairs = [(snpp_m[y][m], aqua_m[y][m]) for y in range(2012, 2026) if aqua_m[y][m] > 0]
        if pairs:
            km.append(round(sum(p[0] for p in pairs) / sum(p[1] for p in pairs), 2))
            lo, hi = _bootstrap_ci(pairs)
            km_ci.append([round(lo, 2), round(hi, 2)])
        else:
            km.append(1.0)
            km_ci.append(None)

    rows = []
    for y in sorted(by_year):
        months = by_year[y]
        src = (
            "MODIS Aqua (13:30)"
            if y < 2012
            else "MODIS Aqua + VIIRS S-NPP (seam 2012-01-20)"
            if y == 2012
            else f"VIIRS S-NPP (1.4 km cell ≥ {threshold_label})"
        )
        rows.append(
            {
                "year": y,
                "sensor_source": src,
                "months": months,
                "annual_total": sum(x for x in months if x is not None),
            }
        )

    medians = []
    for m in range(12):
        vals = [r["months"][m] for r in rows if 2003 <= r["year"] <= 2025 and r["months"][m] is not None]
        medians.append(float(median(vals)) if vals else 0.0)

    # Último mes completo del archivo armonizado
    cur_year, cur_month_idx = last_ym[0], last_ym[1] - 1
    cur_val = by_year[cur_year][cur_month_idx] or 0
    med = medians[cur_month_idx]

    _CSV_CALENDAR_CACHE[region] = {
        "data_source": "nasa-firms-gibs",
        "source": f"Harmonized NASA FIRMS archive (MODIS C6.1 Aqua 13:30 + Suomi-NPP VIIRS 1.4 km ≥ {threshold_label}, in_calendar = 1){region_label}",
        "origin_filter": "Total",
        "start_year": 2002,
        "end_year": last_ym[0],
        "month_labels": MONTH_LABELS,
        "km_factors": km,
        "km_ci95": km_ci,
        "monthly_medians": medians,
        "current_month": {
            "year": cur_year,
            "month": MONTH_LABELS[cur_month_idx],
            "value": cur_val,
            "historical_median": med,
            "anomaly_pct": round((cur_val - med) / med * 100, 1) if med else 0.0,
            "partial": False,
        },
        "rows": rows,
        "coverage": 1.0,
        "updated": datetime.now(timezone.utc).isoformat(),
    }
    _CSV_CALENDAR_CACHE[region]["region"] = region if region not in ("", "*") else "*"
    return _CSV_CALENDAR_CACHE[region]


def load_real_calendar(region: str | None = None) -> dict[str, Any] | None:
    csv_cal = _load_calendar_from_harmonized_csv(region)
    if csv_cal is not None:
        return csv_cal
    if region not in (None, "*", "", "Chihuahua"):
        return None  # el respaldo por GIBS (calendar_counts.json) solo cuenta Chihuahua
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
