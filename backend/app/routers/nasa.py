"""Capas de incendios de la NASA (FIRMS vía GIBS): activos e históricos."""

from __future__ import annotations

import calendar
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.services.nasa_fires import FIRST_DAY, detections_for_range

router = APIRouter(prefix="/api/nasa", tags=["nasa"])


@router.get("/fires")
async def active_fires(days: int = Query(2, ge=1, le=7, description="Días hacia atrás, incluido hoy")):
    """Detecciones VIIRS (NOAA-20, 375 m) en Chihuahua de los últimos `days` días."""
    end = date.today()
    start = end - timedelta(days=days - 1)
    fires = await detections_for_range(start, end)
    fires.sort(key=lambda f: (f["date"], f["time"]), reverse=True)
    return JSONResponse(
        {
            "source": "NASA FIRMS — VIIRS NOAA-20 375 m (via NASA GIBS)",
            "start": start.isoformat(),
            "end": end.isoformat(),
            "count": len(fires),
            "fires": fires,
        },
        headers={"Cache-Control": "public, max-age=600"},
    )


@router.get("/fires/history")
async def historical_fires(month: str = Query(..., pattern=r"^\d{4}-\d{2}$", description="YYYY-MM")):
    """Todas las detecciones de un mes en Chihuahua (formato compacto: [lat, lon, frp, fecha])."""
    year, mon = map(int, month.split("-"))
    if not 1 <= mon <= 12:
        raise HTTPException(400, "Invalid month")
    start = date(year, mon, 1)
    end = date(year, mon, calendar.monthrange(year, mon)[1])
    last_full = date.today().replace(day=1) - timedelta(days=1)
    if start < FIRST_DAY or end > last_full:
        raise HTTPException(400, f"Month must be between {FIRST_DAY:%Y-%m} and {last_full:%Y-%m}")

    fires = await detections_for_range(start, end)
    compact = [[f["lat"], f["lon"], f["frp_mw"], f["date"]] for f in fires]
    return JSONResponse(
        {
            "source": "NASA FIRMS — VIIRS NOAA-20 375 m (via NASA GIBS)",
            "month": month,
            "count": len(compact),
            "fields": ["lat", "lon", "frp_mw", "date"],
            "fires": compact,
        },
        # Un mes pasado no cambia: caché larga en el navegador.
        headers={"Cache-Control": "public, max-age=86400"},
    )
