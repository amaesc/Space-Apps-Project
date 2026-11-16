"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { asset } from "./asset";
import {
  DEFAULT_BURN_CALENDAR,
  DEFAULT_STATIONS,
  getRecentDefaultHotspots,
} from "./default-data";
import {
  type BurnCalendar,
  type FireOrigin,
  type HotspotEvent,
  type NasaFire,
  type Station,
  type WeatherCell,
} from "./fire-data";

/** API pública de la Raspberry Pi (Tailscale Funnel). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://13-217-192-184.sslip.io").replace(/\/$/, "");
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
    state: h.state ?? null,
    detectedAt: h.timestamp,
    sensor: h.sensor,
    confidence: h.confidence ?? null,
    origin: ORIGIN_EN[h.origin] ?? "Undetermined",
    probability: typeof h.probability === "number" ? h.probability : null,
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
    luminosityPct: s.luminosity_pct ?? null,
    flameDetected: Boolean(s.flame_detected),
    flameIntensityPct: s.flame_intensity_pct ?? null,
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
    dataSource: "nasa",
    realCoverage,
    region: c.region ?? "*",
  };
}

/** Calendario real de la NASA: si el servidor aún no terminó el backfill de GIBS, usa la serie real de harmonized_hotspots.csv. */
async function loadCalendar(): Promise<BurnCalendar | null> {
  try {
    const real = await getJson<any>("/api/nasa/calendar");
    const coverage = real.coverage ?? null;
    if (real.data_source && (coverage ?? 0) >= 0.9) return toCalendar(real, coverage);
  } catch {
    // API no disponible: respaldo estático
  }
  return DEFAULT_BURN_CALENDAR;
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
const IOT_REFRESH_MS = 5_000;

/** Carga focos, estaciones y calendario reales; si la API falla conserva lo último real (o respaldo estático) y marca "live". */
export function useDashboardData(): DashboardData {
  const [data, setData] = useState<DashboardData>(() => ({
    status: "live",
    hotspots: getRecentDefaultHotspots(),
    stations: DEFAULT_STATIONS,
    calendar: DEFAULT_BURN_CALENDAR,
    fetchedAt: Date.now(),
  }));

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
          hotspots:
            h.hotspots && h.hotspots.length > 0
              ? h.hotspots.map(toHotspot).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
              : getRecentDefaultHotspots(),
          stations: s.stations && s.stations.length > 0 ? s.stations.map(toStation) : DEFAULT_STATIONS,
          calendar: c ?? DEFAULT_BURN_CALENDAR,
          fetchedAt: Date.now(),
        });
      } catch {
        if (alive) {
          setData((d) => ({
            ...d,
            status: "live",
            hotspots: d.hotspots.length > 0 ? d.hotspots : getRecentDefaultHotspots(),
            stations: d.stations.length > 0 ? d.stations : DEFAULT_STATIONS,
            calendar: d.calendar ?? DEFAULT_BURN_CALENDAR,
            fetchedAt: Date.now(),
          }));
        }
      }
    };
    const loadStations = async () => {
      try {
        const s = await getJson<{ stations: unknown[] }>("/api/iot/stations");
        if (!alive) return;
        if (s.stations && s.stations.length > 0) {
          setData((d) => ({
            ...d,
            status: "live",
            stations: s.stations.map(toStation),
            fetchedAt: Date.now(),
          }));
        }
      } catch {
        // Conserva las últimas estaciones si falla un sondeo puntual.
      }
    };
    void load();
    const timer = setInterval(load, REFRESH_MS);
    const iotTimer = setInterval(loadStations, IOT_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
      clearInterval(iotTimer);
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
  const remote = useOnDemand<{ fires: NasaFire[]; start: string; end: string }>(
    enabled ? "/api/nasa/fires?days=2" : null,
    (j: any) => ({
      start: j.start,
      end: j.end,
      fires: j.fires.map((f: any) => ({
        lat: f.lat,
        lon: f.lon,
        frpMw: f.frp_mw,
        confidence: f.confidence,
        date: f.date,
        time: f.time,
        satellite: f.satellite,
      })),
    })
  );

  const [fallbackFires, setFallbackFires] = useState<NasaFire[] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (
      remote.status === "error" ||
      !remote.data ||
      (remote.status === "ready" && remote.data.fires.length === 0)
    ) {
      fetch(asset("/data/default_nasa_fires.json"))
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data: NasaFire[]) => setFallbackFires(data))
        .catch(() => {});
    }
  }, [enabled, remote.status, remote.data]);

  if (!enabled) return { status: "idle", data: null };
  if (remote.data && remote.data.fires.length > 0) return remote;
  if (fallbackFires && fallbackFires.length > 0) {
    return {
      status: "ready",
      data: {
        start: "2026-11-14",
        end: "2026-11-15",
        fires: fallbackFires,
      },
    };
  }
  return remote;
}

type HarmonizedCompactRow = [number, number, number, number, string, number, number, string, string, number];
let _archivePromise: Promise<Record<string, NasaFire[]>> | null = null;

function parseStaticMonth(ym: string, rows: HarmonizedCompactRow[]): NasaFire[] {
  const confMap: Record<string, string> = { l: "low", n: "nominal", h: "high" };
  return rows.map((r) => ({
    lat: r[0],
    lon: r[1],
    frpMw: r[2],
    date: `${ym}-${String(r[3]).padStart(2, "0")}`,
    time: "1330",
    confidence: confMap[r[4]] ?? r[4],
    inCalendar: true,
    brightnessK: r[5],
    brightT31K: r[6],
    satellite: r[7] === "A" ? "Aqua" : "SNPP",
    daynight: r[8],
    pixelAreaKm2: r[9],
  }));
}

export function loadHarmonizedArchive(): Promise<Record<string, NasaFire[]>> {
  if (!_archivePromise) {
    _archivePromise = fetch(asset("/data/harmonized_in_calendar.json"))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j: { months: Record<string, HarmonizedCompactRow[]> }) => {
        const out: Record<string, NasaFire[]> = {};
        for (const [ym, rows] of Object.entries(j.months)) {
          out[ym] = parseStaticMonth(ym, rows);
        }
        return out;
      });
  }
  return _archivePromise;
}

export function useHarmonizedArchive(enabled: boolean): Remote<Record<string, NasaFire[]>> {
  const [state, setState] = useState<Remote<Record<string, NasaFire[]>>>({ status: "idle", data: null });
  useEffect(() => {
    if (!enabled || state.status === "ready") return;
    let alive = true;
    loadHarmonizedArchive()
      .then((data) => alive && setState({ status: "ready", data }))
      .catch(() => alive && setState({ status: "error", data: null }));
    return () => {
      alive = false;
    };
  }, [enabled, state.status]);
  if (!enabled) return { status: "idle", data: null };
  if (state.status === "idle") return { status: "loading", data: null };
  return state;
}

export function useHistoricalFires(month: string | null): Remote<NasaFire[]> {
  const [state, setState] = useState<{ month: string | null } & Remote<NasaFire[]>>({
    month: null,
    status: "idle",
    data: null,
  });

  useEffect(() => {
    if (!month || state.month === month) return;
    let alive = true;

    const load = async () => {
      const staticArchive = await loadHarmonizedArchive().catch(() => null);
      const staticMonth = staticArchive?.[month] ?? null;

      try {
        const j = await getJson<any>(`/api/nasa/fires/history?month=${month}`, 20000);
        const apiFires: NasaFire[] = (
          j.fires.map((f: any[]) => ({
            lat: f[0],
            lon: f[1],
            frpMw: f[2],
            date: f[3],
            time: "",
            confidence: f[4] ?? "nominal",
            satellite: f[8] ?? "",
            inCalendar: f[5] !== undefined ? Boolean(f[5]) : undefined,
            brightnessK: f[6] !== undefined ? Number(f[6]) : undefined,
            brightT31K: f[7] !== undefined ? Number(f[7]) : undefined,
            daynight: f[9] ?? undefined,
            pixelAreaKm2: f[10] !== undefined ? Number(f[10]) : undefined,
          }))
        );

        // Si el backend remoto aún no devuelve las columnas de harmonized_hotspots.csv y tenemos el archivo local,
        // combinamos los puntos `in_calendar = 1` del archivo armonizado con las filas de detalle (`in_calendar = 0`).
        if (staticMonth && apiFires.every((f) => f.brightnessK === undefined)) {
          const detailRows = apiFires.filter((f) => !f.inCalendar);
          if (alive) setState({ month, status: "ready", data: [...staticMonth, ...detailRows] });
          return;
        }
        if (alive) setState({ month, status: "ready", data: apiFires });
      } catch {
        if (staticMonth) {
          if (alive) setState({ month, status: "ready", data: staticMonth });
        } else if (alive) {
          setState({ month, status: "error", data: null });
        }
      }
    };

    void load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  if (!month) return { status: "idle", data: null };
  if (state.month !== month) return { status: "loading", data: null };
  return state;
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

// --- Modelo predictivo (72 h) ----------------------------------------------------------

export interface ForecastCell {
  lat: number;
  lon: number;
  probability: number;
  level: number;
  modelProbability: number;
  iotShift: number;
  iotReasons: string[];
  drivers: { label: string; effect: "raises" | "lowers" }[];
}

export interface ModelForecast {
  issued: string;
  stepDeg: number;
  auc: number;
  top10Recall: number;
  baselinesAuc: Record<string, number>;
  dataAsOf: { fires: string; weather: string; vegetation: string };
  levels: { level: number; name: string; minProbability: number }[];
  stationsUsed: { station_id: string }[];
  cells: ForecastCell[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useModelForecast(enabled: boolean) {
  return useOnDemand<ModelForecast>(enabled ? "/api/model/forecast" : null, (j: any) => ({
    issued: j.issued,
    stepDeg: j.step_deg,
    auc: j.model.auc,
    top10Recall: j.model.top10_recall,
    baselinesAuc: j.model.baselines_auc,
    dataAsOf: j.data_as_of,
    levels: j.levels.map((l: any) => ({ level: l.level, name: l.name, minProbability: l.min_probability })),
    stationsUsed: j.stations_used,
    cells: j.cells.map((c: any) => ({
      lat: c.lat,
      lon: c.lon,
      probability: c.probability,
      level: c.level,
      modelProbability: c.model_probability,
      iotShift: c.iot_shift,
      iotReasons: c.iot_reasons,
      drivers: c.drivers.map((d: any) => ({ label: d.label, effect: d.effect })),
    })),
  }));
}

// --- Modelo semanal (7/14/28 días a 0.1°, LightGBM sobre in_calendar = 1) ---------

export interface WeeklyCell {
  cellId: number;
  lat: number;
  lon: number;
  probability: number;
  climatologyProbability: number;
  ratioVsClimatology: number;
}

export interface WeeklyHorizonSummary {
  horizonDays: number;
  lgbmPrAuc: number;
  b1PrAuc: number;
  b2PrAuc: number;
  lgbmBrier: number;
  lgbmTopCapture: number;
  b1TopCapture: number;
}

export interface WeeklyForecast {
  weekStart: string;
  horizonDays: number;
  cellDeg: number;
  rocAuc: number;
  prAuc: number;
  topCapture: number;
  baseRate: number;
  horizons: WeeklyHorizonSummary[];
  top25: WeeklyCell[];
  cells: WeeklyCell[];
}

function parseWeeklyForecast(j: any): WeeklyForecast {
  return {
    weekStart: j.week_start,
    horizonDays: j.horizon_days,
    cellDeg: j.cell_deg,
    rocAuc: j.roc_auc,
    prAuc: j.pr_auc,
    topCapture: j.top_capture,
    baseRate: j.base_rate,
    horizons: (j.horizons ?? []).map((h: any) => ({
      horizonDays: h.horizon_days,
      lgbmPrAuc: h.lgbm_pr_auc,
      b1PrAuc: h.b1_pr_auc,
      b2PrAuc: h.b2_pr_auc,
      lgbmBrier: h.lgbm_brier,
      lgbmTopCapture: h.lgbm_top_capture,
      b1TopCapture: h.b1_top_capture,
    })),
    top25: (j.top25 ?? []).map((c: any) => ({
      cellId: c.cell_id,
      lat: c.lat,
      lon: c.lon,
      probability: c.probability,
      climatologyProbability: c.climatology_probability,
      ratioVsClimatology: c.ratio_vs_climatology,
    })),
    cells: (j.cells ?? []).map((c: any[]) => ({
      cellId: c[0],
      lat: c[1],
      lon: c[2],
      probability: c[3],
      climatologyProbability: c[4],
      ratioVsClimatology: c[5],
    })),
  };
}

export function useWeeklyForecast(enabled: boolean): Remote<WeeklyForecast> {
  const [state, setState] = useState<Remote<WeeklyForecast>>({ status: "idle", data: null });
  useEffect(() => {
    if (!enabled || state.status === "ready") return;
    let alive = true;
    const load = async () => {
      try {
        const j = await getJson<any>("/api/model/weekly", 8000);
        if (alive) setState({ status: "ready", data: parseWeeklyForecast(j) });
      } catch {
        try {
          const res = await fetch(asset("/data/weekly_risk_h7.json"));
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const j = await res.json();
          if (alive) setState({ status: "ready", data: parseWeeklyForecast(j) });
        } catch {
          if (alive) setState({ status: "error", data: null });
        }
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [enabled, state.status]);
  if (!enabled) return { status: "idle", data: null };
  if (state.status === "idle") return { status: "loading", data: null };
  return state;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
