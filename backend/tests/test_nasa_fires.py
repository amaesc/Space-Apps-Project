"""`mark_in_calendar`: rejilla EPSG:6372 y umbral por región, igual que harmonization/build_harmonized_dataset.py."""

import pytest

from app.services.nasa_fires import FRP_THRESHOLD_MW, lcc_km, mark_in_calendar


@pytest.mark.parametrize(
    "lon,lat,x,y",
    [  # referencia: pyproj Transformer.from_crs(4326, 6372), en km
        (-106.08, 28.63, 2101.690199, 1846.003528),
        (-117.0, 32.5, 1082.993309, 2344.558856),
        (-87.0, 21.0, 4049.744462, 1080.043823),
        (-102.0, 12.0, 2500.0, 0.0),
    ],
)
def test_lcc_matches_pyproj(lon, lat, x, y):
    gx, gy = lcc_km(lon, lat)
    assert gx == pytest.approx(x, abs=1e-6) and gy == pytest.approx(y, abs=1e-6)


def _px(frp, region="West", lon=-110.5757, lat=32.3047, conf="nominal"):
    return {"lat": lat, "lon": lon, "frp_mw": frp, "date": "2015-04-10", "time": "0912",
            "confidence": conf, "satellite": "VIIRS S-NPP", "region": region}


def test_cell_keeps_only_strongest_pixel_at_threshold():
    # 4 píxeles en la misma celda de 1.4 km / 30 min; suma exacta 17.10 MW = umbral
    fires = [_px(3.76), _px(3.54, lat=32.3050), _px(6.26, lat=32.3048), _px(3.54, lat=32.3049)]
    out = mark_in_calendar(fires, thresholds={"West": 17.1})
    assert [f["in_calendar"] for f in out] == [0, 0, 1, 0]


def test_region_threshold_and_fallback():
    cell = [_px(10.0), _px(6.0, lat=32.3049)]  # 16 MW
    assert sum(f["in_calendar"] for f in mark_in_calendar(cell, thresholds={"West": 17.1})) == 0
    assert sum(f["in_calendar"] for f in mark_in_calendar(cell, thresholds={"West": 13.0})) == 1
    assert 16.0 >= FRP_THRESHOLD_MW  # región sin umbral calibrado -> respaldo de 15 MW
    assert sum(f["in_calendar"] for f in mark_in_calendar(cell, thresholds={})) == 1


def test_low_confidence_and_terra_excluded():
    out = mark_in_calendar(
        [_px(50.0, conf="low"),
         {"date": "2010-05-01", "satellite": "MODIS T", "confidence": "high", "frp_mw": 40},
         {"date": "2010-05-01", "satellite": "MODIS A", "confidence": "high", "frp_mw": 40}],
        thresholds={},
    )
    assert [f["in_calendar"] for f in out] == [0, 0, 1]


def test_seam_aqua_only_before_snpp_only_after():
    aqua = {"satellite": "MODIS A", "confidence": "high", "frp_mw": 40}
    out = mark_in_calendar(
        [dict(aqua, date="2012-01-19"), dict(aqua, date="2012-01-20"),
         dict(_px(20.0), date="2012-01-19"), dict(_px(20.0), date="2012-01-20")],
        thresholds={},
    )
    assert [f["in_calendar"] for f in out] == [1, 0, 0, 1]


def test_history_sources_follow_the_seam():
    from datetime import date

    from app.services.nasa_fires import MODIS, VIIRS_SNPP, history_sources

    assert history_sources(date(2011, 12, 1)) == (MODIS,)
    assert history_sources(date(2012, 1, 1)) == (MODIS, VIIRS_SNPP)
    assert history_sources(date(2012, 2, 1)) == (VIIRS_SNPP,)
    assert history_sources(date(2025, 6, 1)) == (VIIRS_SNPP,)


def _tiny_db(tmp_path, monkeypatch):
    """Base SQLite mínima construida con harmonization/csv_to_sqlite.py (sin depender del archivo nacional)."""
    import importlib.util
    from pathlib import Path

    import app.services.nasa_fires as nf

    spec = importlib.util.spec_from_file_location(
        "csv_to_sqlite", Path(__file__).resolve().parents[2] / "harmonization" / "csv_to_sqlite.py")
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    head = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight,type,region,in_calendar"
    rows = [
        "28.10000,-106.20000,330.5,1.0,1.0,2010-04-02,2040,Aqua,MODIS,n,6.1NRT,300.1,20.00,D,0,Chihuahua,1",
        "28.10000,-106.20000,320.0,1.0,1.0,2010-04-02,1740,Terra,MODIS,h,6.1NRT,300.1,10.00,D,0,Chihuahua,0",
        "19.40000,-99.10000,330.5,1.0,1.0,2010-04-03,2040,Aqua,MODIS,n,6.1NRT,300.1,20.00,D,0,Ciudad de México,1",
        "28.20000,-106.30000,340.0,0.4,0.4,2024-04-05,2010,SNPP,VIIRS,n,2,295.0,18.50,D,0,Chihuahua,1",
    ]
    csv_path, db = tmp_path / "h.csv", tmp_path / "h.sqlite"
    csv_path.write_text("\r\n".join([head, *rows]) + "\r\n")
    mod.convert(str(csv_path), str(db))
    monkeypatch.setattr(nf, "HARMONIZED_DB", db)
    nf._db_fires_for_month.cache_clear()
    return nf, csv_path


def test_harmonized_db_month_region_and_export(tmp_path, monkeypatch):
    nf, csv_path = _tiny_db(tmp_path, monkeypatch)
    april = nf.harmonized_fires_for_month("2010-04", "Chihuahua")
    assert [f["satellite"] for f in april] == ["Aqua", "Terra"] and april[0]["confidence"] == "nominal"
    assert len(nf.harmonized_fires_for_month("2010-04", "*")) == 3
    assert nf.harmonized_fires_for_month("1999-01", "Chihuahua") is None
    # export: texto original exacto, CRLF como el CSV fuente
    out = nf.harmonized_csv_slice(14, 33, -118, -86, "2002-01-01", "2030-12-31", region="*")
    assert out == csv_path.read_text().replace("\n", "\r\n").replace("\r\r", "\r")
    only = nf.harmonized_csv_slice(28.0, 28.5, -107, -106, "2024-01-01", "2024-12-31", True, region="Chihuahua")
    assert only.splitlines()[1].startswith("28.20000,-106.30000") and len(only.splitlines()) == 2


def test_calendar_from_db_uses_monthly_table(tmp_path, monkeypatch):
    nf, _ = _tiny_db(tmp_path, monkeypatch)
    import app.services.calendar_builder as cb

    monkeypatch.setattr(cb, "_CSV_CALENDAR_CACHE", {})
    nat = {r["year"]: r["months"] for r in cb._load_calendar_from_harmonized_csv("*")["rows"]}
    chih = cb._load_calendar_from_harmonized_csv("Chihuahua")
    by = {r["year"]: r["months"] for r in chih["rows"]}
    assert nat[2010][3] == 2 and by[2010][3] == 1      # México cuenta CDMX + Chihuahua; Chihuahua solo la suya
    assert by[2024][2] == 0
    assert by[2010][2] is None and by[2024][3] is None  # fuera de cobertura: antes de 2010-04 y abril 2024 incompleto
    assert chih["current_month"]["year"] == 2024 and chih["current_month"]["month"] == "Mar"
    assert chih["region"] == "Chihuahua" and chih["source"].endswith("Chihuahua")


def test_region_query_validation_and_filter(tmp_path, monkeypatch):
    nf, _ = _tiny_db(tmp_path, monkeypatch)
    import app.services.calendar_builder as cb
    from fastapi.testclient import TestClient

    from app.main import app

    monkeypatch.setattr(cb, "_CSV_CALENDAR_CACHE", {})
    c = TestClient(app)
    assert c.get("/api/nasa/fires/history?month=2010-04&region=Atlantis").status_code == 400
    nat = c.get("/api/nasa/fires/history?month=2010-04").json()
    cdmx = c.get("/api/nasa/fires/history?month=2010-04&region=ciudad de méxico").json()  # sin distinguir mayúsculas
    assert nat["region"] == "*" and nat["count"] == 3
    assert cdmx["region"] == "Ciudad de México" and cdmx["count"] == 1
    csv_text = c.get("/api/nasa/fires/harmonized.csv?region=Chihuahua").text
    assert len(csv_text.splitlines()) == 1 + 3 and "Ciudad de México" not in csv_text
    assert c.get("/api/nasa/calendar?region=Chihuahua").json()["region"] == "Chihuahua"


def test_legacy_csv_never_answers_for_other_states(monkeypatch, tmp_path):
    import app.services.nasa_fires as nf

    monkeypatch.setattr(nf, "HARMONIZED_DB", tmp_path / "missing.sqlite")
    assert nf.harmonized_fires_for_month("2010-04", "Jalisco") is None
    assert nf.harmonized_csv_slice(region="Jalisco") == ""


def test_tile_duplicates_removed(monkeypatch):
    import asyncio

    import app.services.nasa_fires as nf

    pt = {"lat": 21.0, "lon": -90.0, "date": "2024-04-10", "time": "19:17", "satellite": "VIIRS S-NPP", "region": "Yucatán"}

    class R:
        status_code, content = 200, b""

        def raise_for_status(self):
            pass

    class C:
        async def get(self, url):
            return R()

    monkeypatch.setattr(nf, "_decode", lambda raw, src: [dict(pt)])  # cada tile devuelve el mismo punto de borde
    from datetime import date

    pts = asyncio.run(nf._fetch_day(C(), nf.VIIRS_SNPP, date(2024, 4, 10)))
    assert len(nf.TILES) == 5 and len(pts) == 1


def test_state_lookup():
    from app.services.mexico_states import state_of

    assert state_of(-106.08, 28.63) == "Chihuahua"
    assert state_of(-99.13, 19.43) == "Ciudad de México"
    assert state_of(-118.29, 29.04) == "Baja California"   # Isla Guadalupe
    assert state_of(-96.0, 45.0) is None
