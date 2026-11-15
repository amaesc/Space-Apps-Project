"""Focos recientes REALES: detecciones NASA FIRMS VIIRS (NOAA-20 + NOAA-21) de las últimas horas, por estado.

Sustituye a la lista de demostración que había en harmonizer.py. No se asigna origen (humano / rayo / forestal),
probabilidad, razones ni alerta NOM-015: ningún dato del sistema los calcula todavía, así que el origen es
"Indeterminado" y esos campos van vacíos.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from app.services.nasa_fires import VIIRS_N20, VIIRS_N21, detections_for_range

ORIGIN_UNKNOWN = "Indeterminado"


def _iso_utc(day: str, hhmm: Any) -> str:
    t = str(hhmm or "").replace(":", "").zfill(4)
    return f"{day}T{t[:2]}:{t[2:4]}:00Z" if t[:4].isdigit() else f"{day}T00:00:00Z"


def to_hotspot(f: dict[str, Any]) -> dict[str, Any]:
    ts = _iso_utc(f["date"], f.get("time"))
    sat = str(f.get("satellite") or "")
    return {
        "id": f"{sat.replace(' ', '')}-{ts}-{f['lat']:.4f}-{f['lon']:.4f}",
        "state": f.get("region"),
        "municipality": None,  # sin capa municipal en el backend
        "zone": None,
        "timestamp": ts,
        "sensor": f"{sat} (375 m)",
        "confidence": f.get("confidence"),
        "daynight": f.get("daynight"),
        "origin": ORIGIN_UNKNOWN,
        "probability": None,
        "frp_mw": f.get("frp_mw"),
        "lat": f["lat"],
        "lon": f["lon"],
        "reasons": [],
        "irregular_use_alert": False,
        "irregular_use_reason": None,
    }


async def recent_hotspots(days: int = 2, region: str = "*") -> list[dict[str, Any]]:
    """Detecciones de los últimos `days` días (incluido hoy), más recientes primero; region "*" = México."""
    end = date.today()
    fires = await detections_for_range(end - timedelta(days=days - 1), end, (VIIRS_N20, VIIRS_N21))
    if region != "*":
        fires = [f for f in fires if f.get("region") == region]
    out = [to_hotspot(f) for f in fires]
    out.sort(key=lambda h: h["timestamp"], reverse=True)
    return out
