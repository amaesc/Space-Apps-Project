# AI-assisted code: written with the help of Claude (Anthropic) at the request of a project contributor.
# Review and test it before relying on it.
"""Export simplified INEGI state outlines for the backend's point-in-state lookup (no shapely needed there).

    python3 -I boundaries/export_backend_states.py boundaries/mexico_states.geojson ../backend/app/data/mexico_states.json

Tolerance 0.001 deg (~110 m, topology preserved): on 200k real SNPP detections the state differs from the exact
polygons for 0.028% of points (0.003% fall outside every state), well below the 375 m-1 km FIRMS pixel size.
Output: [{"name": NOMGEO, "bbox": [w, s, e, n], "rings": [[[lon, lat], ...], ...]}, ...] in the GeoJSON order
(the backend, like clean_inputs.py, gives a point to the first state that contains it). All rings (outer + holes,
all parts) are listed flat: the even-odd rule handles holes and multipolygons.
"""
import json, sys
import geopandas as gpd
import shapely

TOL = 0.001

src, dst = sys.argv[1], sys.argv[2]
g = gpd.read_file(src)
out = []
for name, geom in zip(g["NOMGEO"], g.geometry.simplify(TOL, preserve_topology=True)):
    polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    rings = [[[round(x, 5), round(y, 5)] for x, y in r.coords] for p in polys for r in [p.exterior, *p.interiors]]
    out.append({"name": name, "bbox": [round(v, 5) for v in geom.bounds], "rings": rings})
with open(dst, "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
print(f"{len(out)} states, {sum(len(r) for s in out for r in s['rings']):,} vertices -> {dst}")
