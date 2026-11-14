import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.routers.fires import router as fires_router
from app.routers.iot import router as iot_router
from app.routers.lite import router as lite_router
from app.routers.weather import router as weather_router

app = FastAPI(
    title="UNDEFINED API",
    description=(
        "Backend de armonización MODIS/VIIRS, telemetría IoT (ESP32), "
        "clima en vivo (Open-Meteo) y estimación probabilística de origen."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    # Orígenes extra (p. ej. GitHub Pages) separados por coma en ALLOWED_ORIGINS.
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        *[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()],
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Comprime JSON y HTML: importante para conexiones lentas.
app.add_middleware(GZipMiddleware, minimum_size=500)

app.include_router(weather_router)
app.include_router(lite_router)
app.include_router(iot_router)
app.include_router(fires_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "undefined-backend"}
