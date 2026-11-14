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
}

/** Detección de incendio activo de NASA FIRMS (VIIRS). */
export interface NasaFire {
  lat: number;
  lon: number;
  frpMw: number;
  confidence: string; // low | nominal | high
  date: string;
  time: string;
  satellite: string;
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
  { id: "ESP32-CHIH-04", name: "Bocoyna · San Juanito", lat: 27.97, lon: -107.58, temperatureC: 27.4, humidityPct: 22, windKmh: 24.5, lightningStrikes: 0, riskLevel: 4, recordedAt: `${DEMO_DAY}T14:30:00-06:00`, fallbackActive: false, batteryV: 4.12, pressureHpa: 781.4, noiseDb: 38, rssiDbm: -67, linkType: "wifi", luminosityPct: 72 },
  { id: "ESP32-CHIH-07", name: "Guachochi · Sinforosa", lat: 26.82, lon: -107.07, temperatureC: 22.8, humidityPct: 41, windKmh: 14, lightningStrikes: 3, riskLevel: 2, recordedAt: `${DEMO_DAY}T14:30:00-06:00`, fallbackActive: false, batteryV: 3.98, pressureHpa: 802.9, noiseDb: 44, rssiDbm: -98, linkType: "lora", luminosityPct: 64 },
];

// --- Descargas ------------------------------------------------------------------

export function downloadHotspotsCsv(events: HotspotEvent[]): void {
  const header = "id,municipality,zone,date_time,sensor,probable_origin,probability_pct,frp_mw,lat,lon";
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = events.map((ev) =>
    [ev.id, q(ev.municipality), q(ev.zone), ev.detectedAt, q(ev.sensor), ev.origin, ev.probability, ev.frpMw, ev.lat, ev.lon].join(",")
  );
  saveFile([header, ...rows].join("\n"), "text/csv;charset=utf-8", "fuegodata-sierra-chihuahua.csv");
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
