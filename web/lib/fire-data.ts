/** Los datos actuales son ilustrativos; cambiar a false al conectar NASA FIRMS. */
export const IS_DEMO_DATA = true;

export type FireOrigin = "Human" | "Lightning" | "Wildland" | "Undetermined";

export interface HotspotEvent {
  id: string;
  zone: string;
  municipality: string;
  timestamp: string;
  sensor: "VIIRS 375m" | "MODIS 1km";
  origin: FireOrigin;
  probability: number;
  frpMw: number;
  lat: string;
  lon: string;
  latNum: number;
  lngNum: number;
  /** Normalized coordinates (0-100) within the Sierra de Chihuahua map */
  x: number;
  y: number;
}

export interface DailyCountPoint {
  label: string;
  count: number;
}

export const ORIGIN_COLORS: Record<
  FireOrigin,
  { hex: string; badge: string; dot: string }
> = {
  Human: {
    hex: "#f97316",
    badge: "border-orange-400/35 bg-orange-500/15 text-orange-300",
    dot: "bg-[#f97316]",
  },
  Lightning: {
    hex: "#38bdf8",
    badge: "border-sky-400/35 bg-sky-500/15 text-sky-300",
    dot: "bg-sky-400",
  },
  Wildland: {
    hex: "#34d399",
    badge: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
    dot: "bg-emerald-400",
  },
  Undetermined: {
    hex: "#a855f7",
    badge: "border-violet-400/35 bg-violet-500/15 text-violet-300",
    dot: "bg-violet-400",
  },
};

/** Escala de peligro de 5 niveles (colores estándar de peligro de incendio). */
export const RISK_SCALE = [
  { level: "Low", bg: "#16a34a", fg: "#ffffff" },
  { level: "Moderate", bg: "#2563eb", fg: "#ffffff" },
  { level: "High", bg: "#facc15", fg: "#1a1400" },
  { level: "Very high", bg: "#f97316", fg: "#1a0d00" },
  { level: "Extreme", bg: "#dc2626", fg: "#ffffff" },
] as const;

export type RiskLevel = (typeof RISK_SCALE)[number]["level"];

/** Datos de demostración: la "hora actual" es fija para que los tiempos relativos tengan sentido. */
const DEMO_NOW_MINUTES = 14 * 60 + 40; // hoy, 14:40

/** Minutos transcurridos desde la detección ("Today, 14:28" / "Yesterday, 18:14"). */
export function minutesAgo(ev: HotspotEvent): number {
  const match = /^(Today|Yesterday), (\d{1,2}):(\d{2})$/.exec(ev.timestamp);
  if (!match) return Number.POSITIVE_INFINITY;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return DEMO_NOW_MINUTES - minutes + (match[1] === "Yesterday" ? 24 * 60 : 0);
}

export function formatAgo(ev: HotspotEvent): string {
  const m = minutesAgo(ev);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.floor(m / 60)} h ${m % 60} min ago`;
  return ev.timestamp;
}

export function directionsUrl(ev: HotspotEvent): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${ev.latNum},${ev.lngNum}`;
}

export const HOTSPOT_EVENTS: HotspotEvent[] = [
  {
    id: "CHIH-2841",
    zone: "Ejido San Juanito · Km 14",
    municipality: "Bocoyna",
    timestamp: "Today, 14:28",
    sensor: "VIIRS 375m",
    origin: "Human",
    probability: 86,
    frpMw: 24.6,
    lat: "27.97°N",
    lon: "107.58°W",
    latNum: 27.97,
    lngNum: -107.58,
    x: 42,
    y: 46,
  },
  {
    id: "CHIH-2840",
    zone: "Mesa de Arturo · Farmland edge",
    municipality: "Madera",
    timestamp: "Today, 13:45",
    sensor: "VIIRS 375m",
    origin: "Human",
    probability: 81,
    frpMw: 19.2,
    lat: "29.19°N",
    lon: "108.14°W",
    latNum: 29.19,
    lngNum: -108.14,
    x: 28,
    y: 22,
  },
  {
    id: "CHIH-2839",
    zone: "Sinforosa Canyon · North",
    municipality: "Guachochi",
    timestamp: "Today, 13:10",
    sensor: "MODIS 1km",
    origin: "Lightning",
    probability: 74,
    frpMw: 31.4,
    lat: "26.82°N",
    lon: "107.07°W",
    latNum: 26.82,
    lngNum: -107.07,
    x: 56,
    y: 74,
  },
  {
    id: "CHIH-2838",
    zone: "Sierra El Nido · West slope",
    municipality: "Temósachic",
    timestamp: "Today, 12:32",
    sensor: "VIIRS 375m",
    origin: "Wildland",
    probability: 68,
    frpMw: 14.8,
    lat: "28.95°N",
    lon: "107.83°W",
    latNum: 28.95,
    lngNum: -107.83,
    x: 35,
    y: 30,
  },
  {
    id: "CHIH-2837",
    zone: "Basaseachi Corridor",
    municipality: "Ocampo",
    timestamp: "Today, 12:16",
    sensor: "VIIRS 375m",
    origin: "Human",
    probability: 79,
    frpMw: 22.1,
    lat: "28.18°N",
    lon: "108.21°W",
    latNum: 28.18,
    lngNum: -108.21,
    x: 24,
    y: 44,
  },
  {
    id: "CHIH-2836",
    zone: "Cerro Mohinora · High mountain",
    municipality: "Guadalupe y Calvo",
    timestamp: "Today, 11:42",
    sensor: "MODIS 1km",
    origin: "Lightning",
    probability: 83,
    frpMw: 37.5,
    lat: "25.96°N",
    lon: "107.04°W",
    latNum: 25.96,
    lngNum: -107.04,
    x: 58,
    y: 86,
  },
  {
    id: "CHIH-2835",
    zone: "Carichí Valley · South plot",
    municipality: "Carichí",
    timestamp: "Today, 11:25",
    sensor: "VIIRS 375m",
    origin: "Human",
    probability: 88,
    frpMw: 16.4,
    lat: "27.91°N",
    lon: "107.05°W",
    latNum: 27.91,
    lngNum: -107.05,
    x: 61,
    y: 49,
  },
  {
    id: "CHIH-2834",
    zone: "Uruachi Canyon",
    municipality: "Uruachi",
    timestamp: "Today, 10:57",
    sensor: "VIIRS 375m",
    origin: "Undetermined",
    probability: 54,
    frpMw: 11.9,
    lat: "27.86°N",
    lon: "108.21°W",
    latNum: 27.86,
    lngNum: -108.21,
    x: 22,
    y: 55,
  },
  {
    id: "CHIH-2833",
    zone: "Arroyo El Vergel",
    municipality: "Balleza",
    timestamp: "Yesterday, 18:14",
    sensor: "VIIRS 375m",
    origin: "Wildland",
    probability: 72,
    frpMw: 28.0,
    lat: "26.95°N",
    lon: "106.35°W",
    latNum: 26.95,
    lngNum: -106.35,
    x: 74,
    y: 71,
  },
  {
    id: "CHIH-2832",
    zone: "Maguarichi Dirt Road",
    municipality: "Maguarichi",
    timestamp: "Yesterday, 16:40",
    sensor: "MODIS 1km",
    origin: "Human",
    probability: 76,
    frpMw: 18.7,
    lat: "27.86°N",
    lon: "107.99°W",
    latNum: 27.86,
    lngNum: -107.99,
    x: 31,
    y: 53,
  },
];

export const ORIGIN_28D_TOTALS: Record<FireOrigin, number> = {
  Human: 842,
  Lightning: 314,
  Wildland: 218,
  Undetermined: 108,
};

export const DAILY_HARMONIZED_28D: DailyCountPoint[] = [
  { label: "18 Oct", count: 44 },
  { label: "20 Oct", count: 52 },
  { label: "22 Oct", count: 49 },
  { label: "24 Oct", count: 58 },
  { label: "26 Oct", count: 46 },
  { label: "28 Oct", count: 41 },
  { label: "30 Oct", count: 55 },
  { label: "01 Nov", count: 63 },
  { label: "03 Nov", count: 51 },
  { label: "05 Nov", count: 48 },
  { label: "07 Nov", count: 67 },
  { label: "09 Nov", count: 72 },
  { label: "11 Nov", count: 59 },
  { label: "13 Nov", count: 64 },
];

export function downloadHotspotsCsv(events: HotspotEvent[]): void {
  const header = [
    "id",
    "municipality",
    "zone",
    "date_time",
    "sensor",
    "probable_origin",
    "probability_pct",
    "frp_mw",
    "lat",
    "lon",
  ].join(",");

  const rows = events.map((ev) =>
    [
      ev.id,
      `"${ev.municipality}"`,
      `"${ev.zone}"`,
      `"${ev.timestamp}"`,
      `"${ev.sensor}"`,
      ev.origin,
      ev.probability,
      ev.frpMw,
      ev.lat,
      ev.lon,
    ].join(",")
  );

  saveFile(
    [header, ...rows].join("\n"),
    "text/csv;charset=utf-8",
    "fuegodata-sierra-chihuahua-28d.csv"
  );
}

export function downloadHotspotsGeoJson(events: HotspotEvent[]): void {
  const geojson = {
    type: "FeatureCollection",
    features: events.map((ev) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [ev.lngNum, ev.latNum] },
      properties: {
        id: ev.id,
        municipality: ev.municipality,
        zone: ev.zone,
        date_time: ev.timestamp,
        sensor: ev.sensor,
        probable_origin: ev.origin,
        probability_pct: ev.probability,
        frp_mw: ev.frpMw,
      },
    })),
  };
  saveFile(
    JSON.stringify(geojson, null, 2),
    "application/geo+json",
    "fuegodata-sierra-chihuahua-28d.geojson"
  );
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
