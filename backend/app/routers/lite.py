"""Modo ligero: una sola página HTML generada en el servidor.

Pensada para conexiones muy malas: sin JavaScript, sin fuentes web y sin imágenes
externas. El mapa es un SVG dibujado aquí mismo (contorno del estado + focos).
Pesa ~10 KB y se actualiza sola cada 5 minutos.
"""

from __future__ import annotations

import math
import os
from datetime import datetime, timezone
from html import escape
from zoneinfo import ZoneInfo

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.routers.iot import list_stations
from app.services.chihuahua_outline import CHIHUAHUA_OUTLINE
from app.services.hotspots import recent_hotspots

router = APIRouter(tags=["lite"])

LOCAL_TZ = ZoneInfo("America/Chihuahua")
FULL_DASHBOARD_URL = os.getenv("FULL_DASHBOARD_URL", "/")
LIST_MAX = 15  # focos numerados en la lista (los demás solo como puntos en el mapa)

HOTSPOT_COLOR = "#f97316"
RISK = {
    1: ("Low", "#16a34a", "#fff"),
    2: ("Moderate", "#2563eb", "#fff"),
    3: ("High", "#facc15", "#000"),
    4: ("Very high", "#f97316", "#000"),
    5: ("Extreme", "#dc2626", "#fff"),
}

# Proyección simple (equirectangular corregida por latitud) al viewBox del SVG.
_LONS = [p[0] for p in CHIHUAHUA_OUTLINE]
_LATS = [p[1] for p in CHIHUAHUA_OUTLINE]
_MIN_LON, _MAX_LON, _MIN_LAT, _MAX_LAT = min(_LONS), max(_LONS), min(_LATS), max(_LATS)
_KX = math.cos(math.radians((_MIN_LAT + _MAX_LAT) / 2))
_W = 300.0
_SCALE = _W / ((_MAX_LON - _MIN_LON) * _KX)
_H = (_MAX_LAT - _MIN_LAT) * _SCALE
_PAD = 8.0


def _xy(lon: float, lat: float) -> tuple[float, float]:
    return (
        _PAD + (lon - _MIN_LON) * _KX * _SCALE,
        _PAD + (_MAX_LAT - lat) * _SCALE,
    )


_OUTLINE_PATH = "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in (_xy(*p) for p in CHIHUAHUA_OUTLINE)) + "Z"


def _ago(ts: str, now: datetime) -> str:
    try:
        when = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return ""
    minutes = int((now - when).total_seconds() // 60)
    if minutes < 1:
        return "just now"
    if minutes < 60:
        return f"{minutes} min ago"
    if minutes < 48 * 60:
        return f"{minutes // 60} h {minutes % 60} min ago"
    return when.astimezone(LOCAL_TZ).strftime("%b %d, %H:%M")


def _svg(hotspots: list[dict], stations: list[dict], nasa: list[dict]) -> str:
    parts = [
        f'<svg viewBox="0 0 {_W + 2 * _PAD:.0f} {_H + 2 * _PAD:.0f}" role="img" '
        f'aria-label="Map of Chihuahua with {len(hotspots)} hotspots">',
        f'<path d="{_OUTLINE_PATH}" fill="#3a3a40" stroke="#9a9aa5" stroke-width="1"/>',
    ]
    # Detecciones NASA FIRMS (48 h): puntos rojos pequeños debajo de los focos numerados.
    for f in nasa:
        x, y = _xy(f["lon"], f["lat"])
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="#ff2a00" stroke="#ffe066" stroke-width="1"/>')
    for i, h in enumerate(hotspots, 1):
        x, y = _xy(h["lon"], h["lat"])
        parts.append(
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" fill="{HOTSPOT_COLOR}" stroke="#000" stroke-width="1.5"/>'
            f'<text x="{x:.1f}" y="{y + 3.5:.1f}" text-anchor="middle" font-size="9" font-weight="700">{i}</text>'
        )
    # Estaciones encima de los focos para que no queden tapadas.
    for s in stations:
        x, y = _xy(s["lon"], s["lat"])
        parts.append(
            f'<rect x="{x + 3:.1f}" y="{y - 11:.1f}" width="8" height="8" fill="#fff" stroke="#000"/>'
        )
    parts.append("</svg>")
    return "".join(parts)


CSS = (
    "body{margin:0;background:#2b2b2e;color:#f1f1f1;font:16px/1.45 system-ui,sans-serif}"
    "header{background:#8f1c1c;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px}"
    "header a{color:#fff;font-weight:600}"
    "main{max-width:640px;margin:auto;padding:12px}"
    "a{color:#f5c518}h1{font-size:20px;margin:0;color:#fff}"
    "h2{font-size:15px;margin:18px 0 0;padding:4px 8px;background:#34495e;text-transform:uppercase;letter-spacing:.04em}"
    ".b{display:inline-block;padding:1px 8px;border-radius:3px;font-weight:700}"
    ".s{color:#bdbdc4;font-size:14px}"
    "ol,ul{margin:0;padding:0;list-style:none;background:#1f1f22}"
    "li{display:flex;gap:10px;align-items:center;padding:8px;border-bottom:1px solid #3a3a40}"
    ".n{flex:none;width:24px;height:24px;border-radius:50%;color:#000;font-weight:700;"
    "font-size:13px;display:flex;align-items:center;justify-content:center}"
    ".g{flex:1;min-width:0}.go{flex:none;background:#f5c518;color:#000;border-radius:3px;padding:6px 12px;"
    "text-decoration:none;font-weight:700}"
    "svg{width:100%;height:auto;margin-top:10px;background:#1f1f22}"
    ".w{background:#3d3410;color:#f5c518;padding:6px 10px;border-radius:3px;font-size:14px}"
)


@router.get("/lite", response_class=HTMLResponse)
async def lite_page() -> HTMLResponse:
    now = datetime.now(timezone.utc)
    stations = (await list_stations())["stations"]
    try:
        nasa = await recent_hotspots(2, "Chihuahua")  # la página ligera dibuja solo Chihuahua
        nasa_ok = True
    except Exception:  # noqa: BLE001 - la página ligera nunca debe fallar por la NASA
        nasa, nasa_ok = [], False
    hotspots = nasa[:LIST_MAX]

    level = max((int(s.get("risk_level", 1)) for s in stations), default=None)
    risk_label, risk_bg, risk_fg = RISK[level] if level else ("no station data", "#555", "#fff")
    updated = now.astimezone(LOCAL_TZ).strftime("%H:%M")

    items = []
    for i, h in enumerate(hotspots, 1):
        items.append(
            f'<li><span class="n" style="background:{HOTSPOT_COLOR}">{i}</span>'
            f'<span class="g"><b>{h["lat"]:.3f}, {h["lon"]:.3f}</b> · {escape(h["sensor"])}<br>'
            f'<span class="s">{_ago(h["timestamp"], now)} · confidence {escape(str(h["confidence"]))} · '
            f'FRP {h["frp_mw"]} MW</span></span>'
            f'<a class="go" href="https://www.google.com/maps/dir/?api=1&amp;destination={h["lat"]},{h["lon"]}">Go</a></li>'
        )
    if not items:
        items.append('<li><span class="g s">' + ("No NASA detections in Chihuahua in the last 48 h."
                     if nasa_ok else "NASA detections unavailable right now.") + "</span></li>")

    station_items = []
    for s in stations:
        lbl, bg, fg = RISK[int(s.get("risk_level", 1))]
        src = "satellite/weather backup" if s.get("fallback_active") else "field sensor"
        station_items.append(
            f'<li><span class="g"><b>{escape(s["name"])}</b> '
            f'<span class="b" style="background:{bg};color:{fg}">{lbl}</span><br>'
            f'<span class="s">{s["temperature_c"]} °C · {s["humidity_pct"]}% RH · '
            f'{s["wind_kmh"]} km/h wind · {s.get("lightning_strikes", 0)} strikes · '
            f'{_ago(str(s.get("timestamp", "")), now)} · {src}</span></span></li>'
        )

    if not station_items:
        station_items.append('<li><span class="g s">No field station readings yet.</span></li>')

    html = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta http-equiv="refresh" content="300">'
        "<title>FuegoData Lite — Sierra de Chihuahua</title>"
        f"<style>{CSS}</style></head><body>"
        f'<header><h1>FuegoData <span style="font-weight:400;font-size:15px">Lite</span></h1>'
        f'<a href="{escape(FULL_DASHBOARD_URL)}">Full fire map</a></header><main>'
        f'<p>Fire danger <span class="b" style="background:{risk_bg};color:{risk_fg}">{risk_label}</span>'
        f' · <b>{len(nasa)}</b> NASA detections (48 h) · updated {updated}</p>'
        f"{_svg(hotspots, stations, nasa)}"
        f'<p class="s">Numbers match the list (the {len(hotspots)} most recent). ■ = field station. '
        f'<span style="color:#ff6b4a">●</span> = NASA satellite fire detection, last 48 h ({len(nasa)}).</p>'
        f"<h2>Recent NASA detections</h2><ol>{''.join(items)}</ol>"
        f"<h2>Field stations</h2><ul>{''.join(station_items)}</ul>"
        '<p class="s">The cause of each detection (human, lightning, wildland) is not determined. '
        "NASA detections arrive up to ~3 h after the satellite pass. "
        "We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource "
        "Management System (FIRMS). Weather: Open-Meteo. Map outline © OpenStreetMap. "
        "Auto-refreshes every 5 min.</p>"
        "</main></body></html>"
    )
    return HTMLResponse(html, headers={"Cache-Control": "public, max-age=60"})
