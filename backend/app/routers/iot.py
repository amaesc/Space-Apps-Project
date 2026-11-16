from __future__ import annotations

import json
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.db import get_conn, is_db_configured
from app.services.open_meteo import (
    WeatherUnavailable,
    compute_fire_risk_level,
    fetch_open_meteo_risk,
)

router = APIRouter(prefix="/api/iot", tags=["iot"])

DATA_FILE = Path(__file__).resolve().parents[2] / "data" / "iot_readings.json"


class TelemetryIn(BaseModel):
    station_id: str = Field(..., min_length=2, max_length=64, examples=["ESP32-CHIH-04"])
    name: str = Field(default="Estación Sierra de Chihuahua", max_length=120)
    lat: float = Field(default=27.97, ge=-90, le=90)
    lon: float = Field(default=-107.58, ge=-180, le=180)
    temperature_c: float = Field(..., ge=-40, le=70)
    humidity_pct: float = Field(..., ge=0, le=100)
    luminosity_pct: float = Field(default=0.0, ge=0, le=100)
    wind_kmh: float = Field(default=0.0, ge=0, le=200)
    rain_mm: float = Field(default=0.0, ge=0, le=500)
    lightning_strikes: int = Field(default=0, ge=0, le=10000)
    battery_v: float = Field(default=4.1, ge=0, le=24)
    # Métricas opcionales (las estacas antiguas pueden no enviarlas).
    pressure_hpa: float | None = Field(default=None, ge=300, le=1100)
    noise_db: float | None = Field(default=None, ge=0, le=140)
    rssi_dbm: int | None = Field(default=None, ge=-140, le=0, description="Intensidad de señal WiFi/LoRa")
    link_type: str | None = Field(default=None, pattern="^(wifi|lora|cellular)$")
    flame_detected: bool = Field(default=False)
    flame_intensity_pct: float = Field(default=0.0, ge=0, le=100)


def _load_stations() -> dict[str, dict[str, Any]]:
    if is_db_configured():
        try:
            with get_conn() as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT DISTINCT ON (station_id)
                        station_id, name, lat, lon, temperature_c, humidity_pct,
                        wind_kmh, rain_mm, lightning_strikes, battery_v,
                        pressure_hpa, noise_db, rssi_dbm, link_type, luminosity_pct,
                        hdw_score, risk_level, risk_label, source,
                        recorded_at AS timestamp
                    FROM iot_readings
                    ORDER BY station_id, recorded_at DESC
                    """
                )
                rows = cur.fetchall()
                out: dict[str, dict[str, Any]] = {}
                for row in rows:
                    item = dict(row)
                    if hasattr(item.get("timestamp"), "isoformat"):
                        item["timestamp"] = item["timestamp"].isoformat()
                    out[item["station_id"]] = item
                return out
        except Exception as exc:
            print(f"[iot] PostgreSQL no disponible ({exc}); usando fallback JSON.")

    # Sin base de datos: solo las lecturas que las estacas hayan enviado (nada inventado si no hay ninguna).
    if not DATA_FILE.exists():
        return {}
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(f"[iot] {DATA_FILE} ilegible ({exc}); sin estaciones.")
        return {}


def _save_reading(record: dict[str, Any]) -> None:
    if is_db_configured():
        try:
            with get_conn() as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO iot_readings (
                        station_id, name, lat, lon, temperature_c, humidity_pct,
                        wind_kmh, rain_mm, lightning_strikes, battery_v,
                        pressure_hpa, noise_db, rssi_dbm, link_type, luminosity_pct,
                        hdw_score, risk_level, risk_label, source
                    ) VALUES (
                        %(station_id)s, %(name)s, %(lat)s, %(lon)s, %(temperature_c)s,
                        %(humidity_pct)s, %(wind_kmh)s, %(rain_mm)s,
                        %(lightning_strikes)s, %(battery_v)s,
                        %(pressure_hpa)s, %(noise_db)s, %(rssi_dbm)s, %(link_type)s,
                        %(luminosity_pct)s, %(hdw_score)s, %(risk_level)s, %(risk_label)s, %(source)s
                    )
                    """,
                    record,
                )
                conn.commit()
            return
        except Exception as exc:
            print(f"[iot] PostgreSQL no disponible ({exc}); guardando en JSON.")

    stations = _load_stations()
    stations[record["station_id"]] = record
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(json.dumps(stations, indent=2, ensure_ascii=False))


# Si STATION_TOKEN está definido, la estaca debe enviarlo en el header X-Station-Token.
# Evita que cualquiera en internet registre lecturas falsas cuando la API es pública.
STATION_TOKEN = os.getenv("STATION_TOKEN", "")


@router.post("/telemetry")
async def ingest_telemetry(
    payload: TelemetryIn,
    x_station_token: str | None = Header(default=None),
):
    """Recibe una lectura de campo desde una estación ESP32 (WiFi / LoRa)."""
    if STATION_TOKEN and not secrets.compare_digest(x_station_token or "", STATION_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid station token")
    level, label, hdw_score = compute_fire_risk_level(
        payload.temperature_c,
        payload.humidity_pct,
        payload.wind_kmh,
        payload.rain_mm,
    )

    record = {
        **payload.model_dump(),
        "hdw_score": hdw_score,
        "risk_level": level,
        "risk_label": label,
        "source": "esp32-field",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    _save_reading(record)

    # Nivel del modelo predictivo (72 h) en la celda de la estaca, para encender sus 5 LEDs.
    model_risk = None
    try:
        from app.services import fire_model

        model_risk = await fire_model.station_risk({**record, "fallback_active": False})
    except Exception as exc:  # noqa: BLE001 - la lectura ya se guardó; el modelo es opcional
        print(f"[iot] modelo no disponible: {exc}")

    return {"ok": True, "station": record, "model_risk": model_risk}


@router.get("/stations")
async def list_stations():
    """Lista todas las estaciones IoT; activa fallback Open-Meteo si alguna lectura supera 15 min."""
    stations = _load_stations()
    now = datetime.now(timezone.utc)
    result = []

    for station in stations.values():
        entry = dict(station)
        try:
            ts = datetime.fromisoformat(entry["timestamp"])
            age_minutes = (now - ts).total_seconds() / 60.0
        except Exception:
            age_minutes = 999.0

        if age_minutes > 15.0:
            entry["fallback_active"] = True
            try:
                entry["fallback_weather"] = await fetch_open_meteo_risk(entry["lat"], entry["lon"])
            except WeatherUnavailable as exc:  # sin respaldo disponible: se dice, no se inventa
                entry["fallback_weather"] = None
                entry["fallback_error"] = str(exc)
        else:
            entry["fallback_active"] = False

        result.append(entry)

    return {"count": len(result), "stations": result}
