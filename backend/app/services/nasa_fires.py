"""Detecciones de incendios de NASA FIRMS vía NASA GIBS (sin clave de API).

GIBS publica las anomalías térmicas de FIRMS como vector tiles diarias.
En EPSG:4326, nivel 4, cada tile cubre 18°: Chihuahua cabe en 2 tiles
(fila 3, columnas 3 y 4). Se descargan, se decodifican y se filtran al
contorno del estado.

Fuentes:
- VIIRS NOAA-20 (375 m) desde 2020-01-01
- VIIRS NOAA-21 (375 m) desde 2024-01-17
- MODIS Terra+Aqua (1 km) desde 2002-07-04 (archivo "Standard" en los años
  antiguos; se descartan volcanes y fuentes fijas con TYPE != 0)

Días pasados se guardan en disco (no cambian); hoy y ayer se refrescan cada 30 min.
"""

from __future__ import annotations

import asyncio
import csv
import gzip
import io
import json
import math
import time
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import httpx
import mapbox_vector_tile

from app.services.chihuahua_outline import CHIHUAHUA_OUTLINE


@dataclass(frozen=True)
class FireSource:
    key: str
    layer: str
    matrix_set: str
    first_day: date
    label: str


VIIRS_N20 = FireSource("viirs_n20", "VIIRS_NOAA20_Thermal_Anomalies_375m_All", "500m", date(2020, 1, 1), "VIIRS NOAA-20")
VIIRS_N21 = FireSource("viirs_n21", "VIIRS_NOAA21_Thermal_Anomalies_375m_All", "500m", date(2024, 1, 17), "VIIRS NOAA-21")
MODIS = FireSource("modis", "MODIS_Combined_Thermal_Anomalies_All", "1km", date(2002, 7, 4), "MODIS Terra/Aqua")
SOURCES = {s.key: s for s in (VIIRS_N20, VIIRS_N21, MODIS)}

TILE_COLS = (3, 4)
CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "nasa_fires"
_RECENT_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_RECENT_TTL_S = 30 * 60

_LONS = [p[0] for p in CHIHUAHUA_OUTLINE]
_LATS = [p[1] for p in CHIHUAHUA_OUTLINE]
BBOX = (min(_LONS), min(_LATS), max(_LONS), max(_LATS))


def inside_chihuahua(lon: float, lat: float) -> bool:
    """Punto en polígono (ray casting) contra el contorno simplificado del estado."""
    if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
        return False
    inside = False
    pts = CHIHUAHUA_OUTLINE
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def _confidence(raw: Any) -> str:
    """VIIRS ya trae low/nominal/high; MODIS trae 0-100 (clases FIRMS: <30, 30-79, ≥80)."""
    if isinstance(raw, str):
        return {"l": "low", "n": "nominal", "h": "high"}.get(raw[:1].lower(), raw)
    if isinstance(raw, (int, float)):
        return "low" if raw < 30 else "nominal" if raw < 80 else "high"
    return "nominal"


def _decode(raw: bytes, source: FireSource) -> list[dict[str, Any]]:
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    out = []
    for layer in mapbox_vector_tile.decode(raw).values():
        for feat in layer["features"]:
            p = feat["properties"]
            lat, lon = p.get("LATITUDE"), p.get("LONGITUDE")
            if lat is None or lon is None or not inside_chihuahua(lon, lat):
                continue
            if p.get("TYPE", 0) not in (0, None):  # MODIS: volcán / fuente fija / costa afuera
                continue
            sat = p.get("SATELLITE")
            out.append(
                {
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "frp_mw": p.get("FRP"),
                    "confidence": _confidence(p.get("CONFIDENCE")),
                    "date": p.get("ACQ_DATE"),
                    "time": p.get("ACQ_TIME"),
                    "daynight": p.get("DAYNIGHT"),
                    "satellite": f"MODIS {sat}" if source is MODIS else source.label,
                }
            )
    return out


async def _fetch_day(client: httpx.AsyncClient, source: FireSource, day: date) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []
    for col in TILE_COLS:
        url = (
            f"https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{source.layer}/default/"
            f"{day.isoformat()}/{source.matrix_set}/4/3/{col}.mvt"
        )
        res = await client.get(url)
        if res.status_code == 404:  # sin datos ese día / tile
            continue
        res.raise_for_status()
        points.extend(_decode(res.content, source))
    return points


async def detections_for_day(client: httpx.AsyncClient, source: FireSource, day: date) -> list[dict[str, Any]]:
    """Detecciones de un día y una fuente dentro de Chihuahua (con caché)."""
    if day < source.first_day or day > date.today():
        return []
    key = f"{source.key}/{day.isoformat()}"
    if day >= date.today() - timedelta(days=1):
        cached = _RECENT_CACHE.get(key)
        if cached and time.time() - cached[0] < _RECENT_TTL_S:
            return cached[1]
        pts = await _fetch_day(client, source, day)
        _RECENT_CACHE[key] = (time.time(), pts)
        return pts

    path = CACHE_DIR / source.key / f"{day.isoformat()}.json"
    if path.exists():
        return json.loads(path.read_text())
    pts = await _fetch_day(client, source, day)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(pts))
    return pts


def is_cached(source: FireSource, day: date) -> bool:
    return (CACHE_DIR / source.key / f"{day.isoformat()}.json").exists()


async def detections_for_range(
    start: date, end: date, sources: tuple[FireSource, ...], concurrency: int = 4
) -> list[dict[str, Any]]:
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    sem = asyncio.Semaphore(concurrency)
    async with httpx.AsyncClient(timeout=30.0) as client:

        async def one(src: FireSource, d: date) -> list[dict[str, Any]]:
            async with sem:
                try:
                    return await detections_for_day(client, src, d)
                except httpx.HTTPError:
                    return []

        chunks = await asyncio.gather(*(one(s, d) for s in sources for d in days))
    return [p for chunk in chunks for p in chunk]


def history_sources(month_start: date) -> tuple[FireSource, ...]:
    """Fuente(s) del histórico para un mes: VIIRS desde 2020, MODIS antes."""
    if month_start >= VIIRS_N21.first_day.replace(day=1):
        return (VIIRS_N20, VIIRS_N21)
    if month_start >= VIIRS_N20.first_day:
        return (VIIRS_N20,)
    return (MODIS,)


SEAM_DATE = "2012-01-20"
CELL_KM = 1.4
FRP_THRESHOLD_MW = 15.0
_COS_LAT = math.cos(math.radians(28.6))


def _time_to_mins(raw_time: Any) -> int:
    if raw_time is None:
        return 0
    s = str(raw_time).strip().replace(":", "").zfill(4)
    if len(s) >= 4 and s[:4].isdigit():
        return int(s[:2]) * 60 + int(s[2:4])
    return 0


def mark_in_calendar(fires: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Marca cada detección con `in_calendar` (1 ó 0) según `harmonization/build_harmonized_dataset.py`.

    - MODIS / antes de 2012-01-20: detecciones Aqua de confianza nominal/alta (excluye Terra 10:30).
    - VIIRS / desde 2012-01-20: agrupa píxeles de confianza nominal/alta en celdas de 1.4 km × 30 min;
      si la suma de FRP en la celda es >= 15.0 MW, conserva únicamente el píxel de mayor FRP como `in_calendar = 1`.
    """
    out = [dict(f, in_calendar=0) for f in fires]
    cells: dict[tuple[str, int, int, int], list[int]] = {}

    for idx, f in enumerate(out):
        conf = str(f.get("confidence", "nominal")).lower()
        if conf in ("low", "l"):
            continue
        sat = str(f.get("satellite") or "")
        acq_date = str(f.get("date") or "")

        if acq_date < SEAM_DATE or sat.startswith("MODIS"):
            # Excluir Terra ("T" o "Terra"); conservar Aqua o MODIS sin etiqueta de Terra
            if "terra" not in sat.lower() and sat != "MODIS T":
                out[idx]["in_calendar"] = 1
            continue

        lat = float(f.get("lat") or 0.0)
        lon = float(f.get("lon") or 0.0)
        x_km = (lon + 109.5) * 111.32 * _COS_LAT
        y_km = (lat - 25.5) * 111.32
        cx = int(math.floor(x_km / CELL_KM))
        cy = int(math.floor(y_km / CELL_KM))
        tb = _time_to_mins(f.get("time")) // 30
        key = (acq_date, cx, cy, tb)
        cells.setdefault(key, []).append(idx)

    for indices in cells.values():
        total_frp = sum(float(out[i].get("frp_mw") or 0.0) for i in indices)
        if total_frp >= FRP_THRESHOLD_MW:
            best_idx = max(indices, key=lambda i: float(out[i].get("frp_mw") or 0.0))
            out[best_idx]["in_calendar"] = 1

    return out


HARMONIZED_CSV = Path(__file__).resolve().parents[3] / "harmonization" / "harmonized_hotspots.csv"
_HARMONIZED_BY_MONTH: dict[str, list[dict[str, Any]]] | None = None


def _load_harmonized_by_month() -> dict[str, list[dict[str, Any]]] | None:
    global _HARMONIZED_BY_MONTH
    if _HARMONIZED_BY_MONTH is not None:
        return _HARMONIZED_BY_MONTH
    if not HARMONIZED_CSV.exists():
        return None
    by_month: dict[str, list[dict[str, Any]]] = {}
    with HARMONIZED_CSV.open(encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh):
            acq_date = r["acq_date"]
            ym = acq_date[:7]
            scan = float(r.get("scan") or 1.0)
            track = float(r.get("track") or 1.0)
            conf_raw = r.get("confidence", "n")
            conf = {"l": "low", "n": "nominal", "h": "high"}.get(conf_raw, conf_raw)
            by_month.setdefault(ym, []).append(
                {
                    "lat": round(float(r["latitude"]), 4),
                    "lon": round(float(r["longitude"]), 4),
                    "frp_mw": round(float(r["frp"]), 2),
                    "date": acq_date,
                    "time": r.get("acq_time", ""),
                    "confidence": conf,
                    "in_calendar": int(r.get("in_calendar") or 0),
                    "brightness": round(float(r["brightness"]), 1),
                    "bright_t31": round(float(r["bright_t31"]), 1),
                    "satellite": r.get("satellite", ""),
                    "daynight": r.get("daynight", ""),
                    "pixel_area_km2": round(scan * track, 3),
                }
            )
    _HARMONIZED_BY_MONTH = by_month
    return by_month


def harmonized_fires_for_month(month: str) -> list[dict[str, Any]] | None:
    """Devuelve las filas de `harmonized_hotspots.csv` para `YYYY-MM` si el archivo existe y cubre ese mes."""
    by_month = _load_harmonized_by_month()
    if by_month is None or month not in by_month:
        return None
    return by_month[month]


def harmonized_csv_slice(
    south: float = 25.5,
    north: float = 31.8,
    west: float = -109.5,
    east: float = -103.3,
    start_date: str = "2002-07-04",
    end_date: str = "2026-08-30",
    only_in_calendar: bool = False,
) -> str:
    """Recorta `harmonization/harmonized_hotspots.csv` por caja espacial y rango de fechas (16 columnas)."""
    if not HARMONIZED_CSV.exists():
        return ""
    buf = io.StringIO()
    with HARMONIZED_CSV.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        writer = csv.DictWriter(buf, fieldnames=reader.fieldnames or [])
        writer.writeheader()
        for r in reader:
            if only_in_calendar and r.get("in_calendar") != "1":
                continue
            d = r.get("acq_date", "")
            if d < start_date or d > end_date:
                continue
            lat = float(r["latitude"])
            lon = float(r["longitude"])
            if south <= lat <= north and west <= lon <= east:
                writer.writerow(r)
    return buf.getvalue()


