"""Variables del modelo predictivo de incendios (FuegoData).

Este módulo lo usan TANTO el entrenamiento (ml/) COMO el servidor en vivo (Raspberry Pi),
para que el modelo vea exactamente las mismas variables en ambos casos.

Pregunta que responde el modelo, para una celda de 0.25° y una fecha de emisión d:
    ¿Habrá al menos una detección VIIRS NOAA-20 (confianza nominal/alta) en la celda
    durante los días d, d+1 y d+2 (72 h)?

Solo usa información disponible en la mañana del día d (sin mirar al futuro):
- Fuego (NASA FIRMS): hasta d-1 (latencia ~3 h).
- Clima (NASA POWER, MERRA-2): hasta d-3 (latencia ~3 días).
- Vegetación (VIIRS NDVI 16 días): compuesto con fecha ≤ d-30 (latencia ~1 mes).
- Climatología de la celda: solo años anteriores al de d.
"""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np

from app.services.chihuahua_outline import CHIHUAHUA_OUTLINE

GRID_STEP = 0.25
HORIZON_DAYS = 3
WEATHER_LAG_DAYS = 3
NDVI_LAG_DAYS = 30
CLIM_HALF_WINDOW = 15  # días a cada lado para la climatología de la celda

FEATURES = [
    "fire_1d",  # detecciones ayer en la celda
    "fire_7d",  # últimos 7 días
    "fire_30d",  # últimos 30 días
    "fire_nb_7d",  # últimos 7 días en las 8 celdas vecinas
    "clim",  # promedio diario histórico en la celda (±15 días, años anteriores)
    "tmax",  # °C, día d-3
    "rh",  # %, humedad relativa media, d-3
    "wind",  # km/h, ráfaga máxima, d-3
    "soil_wet",  # 0-1, humedad del suelo superficial (GWETTOP), d-3
    "soil_wet_7d",  # promedio 7 días hasta d-3
    "precip_7d",  # mm, 7 días hasta d-3
    "precip_30d",  # mm, 30 días hasta d-3
    "dry_days",  # días seguidos sin lluvia ≥1 mm hasta d-3 (máx. 120)
    "hdw",  # índice Hot-Dry-Windy (mismo cálculo que la estaca)
    "ndvi",  # vegetación (compuesto ≤ d-30)
    "elevation",  # m
    "doy_sin",
    "doy_cos",
]

_LONS = [p[0] for p in CHIHUAHUA_OUTLINE]
_LATS = [p[1] for p in CHIHUAHUA_OUTLINE]
BBOX = (min(_LONS), min(_LATS), max(_LONS), max(_LATS))


def _inside(lon: float, lat: float) -> bool:
    inside, j = False, len(CHIHUAHUA_OUTLINE) - 1
    for i, (xi, yi) in enumerate(CHIHUAHUA_OUTLINE):
        xj, yj = CHIHUAHUA_OUTLINE[j]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def build_cells() -> np.ndarray:
    """Centros (lat, lon) de las celdas de 0.25° dentro de Chihuahua, ordenados."""
    lon0 = np.floor(BBOX[0] / GRID_STEP) * GRID_STEP
    lat0 = np.floor(BBOX[1] / GRID_STEP) * GRID_STEP
    cells = []
    lat = lat0 + GRID_STEP / 2
    while lat < BBOX[3]:
        lon = lon0 + GRID_STEP / 2
        while lon < BBOX[2]:
            if _inside(lon, lat):
                cells.append((round(lat, 4), round(lon, 4)))
            lon += GRID_STEP
        lat += GRID_STEP
    return np.array(cells)


def _key(lat: float, lon: float) -> tuple[int, int]:
    return (int(np.floor(lat / GRID_STEP)), int(np.floor(lon / GRID_STEP)))


def cell_lookup(cells: np.ndarray) -> dict[tuple[int, int], int]:
    return {_key(lat, lon): i for i, (lat, lon) in enumerate(cells)}


def neighbors(cells: np.ndarray) -> list[list[int]]:
    """Índices de las (hasta) 8 celdas vecinas de cada celda."""
    lut = cell_lookup(cells)
    out = []
    for lat, lon in cells:
        a, b = _key(lat, lon)
        out.append([lut[(a + da, b + db)] for da in (-1, 0, 1) for db in (-1, 0, 1) if (da or db) and (a + da, b + db) in lut])
    return out


def fires_matrix(days: list[date], points_by_day: dict[str, list[dict]], cells: np.ndarray) -> np.ndarray:
    """F[día, celda] = detecciones VIIRS con confianza nominal/alta."""
    lut = cell_lookup(cells)
    F = np.zeros((len(days), len(cells)), dtype=np.float32)
    for t, d in enumerate(days):
        for p in points_by_day.get(d.isoformat(), []):
            if p.get("confidence") == "low":
                continue
            i = lut.get(_key(p["lat"], p["lon"]))
            if i is not None:
                F[t, i] += 1
    return F


def trailing_sum(A: np.ndarray, window: int, lag: int = 1) -> np.ndarray:
    """S[t] = suma de A[t-lag-window+1 .. t-lag] (ventana que termina `lag` días antes)."""
    C = np.vstack([np.zeros((1, A.shape[1]), A.dtype), np.cumsum(A, axis=0)])
    T = A.shape[0]
    end = np.arange(T) - lag + 1  # índice exclusivo en C
    start = end - window
    end_c, start_c = np.clip(end, 0, T), np.clip(start, 0, T)
    return C[end_c] - C[start_c]


def lagged(A: np.ndarray, lag: int) -> np.ndarray:
    out = np.full_like(A, np.nan, dtype=np.float32)
    out[lag:] = A[:-lag] if lag else A
    return out


def dry_days(precip: np.ndarray, threshold: float = 1.0, cap: int = 120) -> np.ndarray:
    """Días seguidos sin lluvia ≥ threshold hasta cada día (inclusive)."""
    out = np.zeros_like(precip, dtype=np.float32)
    run = np.zeros(precip.shape[1], dtype=np.float32)
    for t in range(precip.shape[0]):
        run = np.where(np.nan_to_num(precip[t], nan=0.0) >= threshold, 0, np.minimum(run + 1, cap))
        out[t] = run
    return out


def hdw_score(tmax: np.ndarray, rh: np.ndarray, wind_kmh: np.ndarray, precip: np.ndarray) -> np.ndarray:
    """Mismo índice Hot-Dry-Windy que app.services.open_meteo.compute_fire_risk_level."""
    dryness = np.clip((100.0 - rh) / 100.0, 0, None)
    heat = np.clip((tmax - 10.0) / 30.0, 0, None)
    wind_factor = np.minimum(1.5, wind_kmh / 25.0)
    s = dryness * 45.0 + heat * 30.0 + wind_factor * 25.0
    s = np.where(precip >= 1.0, s * 0.65, s)
    return np.where(precip >= 5.0, 12.0, s).astype(np.float32)


def climatology(F: np.ndarray, days: list[date]) -> np.ndarray:
    """clim[t, c] = detecciones diarias promedio en la celda alrededor de la misma fecha,
    usando SOLO años anteriores al de days[t] (NaN si no hay años previos)."""
    w = 2 * CLIM_HALF_WINDOW + 1
    centered = trailing_sum(F, w, lag=-CLIM_HALF_WINDOW) / w  # ventana centrada en t
    index = {d: i for i, d in enumerate(days)}
    out = np.full_like(F, np.nan)
    for t, d in enumerate(days):
        prev = []
        for back in range(1, 30):
            try:
                same = d.replace(year=d.year - back)
            except ValueError:  # 29 de febrero
                same = d.replace(year=d.year - back, day=28)
            i = index.get(same)
            if i is None:
                break
            prev.append(centered[i])
        if prev:
            out[t] = np.mean(prev, axis=0)
    return out


def assemble(
    days: list[date],
    F: np.ndarray,
    weather: dict[str, np.ndarray],
    ndvi: np.ndarray,
    elevation: np.ndarray,
    nb: list[list[int]],
) -> dict[str, np.ndarray]:
    """Arma todas las variables como matrices [día, celda] para cada fecha de emisión.

    weather: tmax, rh, wind (km/h), soil_wet, precip — matrices [día, celda] del día observado.
    ndvi: [día, celda] ya alineado al compuesto disponible en cada día (≤ d-30).
    """
    L = WEATHER_LAG_DAYS
    f7 = trailing_sum(F, 7)
    nb7 = np.zeros_like(f7)
    for c, ns in enumerate(nb):
        if ns:
            nb7[:, c] = f7[:, ns].sum(axis=1)
    precip = weather["precip"]
    doy = np.array([d.timetuple().tm_yday for d in days], dtype=np.float32)
    ang = 2 * np.pi * doy / 365.25
    ones = np.ones((1, F.shape[1]), dtype=np.float32)
    feats = {
        "fire_1d": trailing_sum(F, 1),
        "fire_7d": f7,
        "fire_30d": trailing_sum(F, 30),
        "fire_nb_7d": nb7,
        "clim": climatology(F, days),
        "tmax": lagged(weather["tmax"], L),
        "rh": lagged(weather["rh"], L),
        "wind": lagged(weather["wind"], L),
        "soil_wet": lagged(weather["soil_wet"], L),
        "soil_wet_7d": trailing_sum(np.nan_to_num(weather["soil_wet"]), 7, lag=L) / 7,
        "precip_7d": trailing_sum(np.nan_to_num(precip), 7, lag=L),
        "precip_30d": trailing_sum(np.nan_to_num(precip), 30, lag=L),
        "dry_days": lagged(dry_days(precip), L),
        "hdw": lagged(hdw_score(weather["tmax"], weather["rh"], weather["wind"], np.nan_to_num(precip)), L),
        "ndvi": ndvi,
        "elevation": np.broadcast_to(elevation[None, :], F.shape).astype(np.float32),
        "doy_sin": (np.sin(ang)[:, None] * ones),
        "doy_cos": (np.cos(ang)[:, None] * ones),
    }
    return feats


def labels(F: np.ndarray) -> np.ndarray:
    """y[t, c] = 1 si hay ≥1 detección en t, t+1, t+2 (NaN donde aún no se conoce el futuro)."""
    future = trailing_sum(F, HORIZON_DAYS, lag=-(HORIZON_DAYS - 1))
    y = (future > 0).astype(np.float32)
    y[-(HORIZON_DAYS - 1):] = np.nan
    return y


def ndvi_composite_dates(start: date, end: date) -> list[date]:
    """Fechas de los compuestos VIIRS L3 NDVI 16 días (1 ene + 8k de cada año)."""
    out = []
    for y in range(start.year, end.year + 1):
        d = date(y, 1, 1)
        while d.year == y:
            if start <= d <= end:
                out.append(d)
            d += timedelta(days=8)
    return out
