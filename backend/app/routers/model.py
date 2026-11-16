"""Modelo predictivo de incendio (72 h): satélites + estacas IoT."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.routers.iot import list_stations
from app.services import fire_model

router = APIRouter(prefix="/api/model", tags=["model"])

# Ambos modelos se entrenaron SOLO con Chihuahua: fuera de ahí no hay pronóstico (no se extrapola).
PILOT = {
    "region": "Chihuahua",
    "scope": "pilot",
    "scope_note": "Trained and validated on Chihuahua only; no forecast is produced for other states.",
}
WEEKLY_DIR = Path(__file__).resolve().parents[3] / "risk_model_weekly" / "outputs"
_WEEKLY_CACHE: dict | None = None


@router.get("/forecast")
async def model_forecast():
    """Probabilidad de incendio a 72 h por celda de 0.25°, con explicación y corrección IoT."""
    stations = (await list_stations())["stations"]
    fc = await fire_model.forecast(stations)
    if fc is None:
        raise HTTPException(503, "Model not available")
    return JSONResponse({**fc, **PILOT}, headers={"Cache-Control": "public, max-age=900"})


@router.get("/info")
async def model_info():
    """Métricas de validación y descripción del modelo (para la página Data)."""
    if not fire_model.available():
        raise HTTPException(503, "Model not available")
    meta = fire_model._state["meta"]
    return {**{k: meta[k] for k in ("version", "target", "training_period", "base_rate", "levels", "validation", "importance")}, **PILOT}


@router.get("/weekly")
async def model_weekly():
    """Modelo semanal LightGBM (7, 14 y 28 días en malla de 0.1°, entrenado sobre in_calendar = 1)."""
    global _WEEKLY_CACHE
    if _WEEKLY_CACHE is not None:
        return JSONResponse(_WEEKLY_CACHE, headers={"Cache-Control": "public, max-age=3600"})

    h7_dir = WEEKLY_DIR / "h7"
    fc_files = sorted(h7_dir.glob("forecast_*.csv"))
    if not fc_files:
        raise HTTPException(503, "Weekly model outputs not available")

    cells, week_start = [], ""
    with fc_files[-1].open(encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh):
            week_start = r["week_start"]
            cells.append(
                [
                    int(r["cell_id"]),
                    round(float(r["lat"]), 2),
                    round(float(r["lon"]), 2),
                    round(float(r["probability"]), 4),
                    round(float(r["climatology_probability"]), 4),
                    round(float(r["ratio_vs_climatology"]), 2),
                ]
            )

    top25 = []
    top25_path = h7_dir / "top25_risk.csv"
    if top25_path.exists():
        with top25_path.open(encoding="utf-8", newline="") as fh:
            for r in csv.DictReader(fh):
                top25.append(
                    {
                        "cell_id": int(r["cell_id"]),
                        "lat": round(float(r["lat"]), 2),
                        "lon": round(float(r["lon"]), 2),
                        "probability": round(float(r["probability"]), 4),
                        "climatology_probability": round(float(r["climatology_probability"]), 4),
                        "ratio_vs_climatology": round(float(r["ratio_vs_climatology"]), 2),
                    }
                )

    horizons = []
    summary_path = WEEKLY_DIR / "summary.csv"
    if summary_path.exists():
        with summary_path.open(encoding="utf-8", newline="") as fh:
            for r in csv.DictReader(fh):
                horizons.append(
                    {
                        "horizon_days": int(r["horizon_days"]),
                        "lgbm_pr_auc": round(float(r["LightGBM_pr_auc"]), 3),
                        "b1_pr_auc": round(float(r["B1_pr_auc"]), 3),
                        "b2_pr_auc": round(float(r["B2_pr_auc"]), 3),
                        "lgbm_brier": round(float(r["LightGBM_brier"]), 5),
                        "lgbm_top_capture": round(float(r["LightGBM_top_capture"]), 3),
                        "b1_top_capture": round(float(r["B1_top_capture"]), 3),
                    }
                )

    metrics = json.loads((h7_dir / "metrics.json").read_text(encoding="utf-8"))
    lgbm = metrics["LightGBM (calibrated)"]
    _WEEKLY_CACHE = {
        "week_start": week_start,
        "horizon_days": 7,
        "cell_deg": 0.1,
        "roc_auc": round(lgbm["roc_auc"], 3),
        "pr_auc": round(lgbm["pr_auc"], 3),
        "top_capture": round(lgbm["top_capture"], 3),
        "base_rate": round(lgbm["base_rate"], 4),
        "horizons": horizons,
        "top25": top25,
        "fields": ["cell_id", "lat", "lon", "probability", "climatology_probability", "ratio_vs_climatology"],
        "cells": cells,
        **PILOT,
    }
    return JSONResponse(_WEEKLY_CACHE, headers={"Cache-Control": "public, max-age=3600"})
