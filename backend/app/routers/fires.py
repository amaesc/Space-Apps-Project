"""Focos recientes (detecciones reales NASA FIRMS) y calendario armonizado.

Antes estas rutas servían datos de demostración (6 focos inventados con origen, probabilidad y alertas, y un
calendario generado con factores fijos); ahora devuelven solo datos reales.
"""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.routers.nasa import REGION_QUERY, _region
from app.services.calendar_builder import load_real_calendar
from app.services.hotspots import recent_hotspots

router = APIRouter(prefix="/api/fires", tags=["fires"])

DAYS_QUERY = Query(2, ge=1, le=7, description="Días hacia atrás, incluido hoy")


@router.get("/hotspots")
async def get_hotspots(days: int = DAYS_QUERY, region: str | None = REGION_QUERY):
    """Detecciones VIIRS reales de los últimos días en México o un estado (origen indeterminado)."""
    reg = _region(region)
    items = await recent_hotspots(days, reg)
    return {
        "count": len(items),
        "region": reg,
        "source": "NASA FIRMS — VIIRS NOAA-20 + NOAA-21, 375 m (via NASA GIBS)",
        "origin_note": "Probable origin is not computed yet; all detections are 'Indeterminado'.",
        "hotspots": items,
    }


@router.get("/calendar")
async def get_calendar(
    origin: str = Query("Total", description='Solo "Total": la separación por origen no está disponible'),
    start_year: int = Query(2002, ge=2002, le=2100),
    end_year: int = Query(2100, ge=2002, le=2100),
    region: str | None = REGION_QUERY,
):
    """Calendario armonizado real (el mismo que /api/nasa/calendar), recortado a [start_year, end_year]."""
    if origin.strip().lower() != "total":
        raise HTTPException(400, "Origin split (human / natural) is not available: only origin=Total")
    cal = load_real_calendar(_region(region))
    if cal is None:
        raise HTTPException(503, "Harmonized calendar not available on server")
    rows = [r for r in cal["rows"] if start_year <= r["year"] <= end_year]
    return {**cal, "rows": rows, "origin_filter": "Total"}


@router.get("/export.csv")
async def export_hotspots_csv(days: int = DAYS_QUERY, region: str | None = REGION_QUERY):
    """Exporta las detecciones recientes reales en CSV."""
    items = await recent_hotspots(days, _region(region))
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    cols = ["id", "state", "timestamp_utc", "sensor", "confidence", "daynight", "frp_mw", "lat", "lon", "origin"]
    writer.writerow(cols)
    for h in items:
        writer.writerow([h["id"], h["state"], h["timestamp"], h["sensor"], h["confidence"], h["daynight"],
                         h["frp_mw"], h["lat"], h["lon"], h["origin"]])
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="recent_hotspots.csv"'},
    )
