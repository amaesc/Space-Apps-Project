"""Detecciones de incendios activos de NASA FIRMS vía NASA GIBS (sin clave de API).

GIBS publica las anomalías térmicas de VIIRS (NOAA-20, 375 m) como vector tiles
diarias. En EPSG:4326, nivel 4, cada tile cubre 18°: Chihuahua cabe en 2 tiles
(fila 3, columnas 3 y 4). Se descargan, se decodifican y se filtran al contorno
del estado. Días pasados se guardan en disco (no cambian); el día actual se
refresca cada 30 min.
"""

from __future__ import annotations

import asyncio
import gzip
import json
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import httpx
import mapbox_vector_tile

from app.services.chihuahua_outline import CHIHUAHUA_OUTLINE

LAYER = "VIIRS_NOAA20_Thermal_Anomalies_375m_All"
FIRST_DAY = date(2020, 1, 1)  # inicio del archivo de NOAA-20 en GIBS
TILE_URL = (
    "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/"
    f"{LAYER}/default/{{day}}/500m/4/3/{{col}}.mvt"
)
TILE_COLS = (3, 4)

CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "nasa_fires"
_TODAY_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_TODAY_TTL_S = 30 * 60

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


def _decode(raw: bytes) -> list[dict[str, Any]]:
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    out = []
    for layer in mapbox_vector_tile.decode(raw).values():
        for feat in layer["features"]:
            p = feat["properties"]
            lat, lon = p.get("LATITUDE"), p.get("LONGITUDE")
            if lat is None or lon is None or not inside_chihuahua(lon, lat):
                continue
            out.append(
                {
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "frp_mw": p.get("FRP"),
                    "confidence": p.get("CONFIDENCE"),
                    "date": p.get("ACQ_DATE"),
                    "time": p.get("ACQ_TIME"),
                    "daynight": p.get("DAYNIGHT"),
                    "satellite": "NOAA-20 VIIRS",
                }
            )
    return out


async def _fetch_day(client: httpx.AsyncClient, day: date) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []
    for col in TILE_COLS:
        res = await client.get(TILE_URL.format(day=day.isoformat(), col=col))
        if res.status_code == 404:  # sin datos ese día / tile
            continue
        res.raise_for_status()
        points.extend(_decode(res.content))
    return points


async def detections_for_day(client: httpx.AsyncClient, day: date) -> list[dict[str, Any]]:
    """Detecciones de un día dentro de Chihuahua (con caché)."""
    key = day.isoformat()
    today = date.today()
    if day >= today - timedelta(days=1):
        cached = _TODAY_CACHE.get(key)
        if cached and time.time() - cached[0] < _TODAY_TTL_S:
            return cached[1]
        pts = await _fetch_day(client, day)
        _TODAY_CACHE[key] = (time.time(), pts)
        return pts

    path = CACHE_DIR / f"{key}.json"
    if path.exists():
        return json.loads(path.read_text())
    pts = await _fetch_day(client, day)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(pts))
    return pts


async def detections_for_range(start: date, end: date, concurrency: int = 4) -> list[dict[str, Any]]:
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    sem = asyncio.Semaphore(concurrency)
    async with httpx.AsyncClient(timeout=30.0) as client:

        async def one(d: date) -> list[dict[str, Any]]:
            async with sem:
                try:
                    return await detections_for_day(client, d)
                except httpx.HTTPError:
                    return []

        chunks = await asyncio.gather(*(one(d) for d in days))
    return [p for chunk in chunks for p in chunk]
