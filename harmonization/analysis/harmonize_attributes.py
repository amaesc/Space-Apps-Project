# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Harmonize brightness, satellite metadata and confidence for MODIS + VIIRS.
Usage: python3 -I harmonize_attributes.py <datasets_dir> <out_dir>
"""
import sys, csv, glob, os, collections
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

DATA, OUT = sys.argv[1], sys.argv[2]

# ================= 1. SATELLITE: one metadata table =================
# local overpass times (equator crossing, descending=day for Terra, ascending=day for the afternoon sats)
SAT = {  #            platform       sensor   nominal local daytime pass   nominal local night pass
    "Terra": ("Terra",      "MODIS", "10:30", "22:30"),
    "Aqua":  ("Aqua",       "MODIS", "13:30", "01:30"),
    "SNPP":  ("Suomi-NPP",  "VIIRS", "13:30", "01:30"),
    "N20":   ("NOAA-20",    "VIIRS", "13:30", "01:30"),
    "N21":   ("NOAA-21",    "VIIRS", "13:30", "01:30"),
}
SAT_START = {"Terra": "2002-07-04", "Aqua": "2002-07-04", "SNPP": "2012-01-20",
             "N20": "2018-04-01", "N21": "2023-03-01"}

# ================= 2. load raw (all columns) =================
rows, seen = [], set()
for f in sorted(glob.glob(os.path.join(DATA, "*", "*.csv"))):
    stream = "nrt" if "fire_nrt" in os.path.basename(f) else "archive"
    for r in csv.DictReader(open(f)):
        key = (r["latitude"], r["longitude"], r["acq_date"], r["acq_time"], r["satellite"])
        if key in seen: continue
        seen.add(key)
        d = r["acq_date"].replace("-", "")
        rows.append((float(r["latitude"]), float(r["longitude"]), d, int(r["acq_time"][:2])*60 + int(r["acq_time"][2:]),
                     r["satellite"], float(r["scan"]), float(r["track"]), float(r["brightness"]),
                     float(r["bright_t31"]), float(r["frp"]), r["confidence"], r["daynight"],
                     r["version"], stream))
dt = np.dtype([("lat","f8"),("lon","f8"),("date","U8"),("min","i4"),("sat","U8"),("scan","f8"),("track","f8"),
               ("b","f8"),("t31","f8"),("frp","f8"),("conf","U4"),("dn","U1"),("ver","U12"),("stream","U8")])
T = np.array(rows, dtype=dt)
is_modis = np.isin(T["sat"], ["Terra", "Aqua"])
print("detections:", len(T))

# ================= 3. CONFIDENCE =================
# VIIRS: l/n/h categories.  MODIS: 0-100.  FIRMS' own definition: low <30, nominal 30-79, high >=80.
conf_cls = np.empty(len(T), dtype="U8")
vi = ~is_modis
conf_cls[vi] = np.vectorize({"l": "low", "n": "nominal", "h": "high"}.get)(T["conf"][vi])
mc = T["conf"][is_modis].astype(float)
conf_cls[is_modis] = np.where(mc < 30, "low", np.where(mc < 80, "nominal", "high"))
conf_num = np.full(len(T), np.nan); conf_num[is_modis] = mc          # keep MODIS numeric score

# ================= 4. BRIGHTNESS: saturation + the physical channels =================
# MODIS band 21 (3.96um) saturates at ~500 K, VIIRS I-4 (3.74um) saturates at 367 K.
SAT_K = np.where(is_modis, 500.0, 367.0)
saturated = T["b"] >= SAT_K - 0.5
dT = T["b"] - T["t31"]                                  # fire signal: mid-IR minus thermal-IR
print("\n=== BRIGHTNESS ===")
for s in SAT:
    m = T["sat"] == s
    print(f"{s:5s} n={m.sum():6d} b21/I4 median {np.median(T['b'][m]):6.1f} K  saturated {saturated[m].mean()*100:5.2f}%"
          f"  T31 median {np.median(T['t31'][m]):6.1f} K  dT median {np.median(dT[m]):5.1f} K")

# ================= 5. matched pairs: MODIS pixel <-> VIIRS detections inside it =================
# This is the empirical bridge between the two sensors: same place, same day, <=60 min apart.
lat0 = 28.6
X = (T["lon"] + 109.5) * 111.32 * np.cos(np.radians(lat0)); Y = (T["lat"] - 25.5) * 111.32
CELLKM = 3.0
key = (np.floor(X/CELLKM).astype(np.int64) * 100000 + np.floor(Y/CELLKM).astype(np.int64))
vidx = np.nonzero(vi)[0]
buckets = collections.defaultdict(list)
for i in vidx:
    buckets[(T["date"][i], key[i])].append(i)
midx = np.nonzero(is_modis)[0]
pairs = []   # (modis_i, [viirs_i...])
for i in midx:
    kx, ky = int(X[i] // CELLKM), int(Y[i] // CELLKM)
    half = 0.5 * max(T["scan"][i], T["track"][i]) + 0.2
    cand = []
    for ax in (-1, 0, 1):
        for ay in (-1, 0, 1):
            cand += buckets.get((T["date"][i], (kx+ax)*100000 + (ky+ay)), [])
    if not cand: continue
    cand = np.array(cand)
    ok = (np.abs(X[cand]-X[i]) <= half) & (np.abs(Y[cand]-Y[i]) <= half) & (np.abs(T["min"][cand]-T["min"][i]) <= 60)
    if ok.any(): pairs.append((i, cand[ok]))
print(f"\nMODIS detections: {len(midx)}; with >=1 VIIRS detection inside the pixel (<=60 min): {len(pairs)}")

mi_ = np.array([p[0] for p in pairs])
nV  = np.array([len(p[1]) for p in pairs])
Vmax_b = np.array([T["b"][p[1]].max() for p in pairs])
Vsum_f = np.array([T["frp"][p[1]].sum() for p in pairs])
Vmed_t = np.array([np.median(T["t31"][p[1]]) for p in pairs])
Mb, Mf, Mt = T["b"][mi_], T["frp"][mi_], T["t31"][mi_]

# --- 5a. FRP: this is the clean, area-consistent calibration: MODIS FRP vs SUM of VIIRS FRP inside the same pixel
ok = (Mf > 0) & (Vsum_f > 0)
r_frp = np.corrcoef(np.log10(Mf[ok]), np.log10(Vsum_f[ok]))[0,1]
print(f"\nFRP  MODIS pixel vs SUM of VIIRS FRP inside it: n={ok.sum()}, median ratio MODIS/sumVIIRS = {np.median(Mf[ok]/Vsum_f[ok]):.3f}, "
      f"sum ratio = {Mf[ok].sum()/Vsum_f[ok].sum():.3f}, log-log r = {r_frp:.3f}")

# --- 5b. brightness (exclude saturated values on either side)
okb = (~saturated[mi_]) & (Vmax_b < 366.5)
bm, bv = Mb[okb], Vmax_b[okb]
slope, icpt = np.polyfit(bv, bm, 1)
rb = np.corrcoef(bv, bm)[0,1]
print(f"BRIGHT  MODIS b21 vs VIIRS I-4 (max in pixel), unsaturated pairs n={okb.sum()}: b21 = {slope:.3f}*I4 + {icpt:.1f},  r={rb:.3f},"
      f"  median offset (MODIS-VIIRS) = {np.median(bm-bv):.1f} K")
okt = np.isfinite(Mt) & np.isfinite(Vmed_t)
st, it = np.polyfit(Vmed_t[okt], Mt[okt], 1)
print(f"T31     MODIS b31 vs VIIRS I-5 (median in pixel): b31 = {st:.3f}*I5 + {it:.1f}, r={np.corrcoef(Vmed_t[okt], Mt[okt])[0,1]:.3f},"
      f" median offset = {np.median(Mt[okt]-Vmed_t[okt]):.1f} K")
# harmonized (VIIRS-equivalent) MODIS brightness: invert the fit on unsaturated MODIS pixels
b_harm = T["b"].copy()
b_harm[is_modis & ~saturated] = (T["b"][is_modis & ~saturated] - icpt) / slope
b_harm_flag = np.where(saturated, "saturated", "ok")

# --- 5c. confidence cross-check: how often does VIIRS independently confirm each MODIS class?
print("\n=== CONFIDENCE ===")
matched = np.zeros(len(T), bool); matched[mi_] = True
for c in ("low", "nominal", "high"):
    m = is_modis & (conf_cls == c)
    print(f"MODIS {c:8s} n={m.sum():6d}  share with a VIIRS detection inside pixel: {matched[m].mean()*100:5.1f}%   "
          f"median FRP {np.median(T['frp'][m]):5.1f} MW")
# reverse: does MODIS confirm VIIRS classes? (VIIRS is more sensitive, so this is a lower bound)
vm = np.zeros(len(T), bool)
for i, v in pairs: vm[v] = True
for c in ("low", "nominal", "high"):
    m = vi & (conf_cls == c)
    print(f"VIIRS  {c:8s} n={m.sum():6d}  share inside a MODIS detection pixel:     {vm[m].mean()*100:5.1f}%   "
          f"median FRP {np.median(T['frp'][m]):5.1f} MW")

# ================= 6. write harmonized table =================
_H, _C, _K = 6.62607015e-34, 2.99792458e8, 1.380649e-23
def _planck(Tk, lam_um):
    lam = lam_um*1e-6; return 2*_H*_C**2/lam**5/np.expm1(_H*_C/(lam*_K*Tk))*1e-6
L_mir = np.where(is_modis, _planck(T["b"], 3.959), _planck(T["b"], 3.740))
loc_h = (T["min"]/60.0 + T["lon"]/15.0) % 24                    # approximate local SOLAR time of the detection
with open(os.path.join(OUT, "unified_harmonized.csv"), "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["latitude","longitude","acq_date","acq_time_utc","local_solar_hour","platform","sensor","data_stream","product_version",
                "day_night","nominal_day_pass_local","nominal_night_pass_local","scan_km","track_km","pixel_area_km2",
                "frp_mw","frp_per_pixel_km2","bright_mid_ir_k","bright_mid_ir_saturated","mid_ir_radiance_w_m2_sr_um",
                "bright_t31_k","delta_t_k","confidence_class","confidence_numeric_modis_only","confidence_original"])
    for i in range(len(T)):
        p, s, dpass, npass = SAT[T["sat"][i]]
        d = T["date"][i]; mn = T["min"][i]
        a = T["scan"][i] * T["track"][i]
        w.writerow([T["lat"][i], T["lon"][i], f"{d[:4]}-{d[4:6]}-{d[6:]}", f"{mn//60:02d}{mn%60:02d}", round(loc_h[i],2), p, s,
                    T["stream"][i], T["ver"][i], T["dn"][i], dpass, npass, T["scan"][i], T["track"][i], round(a,4),
                    T["frp"][i], round(T["frp"][i]/a,3), T["b"][i], int(saturated[i]), round(float(L_mir[i]),5),
                    T["t31"][i], round(dT[i],2), conf_cls[i], "" if np.isnan(conf_num[i]) else int(conf_num[i]), T["conf"][i]])
print("\nwrote unified_harmonized.csv")

# ================= 7. figure =================
fig, ax = plt.subplots(2, 2, figsize=(12, 10))
a_ = ax[0,0]
for s, c in zip(SAT, ["tab:green","tab:olive","tab:blue","tab:cyan","tab:purple"]):
    m = (T["sat"] == s) & (T["b"] < 520)
    a_.hist(T["b"][m], bins=np.arange(290, 520, 2), histtype="step", density=True, color=c, label=SAT[s][0])
a_.axvline(367, c="k", ls=":"); a_.text(369, a_.get_ylim()[1]*0.9, "VIIRS I-4\nsaturation", fontsize=8)
a_.axvline(500, c="gray", ls=":"); a_.set_yscale("log"); a_.set_xlabel("mid-IR brightness (K)"); a_.set_title("Mid-IR brightness by platform"); a_.legend(fontsize=8)
a_ = ax[0,1]
a_.scatter(bv, bm, s=3, alpha=.15); lim = [295, 367]
a_.plot(lim, lim, "k--", lw=1, label="1:1"); xs = np.array(lim); a_.plot(xs, slope*xs+icpt, "r", label=f"fit: {slope:.2f}x{icpt:+.0f}")
a_.set_xlabel("VIIRS I-4 max in pixel (K)"); a_.set_ylabel("MODIS band 21 (K)"); a_.set_title(f"Matched pixels, unsaturated (n={okb.sum()}, r={rb:.2f})"); a_.legend()
a_ = ax[1,0]
a_.scatter(Vsum_f[ok], Mf[ok], s=3, alpha=.15); lim = [min(Vsum_f[ok].min(), Mf[ok].min()), max(Vsum_f[ok].max(), Mf[ok].max())]
a_.plot(lim, lim, "k--", lw=1); a_.set_xscale("log"); a_.set_yscale("log")
a_.set_xlabel("sum of VIIRS FRP inside the MODIS pixel (MW)"); a_.set_ylabel("MODIS FRP (MW)"); a_.set_title(f"FRP, pixel-matched (n={ok.sum()}, r={r_frp:.2f})")
a_ = ax[1,1]
cl = ["low", "nominal", "high"]; w_ = 0.35; xs = np.arange(3)
a_.bar(xs - w_/2, [matched[is_modis & (conf_cls == c)].mean()*100 for c in cl], w_, label="MODIS class -> % confirmed by VIIRS")
a_.bar(xs + w_/2, [vm[vi & (conf_cls == c)].mean()*100 for c in cl], w_, label="VIIRS class -> % inside a MODIS detection")
a_.set_xticks(xs); a_.set_xticklabels(cl); a_.set_ylabel("%"); a_.set_title("Does confidence mean the same thing?"); a_.legend(fontsize=8)
fig.tight_layout(); fig.savefig(os.path.join(OUT, "harmonization_attributes.png"), dpi=110)
print("saved figure")
