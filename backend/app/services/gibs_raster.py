"""Valores numéricos de capas raster de NASA GIBS en puntos (NDVI, temperatura de superficie).

GIBS sirve imágenes coloreadas; su tabla de colores (colormap XML) dice qué valor
corresponde a cada color. Se pide una sola imagen WMS de la caja de Chihuahua, se lee
el color en cada punto (mediana de una ventana 3×3 para tolerar nubes/bordes) y se
convierte a valor. Si un día está nublado, se completa con días anteriores.
"""

from __future__ import annotations

import asyncio
import io
import re
import time
from datetime import date, timedelta
from statistics import median
from typing import Any

import httpx
from PIL import Image

WMS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
COLORMAPS = "https://gibs.earthdata.nasa.gov/colormaps/v1.3/{name}.xml"
BBOX = (-109.2, 25.4, -103.2, 31.9)  # lon_min, lat_min, lon_max, lat_max (Chihuahua)
SIZE = (480, 520)

_colormaps: dict[str, dict[tuple[int, int, int], float | None]] = {}
_cache: dict[str, tuple[float, list[float | None]]] = {}
_TTL_S = 6 * 3600


async def _colormap(client: httpx.AsyncClient, name: str) -> dict[tuple[int, int, int], float | None]:
    if name not in _colormaps:
        xml = (await client.get(COLORMAPS.format(name=name))).text
        table: dict[tuple[int, int, int], float | None] = {}
        for attrs in re.findall(r"<ColorMapEntry([^>]*)/>", xml):
            rgb = tuple(int(c) for c in re.search(r'rgb="([^"]+)"', attrs).group(1).split(","))
            val = re.search(r'value="\[([^,]+),([^)\]]+)', attrs)
            if 'nodata="true"' in attrs or 'transparent="true"' in attrs or not val:
                table[rgb] = None
            else:
                table[rgb] = (float(val.group(1)) + float(val.group(2))) / 2
        _colormaps[name] = table
    return _colormaps[name]


def _lookup(table: dict[tuple[int, int, int], float | None], rgb: tuple[int, int, int]) -> float | None:
    if rgb in table:
        return table[rgb]
    best, dist = None, 1e9
    for k, v in table.items():
        d = (k[0] - rgb[0]) ** 2 + (k[1] - rgb[1]) ** 2 + (k[2] - rgb[2]) ** 2
        if d < dist:
            best, dist = v, d
    return best if dist <= 300 else None


async def _sample_day(
    client: httpx.AsyncClient, layer: str, colormap: str, day: date, points: list[tuple[float, float]]
) -> list[float | None]:
    params = {
        "SERVICE": "WMS", "VERSION": "1.3.0", "REQUEST": "GetMap", "LAYERS": layer, "CRS": "EPSG:4326",
        "BBOX": f"{BBOX[1]},{BBOX[0]},{BBOX[3]},{BBOX[2]}", "WIDTH": SIZE[0], "HEIGHT": SIZE[1],
        "FORMAT": "image/png", "TRANSPARENT": "TRUE", "TIME": day.isoformat(),
    }
    res = await client.get(WMS, params=params)
    res.raise_for_status()
    img = Image.open(io.BytesIO(res.content)).convert("RGBA")
    px = img.load()
    table = await _colormap(client, colormap)
    out: list[float | None] = []
    for lat, lon in points:
        x = int((lon - BBOX[0]) / (BBOX[2] - BBOX[0]) * SIZE[0])
        y = int((BBOX[3] - lat) / (BBOX[3] - BBOX[1]) * SIZE[1])
        vals = []
        for dx in (-3, 0, 3):
            for dy in (-3, 0, 3):
                xx, yy = min(max(x + dx, 0), SIZE[0] - 1), min(max(y + dy, 0), SIZE[1] - 1)
                r, g, b, a = px[xx, yy]
                if a > 0:
                    v = _lookup(table, (r, g, b))
                    if v is not None:
                        vals.append(v)
        out.append(median(vals) if vals else None)
    return out


async def sample_layer(
    layer: str, colormap: str, points: list[tuple[float, float]], lookback_days: int = 4, start_offset: int = 1
) -> list[float | None]:
    """Valor por punto, completando huecos (nubes) con hasta `lookback_days` días anteriores."""
    key = f"{layer}:{len(points)}"
    cached = _cache.get(key)
    if cached and time.time() - cached[0] < _TTL_S:
        return cached[1]
    values: list[float | None] = [None] * len(points)
    async with httpx.AsyncClient(timeout=30.0) as client:
        for back in range(start_offset, start_offset + lookback_days):
            day = date.today() - timedelta(days=back)
            try:
                day_vals = await _sample_day(client, layer, colormap, day, points)
            except (httpx.HTTPError, OSError):
                continue
            values = [v if v is not None else d for v, d in zip(values, day_vals)]
            if all(v is not None for v in values):
                break
    _cache[key] = (time.time(), values)
    return values


async def ndvi_and_lst(points: list[tuple[float, float]]) -> dict[str, Any]:
    """NDVI (VIIRS NOAA-20, 8 días) y temperatura de superficie diurna (°C, MODIS Terra)."""
    ndvi, lst_k = await asyncio.gather(
        sample_layer("VIIRS_NOAA20_NDVI_8Day", "MODIS_NDVI", points, lookback_days=10),
        sample_layer("MODIS_Terra_Land_Surface_Temp_Day", "MODIS_Land_Surface_Temp", points, lookback_days=4),
    )
    lst_c = [round(k - 273.15, 1) if k is not None else None for k in lst_k]
    return {"ndvi": [round(v, 3) if v is not None else None for v in ndvi], "lst_c": lst_c}
