import type { Metadata } from "next";
import DataDownloads from "../../components/DataDownloads";
import SiteHeader from "../../components/SiteHeader";
import { IS_DEMO_DATA } from "../../lib/fire-data";

export const metadata: Metadata = {
  title: "Data & methodology — FuegoData",
  description:
    "Download harmonized MODIS/VIIRS hotspot data for the Sierra de Chihuahua (CSV, GeoJSON), field definitions, sources, methodology and limitations.",
};

const FIELDS = [
  ["id", "Hotspot identifier"],
  ["municipality", "Municipality (Chihuahua, Mexico)"],
  ["zone", "Locality or terrain descriptor"],
  ["date_time", "Detection time, local (CST)"],
  ["sensor", "VIIRS 375 m or MODIS 1 km"],
  ["probable_origin", "Human · Lightning · Wildland · Undetermined"],
  ["probability_pct", "Model probability of the assigned origin (0–100)"],
  ["frp_mw", "Fire Radiative Power, megawatts"],
  ["lat, lon", "WGS84 coordinates (GeoJSON: [lon, lat])"],
];

const SOURCES = [
  {
    name: "NASA FIRMS — MODIS C6.1 & VIIRS 375 m",
    use: "Active-fire detections, 2000–present",
    href: "https://firms.modaps.eosdis.nasa.gov/",
  },
  {
    name: "GOES-R Geostationary Lightning Mapper (GLM)",
    use: "Lightning near each detection",
    href: "https://www.goes-r.gov/spacesegment/glm.html",
  },
  {
    name: "Open-Meteo",
    use: "Weather fallback outside IoT coverage",
    href: "https://open-meteo.com/",
  },
  {
    name: "Canadian Fire Weather Index (FWI)",
    use: "Fire danger calibration",
    href: "https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi",
  },
  {
    name: "CONAFOR",
    use: "Historical fire records with known cause",
    href: "https://www.gob.mx/conafor",
  },
  {
    name: "CONANP",
    use: "Protected-area polygons",
    href: "https://www.gob.mx/conanp",
  },
];

export default function DataPage() {
  return (
    <div className="min-h-dvh bg-[#0d0818] text-[#f4f6f8]">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-8 text-base leading-relaxed text-slate-200">
        <h1 className="text-3xl font-bold text-white">Data &amp; methodology</h1>
        <p className="mt-2 text-lg text-slate-300">
          Hotspots for the Sierra de Chihuahua, last 28 days, harmonized across MODIS and VIIRS.
        </p>

        {IS_DEMO_DATA && (
          <p className="mt-4 rounded-lg border border-amber-400/60 bg-amber-400/10 px-4 py-3 text-amber-100">
            <strong>Demo data.</strong> The current dataset is illustrative and must not be used
            for operational decisions. Live NASA FIRMS data is in progress.
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-bold text-white">Download</h2>
          <p className="mt-1 text-slate-300">One row per hotspot. UTF-8, comma-separated.</p>
          <div className="mt-3">
            <DataDownloads />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-white">Fields</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-white/15">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Column</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {FIELDS.map(([col, desc]) => (
                  <tr key={col}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[#fdba74]">{col}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-white">Method</h2>
          <ol className="mt-3 list-decimal space-y-3 pl-5">
            <li>
              <strong className="text-white">Sensor harmonization.</strong> MODIS (1 km, 2000–) and
              VIIRS (375 m, 2012–) counts are not directly comparable. A monthly factor{" "}
              <span className="font-mono">kₘ</span> is fitted on the 2012–2026 overlap to scale
              MODIS to VIIRS-equivalent counts. Uncertainty: 95% bootstrap confidence intervals.
              Validation: leave-one-year-out.
            </li>
            <li>
              <strong className="text-white">Probable origin.</strong> Each detection is classified
              as Human, Lightning, Wildland or Undetermined using GOES-GLM lightning, distance to
              roads, time and day of week, land cover, FWI and CONAFOR records (LightGBM + logistic
              regression).
            </li>
            <li>
              <strong className="text-white">Field weather.</strong> ESP32 stations (BME280,
              AS3935 lightning sensor, wind, rain) compute Hot-Dry-Windy and detect dry
              thunderstorms. Outside coverage, Open-Meteo and GOES-GLM are used.
            </li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-white">Limitations</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Origin is a statistical probability to prioritize inspections, not legal evidence.</li>
            <li>It never identifies properties or people.</li>
            <li>
              The risk model estimates danger from weather and season; it does not predict the
              exact place or time a fire will start.
            </li>
            <li>Cloud cover and satellite overpass times can delay or miss detections.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-white">Sources</h2>
          <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/15">
            {SOURCES.map((src) => (
              <li key={src.name} className="flex flex-wrap items-baseline justify-between gap-x-4 px-3 py-2.5">
                <a
                  href={src.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#fdba74] underline decoration-[#fdba74]/40 underline-offset-4 hover:decoration-[#fdba74]"
                >
                  {src.name}
                </a>
                <span className="text-sm text-slate-300">{src.use}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold text-white">How to cite</h2>
          <p className="mt-3 rounded-lg border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm">
            Team UNDEFINED (2026). FuegoData: harmonized MODIS–VIIRS burn calendar and probable
            fire origin for the Sierra de Chihuahua. NASA Space Apps Challenge 2026.
          </p>
        </section>
      </main>
    </div>
  );
}
