import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.routers.fires import router as fires_router
from app.services.calendar_builder import backfill_loop
from app.routers.iot import router as iot_router
from app.routers.lite import router as lite_router
from app.routers.model import router as model_router
from app.routers.nasa import router as nasa_router
from app.routers.weather import router as weather_router

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Construye el calendario real (NASA FIRMS vía GIBS) en segundo plano.
    # Solo en el servidor de la Raspberry Pi: CALENDAR_BACKFILL=1 en backend/.env
    task = asyncio.create_task(backfill_loop()) if os.getenv("CALENDAR_BACKFILL") == "1" else None
    yield
    if task:
        task.cancel()


app = FastAPI(
    lifespan=lifespan,
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
        "https://firedata.space",
        "https://www.firedata.space",
        "https://firedata.earth",
        "https://www.firedata.earth",
        "https://amaesc.github.io",
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
app.include_router(nasa_router)
app.include_router(model_router)
app.include_router(iot_router)
app.include_router(fires_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "undefined-backend"}
