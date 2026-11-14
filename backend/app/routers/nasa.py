"""Capas de incendios de la NASA (FIRMS vía GIBS): activos, históricos y calendario."""

from __future__ import annotations

import calendar
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.services.calendar_builder import load_real_calendar
from app.services.nasa_fires import MODIS, VIIRS_N20, VIIRS_N21, detections_for_range, history_sources

router = APIRouter(prefix="/api/nasa", tags=["nasa"])

ATTRIBUTION = "We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS)."


@router.get("/fires")
async def active_fires(days: int = Query(2, ge=1, le=7, description="Días hacia atrás, incluido hoy")):
    """Detecciones VIIRS (NOAA-20 y NOAA-21, 375 m) en Chihuahua de los últimos `days` días."""
    end = date.today()
    start = end - timedelta(days=days - 1)
    fires = await detections_for_range(start, end, (VIIRS_N20, VIIRS_N21))
    fires.sort(key=lambda f: (f["date"], f["time"]), reverse=True)
    return JSONResponse(
        {
            "source": "NASA FIRMS — VIIRS NOAA-20 + NOAA-21, 375 m (via NASA GIBS)",
            "attribution": ATTRIBUTION,
            "latency_note": "Global FIRMS data are available within ~3 hours of the satellite overpass.",
            "start": start.isoformat(),
            "end": end.isoformat(),
            "count": len(fires),
            "fires": fires,
        },
        headers={"Cache-Control": "public, max-age=600"},
    )


@router.get("/fires/history")
async def historical_fires(month: str = Query(..., pattern=r"^\d{4}-\d{2}$", description="YYYY-MM")):
    """Detecciones de un mes en Chihuahua (compacto: [lat, lon, frp, fecha, confianza])."""
    year, mon = map(int, month.split("-"))
    if not 1 <= mon <= 12:
        raise HTTPException(400, "Invalid month")
    start = date(year, mon, 1)
    end = date(year, mon, calendar.monthrange(year, mon)[1])
    last_full = date.today().replace(day=1) - timedelta(days=1)
    if start < MODIS.first_day.replace(day=1) or end > last_full:
        raise HTTPException(400, f"Month must be between {MODIS.first_day:%Y-%m} and {last_full:%Y-%m}")

    sources = history_sources(start)
    fires = await detections_for_range(start, end, sources)
    compact = [[f["lat"], f["lon"], f["frp_mw"], f["date"], f["confidence"]] for f in fires]
    return JSONResponse(
        {
            "source": "NASA FIRMS — " + " + ".join(s.label for s in sources) + " (via NASA GIBS)",
            "attribution": ATTRIBUTION,
            "month": month,
            "count": len(compact),
            "fields": ["lat", "lon", "frp_mw", "date", "confidence"],
            "fires": compact,
        },
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/calendar")
async def real_calendar():
    """Calendario armonizado construido con detecciones reales (se completa en segundo plano)."""
    cal = load_real_calendar()
    if cal is None:
        # Aún sin datos: el sitio usa la serie ilustrativa y muestra el avance (0 %).
        return {"data_source": None, "coverage": 0.0}
    return cal
