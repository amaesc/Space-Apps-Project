# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Build ONE harmonized hotspot file from MODIS (Terra+Aqua) and VIIRS (SNPP) archive CSVs.
All rows are kept. Output = the 15 original FIRMS columns + ONE flag column `in_calendar`.

  in_calendar : 1 = row belongs to the consistent hotspot series used for counts/calendars:
                  Aqua (non-low confidence) before SNPP exists (2012-01-20), and
                  SNPP cells (1.4 km, 30 min, non-low pixels) whose summed FRP >= FRP_THRESHOLD -> the highest-FRP
                  pixel of each such cell. One afternoon (13:30) look per day, so counts do not jump when VIIRS takes over.
                0 = kept for detail only (Terra, Aqua after 2012, small VIIRS cells, other VIIRS pixels, low confidence).
Changes to existing fields (MODIS rows only, except the date):
  confidence : 0-100 -> l/n/h (FIRMS thresholds: <30 l, 30-79 n, >=80 h), same type as VIIRS
  acq_date   : ISO format
  brightness : brightness = bright_t31 + f(brightness - bright_t31). f is a monotonic quantile mapping of the MODIS
               fire signal (mid-IR minus thermal-IR) onto the SNPP one, fitted on Aqua<->SNPP pairs (same place, <=15 min),
               separately for day and night. Result is capped at 367 K (VIIRS ceiling) and never below bright_t31.
Everything else (bright_t31, frp, scan, track, version, instrument, type) is exactly as in the source.
An optional `region` column (added by clean_inputs.py) is passed through unchanged.

Usage: python3 -I build_harmonized_dataset.py <modis.csv> <snpp.csv> <out.csv> [--grid lcc|legacy] [--frp-threshold 15]
                                              [--thresholds calibration/thresholds.json]
  --thresholds   per-region thresholds from calibrate_threshold.py (cell -> region of its strongest pixel).
  --grid lcc     (default) km coordinates from Mexico ITRF2008 / LCC (EPSG:6372, INEGI's projection): valid for any
                 region in Mexico.
  --grid legacy  the original N. Chihuahua grid (equirectangular around 28.6 N, origin -109.5 / 25.5); reproduces the
                 published 55,902-row result exactly on the raw bbox archives.
"""
import argparse, csv, collections, json
import numpy as np
import pandas as pd
from pandas.api.types import union_categoricals
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("modis"); ap.add_argument("snpp"); ap.add_argument("out")
ap.add_argument("--grid", choices=("lcc", "legacy"), default="lcc")
ap.add_argument("--frp-threshold", type=float, default=15.0, help="cell FRP threshold (MW); fallback with --thresholds")
ap.add_argument("--thresholds", help="JSON {region: MW} from calibrate_threshold.py; a cell uses the threshold of the "
                                     "region of its strongest pixel (needs the `region` column)")
args = ap.parse_args()
MODIS_F, VIIRS_F, OUT = args.modis, args.snpp, args.out
FIG = OUT.rsplit(".", 1)[0] + "_brightness_mapping.png"
FRP_THRESHOLD, GK, CAP_K, SEAM = args.frp_threshold, 1.4, 367.0, 20120120
COLS = ["latitude","longitude","brightness","scan","track","acq_date","acq_time","satellite","instrument",
        "confidence","version","bright_t31","frp","daynight","type"]

# ---- read: every value kept as text, stored as categoricals (each distinct value once) so national runs fit in RAM ----
def read_text(path):
    parts = []
    for d in pd.read_csv(path, dtype=str, keep_default_na=False, chunksize=1_000_000):
        parts.append(d.astype("category"))
    return parts

parts = read_text(MODIS_F) + read_text(VIIRS_F)                 # MODIS first: on duplicate keys the first row wins
if "region" in parts[0].columns: COLS = COLS + ["region"]
recs = pd.DataFrame(index=pd.RangeIndex(sum(len(d) for d in parts)))
for c in COLS:
    col = [d[c] if c in d.columns else pd.Series(pd.Categorical.from_codes(np.zeros(len(d), np.int8), [""])) for d in parts]
    recs[c] = union_categoricals(col, sort_categories=True)
del parts
recs = recs[~recs.duplicated(subset=["latitude", "longitude", "acq_date", "acq_time", "satellite"], keep="first")]
recs = recs.reset_index(drop=True)
N = len(recs)

def num(c, f=float):
    """Column -> numpy array, converting each distinct text value once (same result as f(text) per row)."""
    cat = recs[c].cat
    return np.array([f(v) for v in cat.categories])[cat.codes.values]

def text(c):
    return np.asarray(recs[c].astype(object))

sat = text("satellite"); dn = text("daynight")
is_m = np.isin(sat, ("Terra", "Aqua"))
conf_txt = text("confidence")
low = np.zeros(N, bool)
low[is_m] = np.array([float(v) < 30 for v in conf_txt[is_m]])
low[~is_m] = conf_txt[~is_m] == "l"
lat = num("latitude"); lon = num("longitude")
date = num("acq_date", lambda v: int(v.replace("-", "")))
mins = num("acq_time", lambda v: int(v[:2])*60 + int(v[2:]))
b = num("brightness"); t31 = num("bright_t31"); frp = num("frp")
scan = num("scan"); track = num("track")
if args.grid == "legacy":
    X = (lon + 109.5)*111.32*np.cos(np.radians(28.6)); Y = (lat - 25.5)*111.32
else:
    from pyproj import Transformer
    X, Y = Transformer.from_crs(4326, 6372, always_xy=True).transform(lon, lat)
    X, Y = np.asarray(X)/1000.0, np.asarray(Y)/1000.0                   # metres -> km
print(f"grid: {args.grid}; FRP threshold: " + (f"per region from {args.thresholds} (fallback {FRP_THRESHOLD} MW)"
                                                 if args.thresholds else f"{FRP_THRESHOLD} MW"))
print(f"input rows {N}: MODIS {is_m.sum()}, SNPP {(~is_m).sum()}; low-confidence {low.sum()} (kept, flagged 0)")

# ---- SNPP cells from non-low pixels ----
vi = np.nonzero(~is_m & ~low)[0]
cx, cy = np.floor(X[vi]/GK).astype(np.int64), np.floor(Y[vi]/GK).astype(np.int64)
# group by (date, cell x, cell y, 30-min window) as separate columns: no packed integer key, so cell indices of any
# size or sign (whole of Mexico, Baja California west of the old origin) can never collide
ug, inv = np.unique(np.column_stack([date[vi], cx, cy, mins[vi]//30]), axis=0, return_inverse=True)
inv = inv.ravel()
# FRP comes with 0.01 MW precision: round the cell sum so float error (17.099999 vs 17.10) never decides a cell
gfrp = np.round(np.bincount(inv, weights=frp[vi]), 2); gn = np.bincount(inv)
gx = np.bincount(inv, weights=X[vi])/gn; gy = np.bincount(inv, weights=Y[vi])/gn; gt = np.bincount(inv, weights=mins[vi])/gn
order = np.lexsort((-frp[vi], inv)); first = np.ones(len(order), bool); first[1:] = inv[order][1:] != inv[order][:-1]
rep = vi[order[first]]
g_date, g_b, g_t31, g_dn = date[rep], b[rep], t31[rep], dn[rep]
g_thr = np.full(len(ug), FRP_THRESHOLD)                                  # per-cell threshold (MW)
if args.thresholds:
    if "region" not in COLS: raise SystemExit("--thresholds needs a `region` column (run clean_inputs.py first)")
    thr = json.load(open(args.thresholds))
    g_reg = text("region")[rep]
    missing = sorted(set(g_reg) - set(thr))
    if missing: print(f"! no fitted threshold for {missing}: using {FRP_THRESHOLD} MW there")
    g_thr = np.array([thr.get(r, FRP_THRESHOLD) for r in g_reg], dtype=float)
    for r in sorted(set(g_reg)):
        m_ = g_reg == r; print(f"  {r}: {g_thr[m_][0]} MW -> {(gfrp[m_] >= g_thr[m_]).sum()} of {m_.sum()} cells")
print(f"SNPP non-low pixels {len(vi)} -> cells {len(ug)}; cells with summed FRP >= threshold: {(gfrp >= g_thr).sum()}")

# ---- matched Aqua <-> SNPP cell pairs ----
bk = collections.defaultdict(list)
for g in range(len(ug)): bk[(g_date[g], int(gx[g]//3), int(gy[g]//3))].append(g)
pa, pg = [], []
for i in np.nonzero((sat == "Aqua") & (date >= SEAM) & ~low)[0]:
    half = 0.5*max(scan[i], track[i]) + 0.2 + 0.5*GK
    cand = []
    for ax in (-1, 0, 1):
        for ay in (-1, 0, 1):
            cand += bk.get((date[i], int(X[i]//3)+ax, int(Y[i]//3)+ay), [])
    if not cand: continue
    cand = np.array(cand)
    ok = (np.abs(gx[cand]-X[i]) <= half) & (np.abs(gy[cand]-Y[i]) <= half) & (np.abs(gt[cand]-mins[i]) <= 15) & (g_dn[cand] == dn[i])
    if not ok.any(): continue
    cand = cand[ok]; pa.append(i); pg.append(cand[np.argmin(np.hypot(gx[cand]-X[i], gy[cand]-Y[i]))])
pa, pg = np.array(pa), np.array(pg)
p_date, p_dn = date[pa], dn[pa]
mx = b[pa] - t31[pa]; vy = g_b[pg] - t31[pa]            # MODIS fire signal -> (paired SNPP brightness) minus the MODIS pixel own bright_t31
print(f"matched Aqua<->SNPP pairs: {len(pa)} (day {np.sum(p_dn=='D')}, night {np.sum(p_dn=='N')})")

U = np.concatenate([np.linspace(0, .9, 91), np.linspace(.91, 1, 91)])
def fit(x, y): return np.maximum.accumulate(np.quantile(x, U)), np.maximum.accumulate(np.quantile(y, U))
def apply(curve, bb, tt):
    qx, qy = curve; d = bb - tt
    f = np.interp(d, qx, qy)
    f = np.where(d < qx[0], qy[0] + (d - qx[0]), f); f = np.where(d > qx[-1], qy[-1] + (d - qx[-1]), f)
    f = np.maximum(f, 0.0)
    return np.maximum(np.minimum(tt + f, CAP_K), tt)               # <= 367 K, never below bright_t31
def ks(a, c):
    v = np.sort(np.concatenate([a, c])); return np.max(np.abs(np.searchsorted(np.sort(a), v, "right")/len(a) - np.searchsorted(np.sort(c), v, "right")/len(c)))

print("\nHELD-OUT CHECK: fit on 2012-2019 pairs, test on 2020-2026 pairs.  Brightness (K): MODIS vs paired SNPP cell")
qs5 = [5, 25, 50, 75, 95]; held = []
for d in ("D", "N"):
    tr = (p_date < 20200101) & (p_dn == d); te = (p_date >= 20200101) & (p_dn == d)
    curve = fit(mx[tr], vy[tr]); bb, tt = b[pa][te], t31[pa][te]; bnew = apply(curve, bb, tt)
    ysn = g_b[pg][te]
    for name, x in (("before", bb), ("after ", bnew)):
        print(f"  {'day  ' if d=='D' else 'night'} {name} n={te.sum():5d}  quantile gap vs SNPP {np.round(np.percentile(x, qs5)-np.percentile(ysn, qs5),1)}  KS={ks(x, ysn):.3f}  pair MAE={np.mean(np.abs(x-ysn)):.1f} K")
    held.append((d, bb, bnew, ysn))
curves = {d: fit(mx[p_dn == d], vy[p_dn == d]) for d in ("D", "N")}

# ---- flag + conversions ----
flag = np.zeros(N, int)
flag[(sat == "Aqua") & (date < SEAM) & ~low] = 1
flag[rep[gfrp >= g_thr]] = 1
bnew = b.copy()
for d in ("D", "N"):
    m = is_m & (dn == d); bnew[m] = apply(curves[d], b[m], t31[m])

# output: original text, except acq_date -> YYYY-MM-DD, MODIS confidence -> l/n/h and MODIS brightness -> mapped (.1f)
dcat = recs["acq_date"].cat.categories
iso = [v if "-" in v else f"{v[:4]}-{v[4:6]}-{v[6:]}" for v in dcat]
recs["acq_date"] = pd.Categorical(np.array(iso, dtype=object)[recs["acq_date"].cat.codes.values])
conf_out = conf_txt.copy()
conf_out[is_m] = np.array(["l" if float(v) < 30 else ("h" if float(v) >= 80 else "n") for v in conf_txt[is_m]], dtype=object)
recs["confidence"] = pd.Categorical(conf_out)
b_out = text("brightness").copy()
b_out[is_m] = np.array([f"{x:.1f}" for x in bnew[is_m]], dtype=object)
recs["brightness"] = b_out
recs["in_calendar"] = flag
for c in ("acq_date", "acq_time", "satellite"):        # sort on text order, stable (same as Python's list.sort)
    recs[c] = recs[c].cat.set_categories(sorted(recs[c].cat.categories), ordered=True)
recs = recs.sort_values(["acq_date", "acq_time", "satellite"], kind="mergesort")
recs[COLS + ["in_calendar"]].to_csv(OUT, index=False, lineterminator="\r\n", quoting=csv.QUOTE_MINIMAL)
print(f"\nwrote {OUT}: {N} rows, {len(COLS)+1} columns; in_calendar=1 on {flag.sum()} rows (Aqua {(flag.astype(bool)&(sat=='Aqua')).sum()}, SNPP {(flag.astype(bool)&(sat=='SNPP')).sum()})")
yc = collections.Counter(recs.loc[recs["in_calendar"] == 1, "acq_date"].astype(str).str[:4]); print("calendar hotspots per year:", {y: yc[y] for y in sorted(yc)})

# ---- relationship checks on the result ----
mm = is_m & ~low
print("\nRELATION brightness vs bright_t31 (fire signal dT = brightness - bright_t31), MODIS rows non-low")
for d in ("D", "N"):
    m = mm & (dn == d); s = ~is_m & ~low & (dn == d)
    print(f"  {'day  ' if d=='D' else 'night'} median dT: MODIS original {np.median((b-t31)[m]):.1f} -> mapped {np.median((bnew-t31)[m]):.1f};  SNPP {np.median((b-t31)[s]):.1f}")
print(f"  corr(dT, log FRP) MODIS original {np.corrcoef((b-t31)[mm], np.log10(frp[mm]))[0,1]:.3f} -> mapped {np.corrcoef((bnew-t31)[mm], np.log10(frp[mm]))[0,1]:.3f}")
print(f"  MODIS rows with brightness < bright_t31: original {(b[is_m] < t31[is_m]).sum()} -> mapped {(bnew[is_m] < t31[is_m]).sum()}")
print(f"  MODIS rows at the 367 K cap: {(bnew[is_m] >= CAP_K-0.05).mean()*100:.1f}%")
print(f"  rank correlation original vs mapped brightness: {np.corrcoef(np.argsort(np.argsort(b[mm])), np.argsort(np.argsort(bnew[mm])))[0,1]:.4f}")

fig, ax = plt.subplots(1, 3, figsize=(16, 5)); qq = np.linspace(1, 99, 99)
for a_, (d, x0, x1, y) in zip(ax[:2], held):
    a_.plot(np.percentile(y, qq), np.percentile(x0, qq), label="MODIS before"); a_.plot(np.percentile(y, qq), np.percentile(x1, qq), label="MODIS after")
    a_.plot([295, 370], [295, 370], "k--", lw=1); a_.set_xlabel("paired SNPP brightness quantiles (K)"); a_.set_ylabel("MODIS quantiles (K)")
    a_.set_title(f"Held-out 2020-2026, {'day' if d=='D' else 'night'}"); a_.legend()
a_ = ax[2]
for d, c in (("D", "tab:orange"), ("N", "tab:blue")):
    xs = np.linspace(0, 120, 200); a_.plot(xs, apply(curves[d], 290+xs, np.full_like(xs, 290)) - 290, c=c, label="day" if d == "D" else "night")
a_.plot([0, 120], [0, 120], "k--", lw=1); a_.set_xlabel("MODIS fire signal, original (K)"); a_.set_ylabel("harmonized (K)")
a_.set_title("Mapping of brightness - bright_t31 (t31 = 290 K)"); a_.legend()
fig.tight_layout(); fig.savefig(FIG, dpi=110); print("saved", FIG)
