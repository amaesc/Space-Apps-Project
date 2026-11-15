// Modelo de datos del frontend + respaldo de demostración.
// Los datos en vivo vienen de la API de la Raspberry Pi (ver lib/api.ts).

/** Los datos actuales son ilustrativos; cambiar a false al conectar NASA FIRMS. */
export const IS_DEMO_DATA = true;

export type FireOrigin = "Human" | "Lightning" | "Wildland" | "Undetermined";

export interface HotspotEvent {
  id: string;
  municipality: string;
  zone: string;
  detectedAt: string; // ISO 8601
  sensor: string;
  origin: FireOrigin;
  probability: number;
  frpMw: number;
  lat: number;
  lon: number;
  reasons: string[];
  irregularUseAlert: boolean;
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  temperatureC: number;
  humidityPct: number;
  windKmh: number;
  lightningStrikes: number;
  riskLevel: number; // 1-5
  recordedAt: string; // ISO 8601
  fallbackActive: boolean;
  batteryV: number | null;
  pressureHpa: number | null;
  noiseDb: number | null;
  rssiDbm: number | null;
  linkType: string | null;
  luminosityPct: number | null;
  flameDetected: boolean;
  flameIntensityPct: number | null;
}

/** Detección de incendio activo o histórico de NASA FIRMS (MODIS / VIIRS). */
export interface NasaFire {
  lat: number;
  lon: number;
  frpMw: number;
  confidence: string; // low | nominal | high
  date: string;
  time: string;
  satellite: string;
  /** true si pertenece a la serie temporal consistente (in_calendar = 1: Aqua pre-2012 o celda 1.4 km ≥ 15 MW). */
  inCalendar?: boolean;
  /** Temperatura de brillo en infrarrojo medio (K) armonizada (tope de 367 K). */
  brightnessK?: number;
  /** Temperatura de brillo en infrarrojo térmico canal T31 (K). */
  brightT31K?: number;
  /** Paso diurno ("D") o nocturno ("N"). */
  daynight?: string;
  /** Área de la huella del píxel scan × track (km²). */
  pixelAreaKm2?: number;
}

/** Celda de la cuadrícula de clima del estado (Open-Meteo + riesgo HDW). */
export interface WeatherCell {
  lat: number;
  lon: number;
  temperatureC: number;
  humidityPct: number;
  pressureHpa: number;
  riskLevel: number;
  ndvi: number | null;
  lstC: number | null;
  fireProbLevel: number;
  fireProbFactors: string[];
}

export interface BurnCalendar {
  monthLabels: string[];
  monthlyMedians: number[];
  current: { year: number; month: string; value: number; median: number; anomalyPct: number };
  rows: { year: number; months: (number | null)[]; source: string }[];
  kmFactors: number[];
  kmCi95: ([number, number] | null)[] | null;
  /** "nasa" = conteos reales de FIRMS; "illustrative" = serie de demostración. */
  dataSource: "nasa" | "illustrative";
  /** Avance de la construcción del calendario real (0-1), si está en curso. */
  realCoverage: number | null;
}

/** Metadatos y métricas de validación extraídos de harmonization/ (MODIS C6.1 ↔ VIIRS S-NPP). */
export const HARMONIZATION_META = {
  bounds: { south: 25.5, north: 31.8, west: -109.5, east: -103.3 },
  dateRange: { start: "2002-07-04", seam: "2012-01-20", snppEnd: "2026-07-31", modisEnd: "2026-08-30" },
  totalRows: 481_029,
  inCalendarRows: 55_902,
  aquaInCalendarRows: 19_874,
  snppInCalendarRows: 36_028,
  detailOnlyRows: 425_127,
  modisInputRows: 103_050,
  modisAquaRows: 54_000,
  modisTerraRows: 49_050,
  viirsSnppInputRows: 377_979,
  confidenceCounts: { low: 47_948, nominal: 378_918, high: 54_163 },
  meanPixelAreaKm2: { modis: 1.99, snpp: 0.234 },
  medianFrpPerPixelKm2: { modis: 12.26, snpp: 16.6 },
  gridCellDeg: 0.05,
  platformStats: [
    { platform: "Terra", sensor: "MODIS 1 km", dayPass: "10:30", nightPass: "22:30", rows: 49_050, medBrightK: 340.8, medT31K: 300.5, medDtK: 37.3, medFrpMw: 17.0 },
    { platform: "Aqua", sensor: "MODIS 1 km", dayPass: "13:30", nightPass: "01:30", rows: 54_000, medBrightK: 346.8, medT31K: 307.4, medDtK: 38.8, medFrpMw: 23.6 },
    { platform: "Suomi-NPP", sensor: "VIIRS 375 m", dayPass: "13:30", nightPass: "01:30", rows: 377_979, medBrightK: 334.2, medT31K: 296.8, medDtK: 30.2, medFrpMw: 3.7 },
  ],
  frpThresholdMw: 15.0,
  cellSizeKm: 1.4,
  cellTimeWindowMin: 30,
  overpassTimeLocal: "13:30",
  brightnessCapK: 367.0,
  modisAtCapPct: 6.2,
  modisBrightT31UncappedRows: 24,
  modisBrightT31UncappedK: 400.1,
  mirWavelengthModisUm: 3.959,
  mirWavelengthViirsUm: 3.74,
  planckUpscaleCorrBefore: 0.45,
  planckUpscaleCorrAfter: 0.72,
  anomaly2011Hotspots: 7_452,
  pre2011AnnualMean: 1_900,
  matchedPairsTotal: 7_028,
  matchedPairsDay: 6_162,
  matchedPairsNight: 866,
  post2012OffsetDivisor: 1.1,
  validation: {
    rawRatioToAqua: 11.7,
    rawCorrelation: 0.967,
    harmonizedRatioToAqua: 0.91,
    harmonizedCorrelation: 0.984,
    heldOutCorrelation: 0.986,
    eraRatios: [
      { era: "2012–2017", ratio: 1.12 },
      { era: "2018–2022", ratio: 1.2 },
      { era: "2023–2026", ratio: 1.07 },
    ],
    aquaDetectionProbByFrp: [
      { bin: "1–2 MW", probPct: 11 },
      { bin: "8–16 MW", probPct: 43 },
      { bin: "32–64 MW", probPct: 73 },
      { bin: "64+ MW", probPct: 84 },
    ],
    brightnessDayGapBeforeK: -17.3,
    brightnessDayGapAfterK: -1.0,
    brightnessDayKsBefore: 0.58,
    brightnessDayKsAfter: 0.13,
    brightnessDayMaeBeforeK: 21.5,
    brightnessDayMaeAfterK: 11.1,
    brightnessNightGapBeforeK: -18.6,
    brightnessNightGapAfterK: 2.5,
    brightnessNightKsBefore: 0.5,
    brightnessNightKsAfter: 0.18,
    brightnessNightMaeBeforeK: 17.5,
    brightnessNightMaeAfterK: 15.6,
  },
} as const;

export const ORIGIN_COLORS: Record<FireOrigin, { hex: string }> = {
  Human: { hex: "#f97316" },
  Lightning: { hex: "#38bdf8" },
  Wildland: { hex: "#34d399" },
  Undetermined: { hex: "#a78bfa" },
};

export const ORIGINS = Object.keys(ORIGIN_COLORS) as FireOrigin[];

/** Escala de peligro de 5 niveles (colores estándar de peligro de incendio). Índice = nivel - 1. */
export const RISK_SCALE = [
  { level: "Low", bg: "#16a34a", fg: "#ffffff" },
  { level: "Moderate", bg: "#2563eb", fg: "#ffffff" },
  { level: "High", bg: "#facc15", fg: "#1a1400" },
  { level: "Very high", bg: "#f97316", fg: "#1a0d00" },
  { level: "Extreme", bg: "#dc2626", fg: "#ffffff" },
] as const;

export function riskFor(level: number) {
  return RISK_SCALE[Math.min(5, Math.max(1, Math.round(level))) - 1];
}

export function minutesSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

/** "12 min ago". Con now = null (HTML estático) devuelve "" y se completa en el navegador. */
export function formatAgo(iso: string, now: number | null): string {
  if (now === null) return "";
  const m = minutesSince(iso, now);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.floor(m / 60)} h ${m % 60} min ago`;
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatTime(iso: string | number): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function directionsUrl(ev: { lat: number; lon: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${ev.lat},${ev.lon}`;
}

// --- Respaldo de demostración (si la API no responde) ---------------------------

const DEMO_DAY = "2026-11-14";
const demo = (
  id: string, municipality: string, zone: string, time: string, sensor: string,
  origin: FireOrigin, probability: number, frpMw: number, lat: number, lon: number,
): HotspotEvent => ({
  id, municipality, zone, detectedAt: `${DEMO_DAY}T${time}:00-06:00`, sensor, origin,
  probability, frpMw, lat, lon, reasons: [], irregularUseAlert: false,
});

export const DEMO_HOTSPOTS: HotspotEvent[] = [
  demo("CHIH-2841", "Bocoyna", "Ejido San Juanito · Km 14", "14:28", "VIIRS 375m", "Human", 86, 24.6, 27.97, -107.58),
  demo("CHIH-2840", "Madera", "Mesa de Arturo · Farmland edge", "13:45", "VIIRS 375m", "Human", 81, 19.2, 29.19, -108.14),
  demo("CHIH-2839", "Guachochi", "Sinforosa Canyon · North", "13:10", "MODIS 1km", "Lightning", 74, 31.4, 26.82, -107.07),
  demo("CHIH-2838", "Temósachic", "Sierra El Nido · West slope", "12:32", "VIIRS 375m", "Wildland", 68, 14.8, 28.95, -107.83),
  demo("CHIH-2837", "Ocampo", "Basaseachi Corridor", "12:16", "VIIRS 375m", "Human", 79, 22.1, 28.18, -108.21),
  demo("CHIH-2836", "Guadalupe y Calvo", "Cerro Mohinora · High mountain", "11:42", "MODIS 1km", "Lightning", 83, 37.5, 25.96, -107.04),
];

export const DEMO_STATIONS: Station[] = [
  { id: "ESP32-CHIH-04", name: "Bocoyna · San Juanito", lat: 27.97, lon: -107.58, temperatureC: 27.4, humidityPct: 22, windKmh: 24.5, lightningStrikes: 0, riskLevel: 4, recordedAt: `${DEMO_DAY}T14:30:00-06:00`, fallbackActive: false, batteryV: 4.12, pressureHpa: 781.4, noiseDb: 38, rssiDbm: -67, linkType: "wifi", luminosityPct: 72, flameDetected: false, flameIntensityPct: 0 },
  { id: "ESP32-CHIH-07", name: "Guachochi · Sinforosa", lat: 26.82, lon: -107.07, temperatureC: 22.8, humidityPct: 41, windKmh: 14, lightningStrikes: 3, riskLevel: 2, recordedAt: `${DEMO_DAY}T14:30:00-06:00`, fallbackActive: false, batteryV: 3.98, pressureHpa: 802.9, noiseDb: 44, rssiDbm: -98, linkType: "lora", luminosityPct: 64, flameDetected: false, flameIntensityPct: 0 },
];

/** Calendario real 2002–2026 calculado directamente de harmonization/harmonized_hotspots.csv (in_calendar = 1, 55,902 filas). */
export const DEMO_CALENDAR: BurnCalendar = {
  monthLabels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  monthlyMedians: [116, 83, 108, 287, 586, 452, 71, 13, 7, 17, 31, 73],
  current: { year: 2026, month: "Jul", value: 22, median: 71, anomalyPct: -69.0 },
  rows: [
    { year: 2002, months: [null, null, null, null, null, null, 109, 21, 7, 11, 38, 35], source: "MODIS Aqua (13:30 · from Jul 4)" },
    { year: 2003, months: [52, 17, 46, 46, 467, 384, 98, 9, 3, 6, 14, 96], source: "MODIS Aqua (13:30)" },
    { year: 2004, months: [43, 37, 38, 23, 161, 312, 65, 11, 2, 5, 18, 125], source: "MODIS Aqua (13:30)" },
    { year: 2005, months: [98, 27, 47, 20, 108, 231, 100, 16, 20, 21, 77, 53], source: "MODIS Aqua (13:30)" },
    { year: 2006, months: [90, 58, 83, 292, 734, 336, 50, 12, 16, 13, 45, 70], source: "MODIS Aqua (13:30)" },
    { year: 2007, months: [27, 130, 109, 134, 603, 276, 88, 10, 3, 28, 65, 138], source: "MODIS Aqua (13:30)" },
    { year: 2008, months: [144, 95, 108, 308, 584, 476, 52, 15, 7, 16, 55, 90], source: "MODIS Aqua (13:30)" },
    { year: 2009, months: [116, 150, 116, 221, 559, 452, 71, 11, 6, 16, 60, 150], source: "MODIS Aqua (13:30)" },
    { year: 2010, months: [146, 138, 123, 86, 543, 363, 89, 22, 7, 23, 182, 225], source: "MODIS Aqua (13:30)" },
    { year: 2011, months: [123, 211, 290, 1214, 3081, 2179, 118, 80, 29, 48, 31, 48], source: "MODIS Aqua (2011 Extreme · 7,452 total)" },
    { year: 2012, months: [100, 32, 116, 613, 1865, 1494, 101, 17, 23, 14, 9, 10], source: "MODIS Aqua + VIIRS S-NPP (seam 2012-01-20)" },
    { year: 2013, months: [30, 55, 125, 411, 914, 975, 84, 22, 10, 24, 14, 109], source: "VIIRS S-NPP (1.4 km ≥ 15 MW)" },
    { year: 2014, months: [183, 100, 49, 117, 396, 654, 25, 9, 4, 66, 50, 96], source: "VIIRS S-NPP (1.4 km ≥ 15 MW)" },
    { year: 2015, months: [106, 120, 26, 19, 173, 301, 43, 11, 8, 13, 31, 73], source: "VIIRS S-NPP (1.4 km ≥ 15 MW)" },
    { year: 2016, months: [324, 178, 109, 127, 602, 744, 109, 9, 13, 17, 90, 92], source: "VIIRS S-NPP (1.4 km ≥ 15 MW)" },
    { year: 2017, months: [131, 60, 290, 307, 1061, 1702, 94, 18, 4, 25, 77, 23], source: "VIIRS S-NPP (1.4 km ≥ 15 MW)" },
    { year: 2018, months: [155, 39, 93, 810, 1749, 951, 45, 20, 5, 6, 30, 38], source: "VIIRS S-NPP (1.4 km ≥ 15 MW)" },
    { year: 2019, months: [151, 93, 43, 386, 323, 560, 76, 28, 4, 12, 10, 10], source: "VIIRS S-NPP (1.4 km ≥ 15 MW)" },
    { year: 2020, months: [159, 83, 26, 49, 203, 218, 57, 41, 8, 24, 30, 29], source: "VIIRS S-NPP (held-out val)" },
    { year: 2021, months: [20, 22, 160, 401, 786, 1291, 65, 9, 7, 18, 26, 38], source: "VIIRS S-NPP (held-out val)" },
    { year: 2022, months: [135, 96, 174, 317, 1156, 380, 47, 5, 7, 19, 54, 161], source: "VIIRS S-NPP (held-out val)" },
    { year: 2023, months: [327, 93, 84, 132, 510, 787, 94, 27, 25, 11, 14, 25], source: "VIIRS S-NPP (held-out val)" },
    { year: 2024, months: [43, 31, 44, 287, 586, 428, 25, 13, 9, 19, 24, 58], source: "VIIRS S-NPP (held-out val)" },
    { year: 2025, months: [34, 42, 605, 686, 1867, 273, 24, 11, 3, 9, 23, 121], source: "VIIRS S-NPP (held-out val)" },
    { year: 2026, months: [94, 72, 92, 36, 215, 169, 22, null, null, null, null, null], source: "VIIRS S-NPP (through 2026-07-31)" },
  ],
  kmFactors: [0.68, 0.66, 1.04, 1.21, 1.26, 1.43, 1.42, 1.45, 0.9, 0.78, 0.6, 0.55],
  kmCi95: null,
  dataSource: "nasa",
  realCoverage: 1.0,
};

const COS_LAT_28_6 = Math.cos((28.6 * Math.PI) / 180);

/** Calcula `inCalendar` en cliente (regla de celda de 1.4 km y suma de FRP >= 15 MW) si la API no lo incluyó. */
export function ensureInCalendarFlags(fires: NasaFire[]): NasaFire[] {
  if (fires.length === 0 || fires.every((f) => typeof f.inCalendar === "boolean")) {
    return fires;
  }
  const out = fires.map((f) => ({ ...f, inCalendar: false }));
  const cells = new Map<string, number[]>();

  for (let i = 0; i < out.length; i++) {
    const f = out[i];
    const conf = (f.confidence || "nominal").toLowerCase();
    if (conf === "low" || conf === "l") continue;

    if (f.date < HARMONIZATION_META.dateRange.seam || f.satellite.startsWith("MODIS")) {
      if (!f.satellite.toLowerCase().includes("terra") && f.satellite !== "MODIS T") {
        out[i].inCalendar = true;
      }
      continue;
    }

    const xKm = (f.lon + 109.5) * 111.32 * COS_LAT_28_6;
    const yKm = (f.lat - 25.5) * 111.32;
    const cx = Math.floor(xKm / HARMONIZATION_META.cellSizeKm);
    const cy = Math.floor(yKm / HARMONIZATION_META.cellSizeKm);
    const key = `${f.date}:${cx}:${cy}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(i);
    else cells.set(key, [i]);
  }

  for (const indices of cells.values()) {
    const sumFrp = indices.reduce((acc, idx) => acc + (out[idx].frpMw || 0), 0);
    if (sumFrp >= HARMONIZATION_META.frpThresholdMw) {
      let bestIdx = indices[0];
      for (const idx of indices) {
        if ((out[idx].frpMw || 0) > (out[bestIdx].frpMw || 0)) bestIdx = idx;
      }
      out[bestIdx].inCalendar = true;
    }
  }

  return out;
}

// --- Descargas ------------------------------------------------------------------

export function downloadHotspotsCsv(events: HotspotEvent[]): void {
  const header = "id,municipality,zone,date_time,sensor,probable_origin,probability_pct,frp_mw,lat,lon,in_calendar";
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = events.map((ev) => {
    const inCal = ev.frpMw >= HARMONIZATION_META.frpThresholdMw ? 1 : 0;
    return [ev.id, q(ev.municipality), q(ev.zone), ev.detectedAt, q(ev.sensor), ev.origin, ev.probability, ev.frpMw, ev.lat, ev.lon, inCal].join(",");
  });
  saveFile([header, ...rows].join("\n"), "text/csv;charset=utf-8", "fuegodata-sierra-chihuahua.csv");
}

export function downloadHistoricalCsv(fires: NasaFire[], monthLabel = "selection"): void {
  const normalized = ensureInCalendarFlags(fires);
  const header =
    "latitude,longitude,brightness,bright_t31,delta_t_k,frp,frp_per_pixel_km2,pixel_area_km2,acq_date,satellite,confidence,daynight,in_calendar";
  const rows = normalized.map((f) => {
    const dt =
      f.brightnessK !== undefined && f.brightT31K !== undefined
        ? (f.brightnessK - f.brightT31K).toFixed(1)
        : "";
    const frpDensity =
      f.pixelAreaKm2 && f.pixelAreaKm2 > 0 ? (f.frpMw / f.pixelAreaKm2).toFixed(2) : "";
    return [
      f.lat,
      f.lon,
      f.brightnessK ?? "",
      f.brightT31K ?? "",
      dt,
      f.frpMw,
      frpDensity,
      f.pixelAreaKm2 ?? "",
      f.date,
      f.satellite || (f.date < HARMONIZATION_META.dateRange.seam ? "Aqua" : "SNPP"),
      f.confidence,
      f.daynight ?? "",
      f.inCalendar ? 1 : 0,
    ].join(",");
  });
  saveFile([header, ...rows].join("\n"), "text/csv;charset=utf-8", `fuegodata-harmonized-${monthLabel}.csv`);
}

export function downloadHotspotsGeoJson(events: HotspotEvent[]): void {
  const geojson = {
    type: "FeatureCollection",
    features: events.map((ev) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [ev.lon, ev.lat] },
      properties: {
        id: ev.id,
        municipality: ev.municipality,
        zone: ev.zone,
        date_time: ev.detectedAt,
        sensor: ev.sensor,
        probable_origin: ev.origin,
        probability_pct: ev.probability,
        frp_mw: ev.frpMw,
        in_calendar: ev.frpMw >= HARMONIZATION_META.frpThresholdMw ? 1 : 0,
      },
    })),
  };
  saveFile(JSON.stringify(geojson, null, 2), "application/geo+json", "fuegodata-sierra-chihuahua.geojson");
}

function saveFile(content: string, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
