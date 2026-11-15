# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Features for every (origin week t, cell). Origin t = the Monday a forecast is issued.
A feature at origin t may only use weeks 0..t-1 (everything before the origin); tests/test_no_leakage.py enforces this."""
import numpy as np, pandas as pd
from scipy.ndimage import uniform_filter

def _cum(A):                                   # cum[t] = sum of A[0..t-1], shape (W+1, ny, nx)
    out = np.zeros((A.shape[0] + 1,) + A.shape[1:], np.float32); np.cumsum(A, axis=0, out=out[1:]); return out

def _win(cum, k):                              # for every origin t: sum over weeks t-k..t-1
    idx = np.arange(cum.shape[0]); return cum[idx] - cum[np.maximum(idx - k, 0)]

def origin_dates(panel):
    return panel["epoch"] + pd.to_timedelta(np.arange(panel["W"] + 1) * 7, unit="D")

def _lagged_max(FM, n, kmax):                  # m[t] = max(FM[t-1..t-kmax]) for origins t=0..n-1
    out = np.zeros((n,) + FM.shape[1:], np.float32)
    for k in range(1, kmax + 1):
        sh = np.zeros_like(out); sh[k:] = FM[: n - k]; out = np.maximum(out, sh)
    return out

def build_features(panel, cfg, hw):
    """hw = forecast horizon in weeks (only the climatology window depends on it)."""
    C, FS, FM, W, grid = panel["C"], panel["FS"], panel["FM"], panel["W"], panel["grid"]
    cap, pad = cfg["features"]["weeks_since_cap"], cfg["features"]["climatology_pad_weeks"]
    cum = _cum(C); n = W + 1; F = {}; wk = np.arange(W, dtype=np.float32)[:, None, None]
    for k in (1, 2, 4, 8, 13, 26, 52): F[f"c{k}"] = _win(cum, k)
    last = np.maximum.accumulate(np.where(C > 0, wk, -1.0), axis=0)          # last week <= w with a hotspot
    ws = np.full((n,) + C.shape[1:], cap, np.float32); ws[1:] = np.where(last >= 0, wk - last, cap)
    F["weeks_since"] = np.minimum(ws, cap)
    F["hist_rate"] = _cum((C > 0).astype(np.float32)) / np.maximum(np.arange(n), 1)[:, None, None]
    F["frp_sum4"] = _win(_cum(FS), 4)
    F["frp_max4"], F["frp_max8"] = _lagged_max(FM, n, 4), _lagged_max(FM, n, 8)
    def box(A, s): return uniform_filter(A, size=(1, s, s), mode="constant", cval=0.0) * (s * s)
    F["nb3_c4"] = box(F["c4"], 3) - F["c4"]                                   # 8 neighbours
    F["nb5ring_c4"] = box(F["c4"], 5) - box(F["c4"], 3)                       # outer ring of the 5x5
    F["nb3_c26"] = box(F["c26"], 3) - F["c26"]
    # climatology: same calendar window in each earlier year that is fully observed
    dates, epoch = origin_dates(panel), panel["epoch"]
    cf = np.full((n,) + C.shape[1:], np.nan, np.float32); cc = cf.copy(); npast = np.zeros_like(cf)
    for t in range(n):
        a = np.zeros(C.shape[1:], np.float32); c = a.copy(); v = 0
        for j in range(1, 25):
            wj = (dates[t] - pd.DateOffset(years=j) - epoch).days // 7
            w1, w2 = wj - pad, wj + hw + pad                                  # weeks [w1, w2), mirrors the label window +-pad
            if w1 < 1: break
            s = cum[w2] - cum[w1]; a += (s > 0); c += s; v += 1
        if v: cf[t], cc[t], npast[t] = a / v, c / v, v
    F["clim_freq"], F["clim_cnt"], F["n_past_years"] = cf, cc, npast
    doy = dates.day_of_year.to_numpy(np.float32)[:, None, None]; shape = F["c1"].shape
    F["season_sin"] = np.broadcast_to(np.sin(2 * np.pi * doy / 365.25), shape).astype(np.float32)
    F["season_cos"] = np.broadcast_to(np.cos(2 * np.pi * doy / 365.25), shape).astype(np.float32)
    la, lo = grid.centers()
    F["lat"] = np.broadcast_to(la.astype(np.float32), shape); F["lon"] = np.broadcast_to(lo.astype(np.float32), shape)
    return F

def build_labels(panel, hw):
    """y[t] = 1 if any hotspot in weeks t..t+hw-1; NaN where that window is not fully observed."""
    C, W = panel["C"], panel["W"]; cum = _cum(C); y = np.full((W + 1,) + C.shape[1:], np.nan, np.float32)
    for t in range(W - hw + 1): y[t] = (cum[t + hw] - cum[t]) > 0
    return y
