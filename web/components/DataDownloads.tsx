"use client";

import {
  downloadHotspotsCsv,
  downloadHotspotsGeoJson,
  HOTSPOT_EVENTS,
} from "../lib/fire-data";

export default function DataDownloads() {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => downloadHotspotsCsv(HOTSPOT_EVENTS)}
        className="min-h-11 cursor-pointer rounded-lg bg-[#ff8a1f] px-5 text-base font-bold text-[#1a0d00] transition hover:brightness-110"
      >
        Download CSV
      </button>
      <button
        type="button"
        onClick={() => downloadHotspotsGeoJson(HOTSPOT_EVENTS)}
        className="min-h-11 cursor-pointer rounded-lg border border-white/30 bg-white/5 px-5 text-base font-semibold text-white transition hover:bg-white/10"
      >
        Download GeoJSON
      </button>
    </div>
  );
}
