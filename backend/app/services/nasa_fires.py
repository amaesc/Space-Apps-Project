"""Detecciones de incendios de NASA FIRMS vía NASA GIBS (sin clave de API).

GIBS publica las anomalías térmicas de FIRMS como vector tiles diarias.
En EPSG:4326, nivel 4, cada tile cubre 18°: México cabe en 5 tiles (calculadas
de los contornos estatales). Se descargan, se decodifican, se quitan duplicados
entre tiles y cada punto recibe su estado INEGI (`region`); fuera de México se descarta.

Fuentes:
- VIIRS S-NPP (375 m) desde 2012-01-20: la serie armonizada (calibrada contra Aqua)
- VIIRS NOAA-20 (375 m) desde 2020-01-01
- VIIRS NOAA-21 (375 m) desde 2024-01-17
- MODIS Terra+Aqua (1 km) desde 2002-07-04 (archivo "Standard" en los años
  antiguos; se descartan volcanes y fuentes fijas con TYPE != 0)

Días pasados se guardan en disco (no cambian); hoy y ayer se refrescan cada 30 min.
"""

from __future__ import annotations

import asyncio
import csv
import gzip
import io
import json
import math
import os
import sqlite3
import time
from functools import lru_cache
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import httpx
import mapbox_vector_tile

from app.services.chihuahua_outline import CHIHUAHUA_OUTLINE
from app.services.mexico_states import _states, state_of


@dataclass(frozen=True)
class FireSource:
    key: str
    layer: str
    matrix_set: str
    first_day: date
    label: str


VIIRS_SNPP = FireSource("viirs_snpp", "VIIRS_SNPP_Thermal_Anomalies_375m_All", "500m", date(2012, 1, 20), "VIIRS S-NPP")
VIIRS_N20 = FireSource("viirs_n20", "VIIRS_NOAA20_Thermal_Anomalies_375m_All", "500m", date(2020, 1, 1), "VIIRS NOAA-20")
VIIRS_N21 = FireSource("viirs_n21", "VIIRS_NOAA21_Thermal_Anomalies_375m_All", "500m", date(2024, 1, 17), "VIIRS NOAA-21")
MODIS = FireSource("modis", "MODIS_Combined_Thermal_Anomalies_All", "1km", date(2002, 7, 4), "MODIS Terra/Aqua")
SOURCES = {s.key: s for s in (VIIRS_SNPP, VIIRS_N20, VIIRS_N21, MODIS)}

TILE_DEG = 18.0  # nivel 4 de EPSG:4326


def _tiles() -> tuple[tuple[int, int], ...]:
    """(fila, columna) de las tiles de nivel 4 que tocan el bbox de algún estado."""
    out = set()
    for st in _states():
        w, s, e, n = st.bbox
        for row in range(int((90 - n) // TILE_DEG), int((90 - s) // TILE_DEG) + 1):
            for col in range(int((w + 180) // TILE_DEG), int((e + 180) // TILE_DEG) + 1):
                out.add((row, col))
    return tuple(sorted(out))


TILES = _tiles()
# Caché por día: carpeta nueva porque la anterior (`nasa_fires/`) solo tenía puntos dentro de Chihuahua.
CACHE_DIR = Path(__file__).resolve().parents[2] / "data" / "nasa_fires_mx"
_RECENT_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_RECENT_TTL_S = 30 * 60

_LONS = [p[0] for p in CHIHUAHUA_OUTLINE]
_LATS = [p[1] for p in CHIHUAHUA_OUTLINE]
BBOX = (min(_LONS), min(_LATS), max(_LONS), max(_LATS))


def inside_chihuahua(lon: float, lat: float) -> bool:
    """Punto en polígono (ray casting) contra el contorno simplificado del estado."""
    if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
        return False
    inside = False
    pts = CHIHUAHUA_OUTLINE
    j = len(pts) - 1
    for i in range(len(pts)):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def _confidence(raw: Any) -> str:
    """VIIRS ya trae low/nominal/high; MODIS trae 0-100 (clases FIRMS: <30, 30-79, ≥80)."""
    if isinstance(raw, str):
        return {"l": "low", "n": "nominal", "h": "high"}.get(raw[:1].lower(), raw)
    if isinstance(raw, (int, float)):
        return "low" if raw < 30 else "nominal" if raw < 80 else "high"
    return "nominal"


def _decode(raw: bytes, source: FireSource) -> list[dict[str, Any]]:
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    out = []
    for layer in mapbox_vector_tile.decode(raw).values():
        for feat in layer["features"]:
            p = feat["properties"]
            lat, lon = p.get("LATITUDE"), p.get("LONGITUDE")
            if lat is None or lon is None:
                continue
            if p.get("TYPE", 0) not in (0, None):  # MODIS: volcán / fuente fija / costa afuera
                continue
            region = state_of(lon, lat)
            if region is None:  # fuera de México
                continue
            sat = p.get("SATELLITE")
            out.append(
                {
                    "lat": round(lat, 4),
                    "lon": round(lon, 4),
                    "frp_mw": p.get("FRP"),
                    "confidence": _confidence(p.get("CONFIDENCE")),
                    "date": p.get("ACQ_DATE"),
                    "time": p.get("ACQ_TIME"),
                    "daynight": p.get("DAYNIGHT"),
                    "satellite": f"MODIS {sat}" if source is MODIS else source.label,
                    "region": region,
                }
            )
    return out


async def _fetch_day(client: httpx.AsyncClient, source: FireSource, day: date) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []
    for row, col in TILES:
        url = (
            f"https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{source.layer}/default/"
            f"{day.isoformat()}/{source.matrix_set}/4/{row}/{col}.mvt"
        )
        res = await client.get(url)
        if res.status_code == 404:  # sin datos ese día / tile
            continue
        res.raise_for_status()
        points.extend(_decode(res.content, source))
    # Las tiles vectoriales traen un margen: un punto cerca del borde aparece en dos tiles (~18 % en un día
    # nacional). Se conserva una sola copia por (lat, lon, fecha, hora, satélite).
    seen: set[tuple[Any, ...]] = set()
    unique = []
    for pt in points:
        k = (pt["lat"], pt["lon"], pt["date"], pt["time"], pt["satellite"])
        if k not in seen:
            seen.add(k)
            unique.append(pt)
    return unique


async def detections_for_day(client: httpx.AsyncClient, source: FireSource, day: date) -> list[dict[str, Any]]:
    """Detecciones de un día y una fuente dentro de Chihuahua (con caché)."""
    if day < source.first_day or day > date.today():
        return []
    key = f"{source.key}/{day.isoformat()}"
    if day >= date.today() - timedelta(days=1):
        cached = _RECENT_CACHE.get(key)
        if cached and time.time() - cached[0] < _RECENT_TTL_S:
            return cached[1]
        pts = await _fetch_day(client, source, day)
        _RECENT_CACHE[key] = (time.time(), pts)
        return pts

    path = CACHE_DIR / source.key / f"{day.isoformat()}.json"
    if path.exists():
        return json.loads(path.read_text())
    pts = await _fetch_day(client, source, day)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(pts))
    return pts


def is_cached(source: FireSource, day: date) -> bool:
    return (CACHE_DIR / source.key / f"{day.isoformat()}.json").exists()


async def detections_for_range(
    start: date, end: date, sources: tuple[FireSource, ...], concurrency: int = 4
) -> list[dict[str, Any]]:
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    sem = asyncio.Semaphore(concurrency)
    async with httpx.AsyncClient(timeout=30.0) as client:

        async def one(src: FireSource, d: date) -> list[dict[str, Any]]:
            async with sem:
                try:
                    return await detections_for_day(client, src, d)
                except httpx.HTTPError:
                    return []

        chunks = await asyncio.gather(*(one(s, d) for s in sources for d in days))
    return [p for chunk in chunks for p in chunk]


def history_sources(month_start: date) -> tuple[FireSource, ...]:
    """Fuente(s) del histórico para un mes, igual que la serie armonizada: MODIS (Aqua) hasta el 2012-01-19,
    VIIRS S-NPP desde el 2012-01-20 (enero 2012 necesita ambas). NOAA-20/21 no entran: sumarían saltos en 2018/2023
    y el umbral está calibrado para S-NPP."""
    if month_start >= VIIRS_SNPP.first_day.replace(day=1) + timedelta(days=31):
        return (VIIRS_SNPP,)
    if month_start >= VIIRS_SNPP.first_day.replace(day=1):
        return (MODIS, VIIRS_SNPP)
    return (MODIS,)


SEAM_DATE = "2012-01-20"
CELL_KM = 1.4
FRP_THRESHOLD_MW = 15.0  # respaldo si una región no tiene umbral calibrado
PILOT_REGION = "Chihuahua"  # región piloto de los modelos de pronóstico (entrenados solo ahí)
THRESHOLDS_JSON = Path(__file__).resolve().parents[3] / "harmonization" / "calibration" / "thresholds.json"


# ---- Rejilla en km: Mexico ITRF2008 / LCC (EPSG:6372), igual que build_harmonized_dataset.py --grid lcc ----
# Lambert Conformal Conic 2SP (EPSG 9802) sobre GRS80, fórmulas de Snyder (1987); sin dependencia de pyproj.
_A, _F = 6378137.0, 1 / 298.257222101
_E = math.sqrt(_F * (2 - _F))
_LAT0, _LON0, _LAT1, _LAT2 = (math.radians(v) for v in (12.0, -102.0, 17.5, 29.5))
_FE, _FN = 2500000.0, 0.0


def _lcc_m(phi: float) -> float:
    return math.cos(phi) / math.sqrt(1 - (_E * math.sin(phi)) ** 2)


def _lcc_t(phi: float) -> float:
    es = _E * math.sin(phi)
    return math.tan(math.pi / 4 - phi / 2) / ((1 - es) / (1 + es)) ** (_E / 2)


_N = (math.log(_lcc_m(_LAT1)) - math.log(_lcc_m(_LAT2))) / (math.log(_lcc_t(_LAT1)) - math.log(_lcc_t(_LAT2)))
_FC = _lcc_m(_LAT1) / (_N * _lcc_t(_LAT1) ** _N)
_R0 = _A * _FC * _lcc_t(_LAT0) ** _N


def lcc_km(lon: float, lat: float) -> tuple[float, float]:
    """Lon/lat WGS84 -> (x, y) en km de EPSG:6372 (ITRF2008 y WGS84 difieren < 1 m: irrelevante a 1.4 km)."""
    r = _A * _FC * _lcc_t(math.radians(lat)) ** _N
    theta = _N * (math.radians(lon) - _LON0)
    return (_FE + r * math.sin(theta)) / 1000.0, (_FN + _R0 - r * math.cos(theta)) / 1000.0


_THRESHOLDS: dict[str, float] | None = None


def region_thresholds() -> dict[str, float]:
    """Umbral T* (MW) por región de `calibrate_threshold.py` (thresholds.json); vacío si aún no se ha calibrado."""
    global _THRESHOLDS
    if _THRESHOLDS is None:
        try:
            _THRESHOLDS = {k: float(v) for k, v in json.loads(THRESHOLDS_JSON.read_text(encoding="utf-8")).items()}
        except (OSError, ValueError):
            _THRESHOLDS = {}
    return _THRESHOLDS


def _time_to_mins(raw_time: Any) -> int:
    if raw_time is None:
        return 0
    s = str(raw_time).strip().replace(":", "").zfill(4)
    if len(s) >= 4 and s[:4].isdigit():
        return int(s[:2]) * 60 + int(s[2:4])
    return 0


def mark_in_calendar(
    fires: list[dict[str, Any]], thresholds: dict[str, float] | None = None
) -> list[dict[str, Any]]:
    """Marca cada detección con `in_calendar` (1 ó 0) según `harmonization/build_harmonized_dataset.py`.

    - MODIS: solo Aqua de confianza nominal/alta antes del 2012-01-20 (excluye Terra 10:30 y Aqua posterior).
    - VIIRS / desde 2012-01-20: agrupa píxeles de confianza nominal/alta en celdas de 1.4 km (rejilla EPSG:6372)
      × 30 min; si la suma de FRP alcanza el umbral de la región de su píxel más fuerte (thresholds.json, o
      FRP_THRESHOLD_MW si no hay), conserva únicamente ese píxel como `in_calendar = 1`.
    """
    thr = region_thresholds() if thresholds is None else thresholds
    out = [dict(f, in_calendar=0) for f in fires]
    cells: dict[tuple[str, int, int, int], list[int]] = {}

    for idx, f in enumerate(out):
        conf = str(f.get("confidence", "nominal")).lower()
        if conf in ("low", "l"):
            continue
        sat = str(f.get("satellite") or "")
        acq_date = str(f.get("date") or "")

        if sat.startswith("MODIS"):
            # Solo Aqua (13:30) antes de la costura; Terra (10:30) y Aqua posterior quedan como detalle (0)
            if acq_date < SEAM_DATE and "terra" not in sat.lower() and sat != "MODIS T":
                out[idx]["in_calendar"] = 1
            continue
        if acq_date < SEAM_DATE:
            continue  # VIIRS antes de la costura no entra en la serie

        x_km, y_km = lcc_km(float(f.get("lon") or 0.0), float(f.get("lat") or 0.0))
        cx = math.floor(x_km / CELL_KM)
        cy = math.floor(y_km / CELL_KM)
        tb = _time_to_mins(f.get("time")) // 30
        cells.setdefault((acq_date, cx, cy, tb), []).append(idx)

    for indices in cells.values():
        # FIRMS reporta FRP con 0.01 MW: redondear evita que el error de coma flotante decida celdas en el umbral
        total_frp = round(sum(float(out[i].get("frp_mw") or 0.0) for i in indices), 2)
        best_idx = max(indices, key=lambda i: float(out[i].get("frp_mw") or 0.0))
        limit = thr.get(str(out[best_idx].get("region")), FRP_THRESHOLD_MW)
        if total_frp >= limit:
            out[best_idx]["in_calendar"] = 1

    return out


HARMONIZED_CSV = Path(__file__).resolve().parents[3] / "harmonization" / "harmonized_hotspots.csv"
# Serie nacional (harmonization/csv_to_sqlite.py): si existe se usa en lugar del CSV, consultando solo mes/región/área.
HARMONIZED_DB = Path(
    os.getenv("HARMONIZED_DB") or Path(__file__).resolve().parents[3] / "harmonization" / "harmonized_hotspots.sqlite"
)
# Región servida por defecto (NOMGEO de INEGI); "*" = todo México.
HARMONIZED_REGION = os.getenv("HARMONIZED_REGION", "*")
_HARMONIZED_BY_MONTH: dict[str, list[dict[str, Any]]] | None = None


def harmonized_db() -> sqlite3.Connection | None:
    """Conexión de solo lectura a la base SQLite armonizada, o None si no existe."""
    if not HARMONIZED_DB.exists():
        return None
    con = sqlite3.connect(f"file:{HARMONIZED_DB}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def harmonized_columns(con: sqlite3.Connection) -> list[str]:
    """Columnas originales del CSV (sin las auxiliares ym/lat/lon/frp_f)."""
    return con.execute("SELECT value FROM meta WHERE key = 'columns'").fetchone()[0].split(",")


def region_filter(con: sqlite3.Connection, region: str | None) -> tuple[str, list[str]]:
    """Cláusula SQL ` AND region = ?` (vacía si la base no tiene región o se piden todas con "*")."""
    region = HARMONIZED_REGION if region is None else region
    if region in ("", "*") or "region" not in harmonized_columns(con):
        return "", []
    return " AND region = ?", [region]


def _row_to_fire(r: Any) -> dict[str, Any]:
    scan = float(r["scan"] or 1.0)
    track = float(r["track"] or 1.0)
    conf_raw = r["confidence"] if r["confidence"] is not None else "n"
    return {
        "lat": round(float(r["latitude"]), 4),
        "lon": round(float(r["longitude"]), 4),
        "frp_mw": round(float(r["frp"]), 2),
        "date": r["acq_date"],
        "time": r["acq_time"] or "",
        "confidence": {"l": "low", "n": "nominal", "h": "high"}.get(conf_raw, conf_raw),
        "in_calendar": int(r["in_calendar"] or 0),
        "brightness": round(float(r["brightness"]), 1),
        "bright_t31": round(float(r["bright_t31"]), 1),
        "satellite": r["satellite"] or "",
        "daynight": r["daynight"] or "",
        "pixel_area_km2": round(scan * track, 3),
    }


def _load_harmonized_by_month() -> dict[str, list[dict[str, Any]]] | None:
    global _HARMONIZED_BY_MONTH
    if _HARMONIZED_BY_MONTH is not None:
        return _HARMONIZED_BY_MONTH
    if not HARMONIZED_CSV.exists():
        return None
    by_month: dict[str, list[dict[str, Any]]] = {}
    with HARMONIZED_CSV.open(encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh):
            r.setdefault("confidence", "n")
            by_month.setdefault(r["acq_date"][:7], []).append(_row_to_fire(r))
    _HARMONIZED_BY_MONTH = by_month
    return by_month


@lru_cache(maxsize=48)
def _db_fires_for_month(month: str, region: str) -> list[dict[str, Any]] | None:
    con = harmonized_db()
    if con is None:
        return None
    with con:
        clause, params = region_filter(con, region)
        rows = con.execute(f"SELECT * FROM hotspots WHERE ym = ?{clause} ORDER BY rowid", [month, *params]).fetchall()
    con.close()
    return [_row_to_fire(r) for r in rows] or None


def harmonized_fires_for_month(month: str, region: str | None = None) -> list[dict[str, Any]] | None:
    """Filas armonizadas de `YYYY-MM` (base SQLite nacional filtrada por región, o el CSV), o None si no cubre ese mes."""
    region = HARMONIZED_REGION if region is None else region
    if HARMONIZED_DB.exists():
        return _db_fires_for_month(month, region)
    if region not in ("*", "", PILOT_REGION):  # el CSV publicado solo cubre el norte de Chihuahua
        return None
    by_month = _load_harmonized_by_month()
    if by_month is None or month not in by_month:
        return None
    return by_month[month]


def harmonized_csv_slice(
    south: float = 25.5,
    north: float = 31.8,
    west: float = -109.5,
    east: float = -103.3,
    start_date: str = "2002-07-04",
    end_date: str = "2026-08-30",
    only_in_calendar: bool = False,
    region: str | None = None,
) -> str:
    """Recorta la serie armonizada por caja espacial, rango de fechas (y región, con la base SQLite): columnas originales."""
    con = harmonized_db()
    if con is not None:
        cols = harmonized_columns(con)
        clause, params = region_filter(con, region)
        sql = (
            "SELECT " + ", ".join(f'"{c}"' for c in cols) + " FROM hotspots"
            " WHERE ym BETWEEN ? AND ? AND acq_date BETWEEN ? AND ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?"
            + (" AND in_calendar = '1'" if only_in_calendar else "") + clause + " ORDER BY rowid"
        )
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(cols)
        with con:
            args = [start_date[:7], end_date[:7], start_date, end_date, south, north, west, east, *params]
            for r in con.execute(sql, args):  # ym acota el índice (region, ym); acq_date da el corte exacto
                w.writerow(tuple(r))
        con.close()
        return buf.getvalue()
    if not HARMONIZED_CSV.exists() or (region not in (None, "*", "", PILOT_REGION)):
        return ""
    buf = io.StringIO()
    with HARMONIZED_CSV.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        writer = csv.DictWriter(buf, fieldnames=reader.fieldnames or [])
        writer.writeheader()
        for r in reader:
            if only_in_calendar and r.get("in_calendar") != "1":
                continue
            d = r.get("acq_date", "")
            if d < start_date or d > end_date:
                continue
            lat = float(r["latitude"])
            lon = float(r["longitude"])
            if south <= lat <= north and west <= lon <= east:
                writer.writerow(r)
    return buf.getvalue()


