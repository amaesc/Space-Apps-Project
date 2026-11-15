# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""End-to-end: panel -> features -> baselines + LightGBM -> calibrated test metrics -> backtest -> forecast export.
Usage: .venv/bin/python run.py [--horizons 7 14 28] [--no-backtest]"""
import sys, os, json, time, pickle, gc, argparse
sys.path.insert(0, "src")
import numpy as np, pandas as pd, lightgbm as lgb
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
from firerisk.panel import load_config, load_series, build_panel
from firerisk.features import build_features, build_labels, origin_dates
from firerisk import model as M, export as E
from sklearn.metrics import average_precision_score

ap = argparse.ArgumentParser(); ap.add_argument("--horizons", nargs="*", type=int); ap.add_argument("--no-backtest", action="store_true")
args = ap.parse_args(); cfg = load_config("config.yaml"); t0 = time.time()
log = lambda *a: print(f"[{time.time()-t0:6.0f}s]", *a, flush=True)
frac = cfg["evaluation"]["topk_frac"]

df = load_series(cfg); panel = build_panel(df, cfg); grid = panel["grid"]; dates = origin_dates(panel); W = panel["W"]
log(f"series rows {len(df)}, weeks {W}, last complete week starts {dates[W-1].date()}, forecast origin {dates[W].date()}, grid {grid.ny}x{grid.nx}")
os.makedirs("outputs", exist_ok=True); summary = []

for H in (args.horizons or cfg["horizons_days"]):
    hw = H // 7; out = f"outputs/h{H}"; os.makedirs(out, exist_ok=True); log(f"===== horizon {H} days ({hw} week[s]) =====")
    F = build_features(panel, cfg, hw); y = build_labels(panel, hw); mk = M.split_masks(dates, y, cfg, hw)
    act = M.active_cells(panel, cfg["splits"]["val_start"]); nA = int(act.sum())
    log(f"features built; active cells {nA}/{grid.ny*grid.nx}; origins train {mk['train'].sum()} val {mk['val'].sum()} calib {mk['calib'].sum()} test {mk['test'].sum()}")
    rows = {k: M.make_rows(F, y, np.nonzero(mk[k])[0], act) for k in mk}
    for k, (X, yy, _) in rows.items(): log(f"  {k}: {len(yy)} rows, positive rate {yy.mean()*100:.2f}%")
    Xtr, ytr, _ = rows["train"]; Xva, yva, _ = rows["val"]; Xca, yca, _ = rows["calib"]; Xte, yte, _ = rows["test"]
    nTe, nCa = mk["test"].sum(), mk["calib"].sum()
    # coverage: how many test events happen in cells outside the active set
    ytest_full = y[mk["test"]]; cov = float(ytest_full[:, act].sum() / ytest_full.sum())
    log(f"  share of test events inside active cells: {cov*100:.1f}%")

    # ---- baselines (calibrated on the calibration years only) ----
    ci = {n: M.FEATURES.index(n) for n in ("clim_freq", "c4")}
    B1 = M.iso(np.nan_to_num(Xca[:, ci["clim_freq"]]), yca); p_b1 = B1.predict(np.nan_to_num(Xte[:, ci["clim_freq"]]))
    B2 = M.iso(Xca[:, ci["c4"]], yca); p_b2 = B2.predict(Xte[:, ci["c4"]])
    woy = np.minimum(dates.isocalendar().week.to_numpy(), 52); trO = np.nonzero(mk["train"])[0]
    rate = np.array([y[trO[woy[trO] == k]][:, act].mean() if (woy[trO] == k).any() else np.nan for k in range(1, 53)])
    rate = np.where(np.isnan(rate), np.nanmean(rate), rate)
    teO = np.nonzero(mk["test"])[0]; p_b0 = np.repeat(rate[np.minimum(woy[teO], 52) - 1], nA)
    # ---- main model ----
    bst = M.fit_lgb(cfg, Xtr, ytr, Xva, yva); log(f"  LightGBM best iteration {bst.best_iteration}")
    iso_m = M.iso(bst.predict(Xca, num_iteration=bst.best_iteration), yca)
    p_raw = bst.predict(Xte, num_iteration=bst.best_iteration); p_m = iso_m.predict(p_raw)
    b1_brier = float(np.mean((p_b1 - yte) ** 2)); res = {}
    for name, p in (("B0 week-of-year rate", p_b0), ("B1 cell climatology", p_b1), ("B2 persistence (last 4 weeks)", p_b2), ("LightGBM (calibrated)", p_m)):
        res[name] = M.metrics(p, yte, nTe, frac, b1_brier)
    res["cells_in_topk"] = res["LightGBM (calibrated)"]["k_cells"]
    tab, ece = M.calib_table(p_m, yte); res["LightGBM ece"] = ece
    tab_b, ece_b = M.calib_table(p_b1, yte); res["B1 ece"] = ece_b
    log("  TEST (2023-2026), horizon %d d:" % H)
    for n, m in res.items():
        if isinstance(m, dict): log(f"    {n:32s} PR-AUC {m['pr_auc']:.3f}  ROC {m['roc_auc']:.3f}  Brier {m['brier']:.5f}  top{int(frac*100)}% capture {m['top_capture']:.3f}  prec@k {m['top_precision']:.3f}")
    log(f"    ECE LightGBM {ece:.5f}  B1 {ece_b:.5f};  predicted events {res['LightGBM (calibrated)']['sum_pred']:.0f} vs observed {res['LightGBM (calibrated)']['sum_obs']:.0f}")
    # ---- breakdown by month on test ----
    mon = np.repeat(dates[teO].month.to_numpy(), nA); mrows = []
    for mth in range(1, 13):
        s = mon == mth
        if s.sum() == 0 or yte[s].sum() < 5: continue
        nO_m = int(s.sum() // nA)
        mrows.append(dict(month=mth, base_rate=float(yte[s].mean()), lgb_pr_auc=average_precision_score(yte[s], p_m[s]), clim_pr_auc=average_precision_score(yte[s], p_b1[s]),
                          lgb_capture=M.topk(p_m[s].reshape(nO_m, -1), yte[s].reshape(nO_m, -1), frac)[0], clim_capture=M.topk(p_b1[s].reshape(nO_m, -1), yte[s].reshape(nO_m, -1), frac)[0]))
    pd.DataFrame(mrows).to_csv(f"{out}/test_by_month.csv", index=False)
    imp = pd.Series(bst.feature_importance("gain"), index=M.FEATURES).sort_values(ascending=False); imp.to_csv(f"{out}/feature_importance.csv", header=["gain"])
    # ---- rolling-origin backtest (7-day horizon only) ----
    if H == 7 and not args.no_backtest:
        bt = []; s = {k: pd.Timestamp(v) for k, v in cfg["splits"].items()}; gap = pd.Timedelta(days=7 * hw); okl = ~np.isnan(y[:, 0, 0]); rng = np.random.default_rng(1)
        for Y in range(cfg["backtest"]["first_test_year"], int(dates[W - 1].year) + 1):
            y0 = pd.Timestamp(f"{Y}-01-01"); y1 = pd.Timestamp(f"{Y+1}-01-01")
            mtr = (dates >= s["train_start"]) & (dates <= y0 - gap) & okl; mte = (dates >= y0) & (dates < y1) & okl
            if mte.sum() < 10: continue
            actY = M.active_cells(panel, y0); Xa, ya, _ = M.make_rows(F, y, np.nonzero(mtr)[0], actY)
            keep = (ya == 1) | (rng.random(len(ya)) < cfg["backtest"]["negative_keep"]); b = M.fit_lgb(cfg, Xa[keep], ya[keep], rounds=cfg["backtest"]["rounds"])
            Xb, yb, _ = M.make_rows(F, y, np.nonzero(mte)[0], actY); pb = b.predict(Xb); pc = np.nan_to_num(Xb[:, ci["clim_freq"]]); nb = int(mte.sum())
            bt.append(dict(year=Y, era="MODIS (Aqua)" if Y < 2012 else "VIIRS (SNPP)", base_rate=float(yb.mean()), lgb_pr_auc=average_precision_score(yb, pb), clim_pr_auc=average_precision_score(yb, pc),
                           lgb_capture=M.topk(pb.reshape(nb, -1), yb.reshape(nb, -1), frac)[0], clim_capture=M.topk(pc.reshape(nb, -1), yb.reshape(nb, -1), frac)[0]))
            log(f"  backtest {Y}: PR-AUC lgb {bt[-1]['lgb_pr_auc']:.3f} vs clim {bt[-1]['clim_pr_auc']:.3f}; capture {bt[-1]['lgb_capture']:.3f} vs {bt[-1]['clim_capture']:.3f}")
        pd.DataFrame(bt).to_csv(f"{out}/backtest_by_year.csv", index=False)
    # ---- forecast for the next, still unobserved week(s) ----
    Xf, _, (iy, ix) = M.make_rows(F, None, np.array([W]), act); pf = iso_m.predict(bst.predict(Xf, num_iteration=bst.best_iteration))
    pfc = B1.predict(np.nan_to_num(Xf[:, ci["clim_freq"]]))
    ft = E.forecast_table(grid, iy, ix, dates[W], H, pf, pfc); ft.to_csv(f"{out}/forecast_{dates[W].date()}.csv", index=False); ft.head(25).to_csv(f"{out}/top25_risk.csv", index=False)
    json.dump(E.cell_polygons(grid, iy, ix, pf, dict(climatology_probability=pfc)), open(f"{out}/forecast_{dates[W].date()}.geojson", "w"))
    tp = pd.DataFrame(dict(week_start=np.repeat(dates[teO].date, nA), cell_id=np.tile(iy * grid.nx + ix, nTe), observed=yte.astype(np.int8), probability=p_m.round(5), climatology_probability=p_b1.round(5)))
    tp.to_parquet(f"{out}/test_predictions.parquet", index=False)
    bst.save_model(f"{out}/lgbm.txt"); pickle.dump(dict(iso_model=iso_m, iso_clim=B1, features=M.FEATURES, horizon_days=H, active=act), open(f"{out}/calibrators.pkl", "wb"))
    json.dump(res, open(f"{out}/metrics.json", "w"), indent=2, default=float)
    # ---- figures ----
    fig, ax = plt.subplots(1, 3, figsize=(17, 5))
    ax[0].plot(tab["pred"], tab["obs"], "o-", label="LightGBM"); ax[0].plot(tab_b["pred"], tab_b["obs"], "s-", label="cell climatology"); mx = max(tab["pred"].max(), tab["obs"].max()); ax[0].plot([0, mx], [0, mx], "k--"); ax[0].set_xlabel("predicted probability"); ax[0].set_ylabel("observed frequency"); ax[0].set_title(f"Calibration, test 2023-26 ({H} d)"); ax[0].legend()
    imp.head(12)[::-1].plot.barh(ax=ax[1]); ax[1].set_title("Feature importance (gain)")
    img = np.full((grid.ny, grid.nx), np.nan); img[iy, ix] = pf; im = ax[2].imshow(img, origin="lower", cmap="YlOrRd", extent=[grid.lon0, grid.lon0 + grid.nx * grid.res, grid.lat0, grid.lat0 + grid.ny * grid.res]); plt.colorbar(im, ax=ax[2], label="probability"); ax[2].set_title(f"Risk, week of {dates[W].date()}")
    fig.tight_layout(); fig.savefig(f"{out}/summary.png", dpi=110); plt.close(fig)
    summary.append(dict(horizon_days=H, **{f"{k.split()[0]}_{m}": v[m] for k, v in res.items() if isinstance(v, dict) for m in ("pr_auc", "brier", "top_capture")}))
    del F, y, rows; gc.collect()
pd.DataFrame(summary).to_csv("outputs/summary.csv", index=False); log("done")
