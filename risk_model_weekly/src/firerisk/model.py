# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Rows, splits, baselines, LightGBM model, calibration, metrics."""
import numpy as np, pandas as pd, lightgbm as lgb
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import average_precision_score, roc_auc_score, brier_score_loss, log_loss

FEATURES = ["c1", "c2", "c4", "c8", "c13", "c26", "c52", "weeks_since", "hist_rate", "frp_sum4", "frp_max4", "frp_max8",
            "nb3_c4", "nb5ring_c4", "nb3_c26", "clim_freq", "clim_cnt", "n_past_years", "season_sin", "season_cos", "lat", "lon"]

def split_masks(dates, y, cfg, hw):
    s = {k: pd.Timestamp(v) for k, v in cfg["splits"].items()}; gap = pd.Timedelta(days=7 * hw)
    ok = ~np.isnan(y[:, 0, 0])                                # label window fully observed
    d = dates
    return dict(train=(d >= s["train_start"]) & (d <= s["val_start"] - gap) & ok,
                val=(d >= s["val_start"]) & (d <= s["calib_start"] - gap) & ok,
                calib=(d >= s["calib_start"]) & (d <= s["test_start"] - gap) & ok,
                test=(d >= s["test_start"]) & ok)

def active_cells(panel, upto_date):
    w = ((pd.Timestamp(upto_date) - panel["epoch"]).days) // 7
    return panel["C"][:w].sum(0) > 0                          # cells with >=1 hotspot BEFORE the cut date

def make_rows(F, y, O, act, names=FEATURES):
    iy, ix = np.nonzero(act); Oc = np.asarray(O)[:, None]
    X = np.empty((len(O) * len(iy), len(names)), np.float32)
    for j, nm in enumerate(names): X[:, j] = F[nm][Oc, iy[None, :], ix[None, :]].ravel()
    yy = None if y is None else y[Oc, iy[None, :], ix[None, :]].ravel()
    return X, yy, (iy, ix)

def iso(x, y):
    return IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0).fit(x, y)

def lgb_params(cfg):
    m = cfg["model"]
    return dict(objective="binary", metric="average_precision", learning_rate=m["learning_rate"], num_leaves=m["num_leaves"],
                min_data_in_leaf=m["min_data_in_leaf"], feature_fraction=m["feature_fraction"], bagging_fraction=m["bagging_fraction"],
                bagging_freq=m["bagging_freq"], lambda_l2=m["lambda_l2"], seed=m["seed"], verbosity=-1, num_threads=12)

def fit_lgb(cfg, Xtr, ytr, Xva=None, yva=None, rounds=None):
    p = lgb_params(cfg); dtr = lgb.Dataset(Xtr, ytr, feature_name=FEATURES, free_raw_data=False)
    if Xva is not None:
        dva = lgb.Dataset(Xva, yva, reference=dtr)
        return lgb.train(p, dtr, cfg["model"]["max_rounds"], valid_sets=[dva],
                         callbacks=[lgb.early_stopping(cfg["model"]["early_stopping"], verbose=False)])
    return lgb.train(p, dtr, rounds)

def topk(P, Y, frac, seed=0):
    """Per origin week: capture = share of that week's burning cells found in the top frac of cells; also precision@k."""
    rng = np.random.default_rng(seed); n = P.shape[1]; k = max(1, int(np.ceil(frac * n)))
    cap, prec = [], []
    for p, y in zip(P, Y):
        if y.sum() == 0: continue
        top = np.argsort(-(p + 1e-9 * rng.random(n)))[:k]; cap.append(y[top].sum() / y.sum()); prec.append(y[top].mean())
    return float(np.mean(cap)), float(np.mean(prec)), k

def calib_table(p, y, bins=10):
    q = pd.qcut(p, bins, duplicates="drop"); g = pd.DataFrame({"p": p, "y": y, "q": q}).groupby("q", observed=True).agg(pred=("p", "mean"), obs=("y", "mean"), n=("y", "size"))
    ece = float((g["n"] * (g["pred"] - g["obs"]).abs()).sum() / g["n"].sum()); return g.reset_index(drop=True), ece

def metrics(p, y, nO, frac, base_brier=None):
    P, Y = p.reshape(nO, -1), y.reshape(nO, -1); cap, prec, k = topk(P, Y, frac)
    pc = np.clip(p, 1e-6, 1 - 1e-6); br = brier_score_loss(y, p)
    m = dict(pr_auc=average_precision_score(y, p), roc_auc=roc_auc_score(y, p), brier=br, logloss=log_loss(y, pc),
             top_capture=cap, top_precision=prec, k_cells=k, base_rate=float(y.mean()), sum_pred=float(p.sum()), sum_obs=float(y.sum()))
    if base_brier: m["brier_skill_vs_clim"] = 1 - br / base_brier
    return m
