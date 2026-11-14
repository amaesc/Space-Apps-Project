"use client";

import { useDashboardData } from "../lib/api";
import { downloadHotspotsCsv, downloadHotspotsGeoJson } from "../lib/fire-data";

export default function DataDownloads() {
  // Descarga los datos en vivo de la API (o el respaldo de demostración si no responde).
  const { hotspots: HOTSPOT_EVENTS, status } = useDashboardData();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => downloadHotspotsCsv(HOTSPOT_EVENTS)}
        className="min-h-11 cursor-pointer rounded bg-fd-gold px-5 text-base font-bold text-black transition hover:brightness-110"
      >
        Download CSV
      </button>
      <button
        type="button"
        onClick={() => downloadHotspotsGeoJson(HOTSPOT_EVENTS)}
        className="min-h-11 cursor-pointer rounded border border-white/30 bg-white/5 px-5 text-base font-semibold text-white transition hover:bg-white/10"
      >
        Download GeoJSON
      </button>
      <span className="text-sm text-slate-400">
        {status === "live" ? "Live data" : status === "loading" ? "Loading…" : "API offline — demo data"}
      </span>
    </div>
  );
}
