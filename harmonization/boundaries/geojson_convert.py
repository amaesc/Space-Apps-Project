"""Convert an INEGI state-boundary shapefile (LCC metres) to WGS84 GeoJSON for clean_inputs.py.

    python3 geojson_convert.py <path/to/08ent.shp> chihuahua_state.geojson      # one state
    python3 geojson_convert.py <path/to/00ent.shp> mexico_states.geojson        # all 32 states (national file)

INEGI Marco Geoestadistico: state boundaries are the `<NN>ent.shp` layer (00 = national, 08 = Chihuahua, ...).
Fields kept: CVEGEO, CVE_ENT, NOMGEO (state name, used as `region`).
"""
import sys
import geopandas as gpd

src, dst = sys.argv[1], sys.argv[2]
gdf = gpd.read_file(src).to_crs(epsg=4326)          # EPSG:6372 (Mexico ITRF2008 / LCC) -> WGS84 lon/lat
gdf = gdf[[c for c in ("CVEGEO", "CVE_ENT", "NOMGEO") if c in gdf.columns] + ["geometry"]]
gdf.to_file(dst, driver="GeoJSON")
print(f"{len(gdf)} feature(s) -> {dst}  bounds: {gdf.total_bounds.round(3)}")
