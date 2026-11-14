from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.fires import router as fires_router
from app.routers.iot import router as iot_router
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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(weather_router)
app.include_router(iot_router)
app.include_router(fires_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "undefined-backend"}
