"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  type BurnCalendar,
  DEMO_HOTSPOTS,
  DEMO_STATIONS,
  type FireOrigin,
  type HotspotEvent,
  type NasaFire,
  type Station,
  type WeatherCell,
} from "./fire-data";

/** API pública de la Raspberry Pi (Tailscale Funnel). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://raspi.taile2c6bf.ts.net").replace(/\/$/, "");
export const LITE_URL = `${API_URL}/lite`;

// La API conserva las etiquetas en español; la interfaz está en inglés.
const ORIGIN_EN: Record<string, FireOrigin> = {
  Humano: "Human",
  Rayo: "Lightning",
  Forestal: "Wildland",
  Indeterminado: "Undetermined",
};

async function getJson<T>(path: string, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toHotspot(h: any): HotspotEvent {
  return {
    id: h.id,
    municipality: h.municipality,
    zone: h.zone,
    detectedAt: h.timestamp,
    sensor: h.sensor,
    origin: ORIGIN_EN[h.origin] ?? "Undetermined",
    probability: h.probability,
    frpMw: h.frp_mw,
    lat: h.lat,
    lon: h.lon,
    reasons: h.reasons ?? [],
    irregularUseAlert: Boolean(h.irregular_use_alert),
  };
}

function toStation(s: any): Station {
  return {
    id: s.station_id,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    temperatureC: s.temperature_c,
    humidityPct: s.humidity_pct,
    windKmh: s.wind_kmh,
    lightningStrikes: s.lightning_strikes ?? 0,
    riskLevel: s.risk_level,
    recordedAt: s.timestamp,
    fallbackActive: Boolean(s.fallback_active),
    batteryV: s.battery_v ?? null,
    pressureHpa: s.pressure_hpa ?? null,
    noiseDb: s.noise_db ?? null,
    rssiDbm: s.rssi_dbm ?? null,
    linkType: s.link_type ?? null,
  };
}

function toCalendar(c: any, realCoverage: number | null): BurnCalendar {
  const EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIdx = EN.indexOf(c.current_month.month) >= 0 ? EN.indexOf(c.current_month.month) : c.month_labels.indexOf(c.current_month.month);
  return {
    monthLabels: EN,
    monthlyMedians: c.monthly_medians,
    current: {
      year: c.current_month.year,
      month: EN[monthIdx] ?? c.current_month.month,
      value: c.current_month.value,
      median: c.current_month.historical_median,
      anomalyPct: c.current_month.anomaly_pct,
    },
    rows: c.rows.map((r: any) => ({ year: r.year, months: r.months, source: r.sensor_source })),
    kmFactors: c.km_factors,
    kmCi95: c.km_ci95 ?? null,
    dataSource: c.data_source === "nasa-firms-gibs" ? "nasa" : "illustrative",
    realCoverage,
  };
}

/** Calendario real de la NASA si ya está casi completo; si no, el ilustrativo + avance. */
async function loadCalendar(): Promise<BurnCalendar> {
  let coverage: number | null = null;
  try {
    const real = await getJson<any>("/api/nasa/calendar");
    coverage = real.coverage ?? null;
    if ((coverage ?? 0) >= 0.9) return toCalendar(real, coverage);
  } catch {
    // aún no existe: usar el ilustrativo
  }
  return toCalendar(await getJson<any>("/api/fires/calendar"), coverage);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface DashboardData {
  status: "loading" | "live" | "offline";
  hotspots: HotspotEvent[];
  stations: Station[];
  calendar: BurnCalendar | null;
  fetchedAt: number | null;
}

const REFRESH_MS = 5 * 60 * 1000;

/** Carga focos, estaciones y calendario; si la API falla usa el respaldo de demostración. */
export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>({
    status: "loading",
    hotspots: DEMO_HOTSPOTS,
    stations: DEMO_STATIONS,
    calendar: null,
    fetchedAt: null,
  });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [h, s, c] = await Promise.all([
          getJson<{ hotspots: unknown[] }>("/api/fires/hotspots"),
          getJson<{ stations: unknown[] }>("/api/iot/stations"),
          loadCalendar(),
        ]);
        if (!alive) return;
        setData({
          status: "live",
          hotspots: h.hotspots.map(toHotspot).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)),
          stations: s.stations.map(toStation),
          calendar: c,
          fetchedAt: Date.now(),
        });
      } catch {
        if (alive) setData((d) => ({ ...d, status: d.status === "live" ? "live" : "offline" }));
      }
    };
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return data;
}

type NetworkInfo = { saveData?: boolean; effectiveType?: string; addEventListener?: (t: string, cb: () => void) => void; removeEventListener?: (t: string, cb: () => void) => void };
const getConnection = () => (navigator as Navigator & { connection?: NetworkInfo }).connection;

function subscribeConnection(cb: () => void) {
  const conn = getConnection();
  conn?.addEventListener?.("change", cb);
  return () => conn?.removeEventListener?.("change", cb);
}

/** true si el navegador indica conexión lenta o "ahorro de datos". */
export function useSlowConnection(): boolean {
  return useSyncExternalStore(
    subscribeConnection,
    () => {
      const conn = getConnection();
      return Boolean(conn && (conn.saveData || ["slow-2g", "2g", "3g"].includes(conn.effectiveType ?? "")));
    },
    () => false
  );
}

// Hora actual, redondeada al minuto, solo en el navegador (en el HTML estático es null).
const MINUTE = 60_000;
function subscribeMinute(cb: () => void) {
  const id = setInterval(cb, MINUTE);
  return () => clearInterval(id);
}

/** Hora actual en ms (se actualiza cada minuto) o null durante el prerender. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => null
  );
}

// --- Capas bajo demanda: solo se descargan cuando el usuario las activa ----------

type Remote<T> = { status: "idle" | "loading" | "ready" | "error"; data: T | null };

/** Descarga `path` cuando `enabled` es true (y lo recuerda mientras no cambie la ruta). */
function useOnDemand<T>(path: string | null, parse: (json: unknown) => T): Remote<T> {
  const [state, setState] = useState<{ path: string | null } & Remote<T>>({ path: null, status: "idle", data: null });
  useEffect(() => {
    if (!path || state.path === path) return;
    let alive = true;
    getJson<unknown>(path, 30000)
      .then((json) => alive && setState({ path, status: "ready", data: parse(json) }))
      .catch(() => alive && setState({ path, status: "error", data: null }));
    return () => {
      alive = false;
    };
    // parse es estable por llamada; solo importa la ruta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  if (!path) return { status: "idle", data: null };
  if (state.path !== path) return { status: "loading", data: null };
  return state;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useNasaFires(enabled: boolean) {
  return useOnDemand<{ fires: NasaFire[]; start: string; end: string }>(enabled ? "/api/nasa/fires?days=2" : null, (j: any) => ({
    start: j.start,
    end: j.end,
    fires: j.fires.map((f: any) => ({ lat: f.lat, lon: f.lon, frpMw: f.frp_mw, confidence: f.confidence, date: f.date, time: f.time, satellite: f.satellite })),
  }));
}

export function useHistoricalFires(month: string | null) {
  return useOnDemand<NasaFire[]>(month ? `/api/nasa/fires/history?month=${month}` : null, (j: any) =>
    j.fires.map((f: any[]) => ({ lat: f[0], lon: f[1], frpMw: f[2], date: f[3], time: "", confidence: f[4] ?? "nominal", satellite: "" }))
  );
}

export function useWeatherGrid(enabled: boolean) {
  return useOnDemand<{ cells: WeatherCell[]; stepDeg: number; source: string }>(enabled ? "/api/weather/grid" : null, (j: any) => ({
    stepDeg: j.step_deg,
    source: j.source,
    cells: j.cells.map((c: any) => ({
      lat: c.lat,
      lon: c.lon,
      temperatureC: c.temperature_c,
      humidityPct: c.humidity_pct,
      pressureHpa: c.pressure_hpa,
      riskLevel: c.risk_level,
      ndvi: c.ndvi ?? null,
      lstC: c.lst_c ?? null,
      fireProbLevel: c.fire_prob_level ?? c.risk_level,
      fireProbFactors: c.fire_prob_factors ?? [],
    })),
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */
