import type { Metadata } from "next";
import DataDownloads from "../../components/DataDownloads";
import ModelCard from "../../components/ModelCard";
import SiteHeader from "../../components/SiteHeader";
import { IS_DEMO_DATA } from "../../lib/fire-data";

export const metadata: Metadata = {
  title: "Data & methodology — FireData",
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
    name: "NASA FIRMS — VIIRS 375 m (NOAA-20, NOAA-21)",
    use: "Active fires (last 48 h) and archive 2020–",
    href: "https://www.earthdata.nasa.gov/data/tools/firms",
  },
  {
    name: "NASA FIRMS — MODIS 1 km (Terra, Aqua)",
    use: "Fire archive 2002– and kₘ harmonization",
    href: "https://www.earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs",
  },
  {
    name: "NASA GIBS",
    use: "Tiles of FIRMS detections, GOES, true color, smoke, NDVI, land surface temperature",
    href: "https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api",
  },
  {
    name: "GOES-East ABI (fire temperature, GeoColor)",
    use: "Near-live imagery every 10 minutes",
    href: "https://www.goes-r.gov/",
  },
  {
    name: "VIIRS NDVI and MODIS land surface temperature",
    use: "Fuel and surface dryness in the fire probability model",
    href: "https://www.earthdata.nasa.gov/data/tools/worldview",
  },
  {
    name: "Open-Meteo",
    use: "Current weather grid (0.5°) and station backup",
    href: "https://open-meteo.com/",
  },
  {
    name: "CONAFOR · CONANP",
    use: "Fire records with known cause · protected areas",
    href: "https://www.gob.mx/conafor",
  },
];

export default function DataPage() {
  return (
    <div className="min-h-dvh bg-fd-bg text-[#f1f1f1]">
      <SiteHeader />

      <div className="border-y border-black/40 bg-fd-red-dark px-4 py-2.5 text-center">
        <h1 className="text-2xl font-semibold text-fd-gold sm:text-3xl">Data &amp; methodology</h1>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8 text-[17px] leading-relaxed text-white/90">
        <p className="text-xl font-semibold text-white">
          Hotspots for the Sierra de Chihuahua, harmonized across MODIS and VIIRS.
        </p>

        {IS_DEMO_DATA && (
          <p className="mt-4 rounded border border-fd-gold/60 bg-fd-gold/10 px-4 py-3 text-fd-gold">
            <strong>Demo data.</strong> The current dataset is illustrative and must not be used
            for operational decisions. Live NASA FIRMS data is in progress.
          </p>
        )}

        <section className="mt-8">
          <h2 className="border-b border-white/15 pb-1 text-xl font-bold text-white">Download</h2>
          <p className="mt-1 text-white/75">One row per hotspot. UTF-8, comma-separated.</p>
          <div className="mt-3">
            <DataDownloads />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="border-b border-white/15 pb-1 text-xl font-bold text-white">Fields</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-white/15">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white/75">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Column</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {FIELDS.map(([col, desc]) => (
                  <tr key={col}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-fd-gold">{col}</td>
                    <td className="px-3 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="border-b border-white/15 pb-1 text-xl font-bold text-white">Method</h2>
          <ol className="mt-3 list-decimal space-y-3 pl-5">
            <li>
              <strong className="text-white">Burn calendar and sensor harmonization.</strong> Our server reads every
              daily NASA FIRMS detection inside Chihuahua: MODIS (1 km) since 2002 and VIIRS NOAA-20 (375 m) since
              2020. On the overlap, a monthly factor <span className="font-mono">kₘ</span> = VIIRS ÷ MODIS is fitted
              (ratio of sums) with a 95% bootstrap confidence interval over years, and MODIS months before 2020 are
              scaled by <span className="font-mono">kₘ</span>. MODIS detections flagged as volcano or static
              industrial sources are excluded.
            </li>
            <li>
              <strong className="text-white">Fire probability (72 h).</strong> A gradient-boosting model (LightGBM)
              per 0.25° cell, trained on 2020–2025. Target: at least one VIIRS detection in the cell within 72 h.
              Inputs use only what is available each morning: NASA FIRMS fire activity up to yesterday, NASA POWER
              weather (temperature, humidity, wind, soil moisture, rain, dry days) from 3 days earlier, VIIRS NDVI
              from at least 30 days earlier, the cell&apos;s historical fire frequency (previous years only),
              elevation and season. Probabilities are calibrated (isotonic regression).
            </li>
            <li>
              <strong className="text-white">IoT correction (experimental).</strong> Field stations report current
              conditions that satellite reanalysis only sees with a 3-day delay. Within 30 km of a station the
              probability is nudged up for hotter/drier/windier readings or lightning, and down after rain. The
              adjustment is bounded and will be validated once stations have a history. Each station receives its
              cell&apos;s level to drive its 5 LEDs.
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
          <h2 className="border-b border-white/15 pb-1 text-xl font-bold text-white">Model validation</h2>
          <div className="mt-3">
            <ModelCard />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="border-b border-white/15 pb-1 text-xl font-bold text-white">Limitations</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Origin is a statistical probability to prioritize inspections, not legal evidence.</li>
            <li>It never identifies properties or people.</li>
            <li>
              The risk model estimates danger from weather and season; it does not predict the
              exact place or time a fire will start.
            </li>
            <li>Cloud cover and satellite overpass times can delay or miss detections.</li>
            <li>
              The model predicts satellite fire detections, which include agricultural and other human burns, not
              only wildfires. It relies most on where fire has occurred recently and historically, so it is
              strongest at anticipating continued or seasonal activity and weaker for brand-new ignitions.
            </li>
            <li>
              Global NASA FIRMS data arrive within about 3 hours of the satellite pass; real-time FIRMS is only
              available for the US and Canada.
            </li>
            <li>A detection is the center of a 375 m (VIIRS) or 1 km (MODIS) pixel, not the exact fire location.</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="border-b border-white/15 pb-1 text-xl font-bold text-white">Sources</h2>
          <ul className="mt-3 divide-y divide-white/10 rounded-lg border border-white/15">
            {SOURCES.map((src) => (
              <li key={src.name} className="flex flex-wrap items-baseline justify-between gap-x-4 px-3 py-2.5">
                <a
                  href={src.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-fd-gold underline decoration-fd-gold/40 underline-offset-4 hover:decoration-fd-gold"
                >
                  {src.name}
                </a>
                <span className="text-sm text-white/75">{src.use}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="border-b border-white/15 pb-1 text-xl font-bold text-white">How to cite</h2>
          <p className="mt-3 rounded-lg border border-white/15 bg-white/5 px-4 py-3 font-mono text-sm">
            Team UNDEFINED (2026). FireData: harmonized MODIS–VIIRS burn calendar and probable
            fire origin for the Sierra de Chihuahua. NASA Space Apps Challenge 2026.
          </p>
          <p className="mt-3 text-sm text-white/75">
            NASA acknowledgement: We acknowledge the use of data and/or imagery from NASA&apos;s Fire Information for
            Resource Management System (FIRMS), part of NASA&apos;s Earth Science Data and Information System (ESDIS),
            and imagery from NASA&apos;s Global Imagery Browse Services (GIBS).
          </p>
        </section>
      </main>
    </div>
  );
}
