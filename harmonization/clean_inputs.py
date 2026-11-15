"""Clean raw FIRMS MODIS + SNPP CSVs for any study area in Mexico, before build_harmonized_dataset.py.

Raw FIRMS schema in, raw FIRMS schema out (+ a `region` column): values are copied as text, never re-formatted,
so the output drops straight into the harmonization step.

    python3 -I clean_inputs.py --boundary boundaries/chihuahua_state.geojson \
        --modis fire_archive_M-C61_848902.csv [fire_nrt_M-C61_848902.csv] \
        --snpp  fire_archive_SV-C2_842407.csv [fire_nrt_SV-C2_842407.csv] \
        --out-dir clean/
    python3 -I build_harmonized_dataset.py clean/modis.csv clean/snpp.csv harmonized_hotspots.csv

--boundary is a WGS84 GeoJSON with one feature per region (one state, or all 32 from INEGI's 00ent.shp; see
boundaries/geojson_convert.py). Each row gets `region` = the --name-field of the feature that contains it.

Steps (rows are dropped, never modified, except acq_date -> YYYY-MM-DD):
  1. Clip to the union of the boundary features. The FIRMS download box always spills over the edges: for
     Chihuahua it included the Texas/New Mexico Permian Basin, whose gas flares were ~9% of SNPP detections and
     mostly unflagged (type 0).
  2. Drop non-vegetation detections: type 1 (volcano), 2 (static land source), 3 (offshore). NRT files have no
     `type`, so NRT rows in archive static-source cells (0.01 deg, >=5 detections, >=50% type 1-3) are dropped too.
  3. Archive/NRT seam: NRT rows on or before the last archive date of the same satellite are dropped (archive
     is science quality), then exact duplicates (lat, lon, date, time, satellite).
  4. Check: night share of detections within 2 km of the study-area edge vs the interior. Much higher near the
     edge means unflagged flares are leaking in (pixel centres inside, source outside) -> buffer that edge.
"""
import argparse, json, os, sys
import numpy as np
import pandas as pd
from pandas.api.types import union_categoricals
import shapely
from shapely.geometry import shape
from pyproj import Transformer

STATIC_CELL, STATIC_MIN_N, STATIC_MIN_SHARE = 0.01, 5, 0.5
COLS = ["latitude", "longitude", "brightness", "scan", "track", "acq_date", "acq_time", "satellite", "instrument",
        "confidence", "version", "bright_t31", "frp", "daynight", "type"]
KEY = ["latitude", "longitude", "acq_date", "acq_time", "satellite"]
TO_KM = Transformer.from_crs(4326, 6372, always_xy=True)          # INEGI Mexico LCC, metres


def _date_iso(v):
    v = v.strip()
    return v if "-" in v or len(v) != 8 or not v.isdigit() else f"{v[:4]}-{v[4:6]}-{v[6:]}"


def read(paths):
    """Read FIRMS CSVs as text, every column categorical: each distinct value is stored once, so the national archives
    (~9M rows) fit in a few hundred MB instead of one Python string per cell. Values stay exactly as written."""
    parts = []
    for p in paths:
        # read as text (every value kept exactly) in 1M-row chunks; each chunk becomes categorical right away
        for d in pd.read_csv(p, dtype=str, keep_default_na=False, chunksize=1_000_000):
            if "type" not in d: d["type"] = ""
            d = d[COLS].astype("category")
            iso = pd.Index([_date_iso(c) for c in d["acq_date"].cat.categories])
            d["acq_date"] = (d["acq_date"].cat.rename_categories(iso) if iso.is_unique
                             else d["acq_date"].astype(object).map(_date_iso).astype("category"))
            d["_nrt"] = "nrt" in os.path.basename(p).lower()
            parts.append(d)
    out = pd.DataFrame({"_nrt": np.concatenate([d["_nrt"].values for d in parts])})
    for c in COLS:
        u = union_categoricals([d[c] for d in parts], sort_categories=True)   # sorted -> ordered = text order
        out[c] = pd.Categorical.from_codes(u.codes, u.categories, ordered=True)
    return out


def cells(d):
    """0.01 deg cell id as one int64 (same cells as floor(lat/0.01), floor(lon/0.01))."""
    lat, lon = d["latitude"].astype(float).values, d["longitude"].astype(float).values
    return np.floor(lat / STATIC_CELL).astype(np.int64) * 100_000 + (np.floor(lon / STATIC_CELL).astype(np.int64) + 50_000)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--boundary", required=True, help="WGS84 GeoJSON, one feature per region")
    ap.add_argument("--name-field", default="NOMGEO", help="feature property used for `region` (INEGI: NOMGEO)")
    ap.add_argument("--modis", nargs="+", required=True, help="MODIS archive (+ optional NRT) CSVs")
    ap.add_argument("--snpp", nargs="+", required=True, help="SNPP archive (+ optional NRT) CSVs")
    ap.add_argument("--out-dir", required=True)
    a = ap.parse_args()

    feats = json.load(open(a.boundary))["features"]
    regions = [(str(f["properties"].get(a.name_field, i)), shape(f["geometry"])) for i, f in enumerate(feats)]
    for _, g in regions: shapely.prepare(g)
    area = shapely.union_all([g for _, g in regions])
    print(f"boundary: {len(regions)} region(s): {', '.join(n for n, _ in regions[:6])}{' ...' if len(regions) > 6 else ''}")
    data = {"modis": read(a.modis), "snpp": read(a.snpp)}

    # 1. clip + region label (first containing feature wins on shared borders); bbox prefilter, then exact test
    for k, d in data.items():
        lon, lat = d["longitude"].astype(float).values, d["latitude"].astype(float).values
        reg = np.full(len(d), -1, dtype=np.int16)
        for r, (name, g) in enumerate(regions):
            x0, y0, x1, y1 = g.bounds
            cand = np.flatnonzero((reg == -1) & (lon >= x0) & (lon <= x1) & (lat >= y0) & (lat <= y1))
            reg[cand[shapely.contains_xy(g, lon[cand], lat[cand])]] = r
        keep = reg >= 0
        d = d[keep].copy()
        d["region"] = pd.Categorical.from_codes(reg[keep], [n for n, _ in regions])
        data[k] = d.reset_index(drop=True)
        print(f"[clip]   {k:5s} kept {keep.sum():>9,} of {len(keep):>9,} ({keep.mean():.1%})")

    # 2. static sources: cells learned from both sensors' archive rows (a flare is a place, not a sensor)
    arch = [d[~d["_nrt"]] for d in data.values()]
    st = pd.DataFrame({"cell": np.concatenate([cells(d) for d in arch]),
                       "bad": np.concatenate([d["type"].isin(["1", "2", "3"]).values for d in arch])})
    st = st.groupby("cell")["bad"].agg(["size", "mean"])
    static = st[(st["size"] >= STATIC_MIN_N) & (st["mean"] >= STATIC_MIN_SHARE)].index.values
    del arch
    for k, d in data.items():
        bad_type = d["type"].isin(["1", "2", "3"]).values
        bad_nrt = d["_nrt"].values & np.isin(cells(d), static)
        data[k] = d[~bad_type & ~bad_nrt].reset_index(drop=True)
        print(f"[static] {k:5s} dropped {bad_type.sum():,} type 1-3 + {bad_nrt.sum():,} NRT rows in {len(static)} static cells")

    # 3. seams + duplicates
    for k, d in data.items():
        nrt = d["_nrt"].values
        last = d[~nrt].groupby("satellite", observed=True)["acq_date"].max()
        seam = np.zeros(len(d), bool)
        for sat, end in last.items():
            seam |= nrt & (d["satellite"] == sat).values & (d["acq_date"] <= end).values
        d = d[~seam]
        out = d.drop_duplicates(subset=KEY)
        print(f"[seam]   {k:5s} dropped {seam.sum():,} NRT rows overlapping the archive, {len(d) - len(out):,} duplicates")
        first_nrt = out[out["_nrt"]].groupby("satellite", observed=True)["acq_date"].min()
        for sat in last.index:
            if sat in first_nrt:
                print(f"         {sat}: archive ends {last[sat]}, NRT starts {first_nrt[sat]}")
        data[k] = out.reset_index(drop=True)

    # 4. edge check (km in EPSG:6372), per sensor and in chunks so no full copy of the rows is made
    edge = shapely.transform(area.boundary, lambda c: np.column_stack(TO_KM.transform(c[:, 0], c[:, 1])))
    shapely.prepare(edge)
    n_near = n_night_near = n_far = n_night_far = 0
    per_region = pd.Series(dtype=np.int64)
    for d in data.values():
        night = (d["daynight"] == "N").values
        lon, lat = d["longitude"].astype(float).values, d["latitude"].astype(float).values
        near = np.zeros(len(d), bool)
        for s in range(0, len(d), 500_000):
            x, y = TO_KM.transform(lon[s:s + 500_000], lat[s:s + 500_000])
            near[s:s + 500_000] = shapely.dwithin(edge, shapely.points(x, y), 2000)
        n_near += near.sum(); n_night_near += (night & near).sum()
        n_far += (~near).sum(); n_night_far += (night & ~near).sum()
        per_region = per_region.add(d["region"].value_counts(), fill_value=0)
    print(f"[check]  within 2 km of the study-area edge: {n_near:,} rows; night share {n_night_near / max(n_near, 1):.0%} "
          f"vs {n_night_far / max(n_far, 1):.0%} inside (much higher -> flares leaking in)")
    top = per_region.astype(np.int64).sort_values(ascending=False, kind="mergesort").head(8)
    print("         per region: " + ", ".join(f"{r} {n:,}" for r, n in top.items()))

    os.makedirs(a.out_dir, exist_ok=True)
    for k, d in data.items():
        d = d.sort_values(["acq_date", "acq_time", "satellite"], kind="mergesort")
        path = os.path.join(a.out_dir, f"{k}.csv")
        d[COLS + ["region"]].to_csv(path, index=False)
        print(f"[write]  {path}: {len(d):,} rows")


if __name__ == "__main__":
    sys.exit(main())
