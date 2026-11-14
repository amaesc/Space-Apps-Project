"""Modelo predictivo de incendio (72 h): satélites + estacas IoT."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.routers.iot import list_stations
from app.services import fire_model

router = APIRouter(prefix="/api/model", tags=["model"])


@router.get("/forecast")
async def model_forecast():
    """Probabilidad de incendio a 72 h por celda de 0.25°, con explicación y corrección IoT."""
    stations = (await list_stations())["stations"]
    fc = await fire_model.forecast(stations)
    if fc is None:
        raise HTTPException(503, "Model not available")
    return JSONResponse(fc, headers={"Cache-Control": "public, max-age=900"})


@router.get("/info")
async def model_info():
    """Métricas de validación y descripción del modelo (para la página Data)."""
    if not fire_model.available():
        raise HTTPException(503, "Model not available")
    meta = fire_model._state["meta"]
    return {k: meta[k] for k in ("version", "target", "training_period", "base_rate", "levels", "validation", "importance")}
