# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Load the harmonized hotspot series and build dense weekly cell panels."""
import numpy as np, pandas as pd, yaml

def load_config(path):
    return yaml.safe_load(open(path))

class Grid:
    def __init__(self, g):
        self.lon0, self.lat0, self.res = g["lon0"], g["lat0"], g["res"]
        self.nx = int(np.ceil(round((g["lon1"] - g["lon0"]) / self.res, 6)))
        self.ny = int(np.ceil(round((g["lat1"] - g["lat0"]) / self.res, 6)))
    def index(self, lat, lon):
        iy = np.clip(np.floor((np.asarray(lat) - self.lat0) / self.res).astype(int), 0, self.ny - 1)
        ix = np.clip(np.floor((np.asarray(lon) - self.lon0) / self.res).astype(int), 0, self.nx - 1)
        return iy, ix
    def centers(self):
        lat = self.lat0 + (np.arange(self.ny) + 0.5) * self.res
        lon = self.lon0 + (np.arange(self.nx) + 0.5) * self.res
        return np.meshgrid(lat, lon, indexing="ij")           # each (ny, nx)

def load_series(cfg):
    d = cfg["data"]
    df = pd.read_csv(d["hotspots_csv"], usecols=["latitude", "longitude", "acq_date", "frp", d["series_flag"]],
                     parse_dates=["acq_date"])
    return df[df[d["series_flag"]] == 1].drop(columns=d["series_flag"]).reset_index(drop=True)

def build_panel(df, cfg):
    """Dense arrays over complete weeks 0..W-1: counts C, FRP sum FS, FRP max FM, each (W, ny, nx)."""
    grid = Grid(cfg["grid"]); epoch = pd.Timestamp(cfg["time"]["epoch"])
    last = df["acq_date"].max()
    last_sunday = last - pd.Timedelta(days=(last.weekday() + 1) % 7)       # last day of the last COMPLETE week
    W = ((last_sunday - epoch).days + 1) // 7
    d = df[df["acq_date"] <= last_sunday]
    w = ((d["acq_date"] - epoch).dt.days // 7).to_numpy()
    iy, ix = grid.index(d["latitude"].to_numpy(), d["longitude"].to_numpy())
    C = np.zeros((W, grid.ny, grid.nx), np.float32); FS = np.zeros_like(C); FM = np.zeros_like(C)
    np.add.at(C, (w, iy, ix), 1.0); np.add.at(FS, (w, iy, ix), d["frp"].to_numpy(np.float32))
    np.maximum.at(FM, (w, iy, ix), d["frp"].to_numpy(np.float32))
    return dict(grid=grid, epoch=epoch, W=W, C=C, FS=FS, FM=FM, last_sunday=last_sunday)
