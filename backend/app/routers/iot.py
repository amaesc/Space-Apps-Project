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
    wind_kmh: float = Field(default=0.0, ge=0, le=200)
    rain_mm: float = Field(default=0.0, ge=0, le=500)
    lightning_strikes: int = Field(default=0, ge=0, le=10000)
    battery_v: float = Field(default=4.1, ge=0, le=24)
    # Métricas opcionales (las estacas antiguas pueden no enviarlas).
    pressure_hpa: float | None = Field(default=None, ge=300, le=1100)
    noise_db: float | None = Field(default=None, ge=0, le=140)
    rssi_dbm: int | None = Field(default=None, ge=-140, le=0, description="Intensidad de señal WiFi/LoRa")
    link_type: str | None = Field(default=None, pattern="^(wifi|lora|cellular)$")


def _seed_stations() -> dict[str, dict[str, Any]]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "ESP32-CHIH-04": {
            "station_id": "ESP32-CHIH-04",
            "name": "Bocoyna · San Juanito",
            "lat": 27.97,
            "lon": -107.58,
            "temperature_c": 27.4,
            "humidity_pct": 22.0,
            "wind_kmh": 24.5,
            "rain_mm": 0.0,
            "lightning_strikes": 0,
            "battery_v": 4.12,
            "pressure_hpa": 781.4,
            "noise_db": 38.0,
            "rssi_dbm": -67,
            "link_type": "wifi",
            "hdw_score": 68.1,
            "risk_level": 4,
            "risk_label": "Muy Alto",
            "source": "esp32-field",
            "timestamp": now,
        },
        "ESP32-CHIH-07": {
            "station_id": "ESP32-CHIH-07",
            "name": "Guachochi · Sinforosa",
            "lat": 26.82,
            "lon": -107.07,
            "temperature_c": 22.8,
            "humidity_pct": 41.0,
            "wind_kmh": 14.0,
            "rain_mm": 0.0,
            "lightning_strikes": 3,
            "battery_v": 3.98,
            "pressure_hpa": 802.9,
            "noise_db": 44.0,
            "rssi_dbm": -98,
            "link_type": "lora",
            "hdw_score": 41.3,
            "risk_level": 2,
            "risk_label": "Moderado",
            "source": "esp32-field",
            "timestamp": now,
        },
    }


def _load_stations() -> dict[str, dict[str, Any]]:
    if is_db_configured():
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT ON (station_id)
                    station_id, name, lat, lon, temperature_c, humidity_pct,
                    wind_kmh, rain_mm, lightning_strikes, battery_v,
                    pressure_hpa, noise_db, rssi_dbm, link_type,
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

    if not DATA_FILE.exists():
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        seeded = _seed_stations()
        DATA_FILE.write_text(json.dumps(seeded, indent=2, ensure_ascii=False))
        return seeded
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return _seed_stations()


def _save_reading(record: dict[str, Any]) -> None:
    if is_db_configured():
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO iot_readings (
                    station_id, name, lat, lon, temperature_c, humidity_pct,
                    wind_kmh, rain_mm, lightning_strikes, battery_v,
                    pressure_hpa, noise_db, rssi_dbm, link_type,
                    hdw_score, risk_level, risk_label, source
                ) VALUES (
                    %(station_id)s, %(name)s, %(lat)s, %(lon)s, %(temperature_c)s,
                    %(humidity_pct)s, %(wind_kmh)s, %(rain_mm)s,
                    %(lightning_strikes)s, %(battery_v)s,
                    %(pressure_hpa)s, %(noise_db)s, %(rssi_dbm)s, %(link_type)s,
                    %(hdw_score)s,
                    %(risk_level)s, %(risk_label)s, %(source)s
                )
                """,
                record,
            )
            conn.commit()
        return

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

    return {"ok": True, "station": record}


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
            fallback = await fetch_open_meteo_risk(entry["lat"], entry["lon"])
            entry["fallback_active"] = True
            entry["fallback_weather"] = fallback
        else:
            entry["fallback_active"] = False

        result.append(entry)

    return {"count": len(result), "stations": result}
