"""Clima: si Open-Meteo falla o faltan variables, la API responde 503 en lugar de inventar valores."""

import httpx
import pytest
from fastapi.testclient import TestClient

import app.services.open_meteo as om
from app.main import app


class _Resp:
    def __init__(self, payload):
        self._p = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._p


def _patch_get(monkeypatch, behaviour):
    async def fake_get(self, url, params=None, **kw):
        return behaviour(params)

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    monkeypatch.setattr(om, "_CACHE", {})
    monkeypatch.setattr(om, "_GRID_CACHE", None)


def _down(params):
    raise httpx.ConnectError("no network")


@pytest.mark.parametrize("path", ["/api/weather/risk?lat=19.4&lon=-99.1", "/api/weather/grid"])
def test_outage_returns_503_not_made_up_values(monkeypatch, path):
    _patch_get(monkeypatch, _down)
    r = TestClient(app).get(path)
    assert r.status_code == 503 and "unavailable" in r.json()["detail"].lower()


def test_missing_field_is_not_filled_in(monkeypatch):
    _patch_get(monkeypatch, lambda p: _Resp({"current": {"temperature_2m": 30.0, "wind_speed_10m": 10.0, "precipitation": 0.0}}))
    r = TestClient(app).get("/api/weather/risk?lat=19.4&lon=-99.1")
    assert r.status_code == 503 and "relative_humidity_2m" in r.json()["detail"]


def test_live_values_pass_through(monkeypatch):
    cur = {"temperature_2m": 31.5, "relative_humidity_2m": 18.0, "wind_speed_10m": 22.0, "precipitation": 0.0}
    _patch_get(monkeypatch, lambda p: _Resp({"current": cur}))
    j = TestClient(app).get("/api/weather/risk?lat=19.4&lon=-99.1").json()
    assert j["source"] == "open-meteo-live" and j["temperature_c"] == 31.5 and j["humidity_pct"] == 18.0


def test_grid_skips_cells_without_data(monkeypatch):
    def grid(params):
        n = len(params["latitude"].split(","))
        full = {"temperature_2m": 25.0, "relative_humidity_2m": 30.0, "wind_speed_10m": 10.0, "precipitation": 0.0,
                "surface_pressure": 850.0}
        return _Resp([{"current": full if i % 2 == 0 else {}} for i in range(n)])

    _patch_get(monkeypatch, grid)
    monkeypatch.setattr("app.services.gibs_raster.ndvi_and_lst", None, raising=False)  # sin red para GIBS
    j = TestClient(app).get("/api/weather/grid").json()
    assert j["cells_without_data"] > 0 and all(c["temperature_c"] == 25.0 for c in j["cells"])


def test_stale_real_reading_served_when_refresh_fails(monkeypatch):
    cur = {"temperature_2m": 28.0, "relative_humidity_2m": 20.0, "wind_speed_10m": 12.0, "precipitation": 0.0}
    _patch_get(monkeypatch, lambda p: _Resp({"current": cur}))
    c = TestClient(app)
    first = c.get("/api/weather/risk?lat=19.4&lon=-99.1").json()
    key = (19.4, -99.1)
    ts, res = om._CACHE[key]
    om._CACHE[key] = (ts - om._CACHE_TTL_S - 1, res)   # caducado para refrescar, pero < 6 h
    _patch_get_keep_cache = _down
    async def fake_get(self, url, params=None, **kw):
        return _patch_get_keep_cache(params)
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)
    second = c.get("/api/weather/risk?lat=19.4&lon=-99.1").json()
    assert second["stale"] is True and second["temperature_c"] == first["temperature_c"] == 28.0
    assert second["timestamp"] == first["timestamp"]  # la hora original de la lectura real
