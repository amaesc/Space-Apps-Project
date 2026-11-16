> AI-assisted: this folder was developed with the help of Claude (Anthropic) at the request of a project contributor. See [`../AI_DISCLOSURE.md`](../AI_DISCLOSURE.md).

# Fire-risk model (weekly hotspot probability per 0.1° cell)

Predicts, for every ~11 km cell in northern Chihuahua, the probability of **at least one hotspot in the next 7, 14 or 28 days**.
Data: NASA FIRMS only (the harmonized MODIS + VIIRS series from [`../harmonization`](../harmonization), rows with `in_calendar = 1`).
No weather, vegetation or other sources are used.

## Run
```
cd risk_model_weekly
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
# ../harmonization/harmonized_hotspots.csv is already in the repo (or rebuild it, see ../harmonization/README.md)
.venv/bin/python -m pytest -q tests                      # leakage / label / grid tests
.venv/bin/python run.py                                  # all horizons + 7-day backtest (~1.5 min)
.venv/bin/python run.py --horizons 7 --no-backtest
```
Settings (cell size, horizons, split dates, model parameters) are in `config.yaml`.

## Method
- Unit: one row per cell and Monday-start week (about 1.8M training rows). Target: any hotspot in the following `horizon` days.
- Features (22, all from weeks before the forecast date): recent counts (1-52 weeks), weeks since last hotspot, historical rate,
  recent FRP, neighbour counts (3x3, 5x5 ring), same-calendar-window frequency in earlier years, season (sin/cos), cell position.
- Active cells: cells with at least one hotspot before 2020 (2,209 of 3,906); they hold 95.5% of 2023-26 events.
- Model: LightGBM, probabilities calibrated with isotonic regression. Baselines: B0 week-of-year rate, B1 cell climatology, B2 persistence.
- Split by time (forecast date): train 2004-07..2019, early stopping 2020-21, calibration 2022, **test 2023-01..2026-07 (never used for fitting)**.
  A gap of one horizon separates the sets so no label window crosses a boundary. Rolling yearly backtest 2009-2026 (7 days).

## Test results (2023-01 to 2026-07, ~0.7% of cell-weeks burn at 7 days)
| Horizon | Model | PR-AUC | Brier | Top-5% cells capture |
|---|---|---|---|---|
| 7 days | LightGBM | **0.118** | **0.00628** | **47.0%** |
| | cell climatology (B1) | 0.070 | 0.00657 | 36.6% |
| | persistence (B2) | 0.044 | 0.00654 | 22.9% |
| 14 days | LightGBM | **0.157** | **0.01122** | **41.2%** |
| | cell climatology (B1) | 0.115 | 0.01179 | 35.6% |
| 28 days | LightGBM | 0.207 | 0.01978 | 37.0% |
| | cell climatology (B1) | 0.176 | 0.02065 | 35.1% |

"Top-5% capture" = share of the week's burning cells that fall in the 5% of cells ranked highest (random would be 5%).
The 7-day model beats climatology in all 18 backtest years (2009-2026) on PR-AUC and capture.

## Outputs (`outputs/h7`, `h14`, `h28`)
`forecast_<date>.csv` / `.geojson` (probability per cell for the week after the last data, with the climatology probability and the ratio),
`top25_risk.csv`, `test_predictions.parquet`, `metrics.json`, `test_by_month.csv`, `backtest_by_year.csv` (7 d), `feature_importance.csv`,
`summary.png`, `lgbm.txt` (model). In git: metrics, figures, feature importance, the 7-day forecast, the models and `test_predictions.parquet`. The calibrators (`calibrators.pkl`) are not stored (a pickle can run code when loaded); `run.py` regenerates them.

## Limits
- It forecasts where hotspots are likely, not individual ignitions; the best signal is where and when fires usually occur
  (climatology) plus recent activity in the cell and its neighbours.
- **Gain shrinks with horizon:** at 28 days the model is only slightly better than climatology (early stopping after 7 rounds).
- **Over-prediction of about 18%** on 2023-26 (predicted 3,318 vs 2,780 observed events at 7 days). Cell-weeks burn less often in
  2023-26 (0.68%) than in the calibration year (0.87%) and in training (0.91%). It could be a real decline or a data effect.
- No weather, drought or vegetation, so unusually dry or wet years are not anticipated.
- Valid for this region only. Series ends 2026-07-31, so the latest forecast is for the week starting 2026-07-27.
- Trained on a mixed MODIS-era (before 2012) and VIIRS-era series with a ~10% count offset; the backtest shows no loss in the VIIRS era.

## How it differs from `../ml`
`../ml` predicts the next 72 h on a 0.25 degree grid using weather, NDVI and altitude. This model predicts the next 7, 14 or 28 days on a 0.1 degree grid
from FIRMS hotspot history only. They are separate and are not connected to the backend or the web app.
