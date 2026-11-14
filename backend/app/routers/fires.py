from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.services.harmonizer import HOTSPOTS_DATA, build_harmonized_calendar

router = APIRouter(prefix="/api/fires", tags=["fires"])


@router.get("/hotspots")
async def get_hotspots(
    origin: str = Query("Todos", description="Todos | Humano | Rayo | Forestal"),
):
    """Devuelve puntos calientes con razones explicables y alertas NOM-015."""
    if origin == "Todos":
        items = HOTSPOTS_DATA
    else:
        items = [h for h in HOTSPOTS_DATA if h["origin"].lower() == origin.lower()]

    return {"count": len(items), "origin_filter": origin, "hotspots": items}


@router.get("/calendar")
async def get_calendar(
    origin: str = Query("Total", description="Total | Humano | Natural"),
    start_year: int = Query(2000, ge=2000, le=2026),
    end_year: int = Query(2026, ge=2000, le=2026),
):
    """Devuelve el calendario armonizado MODIS -> VIIRS (2000-2026) y anomalía vs mediana."""
    return build_harmonized_calendar(
        origin=origin,
        start_year=start_year,
        end_year=end_year,
    )


@router.get("/export.csv")
async def export_hotspots_csv(
    origin: str = Query("Todos", description="Todos | Humano | Rayo | Forestal"),
):
    """Exporta los puntos calientes armonizados en formato CSV."""
    if origin == "Todos":
        items = HOTSPOTS_DATA
    else:
        items = [h for h in HOTSPOTS_DATA if h["origin"].lower() == origin.lower()]

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "municipio",
            "zona",
            "fecha_hora",
            "sensor_origen",
            "conteo_armonizado_km",
            "origen_probable",
            "probabilidad_pct",
            "frp_mw",
            "razones",
            "alerta_uso_irregular",
            "lat",
            "lon",
        ]
    )

    for item in items:
        writer.writerow(
            [
                item["id"],
                item["municipality"],
                item["zone"],
                item["timestamp"],
                item["sensor"],
                item["harmonized_count"],
                item["origin"],
                item["probability"],
                item["frp_mw"],
                " | ".join(item["reasons"]),
                item["irregular_use_reason"] or "No",
                item["lat"],
                item["lon"],
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=undefined-sierra-chihuahua-armonizado.csv"
        },
    )
