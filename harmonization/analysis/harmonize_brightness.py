# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Make MODIS/VIIRS mid-IR brightness comparable, and use it to harmonize hotspot COUNTS.
 1. brightness temperature -> radiance (Planck), because radiance adds linearly across pixels
 2. upscale VIIRS to each Aqua-MODIS footprint (area-weighted mean radiance, background filled in)
 3. compare in radiance space with an errors-in-both-axes (orthogonal) fit
 4. detection efficiency of MODIS vs. VIIRS signal -> a MODIS-equivalent VIIRS hotspot definition
 5. validate on monthly counts (Aqua vs Suomi-NPP: same overpass time)
Usage: python3 -I harmonize_brightness.py <datasets_dir> <out_dir>
"""
import sys, csv, glob, os, collections
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

DATA, OUT = sys.argv[1], sys.argv[2]
H, C, K = 6.62607015e-34, 2.99792458e8, 1.380649e-23
LAM = {"M_mir": 3.959, "V_mir": 3.740, "M_tir": 11.03, "V_tir": 11.45}          # micrometres

def planck(T, lam_um):                                    # W m-2 sr-1 um-1
    lam = lam_um * 1e-6
    return 2*H*C**2 / lam**5 / np.expm1(H*C/(lam*K*np.asarray(T, float))) * 1e-6
def inv_planck(L, lam_um):
    lam = lam_um * 1e-6
    return H*C/(lam*K) / np.log1p(2*H*C**2 / lam**5 * 1e-6 / np.asarray(L, float))

# ---------- load ----------
rows, seen = [], set()
for f in sorted(glob.glob(os.path.join(DATA, "*", "*.csv"))):
    for r in csv.DictReader(open(f)):
        key = (r["latitude"], r["longitude"], r["acq_date"], r["acq_time"], r["satellite"])
        if key in seen: continue
        seen.add(key)
        conf = r["confidence"]
        low = (conf == "l") or (conf not in ("l","n","h") and float(conf) < 30)
        rows.append((float(r["latitude"]), float(r["longitude"]), int(r["acq_date"].replace("-","")),
                     int(r["acq_time"][:2])*60 + int(r["acq_time"][2:]), r["satellite"],
                     float(r["scan"]), float(r["track"]), float(r["brightness"]), float(r["bright_t31"]),
                     float(r["frp"]), low))
dt = np.dtype([("lat","f8"),("lon","f8"),("date","i8"),("min","i4"),("sat","U8"),("scan","f8"),("track","f8"),
               ("b","f8"),("t31","f8"),("frp","f8"),("low","?")])
T = np.array(rows, dtype=dt)
T = T[~T["low"]]                                          # drop low-confidence for the calibration work
lat0 = 28.6
X = (T["lon"] + 109.5) * 111.32 * np.cos(np.radians(lat0)); Y = (T["lat"] - 25.5) * 111.32
area = T["scan"] * T["track"]
isV = np.isin(T["sat"], ["SNPP", "N20", "N21"]); isA = T["sat"] == "Aqua"
print("detections used (non-low confidence): VIIRS", isV.sum(), " Aqua", isA.sum(), " Terra", (T['sat']=='Terra').sum())

# ---------- 1. radiance ----------
Lmir = np.where(isV, planck(T["b"], LAM["V_mir"]), planck(T["b"], LAM["M_mir"]))
sat_flag = isV & (T["b"] >= 366.5)

# ---------- 2. match Aqua pixels with ONE VIIRS overpass (<=15 min), upscale in radiance ----------
CK = 3.0
bk = collections.defaultdict(list)
for i in np.nonzero(isV)[0]:
    bk[(T["date"][i], int(X[i]//CK), int(Y[i]//CK))].append(i)

def background_L(t31_modis, offset):                      # background mid-IR radiance proxy from the 11um temperature
    return planck(t31_modis + offset, LAM["M_mir"])

res = []                                                   # per matched Aqua pixel
for i in np.nonzero(isA)[0]:
    kx, ky = int(X[i]//CK), int(Y[i]//CK); half = 0.5*max(T["scan"][i], T["track"][i]) + 0.2
    cand = []
    for ax in (-1,0,1):
        for ay in (-1,0,1):
            cand += bk.get((T["date"][i], kx+ax, ky+ay), [])
    if not cand: continue
    cand = np.array(cand)
    ok = (np.abs(X[cand]-X[i]) <= half) & (np.abs(Y[cand]-Y[i]) <= half) & (np.abs(T["min"][cand]-T["min"][i]) <= 15)
    if not ok.any(): continue
    cand = cand[ok]
    best = min(set(T["sat"][cand]), key=lambda s: np.abs(T["min"][cand][T["sat"][cand]==s] - T["min"][i]).mean())
    cand = cand[T["sat"][cand] == best]                    # one satellite only -> no double counting
    res.append((i, cand))
print(f"\nAqua detections matched to one VIIRS overpass within 15 min: {len(res)} of {isA.sum()}")

Am = np.array([area[i] for i, _ in res])
Lm = Lmir[[i for i, _ in res]]                             # MODIS band-21 radiance
t31m = T["t31"][[i for i, _ in res]]
SA = np.array([min(area[c].sum(), a) for (_, c), a in zip(res, Am)])
SLA = np.array([(Lmir[c]*area[c]).sum() for _, c in res])
sat_any = np.array([sat_flag[c].any() for _, c in res])
nV = np.array([len(c) for _, c in res])
sumF = np.array([T["frp"][c].sum() for _, c in res])
fill = np.clip(1 - SA/Am, 0, None)

def upscale(offset):
    Lbg = background_L(t31m, offset)
    # if VIIRS footprints overfill the MODIS pixel, normalise the weights
    w = np.maximum((SLA / np.maximum(np.array([area[c].sum() for _, c in res]), 1e-9)), 0)
    meanL = SLA / np.maximum(np.array([area[c].sum() for _, c in res]), 1e-9)
    return fill*Lbg + (1-fill)*meanL
Lup = upscale(0.0); Lup4 = upscale(4.0)

def tls(x, y):                                             # orthogonal (total least squares) fit
    xm, ym = x.mean(), y.mean(); sxx, syy = ((x-xm)**2).mean(), ((y-ym)**2).mean(); sxy = ((x-xm)*(y-ym)).mean()
    b = ((syy - sxx) + np.sqrt((syy - sxx)**2 + 4*sxy**2)) / (2*sxy); return b, ym - b*xm

def report(name, L1, mask):
    x, y = L1[mask], Lm[mask]
    b, a = tls(x, y); r = np.corrcoef(x, y)[0,1]
    # bootstrap CI on slope
    rng = np.random.default_rng(0); bs = []
    for _ in range(300):
        j = rng.integers(0, len(x), len(x)); bs.append(tls(x[j], y[j])[0])
    ols = np.polyfit(x, y, 1)[0]
    print(f"{name}: n={mask.sum()}  TLS slope={b:.3f} [{np.percentile(bs,2.5):.3f},{np.percentile(bs,97.5):.3f}] intercept={a:.3f}  OLS slope={ols:.3f}  r={r:.3f}"
          f"  median MODIS/VIIRS-up={np.median(y/x):.3f}")
    return b, a

print("\n=== BRIGHTNESS in RADIANCE space (MODIS b21 vs VIIRS upscaled to the MODIS footprint) ===")
allm = np.ones(len(res), bool)
report("all pairs, background = T31          ", Lup, allm)
report("all pairs, background = T31+4K       ", Lup4, allm)
report("excluding VIIRS-saturated pairs      ", Lup, ~sat_any)
b_fit, a_fit = report("unsaturated + >=3 VIIRS pixels    ", Lup, (~sat_any) & (nV >= 3))
print(f"saturated VIIRS in {sat_any.mean()*100:.1f}% of matched pairs; mean fill by VIIRS detections: {(1-fill).mean()*100:.0f}% of the MODIS footprint")

# brightness-temperature view of the same comparison, binned (this is the number to quote)
good = (~sat_any)
BTm, BTu = inv_planck(Lm, LAM["M_mir"]), inv_planck(Lup, LAM["M_mir"])
print("\nMODIS b21 minus upscaled-VIIRS brightness (K), binned by upscaled-VIIRS brightness (unsaturated pairs):")
edges = [300, 305, 310, 315, 320, 330, 345, 400]
for lo, hi in zip(edges[:-1], edges[1:]):
    m = good & (BTu >= lo) & (BTu < hi)
    if m.sum() > 20: print(f"  {lo}-{hi} K  n={m.sum():5d}  median diff = {np.median(BTm[m]-BTu[m]):6.1f} K   IQR [{np.percentile(BTm[m]-BTu[m],25):.1f},{np.percentile(BTm[m]-BTu[m],75):.1f}]")
print(f"  OLD method (VIIRS max brightness) median offset was -20.1 K; new overall median offset: {np.median((BTm-BTu)[good]):.1f} K")
print(f"  correlation in BT space: old 0.45 -> new {np.corrcoef(BTu[good], BTm[good])[0,1]:.2f}")

# ---------- 4. detection efficiency: P(Aqua detects | VIIRS fire signal in a MODIS-sized cell) ----------
GK = 1.4                                                   # ~ mean Aqua pixel edge (km)
vi = np.nonzero(isV)[0]
cx, cy = np.floor(X[vi]/GK).astype(np.int64), np.floor(Y[vi]/GK).astype(np.int64)
tb = (T["min"][vi] // 30).astype(np.int64)
gkey = ((T["date"][vi]*1000 + cx)*1000 + cy)*100 + tb
ug, inv = np.unique(gkey, return_inverse=True)
g_frp = np.bincount(inv, weights=T["frp"][vi]); g_n = np.bincount(inv)
g_x = np.bincount(inv, weights=X[vi])/g_n; g_y = np.bincount(inv, weights=Y[vi])/g_n
g_t = np.bincount(inv, weights=T["min"][vi])/g_n
g_date = np.zeros(len(ug), int); g_date[inv] = T["date"][vi]
g_sat = np.empty(len(ug), dtype="U8"); g_sat[inv] = T["sat"][vi]
print(f"\nVIIRS detections {len(vi)} -> {len(ug)} MODIS-sized cells (1.4 km, 30 min)")

aq = np.nonzero(isA)[0]; aq_by_date = collections.defaultdict(list)
for i in aq: aq_by_date[T["date"][i]].append(i)
detected = np.zeros(len(ug), bool); observed = np.zeros(len(ug), bool)
order = np.argsort(g_date)
for d in np.unique(g_date):
    if d not in aq_by_date: continue
    ai = np.array(aq_by_date[d]); gi = np.nonzero(g_date == d)[0]
    dx = np.abs(g_x[gi][:,None] - X[ai][None,:]); dy = np.abs(g_y[gi][:,None] - Y[ai][None,:])
    dtm = np.abs(g_t[gi][:,None] - T["min"][ai][None,:])
    near_time = dtm <= 15
    observed[gi] = (near_time & (np.hypot(dx, dy) <= 100)).any(axis=1)       # Aqua flew over this area at that time
    half = 0.5*np.maximum(T["scan"][ai], T["track"][ai]) + 0.2 + 0.5*GK
    detected[gi] = (near_time & (dx <= half[None,:]) & (dy <= half[None,:])).any(axis=1)
obs = observed
print(f"cells where Aqua demonstrably observed within 15 min: {obs.sum()}")
bins = [0, 0.5, 1, 2, 4, 8, 16, 32, 64, 1e9]
eff = []
print("\nP(Aqua detects the fire) vs summed VIIRS FRP in the cell (cells Aqua observed):")
for lo, hi in zip(bins[:-1], bins[1:]):
    m = obs & (g_frp >= lo) & (g_frp < hi)
    if m.sum() >= 30:
        eff.append((lo, hi, m.sum(), detected[m].mean())); print(f"  {lo:5.1f}-{min(hi,999):5.1f} MW  n={m.sum():6d}  P(detect)={detected[m].mean():.3f}")
# threshold where efficiency reaches 50% (interpolated)
mid = np.array([np.sqrt(max(lo,0.25)*min(hi,128)) for lo,hi,_,_ in eff]); pe = np.array([e[3] for e in eff])
def cross(p):
    j = np.nonzero(pe >= p)[0]
    if not len(j) or j[0] == 0: return float("nan")
    j = j[0]; return float(np.exp(np.interp(p, [pe[j-1], pe[j]], np.log([mid[j-1], mid[j]]))))
T50, T75 = cross(0.5), cross(0.75)
print(f"summed VIIRS FRP at which MODIS detection probability reaches 50%: {T50:.1f} MW ; 75%: {T75:.1f} MW")

# ---------- 5. monthly counts: Aqua vs SNPP (same overpass time) ----------
snpp_mask = (g_sat == "SNPP")
mon = lambda d: (d // 100)
a_idx = np.nonzero(isA)[0]
months = np.unique(T["date"][T["sat"] == "SNPP"] // 100)
months = months[(months >= 201201) & (months <= 202607)]
cA = np.array([((T["date"][a_idx]//100) == m).sum() for m in months])
cS_raw = np.array([(((T["date"][vi]//100) == m) & (T["sat"][vi] == "SNPP")).sum() for m in months])
cS_g = np.array([((mon(g_date) == m) & snpp_mask).sum() for m in months])
thr = T50 if np.isfinite(T50) else 4.0
cS_h = np.array([((mon(g_date) == m) & snpp_mask & (g_frp >= thr)).sum() for m in months])
ok = (cA > 0)
def stats(c, name):
    r = np.corrcoef(c[ok], cA[ok])[0,1]; ratio = c[ok]/cA[ok]
    print(f"  {name:38s} correlation with Aqua = {r:.3f}   monthly ratio to Aqua: median {np.median(ratio):6.2f}, spread (IQR/median) {(np.percentile(ratio,75)-np.percentile(ratio,25))/np.median(ratio):.2f}")
print(f"\nMonthly counts 2012-01 to 2026-07, {ok.sum()} months with Aqua detections. Aqua total {cA.sum()}, SNPP raw {cS_raw.sum()}")
stats(cS_raw, "SNPP raw detections")
stats(cS_g, "SNPP, merged to 1.4 km cells")
stats(cS_h, f"SNPP cells with summed FRP >= {thr:.1f} MW")

# ---------- outputs ----------
with open(os.path.join(OUT, "viirs_modis_equivalent_cells.csv"), "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["acq_date","satellite","x_km","y_km","n_viirs_pixels","sum_frp_mw","aqua_observed","aqua_detected","modis_equivalent_hotspot"])
    for g in range(len(ug)):
        d = str(g_date[g]); w.writerow([f"{d[:4]}-{d[4:6]}-{d[6:]}", g_sat[g], round(g_x[g],2), round(g_y[g],2), int(g_n[g]), round(g_frp[g],2),
                                        int(observed[g]), int(detected[g]), int(g_frp[g] >= thr)])
with open(os.path.join(OUT, "monthly_counts_validation.csv"), "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["month","aqua","snpp_raw","snpp_cells","snpp_modis_equivalent"])
    for m, a, b_, c_, d_ in zip(months, cA, cS_raw, cS_g, cS_h): w.writerow([f"{m//100}-{m%100:02d}", a, b_, c_, d_])

fig, ax = plt.subplots(2, 2, figsize=(13, 10))
a_ = ax[0,0]; a_.scatter(Lup[good], Lm[good], s=3, alpha=.15)
xs = np.array([Lup[good].min(), np.percentile(Lup[good], 99.5)]); a_.plot(xs, xs, "k--", lw=1, label="1:1")
a_.plot(xs, a_fit + b_fit*xs, "r", label=f"orthogonal fit, slope {b_fit:.2f}")
a_.set_xlim(xs[0], xs[1]); a_.set_ylim(xs[0], np.percentile(Lm[good], 99.5))
a_.set_xlabel("VIIRS I-4 radiance upscaled to MODIS footprint"); a_.set_ylabel("MODIS band 21 radiance"); a_.set_title("Mid-IR radiance, matched Aqua pixels (unsaturated)"); a_.legend()
a_ = ax[0,1]
xe = [np.sqrt(max(l,0.25)*min(h,128)) for l,h,_,_ in eff]; a_.plot(xe, pe, "o-"); a_.axhline(0.5, c="gray", ls=":")
a_.set_xscale("log"); a_.set_xlabel("summed VIIRS FRP in a 1.4 km cell (MW)"); a_.set_ylabel("P(MODIS Aqua also detects)"); a_.set_title("MODIS detection efficiency"); a_.set_ylim(0, 1.02)
a_ = ax[1,0]; xm = np.arange(len(months)); a_.plot(xm, cA, label="Aqua"); a_.plot(xm, cS_raw, label="SNPP raw", alpha=.7); a_.plot(xm, cS_h, label="SNPP MODIS-equivalent")
a_.set_yscale("log"); a_.set_xticks(xm[::24]); a_.set_xticklabels([f"{m//100}" for m in months[::24]]); a_.set_title("Monthly hotspot counts"); a_.legend()
a_ = ax[1,1]; a_.scatter(cA[ok], cS_raw[ok], s=10, alpha=.6, label="SNPP raw"); a_.scatter(cA[ok], cS_h[ok], s=10, alpha=.6, label="SNPP MODIS-equivalent")
mx = max(cA.max(), cS_raw.max()); a_.plot([1, mx], [1, mx], "k--", lw=1); a_.set_xscale("log"); a_.set_yscale("log"); a_.set_xlabel("Aqua monthly count"); a_.set_ylabel("SNPP monthly count"); a_.legend(); a_.set_title("Before/after harmonizing counts")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "harmonization_brightness.png"), dpi=110)
print("\nsaved outputs")

# ---------- held-out check: choose the threshold on 2012-2019, test it on 2020-2026 ----------
def t50_from(mask):
    out = []
    for lo, hi in zip(bins[:-1], bins[1:]):
        m = obs & mask & (g_frp >= lo) & (g_frp < hi)
        if m.sum() >= 30: out.append((np.sqrt(max(lo,0.25)*min(hi,128)), detected[m].mean()))
    xs, ps = np.array(out).T
    j = np.nonzero(ps >= 0.5)[0][0]
    return float(np.exp(np.interp(0.5, [ps[j-1], ps[j]], np.log([xs[j-1], xs[j]]))))
train = g_date < 20200101
t_tr = t50_from(train)
mtest = months >= 202001
cA_t, cR_t = cA[mtest], cS_raw[mtest]
cH_t = np.array([((mon(g_date) == m) & snpp_mask & (g_frp >= t_tr)).sum() for m in months[mtest]])
print(f"\nHELD-OUT: threshold learned on 2012-2019 = {t_tr:.1f} MW; applied to 2020-2026 ({mtest.sum()} months)")
for name, c in (("SNPP raw", cR_t), ("SNPP MODIS-equivalent", cH_t)):
    ratio = c/np.maximum(cA_t,1)
    print(f"  {name:24s} corr with Aqua = {np.corrcoef(c, cA_t)[0,1]:.3f}  median ratio = {np.median(ratio):.2f}")
