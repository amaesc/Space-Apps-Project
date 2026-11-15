# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
import sys, numpy as np, pandas as pd
sys.path.insert(0, "src")
from firerisk.panel import Grid
from firerisk.features import build_features, build_labels, origin_dates

def make_panel(W=200, seed=0):
    rng = np.random.default_rng(seed); grid = Grid(dict(lon0=0, lat0=0, lon1=1.0, lat1=0.8, res=0.1))
    shape = (W, grid.ny, grid.nx)
    C = (rng.random(shape) < 0.05).astype(np.float32) * rng.integers(1, 4, shape).astype(np.float32)
    FM = C * rng.random(shape).astype(np.float32) * 50; FS = FM * 1.5
    return dict(grid=grid, epoch=pd.Timestamp("2002-07-01"), W=W, C=C, FS=FS, FM=FM)

CFG = dict(features=dict(climatology_pad_weeks=2, weeks_since_cap=156))

def test_features_do_not_see_the_future():
    P = make_panel(); t0 = 150
    full = build_features(P, CFG, 1)
    P2 = dict(P); P2["C"], P2["FS"], P2["FM"] = P["C"].copy(), P["FS"].copy(), P["FM"].copy()
    for k in ("C", "FS", "FM"): P2[k][t0:] = 99.0           # destroy everything from the origin week onward
    alt = build_features(P2, CFG, 1)
    for name in full:
        a, b = full[name][t0], alt[name][t0]
        assert np.allclose(a, b, equal_nan=True), f"feature {name} changes when data at/after the origin changes"

def test_label_window_alignment():
    P = make_panel(); y = build_labels(P, 2); C = P["C"]
    t = 50; assert np.array_equal(y[t], ((C[t] + C[t + 1]) > 0).astype(np.float32))
    assert np.isnan(y[P["W"]]).all() and np.isnan(y[P["W"] - 1]).all()     # window not fully observed
    assert not np.isnan(y[P["W"] - 2]).any()

def test_grid_index():
    g = Grid(dict(lon0=-109.5, lat0=25.5, lon1=-103.3, lat1=31.8, res=0.1))
    assert (g.ny, g.nx) == (63, 62)
    iy, ix = g.index([25.5, 31.8], [-109.5, -103.3]); assert (iy[0], ix[0]) == (0, 0) and (iy[1], ix[1]) == (62, 61)
