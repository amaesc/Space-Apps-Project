"use client";

import { useState } from "react";
import { loadHarmonizedArchive, useDashboardData } from "../lib/api";
import { downloadHistoricalCsv, downloadHotspotsCsv, downloadHotspotsGeoJson } from "../lib/fire-data";

export default function DataDownloads() {
  // Descarga los datos en vivo de la API (o el respaldo de demostración si no responde).
  const { hotspots: HOTSPOT_EVENTS, status } = useDashboardData();
  const [downloadingArchive, setDownloadingArchive] = useState(false);

  const handleHarmonizedDownload = async () => {
    setDownloadingArchive(true);
    try {
      const archive = await loadHarmonizedArchive();
      const allRows = Object.values(archive).flat();
      downloadHistoricalCsv(allRows, "2002-2026-in-calendar");
    } finally {
      setDownloadingArchive(false);
    }
  };

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
      <button
        type="button"
        disabled={downloadingArchive}
        onClick={handleHarmonizedDownload}
        className="min-h-11 cursor-pointer rounded border border-sky-400/40 bg-sky-500/15 px-5 text-base font-semibold text-sky-200 transition hover:bg-sky-500/25 disabled:cursor-wait disabled:opacity-60"
      >
        {downloadingArchive ? "Preparing CSV…" : "Download Harmonized CSV (2002–2026)"}
      </button>
      <span className="text-sm text-slate-400">
        {status === "live" ? "Live data" : status === "loading" ? "Loading…" : "API offline — demo data"}
      </span>
    </div>
  );
}
