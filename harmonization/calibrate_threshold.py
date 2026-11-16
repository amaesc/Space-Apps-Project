"""Fit the SNPP-cell FRP threshold per region so SNPP-era counts match Aqua (count parity), and validate on later years.

`in_calendar` counts Aqua non-low pixels before 2012-01-20 and, after, SNPP cells (1.4 km, 30 min, non-low pixels)
whose summed FRP >= T. For a continuous series, SNPP cells >= T should be as many as Aqua pixels over the same
period. For each region we solve that exactly on the TRAIN years (T* = the n_aqua-th largest cell FRP), bootstrap
the train years for a 90% interval, then check the ratio on the TEST years and against the fixed 15 MW.

    python3 -I calibrate_threshold.py clean/modis.csv clean/snpp.csv --out calibration/
    python3 -I calibrate_threshold.py clean/modis.csv clean/snpp.csv --out calibration/ --split my_regions.geojson

Low-sample regions can borrow strength: --merge "Tlaxcala=Puebla" fits Tlaxcala's T* on Tlaxcala + Puebla train data
(partners joined with "+", "*" = all regions pooled). Only the region on the left gets that T*; partners keep their own,
and every region is still tested on its own held-out data. The pool used is reported in summary.csv (`fit_on`).

Regions come from the `region` column (clean_inputs.py) or from --split (GeoJSON, any polygons, --name-field).
Same cell definition as build_harmonized_dataset.py (EPSG:6372 km grid). Outputs: thresholds.json (region -> T*),
summary.csv, by_year.csv.
"""
import argparse, json, os
import numpy as np
import pandas as pd
import shapely
from shapely.geometry import shape
from pyproj import Transformer

GK, SEAM = 1.4, "2012-01-20"
TO_KM = Transformer.from_crs(4326, 6372, always_xy=True)


def load(path, sensor):
    d = pd.read_csv(path, dtype={"confidence": str, "acq_time": str, "acq_date": str}, low_memory=False)
    if "region" not in d: d["region"] = "all"
    low = (pd.to_numeric(d["confidence"], errors="coerce") < 30) if sensor == "modis" else d["confidence"].eq("l")
    d = d[~low].copy()
    d["year"] = d["acq_date"].str[:4].astype(int); d["ym"] = d["acq_date"].str[:7]
    return d


def relabel(d, split, field):
    feats = json.load(open(split))["features"]
    lon, lat = d["longitude"].values, d["latitude"].values
    reg = np.full(len(d), None, dtype=object)
    for i, f in enumerate(feats):
        g = shape(f["geometry"]); shapely.prepare(g)
        hit = (reg == None) & shapely.contains_xy(g, lon, lat)  # noqa: E711
        reg[hit] = str(f["properties"].get(field, i))
    d = d.assign(region=reg)
    return d[d["region"].notna()]


def snpp_cells(v):
    x, y = TO_KM.transform(v["longitude"].values, v["latitude"].values)
    mins = v["acq_time"].str.zfill(4).str[:2].astype(int) * 60 + v["acq_time"].str.zfill(4).str[2:].astype(int)
    v = v.assign(cx=np.floor(np.asarray(x) / 1000 / GK).astype(np.int64), cy=np.floor(np.asarray(y) / 1000 / GK).astype(np.int64),
                 tb=(mins // 30).values)
    v = v.sort_values("frp", ascending=False, kind="mergesort")          # first row of each group = strongest pixel
    g = v.groupby(["acq_date", "cx", "cy", "tb"], sort=False)
    cells = g.agg(frp=("frp", "sum"), region=("region", "first"), year=("year", "first"), ym=("ym", "first")).reset_index()
    cells["frp"] = cells["frp"].round(2)  # 0.01 MW precision, same as build_harmonized_dataset.py: T* = an exact cell sum
    return cells


def t_star(cell_frp, n_target):
    s = np.sort(cell_frp)[::-1]
    if n_target <= 0 or len(s) == 0: return np.nan
    return float(s[min(n_target, len(s)) - 1])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("modis"); ap.add_argument("snpp")
    ap.add_argument("--out", required=True)
    ap.add_argument("--split", help="GeoJSON with custom regions (overrides the `region` column)")
    ap.add_argument("--name-field", default="NOMGEO")
    ap.add_argument("--train", default="2012-2019", help="train years, e.g. 2012-2019")
    ap.add_argument("--test", default="2020-2025", help="test years, e.g. 2020-2025 (full years only)")
    ap.add_argument("--fixed", type=float, default=15.0, help="current threshold, for comparison")
    ap.add_argument("--min-aqua", type=int, default=200, help="warn below this many Aqua train detections")
    ap.add_argument("--boot", type=int, default=1000)
    ap.add_argument("--merge", nargs="*", default=[], metavar="REGION=PARTNER[+PARTNER]",
                    help='fit REGION on REGION + partners ("*" = all regions), e.g. "Tlaxcala=Puebla"')
    a = ap.parse_args()
    tr0, tr1 = map(int, a.train.split("-")); te0, te1 = map(int, a.test.split("-"))

    m, v = load(a.modis, "modis"), load(a.snpp, "snpp")
    if a.split:
        m, v = relabel(m, a.split, a.name_field), relabel(v, a.split, a.name_field)
    aqua = m[(m["satellite"] == "Aqua") & (m["acq_date"] >= SEAM)]
    cells = snpp_cells(v[v["acq_date"] >= SEAM])
    print(f"Aqua non-low pixels (>= {SEAM}): {len(aqua):,}; SNPP cells: {len(cells):,}; regions: {cells['region'].nunique()}")

    all_regs = sorted(cells["region"].unique())
    pools = {}
    for spec in a.merge:
        reg, _, partners = spec.partition("=")
        reg, partners = reg.strip(), [x.strip() for x in partners.split("+") if x.strip()]
        pool = all_regs if partners == ["*"] else [reg] + partners
        unknown = sorted(set([reg] + pool) - set(all_regs))
        if not partners or unknown: raise SystemExit(f"--merge {spec!r}: bad spec or unknown region(s) {unknown}")
        pools[reg] = pool

    rng = np.random.default_rng(0)
    summary, by_year, thresholds = [], [], {}
    for reg in all_regs:
        c, q = cells[cells["region"] == reg], aqua[aqua["region"] == reg]
        c_tr, q_tr = c[c["year"].between(tr0, tr1)], q[q["year"].between(tr0, tr1)]
        c_te, q_te = c[c["year"].between(te0, te1)], q[q["year"].between(te0, te1)]
        pool = pools.get(reg, [reg])
        fit_on = "own" if pool == [reg] else ("all regions" if pool == all_regs else " + ".join(pool))
        if pool != [reg]:   # fit (and bootstrap) on the pooled train data; test stays on this region only
            c_tr = cells[cells["region"].isin(pool) & cells["year"].between(tr0, tr1)]
            q_fit = aqua[aqua["region"].isin(pool) & aqua["year"].between(tr0, tr1)]
        else:
            q_fit = q_tr
        T = t_star(c_tr["frp"].values, len(q_fit))

        # bootstrap over train years: resample whole years, refit T*
        yrs = np.arange(tr0, tr1 + 1)
        cy_frp = {y: c_tr.loc[c_tr["year"] == y, "frp"].values for y in yrs}
        qy_n = q_fit["year"].value_counts().reindex(yrs, fill_value=0)
        boots = []
        for _ in range(a.boot):
            ys = rng.choice(yrs, len(yrs))
            boots.append(t_star(np.concatenate([cy_frp[y] for y in ys]), int(qy_n.loc[ys].sum())))
        lo, hi = np.nanpercentile(boots, [5, 95])

        def ratio(cc, qq, t): return (cc["frp"] >= t).sum() / max(len(qq), 1)
        def corr(cc, qq, t):
            s = cc[cc["frp"] >= t].groupby("ym").size(); n = qq.groupby("ym").size()
            j = pd.concat([s, n], axis=1).fillna(0)
            return float(np.corrcoef(j.iloc[:, 0], j.iloc[:, 1])[0, 1]) if len(j) > 2 else np.nan

        row = {"region": reg, "fit_on": fit_on, "aqua_train": len(q_tr), "aqua_test": len(q_te), "T_star_MW": round(T, 2),
               "T_p05": round(lo, 2), "T_p95": round(hi, 2),
               "test_ratio_T_star": round(ratio(c_te, q_te, T), 3), f"test_ratio_{a.fixed:g}MW": round(ratio(c_te, q_te, a.fixed), 3),
               "test_monthly_corr_T_star": round(corr(c_te, q_te, T), 3),
               "low_sample": len(q_fit) < a.min_aqua}
        summary.append(row); thresholds[reg] = round(T, 2)
        for y in range(tr0, te1 + 1):
            cc, qq = c[c["year"] == y], q[q["year"] == y]
            by_year.append({"region": reg, "year": y, "set": "train" if y <= tr1 else "test", "aqua": len(qq),
                            "ratio_T_star": round(ratio(cc, qq, T), 3), f"ratio_{a.fixed:g}MW": round(ratio(cc, qq, a.fixed), 3)})

    os.makedirs(a.out, exist_ok=True)
    s = pd.DataFrame(summary); s.to_csv(os.path.join(a.out, "summary.csv"), index=False)
    pd.DataFrame(by_year).to_csv(os.path.join(a.out, "by_year.csv"), index=False)
    json.dump(thresholds, open(os.path.join(a.out, "thresholds.json"), "w"), indent=1, ensure_ascii=False)
    pd.set_option("display.width", 200)
    print(f"\ntrain {a.train}, test {a.test}  (ratio = SNPP cells >= T / Aqua non-low pixels; 1.0 = no seam step)")
    print(s.to_string(index=False))
    if s["low_sample"].any():
        print(f"\n! regions with < {a.min_aqua} Aqua train detections: T* is unreliable, consider --merge")
    print(f"\nwrote {a.out}/thresholds.json, summary.csv, by_year.csv")


if __name__ == "__main__":
    main()
