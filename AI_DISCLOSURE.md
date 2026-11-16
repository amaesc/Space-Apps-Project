# AI assistance disclosure

The following parts of this repository were developed with the help of an AI assistant (Claude, by Anthropic), working at the request of a project contributor
who directed the work, reviewed it and ran the results:

- `harmonization/` : the MODIS/VIIRS harmonization pipeline (input cleaning, per-state threshold calibration, national build, CSV → SQLite export), its analysis, S3 helper, documentation notebook and README
- `risk_model_weekly/` : the weekly hotspot-risk model (code, tests, configuration, README and the generated outputs)
- `backend/` (parts):
  - `app/services/nasa_fires.py`: harmonized-archive reads (SQLite), the live `in_calendar` rule, national GIBS tiles with state tagging, history caching
  - `app/services/calendar_builder.py`, `app/services/open_meteo.py`, `app/services/mexico_states.py` (+ `app/data/mexico_states.json`)
  - `app/routers/nasa.py`, `app/routers/fires.py`, the `region`/`scope` fields in `app/routers/model.py`, and the removal of invented hotspots and seed stations (`harmonizer.py`, `db/init.sql`, `app/routers/iot.py`)
  - `tests/test_nasa_fires.py`
- `web/` (parts): `lib/api.ts` (live data only, no invented fallbacks), `lib/fire-data.ts` and `lib/hero-data.ts` (real harmonization numbers),
  the harmonization/calendar text in `app/page.tsx` and `components/ChihuahuaOsmMap.tsx`, and the wording fixes in `app/(landing)/about`, `app/(landing)/how-it-works` and `app/data`
  that mark the origin classifier as planned
- deployment: the AWS EC2 setup (systemd + Caddy; not stored in this repo) and the API URL in `.github/workflows/pages.yml`
- README: the sections "Solution Architecture", "Harmonized series and weekly risk model" and the backend/deployment notes, and this file

Every Python file in `harmonization/` and `risk_model_weekly/` starts with an "AI-assisted code" header, and the notebook has a note at the top.
AI-written code can contain mistakes: the numbers in the documentation come from running the code on the FIRMS data, but they should be reviewed before reuse.

Other code in the repository (the rest of `web/` and `backend/`, `esp32/`, `ml/`, `deploy/`) was written by the team; its authors should add their own disclosure if relevant.
