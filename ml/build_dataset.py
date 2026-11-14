"""Construye el conjunto de entrenamiento del modelo de probabilidad de incendio.

Uso (desde la raíz del repo):
    ml/.venv/bin/python ml/build_dataset.py

Fuentes (todo en caché en ml/data/raw, se puede volver a correr sin re-descargar):
- Fuego: NASA FIRMS VIIRS NOAA-20 por día (copiado de la Raspberry Pi:
  rsync raspi:fuegodata/backend/data/nasa_fires/viirs_n20/ ml/data/raw/fires_viirs_n20/)
- Clima: NASA POWER (MERRA-2) diario regional — T2M_MAX, RH2M, WS10M_MAX, PRECTOTCORR, GWETTOP
- Vegetación: NASA GIBS VIIRS NOAA-20 L3 NDVI 16 días (cada 8 días)
- Altitud: Open-Meteo elevation API

Salida:
- ml/data/dataset.npz        filas = (fecha de emisión, celda) 2020-02-01 … 2025-12-31
- backend/models/grid.json   celdas, altitud y punto POWER más cercano (lo usa el servidor)
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import httpx
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.ml.features import (  # noqa: E402
    FEATURES,
    NDVI_LAG_DAYS,
    assemble,
    build_cells,
    fires_matrix,
    labels,
    ndvi_composite_dates,
    neighbors,
)
from app.services.gibs_raster import _sample_day  # noqa: E402

RAW = ROOT / "ml" / "data" / "raw"
OUT = ROOT / "ml" / "data" / "dataset.npz"
GRID_JSON = ROOT / "backend" / "models" / "grid.json"

T0, T1 = date(2019, 12, 1), date(2026, 1, 2)  # línea de tiempo (con margen para ventanas y etiquetas)
ISSUE0, ISSUE1 = date(2020, 2, 1), date(2025, 12, 31)  # fechas de emisión del dataset
POWER_PARAMS = ["T2M_MAX", "RH2M", "WS10M_MAX", "PRECTOTCORR", "GWETTOP"]
POWER_BBOX = dict(lat_min=25.5, lat_max=31.8, lon_min=-109.1, lon_max=-103.3)
NDVI_LAYER, NDVI_COLORMAP = "VIIRS_NOAA20_L3_NDVI_16Day", "MODIS_L3_NDVI"


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def days_between(a: date, b: date) -> list[date]:
    return [a + timedelta(days=i) for i in range((b - a).days + 1)]


# --- Altitud -------------------------------------------------------------------------
def elevation(cells: np.ndarray) -> np.ndarray:
    path = RAW / "elevation.json"
    if path.exists():
        return np.array(json.loads(path.read_text()), dtype=np.float32)
    out: list[float] = []
    with httpx.Client(timeout=30) as client:
        for i in range(0, len(cells), 100):
            chunk = cells[i : i + 100]
            r = client.get(
                "https://api.open-meteo.com/v1/elevation",
                params={"latitude": ",".join(f"{x:.4f}" for x in chunk[:, 0]), "longitude": ",".join(f"{x:.4f}" for x in chunk[:, 1])},
            )
            r.raise_for_status()
            out.extend(r.json()["elevation"])
    RAW.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out))
    return np.array(out, dtype=np.float32)


# --- NASA POWER ----------------------------------------------------------------------
def power_year(client: httpx.Client, param: str, year: int) -> dict:
    path = RAW / "power" / f"{param}_{year}.json"
    if path.exists():
        return json.loads(path.read_text())
    b = POWER_BBOX
    url = (
        "https://power.larc.nasa.gov/api/temporal/daily/regional"
        f"?latitude-min={b['lat_min']}&latitude-max={b['lat_max']}&longitude-min={b['lon_min']}&longitude-max={b['lon_max']}"
        f"&parameters={param}&community=AG&start={year}0101&end={year}1231&format=json"
    )
    for attempt in range(4):
        try:
            r = client.get(url)
            r.raise_for_status()
            data = r.json()
            break
        except httpx.HTTPError:
            time.sleep(5 * (attempt + 1))
    else:
        raise RuntimeError(f"POWER {param} {year} failed")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data))
    return data


def power_matrices(cells: np.ndarray, days: list[date]) -> tuple[dict[str, np.ndarray], np.ndarray, np.ndarray]:
    """Clima [día, celda] usando el punto POWER más cercano a cada celda."""
    idx = {d.strftime("%Y%m%d"): t for t, d in enumerate(days)}
    out: dict[str, np.ndarray] = {}
    pts = None
    nearest = None
    with httpx.Client(timeout=120) as client:
        for param in POWER_PARAMS:
            M = np.full((len(days), len(cells)), np.nan, dtype=np.float32)
            for year in range(days[0].year, days[-1].year + 1):
                data = power_year(client, param, year)
                feats = data["features"]
                if pts is None:
                    pts = np.array([[f["geometry"]["coordinates"][1], f["geometry"]["coordinates"][0]] for f in feats])
                    d2 = ((cells[:, None, 0] - pts[None, :, 0]) ** 2 + (cells[:, None, 1] - pts[None, :, 1]) ** 2)
                    nearest = d2.argmin(axis=1)
                series = np.full((len(days), len(feats)), np.nan, dtype=np.float32)
                for j, f in enumerate(feats):
                    for k, v in f["properties"]["parameter"][param].items():
                        t = idx.get(k)
                        if t is not None and v > -900:
                            series[t, j] = v
                rows = ~np.isnan(series).all(axis=1)
                M[rows] = series[rows][:, nearest]
            out[param] = M
            log(f"POWER {param}: {np.isfinite(M).mean():.1%} valores")
    weather = {
        "tmax": out["T2M_MAX"],
        "rh": out["RH2M"],
        "wind": out["WS10M_MAX"] * 3.6,  # m/s → km/h
        "precip": out["PRECTOTCORR"],
        "soil_wet": out["GWETTOP"],
    }
    return weather, pts, nearest


# --- NDVI ----------------------------------------------------------------------------
async def ndvi_composites(cells: np.ndarray, dates: list[date]) -> dict[date, np.ndarray]:
    cache = RAW / "ndvi"
    cache.mkdir(parents=True, exist_ok=True)
    pts = [(float(a), float(b)) for a, b in cells]
    out: dict[date, np.ndarray] = {}
    sem = asyncio.Semaphore(4)
    async with httpx.AsyncClient(timeout=60) as client:

        async def one(d: date) -> None:
            path = cache / f"{d.isoformat()}.npy"
            if path.exists():
                out[d] = np.load(path)
                return
            async with sem:
                for attempt in range(3):
                    try:
                        vals = await _sample_day(client, NDVI_LAYER, NDVI_COLORMAP, d, pts)
                        break
                    except (httpx.HTTPError, OSError):
                        await asyncio.sleep(3 * (attempt + 1))
                else:
                    log(f"NDVI {d}: falló, se omite")
                    return
            arr = np.array([np.nan if v is None else v for v in vals], dtype=np.float32)
            np.save(path, arr)
            out[d] = arr

        await asyncio.gather(*(one(d) for d in dates))
    return out


def ndvi_matrix(days: list[date], composites: dict[date, np.ndarray], n_cells: int) -> np.ndarray:
    """ndvi[t] = compuesto más reciente con fecha ≤ días[t] - NDVI_LAG_DAYS."""
    keys = sorted(composites)
    M = np.full((len(days), n_cells), np.nan, dtype=np.float32)
    j = -1
    for t, d in enumerate(days):
        limit = d - timedelta(days=NDVI_LAG_DAYS)
        while j + 1 < len(keys) and keys[j + 1] <= limit:
            j += 1
        if j >= 0:
            M[t] = composites[keys[j]]
    return M


# --- Principal -----------------------------------------------------------------------
def main() -> None:
    days = days_between(T0, T1)
    cells = build_cells()
    nb = neighbors(cells)
    log(f"{len(cells)} celdas de 0.25° · {len(days)} días")

    elev = elevation(cells)
    log(f"altitud: {np.nanmin(elev):.0f}–{np.nanmax(elev):.0f} m")

    fire_dir = RAW / "fires_viirs_n20"
    points = {p.stem: json.loads(p.read_text()) for p in fire_dir.glob("*.json")}
    F = fires_matrix(days, points, cells)
    log(f"fuegos: {int(F.sum()):,} detecciones (nominal/alta) en {len(points)} días de archivo")

    weather, power_pts, nearest = power_matrices(cells, days)

    comp_dates = ndvi_composite_dates(T0 - timedelta(days=NDVI_LAG_DAYS + 16), T1)
    log(f"NDVI: {len(comp_dates)} compuestos")
    composites = asyncio.run(ndvi_composites(cells, comp_dates))
    ndvi = ndvi_matrix(days, composites, len(cells))
    log(f"NDVI: {np.isfinite(ndvi).mean():.1%} valores")

    feats = assemble(days, F, weather, ndvi, elev, nb)
    y = labels(F)

    t0, t1 = days.index(ISSUE0), days.index(ISSUE1)
    sl = slice(t0, t1 + 1)
    n_days, n_cells = t1 - t0 + 1, len(cells)
    X = np.stack([feats[name][sl].reshape(-1) for name in FEATURES], axis=1).astype(np.float32)
    Y = y[sl].reshape(-1)
    issue = np.repeat(np.array([d.toordinal() for d in days[sl]]), n_cells)
    cell = np.tile(np.arange(n_cells), n_days)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(OUT, X=X, y=Y, issue=issue, cell=cell, features=np.array(FEATURES))
    log(f"dataset: {X.shape[0]:,} filas × {X.shape[1]} variables · positivos {np.nanmean(Y):.2%} → {OUT.relative_to(ROOT)}")

    GRID_JSON.parent.mkdir(parents=True, exist_ok=True)
    GRID_JSON.write_text(
        json.dumps(
            {
                "step_deg": 0.25,
                "cells": [[float(a), float(b)] for a, b in cells],
                "elevation": [float(e) for e in elev],
                "power_points": [[float(a), float(b)] for a, b in power_pts],
                "power_nearest": [int(i) for i in nearest],
            }
        )
    )
    log(f"grid → {GRID_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
