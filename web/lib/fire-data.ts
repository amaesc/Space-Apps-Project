export type FireOrigin = "Humano" | "Rayo" | "Forestal" | "Indeterminado";

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
  /** Coordenadas normalizadas (0-100) dentro del mapa de Sierra de Chihuahua */
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
  Humano: {
    hex: "#f97316",
    badge: "border-orange-400/35 bg-orange-500/15 text-orange-300",
    dot: "bg-[#f97316]",
  },
  Rayo: {
    hex: "#38bdf8",
    badge: "border-sky-400/35 bg-sky-500/15 text-sky-300",
    dot: "bg-sky-400",
  },
  Forestal: {
    hex: "#34d399",
    badge: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
    dot: "bg-emerald-400",
  },
  Indeterminado: {
    hex: "#a855f7",
    badge: "border-violet-400/35 bg-violet-500/15 text-violet-300",
    dot: "bg-violet-400",
  },
};

export const HOTSPOT_EVENTS: HotspotEvent[] = [
  {
    id: "CHIH-2841",
    zone: "Ejido San Juanito · Km 14",
    municipality: "Bocoyna",
    timestamp: "Hoy, 14:28",
    sensor: "VIIRS 375m",
    origin: "Humano",
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
    zone: "Mesa de Arturo · Borde agrícola",
    municipality: "Madera",
    timestamp: "Hoy, 13:45",
    sensor: "VIIRS 375m",
    origin: "Humano",
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
    zone: "Barranca Sinforosa Norte",
    municipality: "Guachochi",
    timestamp: "Hoy, 13:10",
    sensor: "MODIS 1km",
    origin: "Rayo",
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
    zone: "Sierra El Nido · Ladera oeste",
    municipality: "Temósachic",
    timestamp: "Hoy, 12:32",
    sensor: "VIIRS 375m",
    origin: "Forestal",
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
    zone: "Corredor Basaseachi",
    municipality: "Ocampo",
    timestamp: "Hoy, 12:16",
    sensor: "VIIRS 375m",
    origin: "Humano",
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
    zone: "Cerro Mohinora · Alta montaña",
    municipality: "Guadalupe y Calvo",
    timestamp: "Hoy, 11:42",
    sensor: "MODIS 1km",
    origin: "Rayo",
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
    zone: "Valle de Carichí · Parcela sur",
    municipality: "Carichí",
    timestamp: "Hoy, 11:25",
    sensor: "VIIRS 375m",
    origin: "Humano",
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
    zone: "Cañón de Uruachi",
    municipality: "Uruachi",
    timestamp: "Hoy, 10:57",
    sensor: "VIIRS 375m",
    origin: "Indeterminado",
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
    timestamp: "Ayer, 18:14",
    sensor: "VIIRS 375m",
    origin: "Forestal",
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
    zone: "Brecha Maguarichi",
    municipality: "Maguarichi",
    timestamp: "Ayer, 16:40",
    sensor: "MODIS 1km",
    origin: "Humano",
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
  Humano: 842,
  Rayo: 314,
  Forestal: 218,
  Indeterminado: 108,
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
    "municipio",
    "zona",
    "fecha_hora",
    "sensor",
    "origen_probable",
    "probabilidad_pct",
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

  const csvContent = [header, ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "undefined-sierra-chihuahua-28d.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
