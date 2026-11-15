# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
import json, numpy as np, pandas as pd

def cell_polygons(grid, iy, ix, probs, extra=None):
    feats = []
    for j, (a, b) in enumerate(zip(iy, ix)):
        x0, y0 = grid.lon0 + b * grid.res, grid.lat0 + a * grid.res; x1, y1 = x0 + grid.res, y0 + grid.res
        props = dict(cell_id=int(a * grid.nx + b), probability=round(float(probs[j]), 4))
        if extra: props.update({k: round(float(v[j]), 4) for k, v in extra.items()})
        feats.append(dict(type="Feature", properties=props, geometry=dict(type="Polygon", coordinates=[[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]])))
    return dict(type="FeatureCollection", features=feats)

def forecast_table(grid, iy, ix, week_start, horizon, prob, prob_clim):
    la = grid.lat0 + (iy + 0.5) * grid.res; lo = grid.lon0 + (ix + 0.5) * grid.res
    df = pd.DataFrame(dict(cell_id=iy * grid.nx + ix, lat=la.round(3), lon=lo.round(3), week_start=week_start.date().isoformat(),
                           horizon_days=horizon, probability=prob.round(4), climatology_probability=prob_clim.round(4)))
    df["ratio_vs_climatology"] = (df["probability"] / df["climatology_probability"].clip(lower=1e-4)).round(2)
    return df.sort_values("probability", ascending=False).reset_index(drop=True)
