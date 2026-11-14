"""Modelo en vivo: probabilidades válidas, niveles coherentes y corrección IoT."""

from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

from app.services import fire_model

pytestmark = pytest.mark.skipif(not fire_model.available(), reason="modelo no entrenado")


def _station(**kw):
    s = {
        "station_id": "TEST",
        "name": "Test",
        "lat": 27.97,
        "lon": -107.58,
        "temperature_c": 22,
        "humidity_pct": 40,
        "wind_kmh": 10,
        "rain_mm": 0,
        "lightning_strikes": 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fallback_active": False,
    }
    s.update(kw)
    return s


def _prob_near(stations, lat=27.97, lon=-107.58):
    import asyncio

    fc = asyncio.run(fire_model.forecast(stations))
    cells = np.array([[c["lat"], c["lon"]] for c in fc["cells"]])
    i = int(((cells[:, 0] - lat) ** 2 + (cells[:, 1] - lon) ** 2).argmin())
    return fc, fc["cells"][i]


def test_forecast_shape_and_ranges():
    fc, _ = _prob_near([])
    assert len(fc["cells"]) == len(fire_model._state["cells"])
    p = np.array([c["probability"] for c in fc["cells"]])
    assert ((p >= 0) & (p <= 1)).all()
    th = fc["levels"]
    for c in fc["cells"]:
        assert 1 <= c["level"] <= 5
        assert c["probability"] >= th[c["level"] - 1]["min_probability"] - 1e-9
        assert len(c["drivers"]) == 3
    assert fc["model"]["auc"] > fc["model"]["baselines_auc"]["persistence_7d"]


def test_iot_lightning_raises_and_rain_lowers():
    _, base = _prob_near([])
    _, storm = _prob_near([_station(lightning_strikes=3)])
    _, rain = _prob_near([_station(rain_mm=12)])
    assert storm["probability"] > base["probability"]
    assert rain["probability"] < base["probability"]
    assert storm["iot_reasons"] and "lightning" in storm["iot_reasons"][0]


def test_iot_ignores_stale_or_fallback_station():
    _, base = _prob_near([])
    old = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
    _, stale = _prob_near([_station(lightning_strikes=5, timestamp=old)])
    _, fb = _prob_near([_station(lightning_strikes=5, fallback_active=True)])
    assert stale["probability"] == base["probability"]
    assert fb["probability"] == base["probability"]


def test_iot_only_affects_nearby_cells():
    fc0, _ = _prob_near([])
    fc1, _ = _prob_near([_station(lightning_strikes=3)])
    changed = [a for a, b in zip(fc0["cells"], fc1["cells"]) if a["probability"] != b["probability"]]
    assert 0 < len(changed) <= 12  # radio de 30 km ≈ pocas celdas de 0.25°
