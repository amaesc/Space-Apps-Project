from fastapi import APIRouter, HTTPException, Query

from app.services.open_meteo import WeatherUnavailable, fetch_open_meteo_risk, fetch_weather_grid

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/risk")
async def get_weather_risk(
    lat: float = Query(27.97, description="Latitud del punto (por defecto Bocoyna, Chih.)"),
    lon: float = Query(-107.58, description="Longitud del punto"),
):
    """Devuelve condiciones meteorológicas y nivel de riesgo 1-5 vía Open-Meteo."""
    try:
        return await fetch_open_meteo_risk(lat, lon)
    except WeatherUnavailable as exc:
        raise HTTPException(503, f"Weather unavailable: {exc}") from exc


@router.get("/grid")
async def get_weather_grid():
    """Cuadrícula de 0.5° sobre Chihuahua: temperatura, humedad, presión y riesgo de incendio (HDW)."""
    try:
        return await fetch_weather_grid()
    except WeatherUnavailable as exc:
        raise HTTPException(503, f"Weather unavailable: {exc}") from exc
