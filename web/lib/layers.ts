// Capas del mapa: definiciones, escalas de color y leyendas.
import { RISK_SCALE, type Station, type WeatherCell } from "./fire-data";

export type ConditionLayer = "temperature" | "humidity" | "pressure" | "noise" | "battery" | "connectivity" | "light";

export interface FireLayers {
  nasa: boolean; // NASA FIRMS, activos (48 h)
  history: boolean; // NASA FIRMS, histórico mensual
  probability: boolean; // nuestro modelo de probabilidad de incendio (72 h)
  weekly: boolean; // modelo semanal LightGBM (7 días, 0.1°, in_calendar = 1)
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
const LIGHT: Stop[] = [[0, "#1e1b4b"], [30, "#6d28d9"], [60, "#f59e0b"], [100, "#fef08a"]];
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
    id: "light",
    label: "Light level",
    grid: false,
    stationValue: (s) => (s.luminosityPct === null ? null : { text: `${Math.round(s.luminosityPct)} % light`, color: ramp(LIGHT, s.luminosityPct) }),
    legend: { stops: grad(LIGHT), min: "dark", max: "full sun" },
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

/** Simbología: degradado oficial (tabla de colores de NASA GIBS) o clases con significado (RGB). */
export type SatLegend =
  | { kind: "gradient"; stops: string[]; ticks: { at: number; label: string }[]; caption: string }
  | { kind: "classes"; items: { color: string; label: string }[]; caption: string };

// Kelvin → °C para las etiquetas de temperatura de superficie (la tabla de NASA va de 200 a 350 K).
const lstTick = (k: number) => ({ at: (k - 200) / 150, label: `${Math.round(k - 273.15)} °C` });

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
  legend: SatLegend;
}[] = [
  {
    id: "goes_fire",
    label: "GOES-East fire temperature",
    hint: "Geostationary, every 10 min (2 km, coarser than VIIRS)",
    layer: "GOES-East_ABI_FireTemp",
    level: 7,
    ext: "png",
    time: () => "default",
    opacity: 0.85,
    // Fuente: descripción de la capa en NASA Worldview (Fire Temperature RGB).
    legend: {
      kind: "classes",
      caption: "Fire intensity goes from red (warm) to near white (very hot). Swatches are approximate.",
      items: [
        { color: "#ff1a00", label: "Warm fire" },
        { color: "#ff8c00", label: "Very warm fire" },
        { color: "#ffe600", label: "Hot fire" },
        { color: "#fffbe0", label: "Very hot fire" },
        { color: "#6e1a2c", label: "Burn scar" },
        { color: "#b25fbf", label: "Clear land" },
        { color: "#121212", label: "Water, snow or night" },
        { color: "#2f6fd6", label: "Water clouds" },
        { color: "#2fae5f", label: "Ice clouds" },
      ],
    },
  },
  {
    id: "goes_color",
    label: "GOES-East GeoColor (smoke & clouds)",
    hint: "Near-live image, every 10 min (1 km)",
    layer: "GOES-East_ABI_GeoColor",
    level: 7,
    ext: "png",
    time: () => "default",
    opacity: 0.9,
    // Fuente: descripción de la capa en NASA Worldview (GeoColor).
    legend: {
      kind: "classes",
      caption: "Day: approximate true color. Night: infrared blend; city lights are a static map.",
      items: [
        { color: "#f4f4f4", label: "Clouds (day)" },
        { color: "#9b8f7e", label: "Smoke or dust (day)" },
        { color: "#4e7a3a", label: "Vegetation (day)" },
        { color: "#c9a77c", label: "Desert / bare soil (day)" },
        { color: "#8fd3f5", label: "Low water clouds (night)" },
        { color: "#c8c8c8", label: "High ice clouds (night)" },
        { color: "#ffc34d", label: "City lights (night)" },
      ],
    },
  },
  {
    id: "truecolor",
    label: "True color, yesterday (VIIRS NOAA-20)",
    hint: "Daily natural-color photo (250 m)",
    layer: "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
    level: 9,
    ext: "jpg",
    time: yesterday,
    opacity: 1,
    legend: {
      kind: "classes",
      caption: "Natural color, close to what the human eye sees (bands I1, M4, M3). Typical interpretation:",
      items: [
        { color: "#f4f4f4", label: "Clouds" },
        { color: "#a39b8f", label: "Smoke plume (gray-brown haze)" },
        { color: "#3b2f2a", label: "Fresh burn scar (dark)" },
        { color: "#4e7a3a", label: "Green vegetation" },
        { color: "#c9a77c", label: "Bare soil / dry grass" },
        { color: "#1d3557", label: "Water" },
      ],
    },
  },
  {
    id: "smoke",
    label: "Smoke (UV aerosol index, TEMPO)",
    hint: "Aerosols over North America, hourly in daylight",
    layer: "TEMPO_L3_Ozone_UV_Aerosol_Index",
    level: 7,
    ext: "png",
    time: () => "default",
    opacity: 0.7,
    // Fuente: tabla de colores oficial TEMPO_Ozone_UV_Aerosol_Index (NASA GIBS).
    legend: {
      kind: "gradient",
      stops: ["#f1edec", "#e2c7bf", "#d7a290", "#cc7f64", "#c0593b", "#af2f24", "#901129", "#660f24", "#3c0912"],
      ticks: [
        { at: 0, label: "0" },
        { at: 0.5, label: "2.5" },
        { at: 1, label: "≥5" },
      ],
      caption: "UV aerosol index (unitless). Higher = more UV-absorbing aerosols such as smoke or dust.",
    },
  },
  {
    id: "lst",
    label: "Land surface temperature (day), yesterday",
    hint: "VIIRS NOAA-20 · used by our fire probability model",
    layer: "VIIRS_NOAA20_Land_Surface_Temp_Day",
    level: 7,
    ext: "png",
    // El día en curso aún no cubre todo México: se muestra el anterior completo.
    time: yesterday,
    opacity: 0.7,
    // Fuente: tabla de colores oficial MODIS_Land_Surface_Temp (NASA GIBS), 200–350 K.
    legend: {
      kind: "gradient",
      stops: ["#c900ff", "#4d00ff", "#0047ff", "#00e6ff", "#66ff12", "#dbff00", "#ffc100", "#ff5e00", "#ff0100"],
      ticks: [lstTick(230), lstTick(260), lstTick(290), lstTick(320)],
      caption: "Temperature of the ground surface (not the air), −73 to 77 °C. Hotter surfaces dry out fuel faster. Gaps = clouds.",
    },
  },
  {
    id: "ndvi",
    label: "Vegetation / fuel (NDVI, 8 days)",
    hint: "VIIRS NOAA-20 · used by our fire probability model",
    layer: "VIIRS_NOAA20_NDVI_8Day",
    level: 8,
    ext: "png",
    time: () => "default",
    opacity: 0.7,
    // Fuente: tabla de colores oficial MODIS_NDVI (NASA GIBS), 0–1.
    legend: {
      kind: "gradient",
      stops: ["#f1ecec", "#e1d2c6", "#b4a596", "#a18063", "#96ba20", "#56a101", "#2e8000", "#006400", "#001801"],
      ticks: [
        { at: 0, label: "0" },
        { at: 0.2, label: "0.2" },
        { at: 0.4, label: "0.4" },
        { at: 0.6, label: "0.6" },
        { at: 0.8, label: "0.8" },
        { at: 1, label: "1" },
      ],
      caption: "Tan = little or no vegetation · light green = some · dark green = dense, healthy vegetation.",
    },
  },
];

export function gibsTileUrl(id: SatelliteLayer): { url: string; maxNativeZoom: number; opacity: number } {
  const l = SATELLITE_LAYERS.find((s) => s.id === id)!;
  return {
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${l.layer}/default/${l.time()}/GoogleMapsCompatible_Level${l.level}/{z}/{y}/{x}.${l.ext}`,
    maxNativeZoom: l.level,
    opacity: l.opacity,
  };
}
