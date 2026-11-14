"""Modelo predictivo de incendio en vivo: satélites (entrenado) + estacas IoT (corrección).

1. Variables de hoy con app.ml.features (las MISMAS que en el entrenamiento):
   fuego VIIRS hasta ayer, clima NASA POWER hasta d-3, NDVI ≤ d-30, climatología.
2. LightGBM → probabilidad de ≥1 detección en la celda en 72 h → calibración isotónica.
3. Explicación: las variables que más empujan cada predicción (contribuciones del modelo).
4. Corrección IoT (EXPERIMENTAL, acotada): las estacas miden AHORA lo que el reanálisis solo ve
   con 3 días de retraso. En la validación el clima por sí solo (índice HDW, AUC 0.53) predijo
   poco las detecciones, así que el ajuste por clima es pequeño (±0.5 en log-odds máx.) y el peso
   mayor va a señales con sustento físico: rayos (ignición) y lluvia (apaga/humedece).
   Se validará cuando haya historial de las estacas.
"""

from __future__ import annotations

import asyncio
import json
import math
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
import numpy as np

from app.ml.features import FEATURES, NDVI_LAG_DAYS, assemble, fires_matrix, ndvi_composite_dates, neighbors
from app.services.gibs_raster import _sample_day
from app.services.nasa_fires import VIIRS_N20, detections_for_day

MODELS = Path(__file__).resolve().parents[2] / "models"
TIMELINE_START = date(2020, 1, 1)
POWER_PARAMS = {"T2M_MAX": "tmax", "RH2M": "rh", "WS10M_MAX": "wind", "PRECTOTCORR": "precip", "GWETTOP": "soil_wet"}
IOT_RADIUS_KM = 30.0
LEVEL_NAMES = ["Low", "Moderate", "High", "Very high", "Extreme"]

FEATURE_LABELS = {
    "fire_1d": "fire detected here yesterday",
    "fire_7d": "fire activity here in the last 7 days",
    "fire_30d": "fire activity here in the last 30 days",
    "fire_nb_7d": "fire activity in neighboring cells (7 days)",
    "clim": "historical fire frequency for this place and season",
    "tmax": "maximum temperature",
    "rh": "air humidity",
    "wind": "wind gusts",
    "soil_wet": "soil moisture",
    "soil_wet_7d": "soil moisture (7-day)",
    "precip_7d": "rain in the last 7 days",
    "precip_30d": "rain in the last 30 days",
    "dry_days": "days without rain",
    "hdw": "Hot-Dry-Windy index",
    "ndvi": "vegetation (fuel)",
    "elevation": "elevation",
    "doy_sin": "time of year",
    "doy_cos": "time of year",
}

_state: dict[str, Any] = {"loaded": False}
_cache: dict[str, Any] = {}


def _load() -> bool:
    if _state["loaded"]:
        return True
    model_txt, meta_json, grid_json = MODELS / "fire_lgbm.txt", MODELS / "fire_model.json", MODELS / "grid.json"
    if not (model_txt.exists() and meta_json.exists() and grid_json.exists()):
        return False
    import lightgbm as lgb  # import diferido: el backend funciona aunque no esté instalado

    grid = json.loads(grid_json.read_text())
    _state.update(
        loaded=True,
        booster=lgb.Booster(model_file=str(model_txt)),
        meta=json.loads(meta_json.read_text()),
        cells=np.array(grid["cells"]),
        elevation=np.array(grid["elevation"], dtype=np.float32),
        power_nearest=np.array(grid["power_nearest"]),
        power_points=np.array(grid["power_points"]),
    )
    _state["neighbors"] = neighbors(_state["cells"])
    return True


def available() -> bool:
    try:
        return _load()
    except Exception:  # noqa: BLE001
        return False


async def _power(days: list[date]) -> dict[str, np.ndarray]:
    """Clima NASA POWER [día, celda] (punto más cercano), con caché de 6 h."""
    key = f"power:{days[-1]}"
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < 6 * 3600:
        return hit[1]
    cells_near = _state["power_nearest"]
    idx = {d.strftime("%Y%m%d"): t for t, d in enumerate(days)}
    out: dict[str, np.ndarray] = {}
    async with httpx.AsyncClient(timeout=120) as client:
        for param, name in POWER_PARAMS.items():
            M = np.full((len(days), len(cells_near)), np.nan, dtype=np.float32)
            for year in sorted({d.year for d in days}):
                start = max(date(year, 1, 1), days[0])
                end = min(date(year, 12, 31), days[-1])
                url = (
                    "https://power.larc.nasa.gov/api/temporal/daily/regional?latitude-min=25.5&latitude-max=31.8"
                    f"&longitude-min=-109.1&longitude-max=-103.3&parameters={param}&community=AG"
                    f"&start={start:%Y%m%d}&end={end:%Y%m%d}&format=json"
                )
                r = await client.get(url)
                r.raise_for_status()
                feats = r.json()["features"]
                series = np.full((len(days), len(feats)), np.nan, dtype=np.float32)
                for j, f in enumerate(feats):
                    for k, v in f["properties"]["parameter"][param].items():
                        t = idx.get(k)
                        if t is not None and v > -900:
                            series[t, j] = v
                rows = ~np.isnan(series).all(axis=1)
                M[rows] = series[rows][:, cells_near]
            out[name] = M * 3.6 if name == "wind" else M
    _cache[key] = (time.time(), out)
    return out


async def _ndvi(days: list[date]) -> np.ndarray:
    """NDVI [día, celda] usando solo el compuesto más reciente ≤ hoy-30 días (como en el entrenamiento)."""
    today = days[-1]
    comp = [d for d in ndvi_composite_dates(today - timedelta(days=NDVI_LAG_DAYS + 40), today - timedelta(days=NDVI_LAG_DAYS))]
    M = np.full((len(days), len(_state["cells"])), np.nan, dtype=np.float32)
    pts = [(float(a), float(b)) for a, b in _state["cells"]]
    async with httpx.AsyncClient(timeout=60) as client:
        for d in reversed(comp):
            key = f"ndvi:{d}"
            if key not in _cache:
                try:
                    vals = await _sample_day(client, "VIIRS_NOAA20_L3_NDVI_16Day", "MODIS_L3_NDVI", d, pts)
                except (httpx.HTTPError, OSError):
                    continue
                arr = np.array([np.nan if v is None else v for v in vals], dtype=np.float32)
                if np.isfinite(arr).mean() < 0.5:  # compuesto aún incompleto
                    continue
                _cache[key] = arr
            M[-1] = _cache[key]
            break
    return M


async def _fires(days: list[date]) -> np.ndarray:
    async with httpx.AsyncClient(timeout=30) as client:
        sem = asyncio.Semaphore(8)

        async def one(d: date):
            async with sem:
                try:
                    return d.isoformat(), await detections_for_day(client, VIIRS_N20, d)
                except httpx.HTTPError:
                    return d.isoformat(), []

        pairs = await asyncio.gather(*(one(d) for d in days))
    return fires_matrix(days, dict(pairs), _state["cells"])


async def _base_forecast(today: date) -> dict[str, Any]:
    """Predicción del modelo (sin IoT) para la fecha de emisión `today`; caché diaria."""
    key = f"base:{today}"
    if key in _cache:
        return _cache[key]
    days = [TIMELINE_START + timedelta(days=i) for i in range((today - TIMELINE_START).days + 1)]
    F = await _fires(days)
    recent = days[-160:]  # clima: basta con ~5 meses (días sin lluvia ≤ 120)
    w_recent = await _power(recent)
    weather = {k: np.full((len(days), F.shape[1]), np.nan, dtype=np.float32) for k in POWER_PARAMS.values()}
    for k in weather:
        weather[k][-len(recent):] = w_recent[k]
    ndvi = await _ndvi(days)
    feats = assemble(days, F, weather, ndvi, _state["elevation"], _state["neighbors"])
    X = np.stack([feats[name][-1] for name in FEATURES], axis=1).astype(np.float32)

    booster = _state["booster"]
    raw = booster.predict(X)
    contrib = booster.predict(X, pred_contrib=True)[:, :-1]  # última columna = sesgo
    iso = _state["meta"]["isotonic"]
    prob = np.interp(raw, iso["x"], iso["y"])
    result = {"X": X, "prob": prob, "contrib": contrib, "weather_day": str(today - timedelta(days=3))}
    _cache[key] = result
    return result


def _level(p: float) -> int:
    th = _state["meta"]["level_thresholds"]
    return int(np.searchsorted(np.array(th[1:]), p, side="right") + 1)


def _drivers(contrib_row: np.ndarray, x_row: np.ndarray, k: int = 3) -> list[dict[str, Any]]:
    order = np.argsort(-np.abs(contrib_row))
    out, seen = [], set()
    for j in order:
        label = FEATURE_LABELS.get(FEATURES[j], FEATURES[j])
        if label in seen:
            continue
        seen.add(label)
        v = float(x_row[j])
        out.append({"feature": FEATURES[j], "label": label, "value": None if math.isnan(v) else round(v, 2), "effect": "raises" if contrib_row[j] > 0 else "lowers"})
        if len(out) == k:
            break
    return out


def _haversine_km(a_lat: float, a_lon: float, b_lat: np.ndarray, b_lon: np.ndarray) -> np.ndarray:
    r = 6371.0
    p1, p2 = math.radians(a_lat), np.radians(b_lat)
    dphi, dl = p2 - p1, np.radians(b_lon - a_lon)
    h = np.sin(dphi / 2) ** 2 + math.cos(p1) * np.cos(p2) * np.sin(dl / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(h))


def _iot_adjust(prob: np.ndarray, X: np.ndarray, stations: list[dict[str, Any]]) -> tuple[np.ndarray, list[dict[str, Any]], list[dict[str, Any]]]:
    """Ajusta las probabilidades cerca de estacas con lecturas frescas (≤ 3 h, sensor de campo)."""
    from app.services.open_meteo import compute_fire_risk_level

    logit = np.log(np.clip(prob, 1e-5, 1 - 1e-5) / (1 - np.clip(prob, 1e-5, 1 - 1e-5)))
    shift = np.zeros_like(prob)
    reasons: list[list[str]] = [[] for _ in prob]
    used = []
    cells = _state["cells"]
    hdw_col = FEATURES.index("hdw")
    now = datetime.now(timezone.utc)
    for s in stations:
        try:
            age_h = (now - datetime.fromisoformat(str(s["timestamp"]))).total_seconds() / 3600
        except ValueError:
            continue
        if s.get("fallback_active") or age_h > 3:
            continue
        _, _, hdw_now = compute_fire_risk_level(s["temperature_c"], s["humidity_pct"], s.get("wind_kmh", 0.0), s.get("rain_mm", 0.0))
        dist = _haversine_km(s["lat"], s["lon"], cells[:, 0], cells[:, 1])
        near = dist <= IOT_RADIUS_KM
        if not near.any():
            continue
        weight = 1.0 - dist[near] / IOT_RADIUS_KM
        delta = hdw_now - np.nan_to_num(X[near, hdw_col], nan=hdw_now)
        dshift = weight * np.clip(0.02 * delta, -0.5, 0.5)
        if s.get("lightning_strikes", 0) > 0:
            dshift += weight * 0.7
        if s.get("rain_mm", 0.0) >= 5.0:
            dshift -= weight * 0.7
        shift[near] += dshift
        for i in np.where(near)[0]:
            note = f"station {s['station_id']}: HDW now {hdw_now:.0f}"
            if s.get("lightning_strikes", 0) > 0:
                note += f", {s['lightning_strikes']} lightning strikes"
            if s.get("rain_mm", 0.0) >= 5.0:
                note += f", {s['rain_mm']} mm rain"
            reasons[i].append(note)
        used.append({"station_id": s["station_id"], "hdw_now": round(hdw_now, 1), "cells_affected": int(near.sum()), "lightning": s.get("lightning_strikes", 0)})
    adjusted = 1 / (1 + np.exp(-(logit + shift)))
    notes = [{"shift": round(float(shift[i]), 3), "reasons": reasons[i]} for i in range(len(prob))]
    return adjusted, notes, used


async def forecast(stations: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not available():
        return None
    today = date.today()
    base = await _base_forecast(today)
    prob, notes, used = _iot_adjust(base["prob"], base["X"], stations)
    meta = _state["meta"]
    cells_out = []
    for i, (lat, lon) in enumerate(_state["cells"]):
        p = float(prob[i])
        cells_out.append(
            {
                "lat": float(lat),
                "lon": float(lon),
                "probability": round(p, 4),
                "level": _level(p),
                "model_probability": round(float(base["prob"][i]), 4),
                "iot_shift": notes[i]["shift"],
                "iot_reasons": notes[i]["reasons"],
                "drivers": _drivers(base["contrib"][i], base["X"][i]),
            }
        )
    ov = meta["validation"]["overall"]
    return {
        "issued": today.isoformat(),
        "horizon_hours": 72,
        "step_deg": 0.25,
        "target": meta["target"],
        "model": {
            "version": meta["version"],
            "training_period": meta["training_period"],
            "validation": "leave-one-year-out",
            "auc": ov["model"]["auc"],
            "top10_recall": ov["model"]["top10_recall"],
            "baselines_auc": {k: v["auc"] for k, v in ov.items() if k != "model"},
        },
        "data_as_of": {"fires": str(today - timedelta(days=1)), "weather": base["weather_day"], "vegetation": f"≤ {today - timedelta(days=NDVI_LAG_DAYS)}"},
        "levels": [{"level": i + 1, "name": n, "min_probability": round(meta["level_thresholds"][i], 4)} for i, n in enumerate(LEVEL_NAMES)],
        "stations_used": used,
        "cells": cells_out,
    }


async def station_risk(station: dict[str, Any]) -> dict[str, Any] | None:
    """Probabilidad del modelo (con corrección IoT) en la celda de una estaca: para sus LEDs."""
    fc = await forecast([station])
    if not fc:
        return None
    cells = np.array([[c["lat"], c["lon"]] for c in fc["cells"]])
    i = int(_haversine_km(station["lat"], station["lon"], cells[:, 0], cells[:, 1]).argmin())
    c = fc["cells"][i]
    return {"probability_72h": c["probability"], "level": c["level"], "level_name": LEVEL_NAMES[c["level"] - 1]}
