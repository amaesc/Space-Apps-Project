# Harmonized MODIS + VIIRS hotspot series

> AI-assisted: this folder was developed with the help of Claude (Anthropic) at the request of a project contributor. See [`../AI_DISCLOSURE.md`](../AI_DISCLOSURE.md).


Northern Chihuahua, Mexico (lat 25.5 to 31.8, lon -109.5 to -103.3), 2002-07-04 to 2026-08-30.
Built from NASA FIRMS archive files: MODIS Collection 6.1 (Terra + Aqua) and VIIRS Suomi-NPP.

## Files

| File | What it is |
|---|---|
| `build_harmonized_dataset.py` | Builds the harmonized CSV from the two FIRMS archive files |
| `harmonization_documentation.ipynb` | Step-by-step documentation, validation numbers and check cells (opens in Colab) |
| `harmonized_hotspots_brightness_mapping.png` | Check of the brightness correction (held-out years, mapping curves) |
| `analysis/harmonize_brightness.py` | Analysis behind the 15 MW rule (MODIS detection efficiency) and the Aqua/SNPP pairs. Expects the FIRMS download layout `DL_FIRE_*/*.csv` |
| `s3_io.py` | Download the inputs from / upload outputs to the S3 bucket with boto3 (credentials from the environment, never in code) |

`harmonized_hotspots.csv` (481,029 rows, 16 columns, ~40 MB) is **not stored in git**: rebuild it (below) or fetch it from the bucket.

## The one thing to know: `in_calendar`

VIIRS sees about 16 times more fires than MODIS (smaller pixels), so counting every row would show a fake jump when
VIIRS starts in 2012. `in_calendar` marks the rows that form ONE consistent series:

| `in_calendar` | Rows | Meaning |
|---|---|---|
| `1` | 55,902 | The harmonized series: Aqua before 2012-01-20, and the strongest pixel of every Suomi-NPP 1.4 km cell whose summed FRP is >= 15 MW (roughly what MODIS can detect). One afternoon (13:30) look per day. |
| `0` | 425,127 | Kept for detail only: Terra, Aqua after 2012, small VIIRS cells, the other pixels of each cell, low-confidence rows. |

**Use `in_calendar == 1` for counts, calendars, trends and anomalies. Use all rows for detail views and downloads.**

## Columns

The 15 original FIRMS columns plus `in_calendar`. Same type for MODIS and VIIRS rows.

| Column | Notes |
|---|---|
| `latitude`, `longitude` | Pixel center, WGS84. Unchanged |
| `brightness` | Mid-IR brightness temperature (K). **MODIS rows are corrected** (see below); capped at 367 K for both sensors (24 MODIS rows with `bright_t31` = 400.1 K are the exception) |
| `scan`, `track` | Pixel size in km. Unchanged. Pixel area = scan x track |
| `acq_date` | `YYYY-MM-DD`, UTC |
| `acq_time` | `HHMM`, UTC. Read as text to keep the leading zero |
| `satellite` | `Terra`, `Aqua`, `SNPP` |
| `instrument` | `MODIS` for Terra/Aqua, `SNPP` for Suomi-NPP (VIIRS). Unchanged from the source |
| `confidence` | `l` / `n` / `h` for all rows (MODIS 0-100 converted: <30 l, 30-79 n, >=80 h) |
| `version` | Product version, unchanged. **Read as text** (`6.03`, `61.03`, `2`) |
| `bright_t31` | Thermal-IR brightness temperature (K). Unchanged |
| `frp` | Fire radiative power (MW). Unchanged. Best intensity measure |
| `daynight` | `D` / `N` |
| `type` | 0 presumed vegetation fire, 2 other static land source, 3 offshore. Unchanged |
| `in_calendar` | 0 / 1, see above |

## What was changed, and what was not

Changed:
1. `confidence` of MODIS rows: number -> `l`/`n`/`h`.
2. `acq_date` of MODIS rows: `20020704` -> `2002-07-04`.
3. `brightness` of MODIS rows only: `brightness = bright_t31 + f(brightness - bright_t31)`. `f` maps the MODIS fire signal
   onto the Suomi-NPP one (quantile mapping, separate for day and night), fitted on Aqua/SNPP pairs seen at the same
   place within 15 minutes. Result is capped at 367 K (the VIIRS ceiling) and never below `bright_t31` (so the 24 rows whose `bright_t31` is 400.1 K keep `brightness = bright_t31`).

Not changed: VIIRS rows (every value), and for all rows `bright_t31`, `frp`, `scan`, `track`, `version`, `instrument`, `type`.
No source row was deleted. The raw files are not modified, so the original MODIS values can always be regenerated.

## How to use it

```python
import pandas as pd

df = pd.read_csv("harmonized_hotspots.csv",
                 dtype={"acq_time": str, "version": str},
                 parse_dates=["acq_date"])

# Calendar: hotspots per month and year (harmonized series only)
s = df[df.in_calendar == 1]
cal = (s.groupby([s.acq_date.dt.year.rename("year"), s.acq_date.dt.month.rename("month")])
         .size().unstack("month", fill_value=0))

# Compare one month with the historical median of the same month
median = cal.median()                       # median over years, per month
anomaly = cal - median

# Area of interest + date range, for the map and the CSV download
box = df[(df.latitude.between(28, 30)) & (df.longitude.between(-108, -106)) &
         (df.acq_date >= "2020-01-01") & (df.acq_date <= "2020-12-31")]
box.to_csv("selection.csv", index=False)    # keep in_calendar so users know which rows are the series
```

For a map: draw the overview from `in_calendar == 1` (55,902 rows; the full file is too heavy for a browser), and color or
size points by `frp`.

## Limits (put these in the app)

- **Counts are "MODIS-equivalent" hotspots,** not every fire VIIRS saw. Small VIIRS fires are in the file (`in_calendar = 0`)
  but not in the series. Do not use the series for early warning of small fires.
- **About 10% offset:** the SNPP era reads ~10% above Aqua (SNPP/Aqua monthly ratio 1.07 to 1.20). Divide counts from 2012
  on by ~1.1 when comparing with earlier history, or warn the user.
- **The series ends 2026-07-31** (end of the SNPP file). Do not compare a partial last month with full months.
- **Regional calibration:** the 15 MW threshold and the brightness correction come from this region only.
- **Brightness is approximate.** After correction the MODIS median is within about 1 K of paired SNPP in daytime, but a single
  pixel can be off by ~11 K on average. Night is fitted on only 866 pairs; treat it as rough. Values above 367 K are flattened
  (the information is still in `frp`). Do not compare these values with the original FIRMS MODIS brightness or use old MODIS
  brightness thresholds. Brightness - `bright_t31` is positive in every MODIS row but does not rank intensity well; use `frp`.
- **Pre-2012 Aqua brightness** uses a correction fitted on 2012 and later, assuming the sensor stayed stable.
- **Terra** is not in the series (different overpass time, 10:30), and NOAA-20/NOAA-21 are not part of the input.

## Rebuild

```
export S3_BUCKET=<bucket>                       # plus AWS credentials in your environment (not in the repo)
python3 s3_io.py download data/                 # the two FIRMS archive CSVs (or download them from FIRMS yourself)
python3 build_harmonized_dataset.py data/fire_archive_M-C61_848902.csv data/fire_archive_SV-C2_842407.csv harmonized_hotspots.csv
python3 s3_io.py upload harmonized_hotspots.csv harmonized/harmonized_hotspots.csv     # optional
```
Needs Python 3, numpy and matplotlib. Inputs: FIRMS archive downloads for MODIS C6.1 (Terra+Aqua) and Suomi-NPP VIIRS 375 m, as CSV
(`acq_date` may be `YYYYMMDD` or `YYYY-MM-DD`). Parameters (15 MW threshold, 1.4 km cell, 367 K cap) are constants at the top of the script.
`s3_io.py` has not been run against the real bucket yet.

## Relation to the monthly k_m factor in the main README
The main README describes a monthly MODIS to VIIRS factor (k_m). This folder makes the two records comparable at the **detection level**
instead (which VIIRS rows count as MODIS-equivalent), and keeps all rows. The two approaches have not been reconciled; on the `in_calendar` series
a monthly Aqua/S-NPP factor should come out close to 1.
