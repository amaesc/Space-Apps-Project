// Capas del mapa: definiciones, escalas de color y leyendas.
import { RISK_SCALE, type Station, type WeatherCell } from "./fire-data";

export type ConditionLayer = "temperature" | "humidity" | "pressure" | "noise" | "battery" | "connectivity";

export interface FireLayers {
  nasa: boolean; // NASA FIRMS, activos (48 h)
  history: boolean; // NASA FIRMS, histórico mensual
  probability: boolean; // nuestro modelo de probabilidad de incendio (HDW)
  cause: boolean; // causa probable de los incendios activos
}

type Stop = [number, string];

/** Interpola un color entre paradas [valor, #hex]. */
function ramp(stops: Stop[], v: number): string {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [v1, c1] = stops[i];
    const [v0, c0] = stops[i - 1];
    if (v <= v1) {
      const t = (v - v0) / (v1 - v0);
      const a = parseInt(c0.slice(1), 16);
      const b = parseInt(c1.slice(1), 16);
      const mix = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
      return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, "0")}`;
    }
  }
  return stops[stops.length - 1][1];
}

const TEMP: Stop[] = [[0, "#2c7bb6"], [10, "#00a6ca"], [18, "#90eb9d"], [25, "#f9d057"], [32, "#f29e2e"], [40, "#d7191c"]];
// Humedad baja = peligro: rojo seco → azul húmedo.
const HUM: Stop[] = [[0, "#d7191c"], [20, "#f29e2e"], [40, "#f9d057"], [60, "#90eb9d"], [80, "#00a6ca"], [100, "#2c7bb6"]];
const PRES: Stop[] = [[750, "#3f007d"], [800, "#6a51a3"], [850, "#9e9ac8"], [900, "#cbc9e2"], [1013, "#f2f0f7"]];
const NOISE: Stop[] = [[30, "#1a9850"], [50, "#a6d96a"], [65, "#fee08b"], [80, "#f46d43"], [95, "#a50026"]];
const BATT: Stop[] = [[0, "#a50026"], [25, "#f46d43"], [50, "#fee08b"], [75, "#a6d96a"], [100, "#1a9850"]];

/** Batería Li-ion: 3.3 V ≈ 0 %, 4.2 V ≈ 100 %. */
export const batteryPct = (v: number) => Math.round(Math.min(100, Math.max(0, ((v - 3.3) / 0.9) * 100)));

/** Calidad de enlace a partir del RSSI (o "offline" si la estaca dejó de reportar). */
export const CONNECTIVITY = [
  { label: "Offline", color: "#6b7280" },
  { label: "Poor", color: "#d7191c" },
  { label: "Fair", color: "#f29e2e" },
  { label: "Good", color: "#a6d96a" },
  { label: "Excellent", color: "#1a9850" },
] as const;

export function connectivityLevel(s: Station): number {
  if (s.fallbackActive || s.rssiDbm === null) return 0;
  if (s.rssiDbm >= -60) return 4;
  if (s.rssiDbm >= -75) return 3;
  if (s.rssiDbm >= -90) return 2;
  return 1;
}

export interface ConditionDef {
  id: ConditionLayer;
  label: string;
  /** true si además hay cuadrícula para todo el estado (Open-Meteo). */
  grid: boolean;
  stationValue: (s: Station) => { text: string; color: string } | null;
  cellColor?: (c: WeatherCell) => string;
  cellText?: (c: WeatherCell) => string;
  legend: { stops: string[]; min: string; max: string } | { items: { label: string; color: string }[] };
}

const grad = (stops: Stop[]) => stops.map(([, c]) => c);

export const CONDITIONS: ConditionDef[] = [
  {
    id: "temperature",
    label: "Temperature",
    grid: true,
    stationValue: (s) => ({ text: `${s.temperatureC.toFixed(1)} °C`, color: ramp(TEMP, s.temperatureC) }),
    cellColor: (c) => ramp(TEMP, c.temperatureC),
    cellText: (c) => `${c.temperatureC} °C`,
    legend: { stops: grad(TEMP), min: "0 °C", max: "40 °C" },
  },
  {
    id: "humidity",
    label: "Humidity",
    grid: true,
    stationValue: (s) => ({ text: `${Math.round(s.humidityPct)} %`, color: ramp(HUM, s.humidityPct) }),
    cellColor: (c) => ramp(HUM, c.humidityPct),
    cellText: (c) => `${c.humidityPct} % RH`,
    legend: { stops: grad(HUM), min: "0 % (dry)", max: "100 %" },
  },
  {
    id: "pressure",
    label: "Atmospheric pressure",
    grid: true,
    stationValue: (s) => (s.pressureHpa === null ? null : { text: `${Math.round(s.pressureHpa)} hPa`, color: ramp(PRES, s.pressureHpa) }),
    cellColor: (c) => ramp(PRES, c.pressureHpa),
    cellText: (c) => `${c.pressureHpa} hPa (surface)`,
    legend: { stops: grad(PRES), min: "750 hPa", max: "1013 hPa" },
  },
  {
    id: "noise",
    label: "Noise level",
    grid: false,
    stationValue: (s) => (s.noiseDb === null ? null : { text: `${Math.round(s.noiseDb)} dB`, color: ramp(NOISE, s.noiseDb) }),
    legend: { stops: grad(NOISE), min: "30 dB", max: "95 dB" },
  },
  {
    id: "battery",
    label: "Station battery",
    grid: false,
    stationValue: (s) => {
      if (s.batteryV === null) return null;
      const pct = batteryPct(s.batteryV);
      return { text: `${pct} % · ${s.batteryV.toFixed(2)} V`, color: ramp(BATT, pct) };
    },
    legend: { stops: grad(BATT), min: "0 %", max: "100 %" },
  },
  {
    id: "connectivity",
    label: "Network connectivity",
    grid: false,
    stationValue: (s) => {
      const lvl = connectivityLevel(s);
      const link = s.linkType ? s.linkType.toUpperCase() : "";
      const rssi = s.rssiDbm !== null && lvl > 0 ? ` ${s.rssiDbm} dBm` : "";
      return { text: `${CONNECTIVITY[lvl].label}${link ? ` · ${link}` : ""}${rssi}`, color: CONNECTIVITY[lvl].color };
    },
    legend: { items: CONNECTIVITY.map((c) => ({ label: c.label, color: c.color })) },
  },
];

export const conditionDef = (id: ConditionLayer | null) => CONDITIONS.find((c) => c.id === id) ?? null;

/** Probabilidad de incendio (modelo HDW): nivel 1-5 con la escala de peligro. */
export const probabilityColor = (c: WeatherCell) => RISK_SCALE[Math.min(5, Math.max(1, c.fireProbLevel)) - 1].bg;

/** Meses disponibles para el histórico de NASA (MODIS desde 2002-07, VIIRS desde 2020). */
export function historyMonths(now = new Date()): string[] {
  const out: string[] = [];
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  while (d >= new Date(2002, 6, 1)) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export const monthLabel = (m: string) =>
  new Date(`${m}-15T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

/** Imágenes satelitales de NASA GIBS (raster) que se pueden superponer al mapa. */
export type SatelliteLayer = "goes_fire" | "goes_color" | "truecolor" | "smoke" | "lst" | "ndvi";

const yesterday = () => {
  const d = new Date(Date.now() - 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};

export const SATELLITE_LAYERS: {
  id: SatelliteLayer;
  label: string;
  hint: string;
  layer: string;
  level: number;
  ext: "png" | "jpg";
  /** "default" = la imagen más reciente disponible en GIBS. */
  time: () => string;
  opacity: number;
}[] = [
  { id: "goes_fire", label: "GOES-East fire temperature", hint: "Geostationary, every 10 min (coarser than VIIRS)", layer: "GOES-East_ABI_FireTemp", level: 7, ext: "png", time: () => "default", opacity: 0.85 },
  { id: "goes_color", label: "GOES-East GeoColor (smoke & clouds)", hint: "Near-live image, every 10 min", layer: "GOES-East_ABI_GeoColor", level: 7, ext: "png", time: () => "default", opacity: 0.9 },
  { id: "truecolor", label: "True color, yesterday (VIIRS NOAA-20)", hint: "Daily satellite photo: smoke plumes and burn scars", layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor", level: 9, ext: "jpg", time: yesterday, opacity: 1 },
  { id: "smoke", label: "Smoke (UV aerosol index, TEMPO)", hint: "Aerosols over North America, several times a day", layer: "TEMPO_L3_Ozone_UV_Aerosol_Index", level: 7, ext: "png", time: () => "default", opacity: 0.7 },
  { id: "lst", label: "Land surface temperature (day)", hint: "VIIRS NOAA-20 · used by our fire probability model", layer: "VIIRS_NOAA20_Land_Surface_Temp_Day", level: 7, ext: "png", time: () => "default", opacity: 0.7 },
  { id: "ndvi", label: "Vegetation / fuel (NDVI, 8 days)", hint: "VIIRS NOAA-20 · used by our fire probability model", layer: "VIIRS_NOAA20_NDVI_8Day", level: 8, ext: "png", time: () => "default", opacity: 0.7 },
];

export function gibsTileUrl(id: SatelliteLayer): { url: string; maxNativeZoom: number; opacity: number } {
  const l = SATELLITE_LAYERS.find((s) => s.id === id)!;
  return {
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${l.layer}/default/${l.time()}/GoogleMapsCompatible_Level${l.level}/{z}/{y}/{x}.${l.ext}`,
    maxNativeZoom: l.level,
    opacity: l.opacity,
  };
}
