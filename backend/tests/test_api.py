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


def test_model_endpoints_are_labelled_pilot(client):
    for path in ("/api/model/forecast", "/api/model/info", "/api/model/weekly"):
        r = client.get(path)
        if r.status_code == 503:
            continue  # modelo/salidas no disponibles en este entorno
        j = r.json()
        assert j["region"] == "Chihuahua" and j["scope"] == "pilot", path


def test_no_seeded_stations_without_readings(client):
    # Sin lecturas enviadas por estacas no aparecen estaciones inventadas
    assert client.get("/api/iot/stations").json() == {"count": 0, "stations": []}


def test_hotspots_are_real_detections_without_invented_fields(client, monkeypatch):
    import app.services.hotspots as hs

    fake_nasa = [{"lat": 28.1, "lon": -106.2, "frp_mw": 12.5, "confidence": "nominal", "date": "2026-11-15", "time": "20:10",
                  "daynight": "D", "satellite": "VIIRS NOAA-20", "region": "Chihuahua"},
                 {"lat": 19.4, "lon": -99.1, "frp_mw": 3.0, "confidence": "high", "date": "2026-11-15", "time": "08:05",
                  "daynight": "N", "satellite": "VIIRS NOAA-21", "region": "Ciudad de México"}]

    async def fake_range(start, end, sources):
        return [dict(f) for f in fake_nasa]

    monkeypatch.setattr(hs, "detections_for_range", fake_range)
    j = client.get("/api/fires/hotspots").json()
    assert j["count"] == 2 and j["region"] == "*"
    h = j["hotspots"][0]
    assert h["timestamp"] == "2026-11-15T20:10:00Z" and h["state"] == "Chihuahua"
    assert h["origin"] == "Indeterminado" and h["probability"] is None and h["reasons"] == [] and not h["irregular_use_alert"]
    assert client.get("/api/fires/hotspots?region=Chihuahua").json()["count"] == 1
    csv_text = client.get("/api/fires/export.csv").text
    assert csv_text.splitlines()[0].startswith("id,state,timestamp_utc") and len(csv_text.splitlines()) == 3
    page = client.get("/lite").text
    assert "Demo data" not in page and "28.100, -106.200" in page and "19.400" not in page   # solo Chihuahua


def test_fires_calendar_is_the_real_one(client):
    assert client.get("/api/fires/calendar?origin=Humano").status_code == 400
    r = client.get("/api/fires/calendar?start_year=2010&end_year=2012")
    if r.status_code == 503:
        pytest.skip("sin datos armonizados en este entorno")
    j = r.json()
    assert [row["year"] for row in j["rows"]] == [2010, 2011, 2012] and j["data_source"] == "nasa-firms-gibs"
