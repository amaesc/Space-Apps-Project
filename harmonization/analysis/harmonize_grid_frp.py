# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Harmonize MODIS and VIIRS active-fire detections onto a common grid.
Usage: python3 -I harmonize.py <datasets_dir> <out_dir>
"""
import sys, csv, glob, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

DATA, OUT = sys.argv[1], sys.argv[2]
CELL = 0.05  # degrees (~5 km)

# ---------- 1. load everything into one table ----------
rows, seen = [], set()
for f in sorted(glob.glob(os.path.join(DATA, "*", "*.csv"))):
    for r in csv.DictReader(open(f)):
        key = (r["latitude"], r["longitude"], r["acq_date"], r["acq_time"], r["satellite"])
        if key in seen:                      # same detection in two files -> keep once
            continue
        seen.add(key)
        conf = r["confidence"]
        if conf in ("l", "n", "h"):          # VIIRS letters -> 0-100-ish scale
            conf_cls = {"l": "low", "n": "nominal", "h": "high"}[conf]
        else:                                # MODIS numbers
            c = float(conf); conf_cls = "low" if c < 30 else ("nominal" if c < 80 else "high")
        d = r["acq_date"].replace("-", "")
        rows.append((float(r["latitude"]), float(r["longitude"]), d, r["acq_time"],
                     r["satellite"], "MODIS" if r["instrument"] == "MODIS" else "VIIRS",
                     float(r["scan"]), float(r["track"]), float(r["frp"]),
                     conf_cls, r["daynight"]))
print("unique detections:", len(rows))

dt = np.dtype([("lat","f8"),("lon","f8"),("date","U8"),("time","U4"),("sat","U8"),
               ("sensor","U5"),("scan","f8"),("track","f8"),("frp","f8"),
               ("conf","U8"),("dn","U1")])
T = np.array(rows, dtype=dt)
T = T[~np.isnan(T["frp"])]
T = np.sort(T, order=["date","time"])

# unified table (common schema, ISO dates, pixel area, confidence class)
with open(os.path.join(OUT, "unified_detections.csv"), "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["latitude","longitude","acq_date","acq_time","satellite","sensor",
                "scan_km","track_km","pixel_area_km2","frp_mw","confidence_class","daynight"])
    for r in T:
        d = r["date"]
        w.writerow([r["lat"], r["lon"], f"{d[:4]}-{d[4:6]}-{d[6:]}", r["time"], r["sat"],
                    r["sensor"], r["scan"], r["track"], round(r["scan"]*r["track"],4),
                    r["frp"], r["conf"], r["dn"]])

for s in ("MODIS", "VIIRS"):
    m = T["sensor"] == s
    print(s, m.sum(), min(T["date"][m]), "->", max(T["date"][m]))

# ---------- 2. filter: common period + drop low confidence ----------
sats_start = {s: min(T["date"][(T["sat"] == s)]) for s in np.unique(T["sat"])}
print("first date per satellite:", sats_start)
START = max(min(T["date"][T["sensor"] == "MODIS"]), "20230301")   # N21 exists from here
END = "20260731"                                                    # end of archive files
keep = (T["date"] >= START) & (T["date"] <= END) & (T["conf"] != "low")
P = T[keep]
print(f"comparison period {START}-{END}: {len(P)} detections kept")

# ---------- 3. put each detection in a 0.05 deg cell, per month ----------
lat0, lon0 = 25.5, -109.5
iy = np.floor((P["lat"] - lat0) / CELL).astype(int)
ix = np.floor((P["lon"] - lon0) / CELL).astype(int)
ny, nx = iy.max() + 1, ix.max() + 1
month = np.array([d[:6] for d in P["date"]])
months = np.unique(month)
mi = np.searchsorted(months, month)

lat_c = lat0 + (np.arange(ny) + 0.5) * CELL
cell_area = (111.32 * CELL) * (111.32 * CELL * np.cos(np.radians(lat_c)))   # km2, per row
cell_area = cell_area[:, None] * np.ones((1, nx))

def grid(sensor, what):
    m = P["sensor"] == sensor
    g = np.zeros((len(months), ny, nx))
    val = {"frp": P["frp"], "area": P["scan"] * P["track"], "n": np.ones(len(P))}[what]
    np.add.at(g, (mi[m], iy[m], ix[m]), val[m])
    return g

frp = {s: grid(s, "frp") for s in ("MODIS", "VIIRS")}
area = {s: grid(s, "area") for s in ("MODIS", "VIIRS")}
cnt = {s: grid(s, "n") for s in ("MODIS", "VIIRS")}
dens = {s: frp[s] / cell_area for s in frp}               # MW per km2 per month

# ---------- 4. calibrate MODIS against VIIRS on cells where BOTH saw fire ----------
both = (cnt["MODIS"] > 0) & (cnt["VIIRS"] > 0)
x, y = dens["VIIRS"][both], dens["MODIS"][both]
ratio_sums = y.sum() / x.sum()
b, a = np.polyfit(np.log10(x), np.log10(y), 1)
r = np.corrcoef(np.log10(x), np.log10(y))[0, 1]
print(f"cells with both sensors: {both.sum()}  (VIIRS-only {((cnt['VIIRS']>0)&~(cnt['MODIS']>0)).sum()}, MODIS-only {((cnt['MODIS']>0)&~(cnt['VIIRS']>0)).sum()})")
print(f"sum(MODIS)/sum(VIIRS) FRP density on shared cells: {ratio_sums:.3f}")
print(f"log-log fit: log10(MODIS) = {b:.3f}*log10(VIIRS) + {a:.3f},  r = {r:.3f}")
print(f"total FRP  MODIS {frp['MODIS'].sum():.0f} MW  VIIRS {frp['VIIRS'].sum():.0f} MW")
print(f"detections MODIS {cnt['MODIS'].sum():.0f}  VIIRS {cnt['VIIRS'].sum():.0f}")
print(f"mean pixel area km2: MODIS {area['MODIS'].sum()/cnt['MODIS'].sum():.2f}  VIIRS {area['VIIRS'].sum()/cnt['VIIRS'].sum():.3f}")


# ---------- 4b. AREA-NORMALIZED metric: divide each pixel's FRP by ITS OWN footprint ----------
# pixel_density = sum(FRP) / sum(pixel area) over the detections in the cell
# (an area-weighted mean of MW per km of fire pixel). This is what removes the pixel-size effect.
pix = {s: np.divide(frp[s], area[s], out=np.zeros_like(frp[s]), where=area[s] > 0) for s in frp}
px, py = pix["VIIRS"][both], pix["MODIS"][both]
print("\n--- AREA-NORMALIZED (FRP / pixel footprint), shared cells ---")
print(f"old metric  (sumFRP / cell area):   MODIS/VIIRS = {y.sum()/x.sum():.3f}, median ratio = {np.median(y/x):.3f}")
print(f"new metric  (sumFRP / pixel area):  MODIS/VIIRS = {py.sum()/px.sum():.3f}, median ratio = {np.median(py/px):.3f}")
pb, pa = np.polyfit(np.log10(px), np.log10(py), 1)
pr = np.corrcoef(np.log10(px), np.log10(py))[0, 1]
print(f"new metric log-log fit: slope {pb:.3f}, intercept {pa:.3f}, r = {pr:.3f}")
# per-detection check on FRP/area (mean over all detections of each sensor)
for sname in ("MODIS", "VIIRS"):
    m = P["sensor"] == sname
    d = P["frp"][m] / (P["scan"][m] * P["track"][m])
    print(f"{sname}: median FRP per pixel {np.median(P['frp'][m]):.2f} MW, median FRP/pixel-area {np.median(d):.2f} MW/km2")
# does the ratio depend on how intense the fire is?
edges = np.percentile(px, [0, 25, 50, 75, 100])
print("ratio MODIS/VIIRS by VIIRS pixel-density quartile (new metric):")
for lo, hi in zip(edges[:-1], edges[1:]):
    mm = (px >= lo) & (px <= hi)
    print(f"  VIIRS {lo:7.2f}-{hi:7.2f} MW/km2: n={mm.sum():4d}  ratio={py[mm].sum()/px[mm].sum():.3f}")

# harmonized: MODIS expressed in VIIRS-equivalent units using the power-law fit
mod_h = np.where(dens["MODIS"] > 0, 10 ** ((np.log10(np.maximum(dens["MODIS"],1e-12)) - a) / b), 0)

# grid table
with open(os.path.join(OUT, "grid_monthly_0.05deg.csv"), "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["month","lat_center","lon_center","viirs_n","modis_n","viirs_frp_mw","modis_frp_mw",
                "viirs_frp_density","modis_frp_density","modis_as_viirs_density","viirs_frp_per_pixel_km2","modis_frp_per_pixel_km2"])
    for k, yy, xx in zip(*np.nonzero((cnt["MODIS"] + cnt["VIIRS"]) > 0)):
        w.writerow([months[k], round(lat0+(yy+.5)*CELL,3), round(lon0+(xx+.5)*CELL,3),
                    int(cnt["VIIRS"][k,yy,xx]), int(cnt["MODIS"][k,yy,xx]),
                    round(frp["VIIRS"][k,yy,xx],2), round(frp["MODIS"][k,yy,xx],2),
                    round(dens["VIIRS"][k,yy,xx],5), round(dens["MODIS"][k,yy,xx],5),
                    round(mod_h[k,yy,xx],5), round(pix['VIIRS'][k,yy,xx],4), round(pix['MODIS'][k,yy,xx],4)])

# ---------- 5. maps ----------
ext = [lon0, lon0 + nx*CELL, lat0, lat0 + ny*CELL]
tot = lambda g: g.sum(axis=0) / len(months)          # mean monthly density
fig, ax = plt.subplots(2, 2, figsize=(13, 11))
vmax = np.percentile(np.concatenate([tot(dens["VIIRS"]).ravel(), tot(dens["MODIS"]).ravel()]), 99.9)
for a_, g, title in [(ax[0,0], tot(dens["VIIRS"]), "VIIRS (SNPP+NOAA-20+NOAA-21)"),
                     (ax[0,1], tot(dens["MODIS"]), "MODIS (Terra+Aqua), raw")]:
    im = a_.imshow(np.ma.masked_equal(g, 0), origin="lower", extent=ext, cmap="inferno",
                   norm=matplotlib.colors.LogNorm(vmin=1e-4, vmax=vmax))
    a_.set_title(title); plt.colorbar(im, ax=a_, label="FRP density (MW/km², mean per month)")
a_ = ax[1,0]
g = tot(mod_h)
im = a_.imshow(np.ma.masked_equal(g, 0), origin="lower", extent=ext, cmap="inferno",
               norm=matplotlib.colors.LogNorm(vmin=1e-4, vmax=vmax))
a_.set_title("MODIS rescaled to VIIRS-equivalent"); plt.colorbar(im, ax=a_, label="MW/km²")
a_ = ax[1,1]
a_.scatter(x, y, s=4, alpha=.3)
lim = [min(x.min(), y.min()), max(x.max(), y.max())]
a_.plot(lim, lim, "k--", lw=1, label="1:1")
xs = np.array(lim); a_.plot(xs, 10**(a + b*np.log10(xs)), "r", label=f"fit (slope {b:.2f})")
a_.set_xscale("log"); a_.set_yscale("log")
a_.set_xlabel("VIIRS FRP density (MW/km²)"); a_.set_ylabel("MODIS FRP density (MW/km²)")
a_.set_title(f"Cells seen by both, monthly (n={both.sum()}, r={r:.2f})"); a_.legend()
for a_ in ax.ravel()[:3]:
    a_.set_xlabel("longitude"); a_.set_ylabel("latitude")
fig.suptitle(f"Fire radiative power density, N. Chihuahua, {START[:4]}-{START[4:6]} to {END[:4]}-{END[4:6]}, 0.05° monthly cells")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "harmonization_map.png"), dpi=110)
print("saved figure")

fig, ax = plt.subplots(1, 3, figsize=(17, 5.5))
mean_pix = lambda sname: np.where(area[sname].sum(0) > 0, frp[sname].sum(0) / np.maximum(area[sname].sum(0), 1e-12), 0)
vm = np.percentile(np.concatenate([mean_pix("VIIRS").ravel(), mean_pix("MODIS").ravel()]), 99.5)
for a_, sname in zip(ax[:2], ("VIIRS", "MODIS")):
    im = a_.imshow(np.ma.masked_equal(mean_pix(sname), 0), origin="lower", extent=ext, cmap="inferno",
                   norm=matplotlib.colors.LogNorm(vmin=0.5, vmax=vm))
    a_.set_title(f"{sname}: FRP per km² of fire pixel"); plt.colorbar(im, ax=a_, label="MW / km² of pixel")
    a_.set_xlabel("longitude"); a_.set_ylabel("latitude")
a_ = ax[2]
a_.scatter(px, py, s=4, alpha=.3)
lim = [min(px.min(), py.min()), max(px.max(), py.max())]
a_.plot(lim, lim, "k--", lw=1, label="1:1")
xs = np.array(lim); a_.plot(xs, 10**(pa + pb*np.log10(xs)), "r", label=f"fit (slope {pb:.2f})")
a_.set_xscale("log"); a_.set_yscale("log"); a_.legend()
a_.set_xlabel("VIIRS MW/km² of pixel"); a_.set_ylabel("MODIS MW/km² of pixel")
a_.set_title(f"Area-normalized, cells seen by both (n={both.sum()}, r={pr:.2f})")
fig.suptitle("After dividing each detection's FRP by its own pixel footprint (scan x track)")
fig.tight_layout(); fig.savefig(os.path.join(OUT, "harmonization_area_normalized.png"), dpi=110)
print("saved area-normalized figure")
