// Modelo de datos del frontend. Todos los datos vienen de la API de la Raspberry Pi (ver lib/api.ts):
// no hay respaldo inventado; si la API no responde, la interfaz lo dice.

export type FireOrigin = "Human" | "Lightning" | "Wildland" | "Undetermined";

/** Detección reciente real (NASA FIRMS VIIRS NOAA-20/21). El origen aún no se calcula: siempre "Undetermined". */
export interface HotspotEvent {
  id: string;
  state: string | null; // estado INEGI
  detectedAt: string; // ISO 8601 (UTC)
  sensor: string;
  confidence: string | null;
  origin: FireOrigin;
  probability: number | null;
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
  /** Siempre conteos reales de FIRMS (ya no existe serie de demostración). */
  dataSource: "nasa";
  /** Avance de la construcción del calendario real (0-1), si está en curso. */
  realCoverage: number | null;
  /** Estado INEGI del calendario, o "*" = todo México. */
  region: string;
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

// --- Descargas ------------------------------------------------------------------

export function downloadHotspotsCsv(events: HotspotEvent[]): void {
  // Detecciones recientes NOAA-20/21: no forman parte de la serie armonizada, así que no llevan in_calendar.
  const header = "id,state,date_time_utc,sensor,confidence,frp_mw,lat,lon";
  const q = (s: string | null) => `"${(s ?? "").replace(/"/g, '""')}"`;
  const rows = events.map((ev) =>
    [ev.id, q(ev.state), ev.detectedAt, q(ev.sensor), ev.confidence ?? "", ev.frpMw, ev.lat, ev.lon].join(",")
  );
  saveFile([header, ...rows].join("\n"), "text/csv;charset=utf-8", "fuegodata-recent-detections.csv");
}

export function downloadHistoricalCsv(fires: NasaFire[], monthLabel = "selection"): void {
  const normalized = fires; // in_calendar viene del archivo armonizado; si falta se deja vacío (no se estima)
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
      f.satellite ?? "",
      f.confidence,
      f.daynight ?? "",
      f.inCalendar === undefined ? "" : f.inCalendar ? 1 : 0,
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
        state: ev.state,
        date_time_utc: ev.detectedAt,
        sensor: ev.sensor,
        confidence: ev.confidence,
        frp_mw: ev.frpMw,
      },
    })),
  };
  saveFile(JSON.stringify(geojson, null, 2), "application/geo+json", "fuegodata-recent-detections.geojson");
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
