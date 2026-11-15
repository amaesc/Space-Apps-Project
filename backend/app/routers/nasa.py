"""Capas de incendios de la NASA (FIRMS vía GIBS): activos, históricos y calendario."""

from __future__ import annotations

import calendar
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, Response

from app.services.calendar_builder import load_real_calendar
from app.services.nasa_fires import (
    MODIS,
    VIIRS_N20,
    VIIRS_N21,
    detections_for_range,
    harmonized_csv_slice,
    harmonized_fires_for_month,
    history_sources,
    mark_in_calendar,
)

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

    csv_fires = harmonized_fires_for_month(month)
    if csv_fires is not None:
        compact = [
            [
                f["lat"],
                f["lon"],
                f["frp_mw"],
                f["date"],
                f["confidence"],
                f["in_calendar"],
                f["brightness"],
                f["bright_t31"],
                f["satellite"],
                f["daynight"],
                f["pixel_area_km2"],
            ]
            for f in csv_fires
        ]
        in_cal_count = sum(1 for f in csv_fires if f["in_calendar"] == 1)
        return JSONResponse(
            {
                "source": "NASA FIRMS — Harmonized MODIS C6.1 + Suomi-NPP VIIRS (harmonized_hotspots.csv)",
                "attribution": ATTRIBUTION,
                "month": month,
                "count": len(compact),
                "in_calendar_count": in_cal_count,
                "fields": [
                    "lat",
                    "lon",
                    "frp_mw",
                    "date",
                    "confidence",
                    "in_calendar",
                    "brightness",
                    "bright_t31",
                    "satellite",
                    "daynight",
                    "pixel_area_km2",
                ],
                "fires": compact,
            },
            headers={"Cache-Control": "public, max-age=86400"},
        )

    sources = history_sources(start)
    fires = mark_in_calendar(await detections_for_range(start, end, sources))
    compact = [[f["lat"], f["lon"], f["frp_mw"], f["date"], f["confidence"], f["in_calendar"]] for f in fires]
    in_cal_count = sum(1 for f in fires if f["in_calendar"] == 1)
    return JSONResponse(
        {
            "source": "NASA FIRMS — " + " + ".join(s.label for s in sources) + " (via NASA GIBS)",
            "attribution": ATTRIBUTION,
            "month": month,
            "count": len(compact),
            "in_calendar_count": in_cal_count,
            "fields": ["lat", "lon", "frp_mw", "date", "confidence", "in_calendar"],
            "fires": compact,
        },
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/fires/harmonized.csv")
async def export_harmonized_csv(
    south: float = Query(25.5, description="Latitud sur"),
    north: float = Query(31.8, description="Latitud norte"),
    west: float = Query(-109.5, description="Longitud oeste"),
    east: float = Query(-103.3, description="Longitud este"),
    start: str = Query("2002-07-04", pattern=r"^\d{4}-\d{2}-\d{2}$", description="Fecha inicio YYYY-MM-DD"),
    end: str = Query("2026-08-30", pattern=r"^\d{4}-\d{2}-\d{2}$", description="Fecha fin YYYY-MM-DD"),
    only_in_calendar: bool = Query(False, description="Solo filas con in_calendar == 1"),
):
    """Exporta un recorte espacial y temporal de `harmonized_hotspots.csv` (16 columnas)."""
    data = harmonized_csv_slice(south, north, west, east, start, end, only_in_calendar)
    if not data:
        raise HTTPException(404, "harmonized_hotspots.csv not found on server")
    return Response(
        content=data,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="harmonized_selection.csv"'},
    )


@router.get("/calendar")
async def real_calendar():
    """Calendario armonizado construido con detecciones reales (se completa en segundo plano)."""
    cal = load_real_calendar()
    if cal is None:
        # Aún sin datos: el sitio usa la serie ilustrativa y muestra el avance (0 %).
        return {"data_source": None, "coverage": 0.0}
    return cal
