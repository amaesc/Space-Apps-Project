"""Estados de México (INEGI, contorno simplificado a ~110 m) y búsqueda punto → estado sin shapely.

Datos: app/data/mexico_states.json, generado con harmonization/boundaries/export_backend_states.py desde el
mismo `00ent.shp` que usa clean_inputs.py. Igual que allí, un punto pertenece al PRIMER estado que lo contiene.
En 200k detecciones reales difiere del polígono exacto en 0.028 % de los puntos (todos en bordes).
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np

STATES_JSON = Path(__file__).resolve().parents[1] / "data" / "mexico_states.json"


class _State:
    __slots__ = ("name", "bbox", "x1", "y1", "x2", "y2")

    def __init__(self, name: str, bbox: list[float], rings: list[list[list[float]]]):
        self.name, self.bbox = name, tuple(bbox)
        xs1, ys1, xs2, ys2 = [], [], [], []
        for ring in rings:
            r = np.asarray(ring, dtype=float)
            xs1.append(r[:-1, 0]); ys1.append(r[:-1, 1]); xs2.append(r[1:, 0]); ys2.append(r[1:, 1])
        self.x1, self.y1 = np.concatenate(xs1), np.concatenate(ys1)
        self.x2, self.y2 = np.concatenate(xs2), np.concatenate(ys2)

    def contains(self, lon: float, lat: float) -> bool:
        w, s, e, n = self.bbox
        if not (w <= lon <= e and s <= lat <= n):
            return False
        # regla par-impar sobre todas las aristas (anillos exteriores y huecos)
        cross = (self.y1 > lat) != (self.y2 > lat)
        if not cross.any():
            return False
        y1, y2, x1, x2 = self.y1[cross], self.y2[cross], self.x1[cross], self.x2[cross]
        xi = (x2 - x1) * (lat - y1) / (y2 - y1) + x1
        return bool(np.count_nonzero(lon < xi) % 2)


@lru_cache(maxsize=1)
def _states() -> tuple[_State, ...]:
    data = json.loads(STATES_JSON.read_text(encoding="utf-8"))
    return tuple(_State(s["name"], s["bbox"], s["rings"]) for s in data)


def state_names() -> list[str]:
    return [s.name for s in _states()]


def mexico_bbox() -> tuple[float, float, float, float]:
    """(oeste, sur, este, norte) de todos los estados."""
    b = np.array([s.bbox for s in _states()])
    return float(b[:, 0].min()), float(b[:, 1].min()), float(b[:, 2].max()), float(b[:, 3].max())


def state_of(lon: float, lat: float) -> str | None:
    """Nombre INEGI (NOMGEO) del estado que contiene el punto, o None fuera de México."""
    for s in _states():
        if s.contains(lon, lat):
            return s.name
    return None


def state_bbox(name: str) -> tuple[float, float, float, float] | None:
    for s in _states():
        if s.name == name:
            return s.bbox
    return None
