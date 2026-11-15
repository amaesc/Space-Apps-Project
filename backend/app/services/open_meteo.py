from __future__ import annotations

import asyncio
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


class WeatherUnavailable(RuntimeError):
    """Open-Meteo no respondió o faltan variables: no se inventan valores."""


_REQUIRED = ("temperature_2m", "relative_humidity_2m", "wind_speed_10m", "precipitation")


def _required_values(cur: dict[str, Any], keys: tuple[str, ...] = _REQUIRED) -> list[float]:
    missing = [k for k in keys if cur.get(k) is None]
    if missing:
        raise WeatherUnavailable(f"Open-Meteo response is missing {missing}")
    return [float(cur[k]) for k in keys]


# Caché de 10 min por punto: el clima no cambia tan rápido y así las páginas
# no esperan a un servicio externo en cada visita.
_CACHE: dict[tuple[float, float], tuple[float, dict[str, Any]]] = {}
_CACHE_TTL_S = 600.0
# Si Open-Meteo falla, se sirve la última lectura REAL (marcada "stale" con su hora original) hasta 6 h.
_STALE_MAX_S = 6 * 3600


def _err(exc: Exception) -> str:
    return f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__


async def fetch_open_meteo_risk(lat: float, lon: float) -> dict[str, Any]:
    """Clima actual de Open-Meteo (sin API key). Lanza WeatherUnavailable si el servicio falla: sin valores inventados."""
    key = (round(lat, 2), round(lon, 2))
    now_ts = datetime.now(timezone.utc).timestamp()
    cached = _CACHE.get(key)
    if cached and now_ts - cached[0] < _CACHE_TTL_S:
        return cached[1]
    try:
        result = await _fetch_open_meteo_risk(lat, lon)
    except WeatherUnavailable:
        if cached and now_ts - cached[0] < _STALE_MAX_S:
            return {**cached[1], "stale": True}
        raise
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

    except (httpx.HTTPError, ValueError) as exc:
        raise WeatherUnavailable(f"Open-Meteo request failed: {_err(exc)}") from exc
    temp, humidity, wind, rain = _required_values(payload.get("current") or {})
    source = "open-meteo-live"

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


def fire_probability(hdw_score: float, ndvi: float | None, lst_c: float | None) -> tuple[int, float, list[str]]:
    """Probabilidad de incendio (prototipo): clima HDW × combustible (NDVI) + superficie caliente (LST).

    - Combustible (NDVI de NASA): suelo desnudo (<0.08) casi no arde; pasto/matorral
      (0.2–0.45) es combustible fino que se seca rápido; vegetación muy verde (>0.6)
      retiene humedad.
    - Temperatura de superficie (LST de NASA): suelo muy caliente seca el combustible.
    """
    factors = [f"weather HDW {hdw_score:.0f}"]
    fuel = 1.0
    if ndvi is not None:
        if ndvi < 0.08:
            fuel = 0.4
        elif ndvi < 0.2:
            fuel = 0.85
        elif ndvi < 0.45:
            fuel = 1.15
        elif ndvi < 0.6:
            fuel = 1.0
        else:
            fuel = 0.8
        factors.append(f"vegetation NDVI {ndvi:.2f} (fuel ×{fuel})")
    bonus = 0.0
    if lst_c is not None:
        bonus = 10.0 if lst_c >= 45 else 6.0 if lst_c >= 38 else 3.0 if lst_c >= 32 else 0.0
        factors.append(f"surface {lst_c:.0f} °C (+{bonus:.0f})")
    score = round(hdw_score * fuel + bonus, 1)
    level = 1 if score < 25 else 2 if score < 42 else 3 if score < 60 else 4 if score < 78 else 5
    return level, score, factors


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
    try:
        result = await _fetch_weather_grid()
    except WeatherUnavailable:
        if _GRID_CACHE and now_ts - _GRID_CACHE[0] < _STALE_MAX_S:
            return {**_GRID_CACHE[1], "stale": True}
        raise
    _GRID_CACHE = (now_ts, result)
    return result


GRID_CHUNK = 50  # Open-Meteo responde mucho más lento a una sola petición con ~100 puntos


async def _fetch_currents(pts: list[tuple[float, float]]) -> list[dict[str, Any]]:
    fields = "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,precipitation"
    async with httpx.AsyncClient(timeout=45.0) as client:

        async def one(sub: list[tuple[float, float]]) -> list[dict[str, Any]]:
            params = {"latitude": ",".join(str(p[0]) for p in sub), "longitude": ",".join(str(p[1]) for p in sub),
                      "current": fields, "timezone": "auto"}
            res = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
            res.raise_for_status()
            payload = res.json()
            rows = payload if isinstance(payload, list) else [payload]
            if len(rows) != len(sub):
                raise WeatherUnavailable(f"Open-Meteo returned {len(rows)} locations for {len(sub)} requested")
            return [r.get("current") or {} for r in rows]

        try:
            chunks = await asyncio.gather(*(one(pts[i:i + GRID_CHUNK]) for i in range(0, len(pts), GRID_CHUNK)))
        except (httpx.HTTPError, ValueError) as exc:
            raise WeatherUnavailable(f"Open-Meteo request failed: {_err(exc)}") from exc
    return [c for chunk in chunks for c in chunk]


async def _fetch_weather_grid() -> dict[str, Any]:
    pts = _grid_points()
    source = "open-meteo-live"
    currents = await _fetch_currents(pts)

    # Datos de NASA GIBS para el modelo (si fallan, el modelo usa solo el clima).
    try:
        from app.services.gibs_raster import ndvi_and_lst

        sat = await ndvi_and_lst(pts)
    except Exception:  # noqa: BLE001
        sat = {"ndvi": [None] * len(pts), "lst_c": [None] * len(pts)}

    cells, skipped = [], 0
    for i, ((lat, lon), cur) in enumerate(zip(pts, currents)):
        try:
            temp, rh, wind, rain = _required_values(cur)
        except WeatherUnavailable:
            skipped += 1  # celda sin datos: se omite en lugar de rellenarla
            continue
        level, label, hdw = compute_fire_risk_level(temp, rh, wind, rain)
        ndvi, lst_c = sat["ndvi"][i], sat["lst_c"][i]
        p_level, p_score, p_factors = fire_probability(hdw, ndvi, lst_c)
        cells.append(
            {
                "lat": lat,
                "lon": lon,
                "temperature_c": round(temp, 1),
                "humidity_pct": round(rh),
                "pressure_hpa": round(float(cur["surface_pressure"]), 1) if cur.get("surface_pressure") is not None else None,
                "wind_kmh": round(wind, 1),
                "hdw_score": hdw,
                "risk_level": level,
                "risk_label": label,
                "ndvi": ndvi,
                "lst_c": lst_c,
                "fire_prob_level": p_level,
                "fire_prob_score": p_score,
                "fire_prob_factors": p_factors,
            }
        )

    result = {
        "source": source,
        "step_deg": GRID_STEP,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cells": cells,
        "cells_without_data": skipped,
    }
    if not cells:
        raise WeatherUnavailable("Open-Meteo returned no usable cells")
    return result
