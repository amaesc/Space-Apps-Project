# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Convert harmonized_hotspots*.csv to an indexed SQLite file the backend can query by month, region and area.

    python3 -I csv_to_sqlite.py harmonized_hotspots_mexico.csv harmonized_hotspots.sqlite

Streams the CSV (low memory). Table `hotspots` keeps every CSV column as the exact original TEXT (so exports are
byte-for-byte the source values), plus helper columns: `ym` (YYYY-MM), `lat`, `lon`, `frp_f` (REAL) for filtering.
Indexes: (region, ym) when a `region` column exists, (ym), (acq_date). Rows keep the CSV order (rowid).
Table `monthly` (region, ym, n_calendar, n_aqua, n_snpp): per-month counts for the backend calendar, where
n_calendar = rows with in_calendar = 1, n_aqua = Aqua non-low rows, n_snpp = SNPP rows with in_calendar = 1.
Standard library only.
"""
import csv, os, sqlite3, sys, time


def convert(src, dst, batch=50_000):
    tmp = dst + ".tmp"
    if os.path.exists(tmp): os.remove(tmp)
    con = sqlite3.connect(tmp)
    con.executescript("PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA temp_store=MEMORY;")
    t0 = time.time(); n = 0
    with open(src, newline="", encoding="utf-8") as fh:
        rd = csv.reader(fh)
        cols = next(rd)
        need = {"acq_date", "latitude", "longitude", "frp", "in_calendar"}
        if not need <= set(cols): sys.exit(f"missing columns: {sorted(need - set(cols))}")
        ia, ila, ilo, ifr = cols.index("acq_date"), cols.index("latitude"), cols.index("longitude"), cols.index("frp")
        q = ", ".join(f'"{c}" TEXT' for c in cols)
        con.execute(f"CREATE TABLE hotspots ({q}, ym TEXT NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL, frp_f REAL NOT NULL)")
        con.execute("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)")
        ins = f"INSERT INTO hotspots VALUES ({', '.join('?' * (len(cols) + 4))})"
        buf = []
        for r in rd:
            if len(r) != len(cols): sys.exit(f"row {n + 2}: {len(r)} fields, expected {len(cols)}")
            buf.append((*r, r[ia][:7], float(r[ila]), float(r[ilo]), float(r[ifr])))
            if len(buf) >= batch:
                con.executemany(ins, buf); n += len(buf); buf.clear()
        if buf: con.executemany(ins, buf); n += len(buf)
    if "region" in cols: con.execute("CREATE INDEX idx_region_ym ON hotspots (region, ym)")
    con.execute("CREATE INDEX idx_ym ON hotspots (ym)")
    con.execute("CREATE INDEX idx_date ON hotspots (acq_date)")
    reg = "region" if "region" in cols else "''"
    con.execute("CREATE TABLE monthly (region TEXT, ym TEXT, n_calendar INTEGER, n_aqua INTEGER, n_snpp INTEGER,"
                " PRIMARY KEY (region, ym))")
    con.execute(f"INSERT INTO monthly SELECT {reg}, ym, SUM(in_calendar = '1'),"
                " SUM(satellite = 'Aqua' AND confidence != 'l'), SUM(satellite = 'SNPP' AND in_calendar = '1')"
                " FROM hotspots GROUP BY 1, 2")
    lo, hi = con.execute("SELECT MIN(acq_date), MAX(acq_date) FROM hotspots").fetchone()
    con.executemany("INSERT INTO meta VALUES (?, ?)", [("source_csv", os.path.basename(src)), ("rows", str(n)),
                                                      ("columns", ",".join(cols)), ("min_date", lo), ("max_date", hi)])
    con.commit(); con.execute("ANALYZE"); con.close()
    os.replace(tmp, dst)
    print(f"{dst}: {n:,} rows, {len(cols)} columns, {lo} -> {hi}, {os.path.getsize(dst) / 1e6:.0f} MB, {time.time() - t0:.0f} s")


if __name__ == "__main__":
    if len(sys.argv) != 3: sys.exit(__doc__)
    convert(sys.argv[1], sys.argv[2])
