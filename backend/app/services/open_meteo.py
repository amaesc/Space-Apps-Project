from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

RISK_LABELS = {
    1: "Bajo",
    2: "Moderado",
    3: "Alto",
    4: "Muy Alto",
    5: "Extremo",
}


def compute_fire_risk_level(
    temperature_c: float,
    humidity_pct: float,
    wind_kmh: float,
    rain_mm: float = 0.0,
) -> tuple[int, str, float]:
    """Calcula nivel de riesgo 1-5 (5 LEDs) e índice HDW simplificado."""
    if rain_mm >= 5.0:
        return 1, RISK_LABELS[1], 12.0

    # Vapor Pressure Deficit aproximado + viento (Hot-Dry-Windy)
    dryness = max(0.0, (100.0 - humidity_pct) / 100.0)
    heat = max(0.0, (temperature_c - 10.0) / 30.0)
    wind_factor = min(1.5, wind_kmh / 25.0)
    hdw_score = round((dryness * 45.0) + (heat * 30.0) + (wind_factor * 25.0), 1)

    if rain_mm >= 1.0:
        hdw_score = round(hdw_score * 0.65, 1)

    if hdw_score < 25:
        level = 1
    elif hdw_score < 42:
        level = 2
    elif hdw_score < 60:
        level = 3
    elif hdw_score < 78:
        level = 4
    else:
        level = 5

    return level, RISK_LABELS[level], hdw_score


# Caché de 10 min por punto: el clima no cambia tan rápido y así las páginas
# no esperan a un servicio externo en cada visita.
_CACHE: dict[tuple[float, float], tuple[float, dict[str, Any]]] = {}
_CACHE_TTL_S = 600.0


async def fetch_open_meteo_risk(lat: float, lon: float) -> dict[str, Any]:
    """Consulta clima actual en Open-Meteo (sin API key) con fallback seguro."""
    key = (round(lat, 2), round(lon, 2))
    now_ts = datetime.now(timezone.utc).timestamp()
    cached = _CACHE.get(key)
    if cached and now_ts - cached[0] < _CACHE_TTL_S:
        return cached[1]
    result = await _fetch_open_meteo_risk(lat, lon)
    if result["source"] == "open-meteo-live":
        _CACHE[key] = (now_ts, result)
    return result


async def _fetch_open_meteo_risk(lat: float, lon: float) -> dict[str, Any]:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
        "timezone": "auto",
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(url, params=params)
            res.raise_for_status()
            payload = res.json()

        current = payload.get("current", {})
        temp = float(current.get("temperature_2m", 24.0))
        humidity = float(current.get("relative_humidity_2m", 32.0))
        wind = float(current.get("wind_speed_10m", 18.0))
        rain = float(current.get("precipitation", 0.0))
        source = "open-meteo-live"
    except Exception:
        # Respaldo determinista para demostración sin red
        temp, humidity, wind, rain = 26.5, 24.0, 21.0, 0.0
        source = "open-meteo-fallback"

    level, label, hdw_score = compute_fire_risk_level(temp, humidity, wind, rain)

    return {
        "source": source,
        "lat": lat,
        "lon": lon,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "temperature_c": temp,
        "humidity_pct": humidity,
        "wind_kmh": wind,
        "rain_mm": rain,
        "hdw_score": hdw_score,
        "risk_level": level,
        "risk_label": label,
    }


# --- Cuadrícula de clima del estado (capas de temperatura, humedad, presión y
# probabilidad de incendio) ----------------------------------------------------

GRID_STEP = 0.5  # grados (~50 km)
_GRID_CACHE: tuple[float, dict[str, Any]] | None = None
_GRID_TTL_S = 30 * 60


def _grid_points() -> list[tuple[float, float]]:
    from app.services.nasa_fires import BBOX, inside_chihuahua

    pts = []
    lat = BBOX[1] + GRID_STEP / 2
    while lat < BBOX[3]:
        lon = BBOX[0] + GRID_STEP / 2
        while lon < BBOX[2]:
            if inside_chihuahua(lon, lat):
                pts.append((round(lat, 3), round(lon, 3)))
            lon += GRID_STEP
        lat += GRID_STEP
    return pts


async def fetch_weather_grid() -> dict[str, Any]:
    """Clima actual en una cuadrícula de 0.5° sobre Chihuahua + riesgo HDW por celda."""
    global _GRID_CACHE
    now_ts = datetime.now(timezone.utc).timestamp()
    if _GRID_CACHE and now_ts - _GRID_CACHE[0] < _GRID_TTL_S:
        return _GRID_CACHE[1]

    pts = _grid_points()
    params = {
        "latitude": ",".join(str(p[0]) for p in pts),
        "longitude": ",".join(str(p[1]) for p in pts),
        "current": "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,precipitation",
        "timezone": "auto",
    }
    source = "open-meteo-live"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
            res.raise_for_status()
            payload = res.json()
        rows = payload if isinstance(payload, list) else [payload]
        currents = [r.get("current", {}) for r in rows]
    except Exception:
        # Respaldo determinista: gradiente suave (más caliente y seco al este/norte).
        source = "open-meteo-fallback"
        currents = [
            {
                "temperature_2m": 18 + (lat - 25.5) * 0.6 + (lon + 109) * 0.9,
                "relative_humidity_2m": max(8.0, 60 - (lon + 109) * 6),
                "surface_pressure": 880 - (31.8 - lat) * 4 + (lon + 109) * 6,
                "wind_speed_10m": 12 + (lat - 25.5) * 1.5,
                "precipitation": 0.0,
            }
            for lat, lon in pts
        ]

    cells = []
    for (lat, lon), cur in zip(pts, currents):
        temp = float(cur.get("temperature_2m", 24.0))
        rh = float(cur.get("relative_humidity_2m", 30.0))
        wind = float(cur.get("wind_speed_10m", 15.0))
        rain = float(cur.get("precipitation", 0.0))
        level, label, hdw = compute_fire_risk_level(temp, rh, wind, rain)
        cells.append(
            {
                "lat": lat,
                "lon": lon,
                "temperature_c": round(temp, 1),
                "humidity_pct": round(rh),
                "pressure_hpa": round(float(cur.get("surface_pressure", 0.0)), 1),
                "wind_kmh": round(wind, 1),
                "hdw_score": hdw,
                "risk_level": level,
                "risk_label": label,
            }
        )

    result = {
        "source": source,
        "step_deg": GRID_STEP,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cells": cells,
    }
    if source == "open-meteo-live":
        _GRID_CACHE = (now_ts, result)
    return result
