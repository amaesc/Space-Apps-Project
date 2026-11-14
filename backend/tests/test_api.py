"""API completa con el cliente de pruebas de FastAPI (sin base de datos: respaldo JSON)."""

import pytest
from fastapi.testclient import TestClient

import app.routers.iot as iot
from app.main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(iot, "DATA_FILE", tmp_path / "iot_readings.json")
    monkeypatch.setattr(iot, "is_db_configured", lambda: False)
    with TestClient(app) as c:
        yield c


READING = {"station_id": "ESP32-TEST", "name": "Test", "lat": 27.97, "lon": -107.58,
           "temperature_c": 28.5, "humidity_pct": 18, "luminosity_pct": 70, "rssi_dbm": -64, "link_type": "wifi"}


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_telemetry_requires_token(client):
    assert client.post("/api/iot/telemetry", json=READING).status_code == 401
    assert client.post("/api/iot/telemetry", json=READING, headers={"X-Station-Token": "wrong"}).status_code == 401


def test_telemetry_with_token_returns_model_risk(client):
    r = client.post("/api/iot/telemetry", json=READING, headers={"X-Station-Token": "test-token"})
    assert r.status_code == 200
    body = r.json()
    assert body["station"]["luminosity_pct"] == 70
    assert body["station"]["rssi_dbm"] == -64
    risk = body["model_risk"]
    assert risk is None or (1 <= risk["level"] <= 5 and 0 <= risk["probability_72h"] <= 1)
    st = client.get("/api/iot/stations").json()["stations"]
    assert any(s["station_id"] == "ESP32-TEST" for s in st)


def test_telemetry_validates_input(client):
    bad = {**READING, "humidity_pct": 150}
    assert client.post("/api/iot/telemetry", json=bad, headers={"X-Station-Token": "test-token"}).status_code == 422


def test_lite_page_is_tiny_and_scriptless(client):
    r = client.get("/lite")
    assert r.status_code == 200
    assert "<script" not in r.text.lower()
    assert len(r.content) < 14_000
    assert "FIRMS" in r.text


def test_model_endpoints(client):
    r = client.get("/api/model/forecast")
    if r.status_code == 503:
        pytest.skip("modelo no disponible")
    fc = r.json()
    assert fc["horizon_hours"] == 72 and len(fc["cells"]) > 300
    info = client.get("/api/model/info").json()
    assert info["validation"]["scheme"] == "leave-one-year-out"


def test_nasa_and_weather(client):
    fires = client.get("/api/nasa/fires?days=2").json()
    assert "fires" in fires and "attribution" in fires
    hist = client.get("/api/nasa/fires/history?month=2025-05").json()
    assert hist["count"] > 100
    assert client.get("/api/nasa/fires/history?month=1999-01").status_code == 400
    grid = client.get("/api/weather/grid").json()
    assert len(grid["cells"]) > 50
