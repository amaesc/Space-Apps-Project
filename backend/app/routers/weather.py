from fastapi import APIRouter, Query

from app.services.open_meteo import fetch_open_meteo_risk

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/risk")
async def get_weather_risk(
    lat: float = Query(27.97, description="Latitud del punto (por defecto Bocoyna, Chih.)"),
    lon: float = Query(-107.58, description="Longitud del punto"),
):
    """Devuelve condiciones meteorológicas y nivel de riesgo 1-5 vía Open-Meteo."""
    return await fetch_open_meteo_risk(lat, lon)
