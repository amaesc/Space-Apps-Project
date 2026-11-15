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
Usage: python3 -I build_harmonized_dataset.py <modis.csv> <snpp.csv> <out.csv>
"""
import sys, csv, collections
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

MODIS_F, VIIRS_F, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FIG = OUT.rsplit(".", 1)[0] + "_brightness_mapping.png"
FRP_THRESHOLD, GK, CAP_K, SEAM = 15.0, 1.4, 367.0, 20120120
COLS = ["latitude","longitude","brightness","scan","track","acq_date","acq_time","satellite","instrument",
        "confidence","version","bright_t31","frp","daynight","type"]

recs, seen = [], set()
for f in (MODIS_F, VIIRS_F):
    for r in csv.DictReader(open(f)):
        k = (r["latitude"], r["longitude"], r["acq_date"], r["acq_time"], r["satellite"])
        if k in seen: continue
        seen.add(k); r.setdefault("type", ""); recs.append(r)
N = len(recs)
is_m = np.array([r["satellite"] in ("Terra", "Aqua") for r in recs])
low = np.array([(float(r["confidence"]) < 30) if is_m[i] else (r["confidence"] == "l") for i, r in enumerate(recs)])
lat = np.array([float(r["latitude"]) for r in recs]); lon = np.array([float(r["longitude"]) for r in recs])
date = np.array([int(r["acq_date"].replace("-", "")) for r in recs])
mins = np.array([int(r["acq_time"][:2])*60 + int(r["acq_time"][2:]) for r in recs])
sat = np.array([r["satellite"] for r in recs]); b = np.array([float(r["brightness"]) for r in recs])
t31 = np.array([float(r["bright_t31"]) for r in recs]); frp = np.array([float(r["frp"]) for r in recs])
scan = np.array([float(r["scan"]) for r in recs]); track = np.array([float(r["track"]) for r in recs])
dn = np.array([r["daynight"] for r in recs])
X = (lon + 109.5)*111.32*np.cos(np.radians(28.6)); Y = (lat - 25.5)*111.32
print(f"input rows {N}: MODIS {is_m.sum()}, SNPP {(~is_m).sum()}; low-confidence {low.sum()} (kept, flagged 0)")

# ---- SNPP cells from non-low pixels ----
vi = np.nonzero(~is_m & ~low)[0]
cx, cy = np.floor(X[vi]/GK).astype(np.int64), np.floor(Y[vi]/GK).astype(np.int64)
gkey = ((date[vi]*1000 + cx)*1000 + cy)*100 + mins[vi]//30
ug, inv = np.unique(gkey, return_inverse=True)
gfrp = np.bincount(inv, weights=frp[vi]); gn = np.bincount(inv)
gx = np.bincount(inv, weights=X[vi])/gn; gy = np.bincount(inv, weights=Y[vi])/gn; gt = np.bincount(inv, weights=mins[vi])/gn
order = np.lexsort((-frp[vi], inv)); first = np.ones(len(order), bool); first[1:] = inv[order][1:] != inv[order][:-1]
rep = vi[order[first]]
g_date, g_b, g_t31, g_dn = date[rep], b[rep], t31[rep], dn[rep]
print(f"SNPP non-low pixels {len(vi)} -> cells {len(ug)}; cells with summed FRP >= {FRP_THRESHOLD} MW: {(gfrp >= FRP_THRESHOLD).sum()}")

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
flag[rep[gfrp[np.arange(len(ug))] >= FRP_THRESHOLD]] = 1
bnew = b.copy()
for d in ("D", "N"):
    m = is_m & (dn == d); bnew[m] = apply(curves[d], b[m], t31[m])

out = []
for i in range(N):
    r = dict(recs[i]); dd = r["acq_date"]
    if "-" not in dd: r["acq_date"] = f"{dd[:4]}-{dd[4:6]}-{dd[6:]}"
    if is_m[i]:
        v = float(r["confidence"]); r["confidence"] = "l" if v < 30 else ("h" if v >= 80 else "n")
        r["brightness"] = f"{bnew[i]:.1f}"
    r["in_calendar"] = int(flag[i]); out.append(r)
out.sort(key=lambda r: (r["acq_date"], r["acq_time"], r["satellite"]))
with open(OUT, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=COLS + ["in_calendar"], extrasaction="ignore"); w.writeheader(); w.writerows(out)
print(f"\nwrote {OUT}: {len(out)} rows, {len(COLS)+1} columns; in_calendar=1 on {flag.sum()} rows (Aqua {(flag.astype(bool)&(sat=='Aqua')).sum()}, SNPP {(flag.astype(bool)&(sat=='SNPP')).sum()})")
yc = collections.Counter(r["acq_date"][:4] for r in out if r["in_calendar"] == 1); print("calendar hotspots per year:", {y: yc[y] for y in sorted(yc)})

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
