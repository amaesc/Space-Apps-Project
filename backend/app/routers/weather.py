from fastapi import APIRouter, Query

from app.services.open_meteo import fetch_open_meteo_risk, fetch_weather_grid

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/risk")
async def get_weather_risk(
    lat: float = Query(27.97, description="Latitud del punto (por defecto Bocoyna, Chih.)"),
    lon: float = Query(-107.58, description="Longitud del punto"),
):
    """Devuelve condiciones meteorológicas y nivel de riesgo 1-5 vía Open-Meteo."""
    return await fetch_open_meteo_risk(lat, lon)


@router.get("/grid")
async def get_weather_grid():
    """Cuadrícula de 0.5° sobre Chihuahua: temperatura, humedad, presión y riesgo de incendio (HDW)."""
    return await fetch_weather_grid()
