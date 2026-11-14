# FuegoData — fire probability model (v1)

Target: ≥1 VIIRS NOAA-20 detection (nominal/high confidence) in the 0.25° cell within 72 h. Training period 2020-02-01 → 2025-12-31 (795,248 cell-days, fire rate 4.50%). Validation: leave-one-year-out.

## Overall (out-of-sample)

| Method | ROC AUC | Avg. precision | Fires caught in top 10 % cells/day |
|---|---|---|---|
| **FuegoData model (LightGBM)** | 0.894 | 0.472 | 56.5% |
| Climatology of the cell | 0.777 | 0.231 | 42.9% |
| Persistence (fire last 7 days) | 0.829 | 0.327 | 47.2% |
| Hot-Dry-Windy index | 0.525 | 0.043 | 5.7% |

Brier score (calibrated): 0.03117 vs 0.04299 for a constant base rate.

## Risk levels

| Level | Min. probability (72 h) | Share of cells | Observed fire rate | Share of all fires |
|---|---|---|---|---|
| Low | 0.0% | 60% | 0.6% | 8% |
| Moderate | 1.6% | 25% | 3.1% | 17% |
| High | 6.9% | 10% | 11.4% | 26% |
| Very high | 21.4% | 4% | 33.8% | 30% |
| Extreme | 61.1% | 1% | 81.0% | 19% |

## Per year (ROC AUC)

| Year | Fire rate | Model | Climatology | Persistence | HDW |
|---|---|---|---|---|---|
| 2020 | 3.72% | 0.862 | 0.507 | 0.805 | 0.455 |
| 2021 | 4.84% | 0.905 | 0.758 | 0.847 | 0.552 |
| 2022 | 5.03% | 0.907 | 0.832 | 0.846 | 0.569 |
| 2023 | 5.02% | 0.880 | 0.826 | 0.816 | 0.508 |
| 2024 | 4.03% | 0.897 | 0.853 | 0.812 | 0.521 |
| 2025 | 4.31% | 0.910 | 0.867 | 0.838 | 0.543 |

## Most important variables (gain)

- fire_30d: 37.1%
- fire_7d: 21.1%
- clim: 11.4%
- fire_1d: 5.2%
- fire_nb_7d: 4.8%
- elevation: 3.8%
- ndvi: 3.1%
- doy_cos: 2.7%
- doy_sin: 2.5%
- precip_30d: 1.6%
