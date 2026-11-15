"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { AreaBounds, Basemap, MapApi } from "../components/ChihuahuaOsmMap";
import {
  CalendarIcon,
  CloseIcon,
  CloudIcon,
  DownloadIcon,
  FeatherIcon,
  FlameIcon,
  HelpIcon,
  LayersIcon,
  LocateIcon,
  ResetIcon,
  SelectAreaIcon,
  WarnIcon,
} from "../components/Icons";
import LazyMap from "../components/LazyMap";
import SiteHeader from "../components/SiteHeader";
import { LITE_URL, type ModelForecast, useDashboardData, useHarmonizedArchive, useHistoricalFires, useModelForecast, useNasaFires, useNow, useSlowConnection, useWeatherGrid, useWeeklyForecast, type WeeklyForecast } from "../lib/api";
import { asset } from "../lib/asset";
import {
  type BurnCalendar,
  directionsUrl,
  downloadHistoricalCsv,
  downloadHotspotsCsv,
  formatAgo,
  formatTime,
  HARMONIZATION_META,
  type HotspotEvent,
  minutesSince,
  type NasaFire,
  ORIGIN_COLORS,
  RISK_SCALE,
  riskFor,
  type Station,
} from "../lib/fire-data";
import {
  CONDITIONS,
  type ConditionDef,
  type ConditionLayer,
  conditionDef,
  type FireLayers,
  historyMonths,
  monthLabel,
  SATELLITE_LAYERS,
  type SatelliteLayer,
  type SatLegend,
} from "../lib/layers";

type Range = "24h" | "7d" | "all";
const RANGES: { id: Range; label: string; minutes: number }[] = [
  { id: "24h", label: "24HRS", minutes: 24 * 60 },
  { id: "7d", label: "7DAYS", minutes: 7 * 24 * 60 },
  { id: "all", label: "ALL", minutes: Number.POSITIVE_INFINITY },
];

const DISCLAIMER_KEY = "fd-disclaimer-ok";

// --- Estado del navegador sin setState en efectos --------------------------------
const desktopQuery = "(min-width: 768px)";
const subscribeDesktop = (cb: () => void) => {
  const mq = window.matchMedia(desktopQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useIsDesktop = () =>
  useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => true);

const readDisclaimerOk = () => {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) === "1";
  } catch {
    return false;
  }
};
const noopSubscribe = () => () => {};
const useDisclaimerSeen = () => useSyncExternalStore(noopSubscribe, readDisclaimerOk, () => true);

export default function FireMapPage() {
  const data = useDashboardData();
  const slow = useSlowConnection();
  const now = useNow();
  const isDesktop = useIsDesktop();
  const disclaimerSeen = useDisclaimerSeen();

  const [range, setRange] = useState<Range>("7d");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [showStations, setShowStations] = useState(true);
  const [conditionId, setConditionId] = useState<ConditionLayer | null>(null);
  const [satellite, setSatellite] = useState<SatelliteLayer | null>(null);
  const [fire, setFire] = useState<FireLayers>({ nasa: true, history: false, probability: false, weekly: false, cause: true });
  const months = historyMonths();
  const [historyMonth, setHistoryMonth] = useState(months.find((m) => m.endsWith("-05")) ?? months[0]);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historyOnlyInCalendar, setHistoryOnlyInCalendar] = useState(true);
  const [showHarmonizationZone, setShowHarmonizationZone] = useState(false);
  const [panelPref, setPanelPref] = useState<boolean | null>(null);
  const [modal, setModal] = useState<"help" | "calendar" | "area" | "weekly" | null>(null);
  const [selectAreaMode, setSelectAreaMode] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState<AreaBounds | null>(null);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const mapApi = useRef<MapApi | null>(null);
  const onReady = useCallback((api: MapApi) => (mapApi.current = api), []);

  useEffect(() => {
    if (!selectAreaMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectAreaMode(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectAreaMode]);

  const handleAreaSelected = (bounds: AreaBounds) => {
    setSelectedBounds(bounds);
    setSelectAreaMode(false);
    setModal("area");
  };

  // Capas bajo demanda: cada una se descarga solo al activarla.
  const condition = conditionDef(conditionId);
  const nasa = useNasaFires(fire.nasa);
  const hasRange = Boolean(historyStartDate || historyEndDate);
  const rangeStart = historyStartDate || historyEndDate;
  const rangeEnd = historyEndDate || historyStartDate;
  const isMultiMonthRange = Boolean(
    rangeStart && rangeEnd && rangeStart.slice(0, 7) !== rangeEnd.slice(0, 7)
  );
  const history = useHistoricalFires(fire.history && !isMultiMonthRange ? historyMonth : null);
  const rangeArchive = useHarmonizedArchive(fire.history && isMultiMonthRange);

  const filteredHistory = (() => {
    if (!hasRange) return history.data;
    if (isMultiMonthRange) {
      if (!rangeArchive.data) return null;
      const ymStart = rangeStart.slice(0, 7);
      const ymEnd = rangeEnd.slice(0, 7);
      return Object.entries(rangeArchive.data)
        .filter(([ym]) => ym >= ymStart && ym <= ymEnd)
        .flatMap(([, rows]) => rows.filter((f) => f.date >= rangeStart && f.date <= rangeEnd));
    }
    if (!history.data) return null;
    return history.data.filter((f) => f.date >= rangeStart && f.date <= rangeEnd);
  })();

  const visibleHistory =
    filteredHistory && historyOnlyInCalendar
      ? filteredHistory.filter((f) => f.inCalendar)
      : filteredHistory;
  const historyRangeLabel = hasRange
    ? rangeStart === rangeEnd
      ? rangeStart
      : `${rangeStart}_to_${rangeEnd}`
    : historyMonth;
  // El modelo se carga siempre (alimenta el panel de peligro); la cuadrícula de clima, solo si hace falta.
  const model = useModelForecast(true);
  const weekly = useWeeklyForecast(fire.weekly || modal === "weekly" || modal === "area");
  const grid = useWeatherGrid((fire.probability && !model.data) || Boolean(condition?.grid));
  const toggleFire = (k: keyof FireLayers) => setFire((f) => ({ ...f, [k]: !f[k] }));

  const panelOpen = panelPref ?? isDesktop;
  const showDisclaimer = modal === "help" || (!disclaimerSeen && !disclaimerDismissed);

  const maxMinutes = RANGES.find((r) => r.id === range)!.minutes;
  const events = data.hotspots.filter((e) => now === null || minutesSince(e.detectedAt, now) <= maxMinutes);
  const selected = events.find((e) => e.id === selectedId) ?? null;
  const flameStations = data.stations.filter((s) => s.flameDetected);
  // Peligro: nivel más alto del modelo a 72 h; si no está disponible, el de las estacas.
  const riskLevel = model.data ? Math.max(1, ...model.data.cells.map((c) => c.level)) : Math.max(1, ...data.stations.map((s) => s.riskLevel));
  const risk = riskFor(riskLevel);
  const highCells = model.data ? model.data.cells.filter((c) => c.level >= 3).length : null;

  const closeDisclaimer = (remember: boolean) => {
    if (remember) {
      try {
        localStorage.setItem(DISCLAIMER_KEY, "1");
      } catch {
        // sin almacenamiento: se mostrará de nuevo la próxima vez
      }
    }
    setDisclaimerDismissed(true);
    setModal(null);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SiteHeader />

      <div className="relative flex-1">
        <LazyMap
          events={events}
          stations={data.stations}
          showStations={showStations}
          basemap={basemap}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onReady={onReady}
          condition={condition}
          grid={grid.data}
          showProbability={fire.probability}
          forecast={model.data}
          weeklyForecast={weekly.data}
          showWeekly={fire.weekly}
          nasaFires={fire.nasa ? nasa.data?.fires ?? null : null}
          historyFires={fire.history ? filteredHistory : null}
          historyOnlyInCalendar={historyOnlyInCalendar}
          showHarmonizationZone={fire.history && showHarmonizationZone}
          showCause={fire.cause}
          satellite={satellite}
          selectAreaMode={selectAreaMode}
          selectedBounds={selectedBounds}
          onAreaSelected={handleAreaSelected}
        />

        {selectAreaMode && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[1001] -translate-x-1/2 rounded border border-fd-gold/60 bg-[#141416]/95 px-3.5 py-2 text-center text-xs font-semibold text-fd-gold shadow-xl">
            Drag on the map from one point to another to capture an area · Press Esc to cancel
          </div>
        )}

        {flameStations.length > 0 && (
          <div
            role="alert"
            className="pointer-events-none absolute left-1/2 top-3 z-[1002] flex w-[min(92%,34rem)] -translate-x-1/2 items-center justify-center gap-2 rounded border border-red-400 bg-red-600/95 px-4 py-2 text-center text-sm font-bold text-white shadow-xl"
          >
            <span className="inline-block h-2.5 w-2.5 animate-ping rounded-full bg-white" />
            <span>
              FLAME DETECTED:{" "}
              {flameStations
                .map((s) =>
                  s.flameIntensityPct !== null
                    ? `${s.name} (${Math.round(s.flameIntensityPct)}%)`
                    : s.name
                )
                .join(" · ")}
            </span>
          </div>
        )}

        <MapLegend condition={condition} fire={fire} historyMonth={historyMonth} satellite={satellite} forecast={model.data} weeklyForecast={weekly.data} />

        {/* Avisos de conexión */}
        {(slow || data.status === "offline") && (
          <div className="absolute left-1/2 top-2 z-[1000] w-[min(92%,30rem)] -translate-x-1/2 rounded border border-black/40 bg-[#1f1f22]/95 px-3 py-2 text-center text-sm shadow-lg">
            {data.status === "offline" ? "Live data unavailable right now. " : "Slow connection detected. "}
            <a href={LITE_URL} className="font-bold text-fd-gold underline">
              Switch to Lite mode (~3 KB)
            </a>
          </div>
        )}

        {/* Celular: estado siempre visible; al tocarlo abre el panel */}
        {!panelOpen && (
          <button
            type="button"
            onClick={() => setPanelPref(true)}
            className="absolute right-2 top-2 z-[1000] flex cursor-pointer items-center gap-2 rounded border border-black/50 bg-fd-panel/95 px-2.5 py-1.5 text-sm font-semibold shadow-lg md:hidden"
          >
            <span className="rounded px-1.5 uppercase" style={{ backgroundColor: risk.bg, color: risk.fg }}>
              {risk.level}
            </span>
            {events.length} hotspots ›
          </button>
        )}

        {/* Panel lateral (escritorio) / inferior (celular) */}
        {panelOpen && (
          <aside
            aria-label="Map panel"
            className="absolute inset-x-0 bottom-14 z-[1000] max-h-[55%] overflow-y-auto border-t border-black/50 bg-fd-panel/95 text-[15px] shadow-2xl md:inset-x-auto md:bottom-16 md:right-2 md:top-2 md:max-h-none md:w-[370px] md:rounded md:border"
          >
            <Section title="Fire danger" right={data.fetchedAt ? `Updated ${formatTime(data.fetchedAt)}` : data.status === "loading" ? "Loading…" : "Offline"}>
              <div className="flex items-center gap-3 px-3 py-3">
                <span className="rounded px-2.5 py-1 text-lg font-bold uppercase" style={{ backgroundColor: risk.bg, color: risk.fg }}>
                  {risk.level}
                </span>
                <ol aria-label={`Danger level ${riskLevel} of 5`} className="flex items-end gap-0.5">
                  {RISK_SCALE.map((r, i) => (
                    <li
                      key={r.level}
                      title={r.level}
                      className={`w-5 ${i + 1 === riskLevel ? "h-5 ring-2 ring-white" : "h-2.5 opacity-60"}`}
                      style={{ backgroundColor: r.bg }}
                    />
                  ))}
                </ol>
                {data.calendar && (
                  <span className="ml-auto text-right text-sm leading-tight text-white/80">
                    {data.calendar.current.month} vs median
                    <br />
                    <b className="text-white">
                      {data.calendar.current.anomalyPct > 0 ? "+" : ""}
                      {data.calendar.current.anomalyPct}%
                    </b>
                  </span>
                )}
              </div>
              <p className="mx-3 mb-2 text-sm text-white/75">
                {model.data ? (
                  <>
                    Highest 72-h fire risk in Chihuahua (model trained on NASA FIRMS, POWER and NDVI; AUC{" "}
                    {model.data.auc.toFixed(2)}).{" "}
                    <b className="text-white">{highCells}</b> cells at High or above.{" "}
                    <button type="button" onClick={() => setFire((f) => ({ ...f, probability: true }))} className="cursor-pointer font-semibold text-fd-gold underline">
                      Show on map
                    </button>
                  </>
                ) : model.status === "loading" ? (
                  "Loading 72-h fire risk model…"
                ) : (
                  "Model unavailable: showing field station danger."
                )}
              </p>
            </Section>

            <Section title="Layers">
              <div className="space-y-3 px-3 py-2.5">
                <fieldset>
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-fd-gold">Fire</legend>
                  <LayerCheck checked={fire.nasa} onChange={() => toggleFire("nasa")} label="NASA active fires" hint={fire.nasa ? layerHint(nasa.status, `VIIRS NOAA-20 + NOAA-21 · last 48 h · ${nasa.data?.fires.length ?? 0} in Chihuahua · up to ~3 h delay`) : "NASA FIRMS, VIIRS 375 m, last 48 h"} swatch={<span className="h-3 w-3 rounded-full border-2 border-[#ffe066] bg-[#ff2a00]" />} />
                  <LayerCheck
                    checked={fire.history}
                    onChange={() => toggleFire("history")}
                    label="Historical fires (harmonized)"
                    hint={
                      fire.history
                        ? layerHint(
                            history.status,
                            `${history.data?.filter((f) => f.inCalendar).length ?? 0} in_calendar=1 (${history.data?.length ?? 0} total) in ${monthLabel(historyMonth)} · ${
                              historyMonth < "2012-01" ? "Aqua MODIS 1 km (13:30)" : "S-NPP/NOAA VIIRS 375 m (1.4 km cell ≥ 15 MW)"
                            }`
                          )
                        : "Harmonized archive: Aqua MODIS (2002–2011) + S-NPP VIIRS ≥15 MW cells (2012–2026)"
                    }
                    swatch={<span className="h-2.5 w-2.5 rounded-full bg-[#ff9f1c]" />}
                  >
                    <select
                      value={historyMonth}
                      onChange={(e) => {
                        setHistoryMonth(e.target.value);
                        setHistoryStartDate("");
                        setHistoryEndDate("");
                      }}
                      aria-label="Historical month"
                      className="mt-1 w-full rounded border border-white/20 bg-[#141416] px-2 py-1 text-sm"
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>{monthLabel(m)}</option>
                      ))}
                    </select>
                    <div className="mt-1.5 rounded border border-white/15 bg-black/25 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white/85">Calendar range &amp; print</span>
                        {hasRange && (
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryStartDate("");
                              setHistoryEndDate("");
                            }}
                            className="cursor-pointer text-[11px] font-semibold text-fd-gold hover:underline"
                          >
                            All month
                          </button>
                        )}
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <label className="block text-[10px] text-white/60">
                          From
                          <input
                            type="date"
                            value={historyStartDate}
                            min="2002-07-04"
                            max={historyEndDate || "2026-08-30"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHistoryStartDate(val);
                              if (val) {
                                const ym = val.slice(0, 7);
                                if (months.includes(ym)) setHistoryMonth(ym);
                                if (historyEndDate && historyEndDate < val) setHistoryEndDate(val);
                              }
                            }}
                            aria-label="Start date"
                            className="mt-0.5 w-full rounded border border-white/20 bg-[#141416] px-1.5 py-1 text-[11px] text-white"
                          />
                        </label>
                        <label className="block text-[10px] text-white/60">
                          To
                          <input
                            type="date"
                            value={historyEndDate}
                            min={historyStartDate || "2002-07-04"}
                            max="2026-08-30"
                            onChange={(e) => {
                              const val = e.target.value;
                              setHistoryEndDate(val);
                              if (val && !historyStartDate) {
                                const ym = val.slice(0, 7);
                                if (months.includes(ym)) setHistoryMonth(ym);
                              }
                            }}
                            aria-label="End date"
                            className="mt-0.5 w-full rounded border border-white/20 bg-[#141416] px-1.5 py-1 text-[11px] text-white"
                          />
                        </label>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-1.5">
                        <span className="truncate text-[11px] text-white/65">
                          {isMultiMonthRange && rangeArchive.status === "loading"
                            ? "Loading range…"
                            : `${visibleHistory?.length ?? 0} detections`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!visibleHistory || visibleHistory.length === 0}
                            onClick={() =>
                              visibleHistory &&
                              printHistoricalReport(
                                visibleHistory,
                                hasRange ? `${rangeStart} to ${rangeEnd}` : monthLabel(historyMonth)
                              )
                            }
                            className="cursor-pointer rounded border border-fd-gold/40 bg-fd-gold/15 px-2.5 py-1 text-[11px] font-semibold text-fd-gold hover:bg-fd-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Print
                          </button>
                          <button
                            type="button"
                            disabled={!visibleHistory || visibleHistory.length === 0}
                            onClick={() =>
                              visibleHistory &&
                              downloadHistoricalCsv(visibleHistory, historyRangeLabel)
                            }
                            className="cursor-pointer rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            CSV
                          </button>
                        </div>
                      </div>
                    </div>
                    <label className="mt-1.5 flex cursor-pointer items-start gap-2 text-xs text-white/80">
                      <input
                        type="checkbox"
                        checked={historyOnlyInCalendar}
                        onChange={(e) => setHistoryOnlyInCalendar(e.target.checked)}
                        className="mt-0.5 accent-[#f5c518]"
                      />
                      <span>
                        <code className="text-fd-gold">in_calendar = 1</code> only (MODIS-eq ≥ 15 MW, 55,902 consistent series)
                      </span>
                    </label>
                    <label className="mt-1 flex cursor-pointer items-start gap-2 text-xs text-white/80">
                      <input
                        type="checkbox"
                        checked={showHarmonizationZone}
                        onChange={(e) => setShowHarmonizationZone(e.target.checked)}
                        className="mt-0.5 accent-[#f5c518]"
                      />
                      <span>Show calibration domain (25.5°–31.8° N, −109.5° to −103.3° E)</span>
                    </label>
                  </LayerCheck>
                  <LayerCheck checked={fire.probability} onChange={() => toggleFire("probability")} label="Fire probability, next 72 h (our model)" hint={model.data ? `Trained on 6 years of NASA data · AUC ${model.data.auc.toFixed(2)} · corrected by IoT stations` : layerHint(grid.status, "Model unavailable: weather index shown instead")} swatch={<span className="h-3 w-3 bg-gradient-to-r from-[#16a34a] via-[#facc15] to-[#dc2626]" />} />
                  <LayerCheck
                    checked={fire.weekly}
                    onChange={() => toggleFire("weekly")}
                    label="Weekly fire risk, next 7 days (0.1° · LightGBM)"
                    hint={
                      weekly.data
                        ? `Trained on in_calendar = 1 · PR-AUC ${weekly.data.prAuc} · Top-5% capture ${Math.round(weekly.data.topCapture * 100)}% (${weekly.data.cells.length.toLocaleString()} cells)`
                        : layerHint(weekly.status, "0.1° (~11 km) LightGBM model trained on harmonized series")
                    }
                    swatch={<span className="h-3 w-3 border border-[#fde047] bg-gradient-to-r from-[#16a34a] via-[#facc15] to-[#dc2626]" />}
                  >
                    <button
                      type="button"
                      onClick={() => setModal("weekly")}
                      className="mt-1 cursor-pointer text-xs font-semibold text-fd-gold underline hover:brightness-110"
                    >
                      View Top-25 risk cells &amp; 7/14/28d metrics
                    </button>
                  </LayerCheck>
                  <LayerCheck checked={fire.cause} onChange={() => toggleFire("cause")} label="Recent detections list (48 h)" hint="NASA VIIRS NOAA-20/21 · cause not determined" swatch={<span className="h-3 w-3 rounded-full bg-[#f97316] ring-2 ring-[#38bdf8]" />} />
                </fieldset>

                <fieldset className="border-t border-white/10 pt-2.5">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-fd-gold">Field station conditions</legend>
                  <label className="flex cursor-pointer items-center gap-2 py-0.5">
                    <input type="radio" name="condition" checked={conditionId === null} onChange={() => setConditionId(null)} className="accent-[#f5c518]" />
                    None
                  </label>
                  {CONDITIONS.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 py-0.5">
                      <input type="radio" name="condition" checked={conditionId === c.id} onChange={() => setConditionId(c.id)} className="accent-[#f5c518]" />
                      {c.label}
                      {c.grid && <span className="text-xs text-white/50">+ statewide</span>}
                    </label>
                  ))}
                  <label className="mt-1 flex cursor-pointer items-center gap-2 py-0.5 text-sm text-white/80">
                    <input type="checkbox" checked={showStations} onChange={(e) => setShowStations(e.target.checked)} className="accent-[#f5c518]" />
                    Always show station markers
                  </label>
                </fieldset>

                <fieldset className="border-t border-white/10 pt-2.5">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-fd-gold">Satellite imagery (NASA GIBS)</legend>
                  <label className="flex cursor-pointer items-center gap-2 py-0.5">
                    <input type="radio" name="satellite" checked={satellite === null} onChange={() => setSatellite(null)} className="accent-[#f5c518]" />
                    None
                  </label>
                  {SATELLITE_LAYERS.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-start gap-2 py-0.5">
                      <input type="radio" name="satellite" checked={satellite === s.id} onChange={() => setSatellite(s.id)} className="mt-1 accent-[#f5c518]" />
                      <span className="min-w-0 flex-1 leading-tight">
                        {s.label}
                        <span className="block text-xs text-white/55">{s.hint}</span>
                        <SatLegendPreview legend={s.legend} />
                      </span>
                    </label>
                  ))}
                </fieldset>

                <fieldset className="border-t border-white/10 pt-2.5">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-fd-gold">Basemap</legend>
                  {(
                    [
                      ["satellite", "Satellite imagery"],
                      ["dark", "Dark street map (lighter download)"],
                    ] as const
                  ).map(([id, label]) => (
                    <label key={id} className="flex cursor-pointer items-center gap-2 py-0.5">
                      <input type="radio" name="basemap" checked={basemap === id} onChange={() => setBasemap(id)} className="accent-[#f5c518]" />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </div>
            </Section>

            <Section title={`Recent NASA detections (${events.length})`}>
              <div className="flex items-center justify-center gap-3 px-3 pt-3">
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={range === r.id}
                    onClick={() => setRange(r.id)}
                    className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-bold ${
                      range === r.id ? "border-fd-gold bg-fd-gold text-black" : "border-white/30 text-white/80 hover:border-white/60"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="px-3 pt-2 text-xs text-white/60">Circle size = intensity (FRP) · pulsing = last hour · ■ = field station</p>

              <ol className="mt-2 divide-y divide-white/10 border-t border-white/10">
                {events.length === 0 && (
                  <li className="px-3 py-4 text-sm text-white/70">
                    {data.status === "loading" ? "Loading NASA detections…" : data.status === "offline" ? "NASA detections unavailable right now." : "No detections in this time range."}
                  </li>
                )}
                {events.map((ev) => {
                  const isSel = ev.id === selected?.id;
                  return (
                    <li key={ev.id} className={isSel ? "bg-white/10" : ""}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(isSel ? null : ev.id)}
                        aria-expanded={isSel}
                        className="flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/5"
                      >
                        <span aria-hidden="true" className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: ORIGIN_COLORS[ev.origin].hex }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {ev.state ?? "Mexico"} · {ev.lat.toFixed(3)}, {ev.lon.toFixed(3)}
                          </span>
                          <span className="block text-sm text-white/70">
                            {formatAgo(ev.detectedAt, now)} · {ev.sensor}
                            {ev.confidence ? ` · ${ev.confidence} confidence` : ""}
                          </span>
                        </span>
                      </button>
                      {isSel && (
                        <div className="px-3 pb-3 pl-8 text-sm">
                          <p className="text-white/80">
                            FRP {ev.frpMw} MW · cause not determined
                          </p>
                          <a
                            href={directionsUrl(ev)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block rounded bg-fd-gold px-3 py-1.5 font-bold text-black hover:brightness-110"
                          >
                            Directions ↗
                          </a>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Section>

            <Section title={`Field stations (${data.stations.length})`}>
              <ul className="divide-y divide-white/10">
                {data.stations.map((s) => {
                  const r = riskFor(s.riskLevel);
                  return (
                    <li key={s.id} className="px-3 py-2.5">
                      <p className="flex items-center gap-2 font-semibold">
                        {s.name}
                        <span className="rounded px-1.5 text-xs font-bold uppercase" style={{ backgroundColor: r.bg, color: r.fg }}>
                          {r.level}
                        </span>
                      </p>
                      <p className="text-sm tabular-nums text-white/75">
                        {s.temperatureC} °C · {s.humidityPct}% RH · {s.windKmh} km/h · {s.lightningStrikes} strikes
                      </p>
                      <p className="text-xs text-white/55">
                        {s.id} · {formatAgo(s.recordedAt, now)} · {s.fallbackActive ? "weather backup" : "field sensor"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </Section>

          </aside>
        )}

        {/* Barra de herramientas inferior */}
        <nav aria-label="Map tools" className="absolute inset-x-0 bottom-0 z-[1001] flex justify-center">
          <ul className="flex max-w-full overflow-x-auto border border-black/50 bg-[#1f1f22]/95 shadow-2xl md:mb-2 md:rounded">
            <Tool label="Layers" active={panelOpen} onClick={() => setPanelPref(!panelOpen)} icon={<LayersIcon />} />
            <Tool
              label="Area"
              active={selectAreaMode || Boolean(selectedBounds)}
              onClick={() => {
                if (selectedBounds && !selectAreaMode) {
                  setModal("area");
                } else {
                  setSelectAreaMode((v) => !v);
                }
              }}
              icon={<SelectAreaIcon />}
            />
            <Tool label="Location" onClick={() => mapApi.current?.locate()} icon={<LocateIcon />} />
            <Tool label="Reset" onClick={() => mapApi.current?.reset()} icon={<ResetIcon />} />
            <Tool label="Calendar" onClick={() => setModal("calendar")} icon={<CalendarIcon />} />
            <Tool label="Download" onClick={() => downloadHotspotsCsv(events)} icon={<DownloadIcon />} />
            <li>
              <a href={LITE_URL} className="flex h-14 w-[3.35rem] flex-col items-center sm:w-[4.5rem] justify-center gap-0.5 text-[10px] font-semibold uppercase text-white/85 hover:bg-white/10 hover:text-fd-gold sm:text-[11px]">
                <FeatherIcon />
                Lite
              </a>
            </li>
            <Tool label="Help" onClick={() => setModal("help")} icon={<HelpIcon />} />
          </ul>
        </nav>

        {modal === "calendar" && (
          <Modal title="Harmonized burn calendar & MODIS ↔ VIIRS calibration" onClose={() => setModal(null)} wide>
            <CalendarHeatmap
              calendar={data.calendar}
              selectedMonth={historyMonth}
              onSelectMonth={(ym) => {
                setHistoryMonth(ym);
                setHistoryStartDate("");
                setHistoryEndDate("");
                setFire((f) => ({ ...f, history: true }));
                setModal(null);
              }}
            />
          </Modal>
        )}

        {modal === "weekly" && (
          <Modal title="Weekly Fire-Risk Model (0.1° · LightGBM on in_calendar = 1)" onClose={() => setModal(null)} wide>
            <WeeklyRiskModal
              weekly={weekly.data}
              onLocateCell={(lat, lon) => {
                setFire((f) => ({ ...f, weekly: true }));
                setModal(null);
                mapApi.current?.focus(lat, lon, 10);
              }}
            />
          </Modal>
        )}

        {modal === "area" && selectedBounds && (
          <Modal title="Selected area data" onClose={() => setModal(null)} wide>
            <AreaSummary
              bounds={selectedBounds}
              events={events}
              stations={data.stations}
              nasaFires={fire.nasa ? nasa.data?.fires ?? null : null}
              historyFires={fire.history ? filteredHistory : null}
              historyMonth={historyRangeLabel}
              forecast={model.data}
              weeklyForecast={weekly.data}
              onClear={() => {
                setSelectedBounds(null);
                setModal(null);
              }}
              onReselect={() => {
                setModal(null);
                setSelectAreaMode(true);
              }}
            />
          </Modal>
        )}

        {showDisclaimer && (
          <Modal title="Active fires / hotspots" onClose={() => closeDisclaimer(false)}>
            <ul className="space-y-3 text-[15px]">
              <li className="flex gap-3">
                <WarnIcon className="h-5 w-5 shrink-0 text-fd-gold" />
                Not for protecting life or property on its own. Satellite hotspots have limited accuracy; always confirm in the field.
              </li>
              <li className="flex gap-3">
                <FlameIcon className="h-5 w-5 shrink-0 text-red-400" />
                A hotspot can be a fire, hot smoke, agricultural burning or another heat source.
              </li>
              <li className="flex gap-3">
                <CloudIcon className="h-5 w-5 shrink-0 text-white/80" />
                Clouds and satellite overpass times can hide or delay detections.
              </li>
              <li className="flex gap-3">
                <HelpIcon className="h-5 w-5 shrink-0 text-sky-300" />
                The cause of a detection (human, lightning, wildland) is not determined by this system.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => closeDisclaimer(true)}
              className="mt-5 w-full cursor-pointer rounded bg-fd-red py-2.5 text-lg font-bold text-white hover:bg-fd-red-dark"
            >
              OK, I understand
            </button>
          </Modal>
        )}
      </div>
    </div>
  );
}

function Section({ title, right, children }: { title: string; right?: string; children: ReactNode }) {
  return (
    <section className="border-b border-black/40">
      <h2 className="flex items-center justify-between bg-fd-bar px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-white">
        {title}
        {right && <span className="text-xs font-normal normal-case text-white/75">{right}</span>}
      </h2>
      {children}
    </section>
  );
}

function Tool({ label, icon, onClick, active, disabled }: { label: string; icon: ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        className={`flex h-14 w-[3.35rem] cursor-pointer flex-col sm:w-[4.5rem] items-center justify-center gap-0.5 text-[10px] font-semibold uppercase sm:text-[11px] disabled:cursor-not-allowed disabled:opacity-40 ${
          active ? "bg-white/15 text-fd-gold" : "text-white/85 hover:bg-white/10 hover:text-fd-gold"
        }`}
      >
        {icon}
        {label}
      </button>
    </li>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-[1200] flex items-center justify-center bg-black/55 p-3" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`flex max-h-full w-full flex-col overflow-hidden rounded border border-black bg-[#141416] shadow-2xl ${wide ? "max-w-4xl" : "max-w-lg"}`}>
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-b from-fd-red to-fd-red-dark px-4 py-2.5">
          <h2 className="text-xl font-semibold uppercase tracking-wide text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded p-1 text-white hover:bg-black/25">
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

/** Exporta la matriz mensual del calendario (2002–2026), medianas y factores k_m a CSV. */
function exportCalendarCsv(calendar: BurnCalendar, scaleVal: (year: number, v: number | null) => number | null, sourceTag: string) {
  const esc = (s: string | number) => {
    const str = String(s);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = ["year", "sensor_source", ...calendar.monthLabels, "total"].join(",");
  const yearLines = calendar.rows.map((r) => {
    const vals = r.months.map((v) => scaleVal(r.year, v));
    const total = vals.reduce<number>((acc, v) => acc + (v ?? 0), 0);
    return [r.year, esc(r.source), ...vals.map((v) => (v === null ? "" : v)), total].join(",");
  });
  const medianTotal = Math.round(calendar.monthlyMedians.reduce((a, b) => a + b, 0));
  const medianLine = ["Median", esc(sourceTag), ...calendar.monthlyMedians.map((v) => Math.round(v)), medianTotal].join(",");
  const kmLine = ["k_m", esc(sourceTag), ...calendar.kmFactors.map((k) => k.toFixed(2)), ""].join(",");
  const csv = [header, ...yearLines, medianLine, kmLine].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `burn_calendar_${sourceTag.replace(/\s+/g, "_").toLowerCase()}_in_calendar_1.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Calendario de quema armonizado + documentación y límites de harmonization/ (MODIS ↔ VIIRS). */
function CalendarHeatmap({
  calendar,
  selectedMonth,
  onSelectMonth,
}: {
  calendar: BurnCalendar | null;
  selectedMonth?: string;
  onSelectMonth?: (ym: string) => void;
}) {
  const [showCounts, setShowCounts] = useState(false);
  const m = HARMONIZATION_META;
  // El calendario de la API ya es la serie armonizada (in_calendar = 1): no hay otra fuente que elegir.
  const activeCalendar = calendar;
  const place = !calendar || calendar.region === "*" ? "Mexico" : calendar.region;

  const rows = activeCalendar ? [...activeCalendar.rows].reverse() : [];
  const values = rows.flatMap((r) => r.months).filter((v): v is number => v !== null);
  const max = Math.max(1, ...values);
  const shade = (v: number | null) => (v === null ? "transparent" : `rgba(245, 120, 30, ${(0.08 + 0.92 * (v / max)).toFixed(2)})`);

  return (
    <div className="space-y-4">
      {activeCalendar ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-white/80">
              Monthly fire detections in {place}, {rows[rows.length - 1]?.year}–{rows[0]?.year}. Darker = more activity.
              {onSelectMonth && <span className="ml-1.5 text-xs text-fd-gold/90">Click any cell to load that month on the map.</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/85">
                <input
                  type="checkbox"
                  checked={showCounts}
                  onChange={(e) => setShowCounts(e.target.checked)}
                  className="accent-[#f5c518]"
                />
                Show counts
              </label>
            </div>
          </div>

          <p className="rounded bg-emerald-500/15 px-2.5 py-1.5 text-sm text-emerald-200">
            Source: real NASA FIRMS detections — MODIS Aqua until 2012-01-20, then VIIRS S-NPP 1.4 km cells at or above each
            state&apos;s fitted FRP threshold (<code>in_calendar = 1</code>).
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[610px] border-separate border-spacing-0.5 text-center text-xs tabular-nums">
              <thead>
                <tr>
                  <th className="w-14" />
                  {activeCalendar.monthLabels.map((lbl) => (
                    <th key={lbl} scope="col" className="font-semibold text-white/80">{lbl}</th>
                  ))}
                  <th scope="col" className="pl-2 text-right font-semibold text-white/80">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const rowTotal = r.months.reduce<number>((acc, v) => acc + (v ?? 0), 0);
                  const cellHeight = showCounts ? "h-5" : "h-4";
                  return (
                    <tr key={r.year}>
                      <th scope="row" className="pr-1 text-right font-semibold text-white/80" title={r.source}>{r.year}</th>
                      {r.months.map((v, i) => {
                        const ym = `${r.year}-${String(i + 1).padStart(2, "0")}`;
                        const isSelected = selectedMonth === ym;
                        const label = v === null ? "no data" : `${activeCalendar.monthLabels[i]} ${r.year}: ${v}`;
                        const countText = showCounts && v !== null ? v : null;
                        return (
                          <td key={i} className={`${cellHeight} p-0`} style={{ backgroundColor: shade(v) }} title={label}>
                            {v !== null && onSelectMonth ? (
                              <button
                                type="button"
                                onClick={() => onSelectMonth(ym)}
                                aria-label={`Load ${label} on map`}
                                className={`flex ${cellHeight} w-full cursor-pointer items-center justify-center text-[10px] font-medium leading-none text-white/95 transition hover:ring-1 hover:ring-white/85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#f5c518] ${
                                  isSelected ? "ring-1 ring-[#f5c518]" : ""
                                }`}
                              >
                                {countText}
                              </button>
                            ) : (
                              countText !== null && (
                                <span className="flex h-full items-center justify-center text-[10px] font-medium leading-none text-white/95">
                                  {countText}
                                </span>
                              )
                            )}
                          </td>
                        );
                      })}
                      <td className="pl-2 text-right font-semibold text-white/85">{rowTotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
                <tr>
                  <th scope="row" className="pr-1 pt-1 text-right font-semibold text-sky-300">Median</th>
                  {activeCalendar.monthlyMedians.map((v, i) => (
                    <td key={i} className="pt-1 text-sky-300">{Math.round(v)}</td>
                  ))}
                  <td className="pl-2 pt-1 text-right font-semibold text-sky-300">
                    {Math.round(activeCalendar.monthlyMedians.reduce((a, b) => a + b, 0)).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="pr-1 text-right font-semibold text-fd-gold">kₘ</th>
                  {activeCalendar.kmFactors.map((k, i) => {
                    const ci = activeCalendar.kmCi95?.[i];
                    return (
                      <td key={i} className="text-fd-gold" title={ci ? `95% CI ${ci[0]}–${ci[1]}` : undefined}>
                        {k.toFixed(2)}
                      </td>
                    );
                  })}
                  <td className="pl-2 text-right text-white/40">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/65">
            <div className="flex items-center gap-2">
              <span>0</span>
              <span
                className="inline-block h-2.5 w-32 rounded-sm border border-white/15"
                style={{ background: "linear-gradient(90deg, rgba(245, 120, 30, 0.08), rgba(245, 120, 30, 1))" }}
                aria-hidden="true"
              />
              <span>{max.toLocaleString()} detections/mo</span>
            </div>
            <button
              type="button"
              onClick={() => exportCalendarCsv(activeCalendar, (_year, v) => v, activeCalendar.region === "*" ? "mexico" : activeCalendar.region)}
              className="cursor-pointer rounded border border-white/20 bg-white/5 px-2.5 py-1 font-semibold text-white/85 transition hover:border-fd-gold/50 hover:text-fd-gold"
            >
              Export CSV
            </button>
          </div>
        </>
      ) : (
        <p className="rounded bg-white/5 px-3 py-2 text-sm text-white/75">
          The monthly calendar is unavailable right now (the server did not respond). Below: the harmonization method summary.
        </p>
      )}

      {/* Resumen técnico extraído de harmonization/ */}
      <div className="space-y-3 border-t border-white/15 pt-3 text-xs text-white/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-fd-gold">
            Detection-level Harmonization (MODIS C6.1 ↔ VIIRS S-NPP · <code>in_calendar = 1</code>)
          </h3>
          <span className="font-mono text-[11px] text-white/60">
            N. Chihuahua ({m.bounds.south}°–{m.bounds.north}° N, {m.bounds.west}° to {m.bounds.east}° E) · {m.dateRange.start} → {m.dateRange.snppEnd}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-white/10 bg-white/5 p-2.5">
            <p className="text-[10px] uppercase text-white/55">Consistent series (in_calendar = 1)</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{m.inCalendarRows.toLocaleString()} rows</p>
            <p className="text-[11px] text-white/65">
              Aqua {m.aquaInCalendarRows.toLocaleString()} + S-NPP {m.snppInCalendarRows.toLocaleString()} (of {m.totalRows.toLocaleString()} total)
            </p>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-2.5">
            <p className="text-[10px] uppercase text-white/55">13:30 overpass & 15 MW cell rule</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-white">≥ {m.frpThresholdMw} MW / {m.cellSizeKm} km</p>
            <p className="text-[11px] text-white/65">
              Aqua before {m.dateRange.seam}; strongest pixel per {m.cellSizeKm} km × {m.cellTimeWindowMin} min S-NPP cell
            </p>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-2.5">
            <p className="text-[10px] uppercase text-white/55">Monthly count validation</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-300">
              r = {m.validation.harmonizedCorrelation} · {m.validation.harmonizedRatioToAqua}×
            </p>
            <p className="text-[11px] text-white/65">
              Raw S-NPP/Aqua was {m.validation.rawRatioToAqua}×; held-out 2020–2026 r = {m.validation.heldOutCorrelation}
            </p>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-2.5">
            <p className="text-[10px] uppercase text-white/55">Brightness quantile mapping</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-sky-300">
              {m.validation.brightnessDayGapBeforeK} K → {m.validation.brightnessDayGapAfterK} K
            </p>
            <p className="text-[11px] text-white/65">
              {m.matchedPairsTotal.toLocaleString()} Aqua↔S-NPP pairs (≤15 min) · capped at {m.brightnessCapK} K
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded border border-white/10 bg-black/25 p-3">
            <p className="font-semibold text-white">P(Aqua detects | summed VIIRS FRP in 1.4 km cell)</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5 text-center tabular-nums">
              {m.validation.aquaDetectionProbByFrp.map((b) => (
                <div key={b.bin} className="rounded bg-white/5 px-2 py-1.5">
                  <span className="block text-[10px] text-white/60">{b.bin}</span>
                  <strong className="text-sm text-fd-gold">{b.probPct}%</strong>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-white/70">
              The 50% detection efficiency point is ≈ <strong>15 MW</strong>. Era S-NPP/Aqua ratios:{" "}
              {m.validation.eraRatios.map((e) => `${e.era}: ${e.ratio}×`).join(" · ")}.
            </p>
            <p className="mt-1 text-[11px] text-white/65">
              <strong>Planck radiance &amp; quantile physics:</strong> Upscaling VIIRS ({m.mirWavelengthViirsUm} µm) to the Aqua-MODIS footprint ({m.mirWavelengthModisUm} µm) raises brightness correlation from {m.planckUpscaleCorrBefore} → {m.planckUpscaleCorrAfter}; empirical quantile mapping reaches daytime MAE {m.validation.brightnessDayMaeAfterK} K (KS {m.validation.brightnessDayKsBefore} → {m.validation.brightnessDayKsAfter}) and nighttime MAE {m.validation.brightnessNightMaeAfterK} K (KS {m.validation.brightnessNightKsBefore} → {m.validation.brightnessNightKsAfter}).
            </p>
          </div>

          <div className="rounded border border-amber-400/30 bg-amber-500/10 p-3">
            <p className="font-semibold text-fd-gold">Methodological limits (required for interpretation)</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] leading-snug text-white/85">
              <li>
                <strong>MODIS-equivalent counts:</strong> <code>in_calendar = 1</code> excludes small VIIRS fires (&lt;15 MW cell). Do not use this series for early warning of small ignitions.
              </li>
              <li>
                <strong>≈10% post-2012 offset:</strong> S-NPP reads ~10% above Aqua; use the <code>÷1.1</code> toggle above when comparing 2012+ against pre-2012 history.
              </li>
              <li>
                <strong>Use FRP (MW) for intensity:</strong> Mapped MODIS brightness is capped at {m.brightnessCapK} K ({m.modisAtCapPct}% of MODIS rows sit at cap; {m.modisBrightT31UncappedRows} rows with <code>bright_t31 = {m.modisBrightT31UncappedK} K</code> remain uncapped).
              </li>
              <li>
                <strong>2011 fire anomaly:</strong> 2011 recorded <strong>{m.anomaly2011Hotspots.toLocaleString()}</strong> hotspots (vs ≈{m.pre2011AnnualMean.toLocaleString()}/yr before), verified in both Terra and Aqua and peaking in Apr–Jun.
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded border border-white/10 bg-black/25 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-white">
              Platform Attributes &amp; Area-Normalized FRP Density (<code>harmonized_hotspots.csv</code> · 16 cols)
            </p>
            <span className="text-[11px] text-white/60">
              Mean footprint (scan × track): MODIS <strong>{m.meanPixelAreaKm2.modis} km²</strong> vs S-NPP <strong>{m.meanPixelAreaKm2.snpp} km²</strong> · Median FRP/area: MODIS <strong>{m.medianFrpPerPixelKm2.modis}</strong> vs S-NPP <strong>{m.medianFrpPerPixelKm2.snpp} MW/km²</strong>
            </span>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-[11px] tabular-nums">
              <thead>
                <tr className="border-b border-white/10 text-white/60">
                  <th className="py-1 pr-2">Platform</th>
                  <th className="py-1 pr-2">Sensor</th>
                  <th className="py-1 pr-2">Local pass (D / N)</th>
                  <th className="py-1 pr-2 text-right">Rows</th>
                  <th className="py-1 pr-2 text-right">Med Bright (K)</th>
                  <th className="py-1 pr-2 text-right">Med T31 (K)</th>
                  <th className="py-1 pr-2 text-right">Med ΔT (K)</th>
                  <th className="py-1 text-right">Med FRP (MW)</th>
                </tr>
              </thead>
              <tbody>
                {m.platformStats.map((p) => (
                  <tr key={p.platform} className="border-b border-white/5">
                    <td className="py-1 pr-2 font-semibold text-white">{p.platform}</td>
                    <td className="py-1 pr-2 text-white/75">{p.sensor}</td>
                    <td className="py-1 pr-2 text-white/75">{p.dayPass} / {p.nightPass}</td>
                    <td className="py-1 pr-2 text-right">{p.rows.toLocaleString()}</td>
                    <td className="py-1 pr-2 text-right text-sky-300">{p.medBrightK.toFixed(1)}</td>
                    <td className="py-1 pr-2 text-right">{p.medT31K.toFixed(1)}</td>
                    <td className="py-1 pr-2 text-right text-amber-300">+{p.medDtK.toFixed(1)}</td>
                    <td className="py-1 text-right font-semibold text-fd-gold">{p.medFrpMw.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-white/60">
            Unified confidence classes across all {m.totalRows.toLocaleString()} rows: <code>l</code> = {m.confidenceCounts.low.toLocaleString()}, <code>n</code> = {m.confidenceCounts.nominal.toLocaleString()}, <code>h</code> = {m.confidenceCounts.high.toLocaleString()}.
          </p>
        </div>

        <details className="rounded border border-white/10 bg-black/25 p-2.5">
          <summary className="cursor-pointer font-semibold text-white hover:text-fd-gold">
            View held-out 2020–2026 brightness quantile mapping validation plot
          </summary>
          <div className="mt-2 overflow-hidden rounded bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/images/harmonized_hotspots_brightness_mapping.png")}
              alt="Held-out 2020-2026 MODIS to Suomi-NPP brightness quantile mapping curves for day and night"
              className="h-auto w-full"
            />
          </div>
        </details>
      </div>
    </div>
  );
}

function layerHint(status: string, ready: string) {
  return status === "loading" ? "Loading…" : status === "error" ? "Unavailable right now" : ready;
}

function LayerCheck({
  checked,
  onChange,
  label,
  hint,
  swatch,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
  swatch: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="py-1">
      <label className="flex cursor-pointer items-start gap-2">
        <input type="checkbox" checked={checked} onChange={onChange} className="mt-1 accent-[#f5c518]" />
        <span className="mt-1 flex w-4 shrink-0 justify-center" aria-hidden="true">{swatch}</span>
        <span className="leading-tight">
          {label}
          <span className="block text-xs text-white/55">{hint}</span>
        </span>
      </label>
      {checked && children && <div className="pl-12">{children}</div>}
    </div>
  );
}

/** Leyenda de las capas activas, sobre el mapa (abajo a la izquierda). */
function MapLegend({
  condition,
  fire,
  historyMonth,
  satellite,
  forecast,
  weeklyForecast,
}: {
  condition: ConditionDef | null;
  fire: FireLayers;
  historyMonth: string;
  satellite: SatelliteLayer | null;
  forecast: ModelForecast | null;
  weeklyForecast: WeeklyForecast | null;
}) {
  const rows: ReactNode[] = [];
  const sat = SATELLITE_LAYERS.find((s) => s.id === satellite);
  if (sat)
    rows.push(
      <div key="sat">
        <p className="font-semibold">{sat.label}</p>
        <SatLegendView legend={sat.legend} />
      </div>
    );
  if (fire.probability) {
    rows.push(
      <div key="prob">
        <p className="font-semibold">{forecast ? "Fire probability, next 72 h" : "Fire danger (weather index)"}</p>
        {forecast ? (
          <ul className="mt-0.5 space-y-0.5">
            {forecast.levels.map((l) => (
              <li key={l.level} className="flex items-center gap-1.5">
                <span className="h-2.5 w-4" style={{ backgroundColor: RISK_SCALE[l.level - 1].bg }} />
                {l.name}
                <span className="ml-auto text-white/60">≥ {(l.minProbability * 100).toFixed(l.minProbability < 0.1 ? 1 : 0)}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-0.5 flex gap-px">
            {RISK_SCALE.map((r) => (
              <span key={r.level} className="h-2.5 flex-1" style={{ backgroundColor: r.bg }} title={r.level} />
            ))}
          </div>
        )}
        {forecast && (
          <p className="mt-1 text-[11px] leading-snug text-white/70">
            Data as of: fires {forecast.dataAsOf.fires}, weather {forecast.dataAsOf.weather}. Hover a cell to see why.
          </p>
        )}
      </div>
    );
  }
  if (fire.weekly) {
    rows.push(
      <div key="weekly">
        <p className="font-semibold">Weekly risk, 7 days (0.1° · LightGBM)</p>
        <ul className="mt-0.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
          <li className="flex items-center gap-1"><span className="h-2.5 w-3 bg-[#dc2626]" /> ≥ 5.0%</li>
          <li className="flex items-center gap-1"><span className="h-2.5 w-3 bg-[#f97316]" /> 2.0–5.0%</li>
          <li className="flex items-center gap-1"><span className="h-2.5 w-3 bg-[#facc15]" /> 0.7–2.0%</li>
          <li className="flex items-center gap-1"><span className="h-2.5 w-3 bg-[#16a34a]" /> 0.15–0.7%</li>
        </ul>
        {weeklyForecast && (
          <p className="mt-0.5 text-[10px] text-white/65">
            Week {weeklyForecast.weekStart} · PR-AUC {weeklyForecast.prAuc}
          </p>
        )}
      </div>
    );
  }
  if (condition) {
    const lg = condition.legend;
    rows.push(
      <div key="cond">
        <p className="font-semibold">{condition.label}</p>
        {"stops" in lg ? (
          <>
            <span className="mt-0.5 block h-2.5" style={{ background: `linear-gradient(to right, ${lg.stops.join(",")})` }} />
            <p className="flex justify-between text-[11px] text-white/70"><span>{lg.min}</span><span>{lg.max}</span></p>
          </>
        ) : (
          <ul className="mt-0.5 flex flex-wrap gap-x-2 text-[11px]">
            {lg.items.map((i) => (
              <li key={i.label} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5" style={{ backgroundColor: i.color }} />
                {i.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  const points: [boolean, string, string][] = [
    [fire.nasa, "NASA active fire (48 h) · faded = low confidence", "h-2.5 w-2.5 rounded-full border-2 border-[#ffe066] bg-[#ff2a00]"],
    [
      fire.history,
      `Historical · ${monthLabel(historyMonth)} · sized by FRP (≥15 MW = MODIS-eq)`,
      "h-2.5 w-2.5 rounded-full bg-[#ff9f1c]",
    ],
  ];
  const active = points.filter(([on]) => on);
  if (active.length) {
    rows.push(
      <ul key="pts" className="space-y-0.5">
        {active.map(([, label, cls]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className={cls} />
            {label}
          </li>
        ))}
      </ul>
    );
  }
  if (fire.cause) {
    rows.push(
      <ul key="cause" className="flex flex-wrap gap-x-2">
        <li className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ORIGIN_COLORS.Undetermined.hex }} />
          Recent detection (cause not determined)
        </li>
      </ul>
    );
  }
  if (!rows.length) return null;
  return (
    <div
      className={`absolute bottom-[5.5rem] left-2 z-[999] max-h-[45vh] space-y-2 overflow-y-auto rounded border border-black/50 bg-fd-panel/90 px-2.5 py-2 text-xs shadow-lg md:bottom-[5.75rem] md:max-h-[60vh] ${
        sat ? "w-64" : "w-56"
      }`}
    >
      {rows}
    </div>
  );
}

/** Simbología completa de una capa satelital (leyenda del mapa). */
function SatLegendView({ legend }: { legend: SatLegend }) {
  if (legend.kind === "gradient") {
    return (
      <div className="mt-1">
        <span className="block h-3" style={{ background: `linear-gradient(to right, ${legend.stops.join(",")})` }} />
        <div className="relative mt-0.5 h-3.5 text-[10px] text-white/80">
          {legend.ticks.map((tk) => (
            <span
              key={tk.label}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${Math.min(92, Math.max(8, tk.at * 100))}%` }}
            >
              {tk.label}
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-white/70">{legend.caption}</p>
      </div>
    );
  }
  return (
    <div className="mt-1">
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {legend.items.map((i) => (
          <li key={i.label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 shrink-0 border border-white/30" style={{ backgroundColor: i.color }} />
            <span className="leading-tight">{i.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] leading-snug text-white/70">{legend.caption}</p>
    </div>
  );
}

/** Vista previa compacta de la simbología (panel de capas). */
function SatLegendPreview({ legend }: { legend: SatLegend }) {
  if (legend.kind === "gradient") {
    const first = legend.ticks[0]?.label;
    const last = legend.ticks[legend.ticks.length - 1]?.label;
    return (
      <span className="mt-1 flex items-center gap-1.5 text-[10px] text-white/60">
        {first}
        <span className="h-2 flex-1" style={{ background: `linear-gradient(to right, ${legend.stops.join(",")})` }} />
        {last}
      </span>
    );
  }
  return (
    <span className="mt-1 flex flex-wrap gap-0.5" aria-hidden="true">
      {legend.items.map((i) => (
        <span key={i.label} title={i.label} className="h-2 w-4 border border-white/20" style={{ backgroundColor: i.color }} />
      ))}
    </span>
  );
}

/** Resumen de datos extraídos dentro del rectángulo capturado en el mapa. */
function AreaSummary({
  bounds,
  events,
  stations,
  nasaFires,
  historyFires,
  historyMonth,
  forecast,
  weeklyForecast,
  onClear,
  onReselect,
}: {
  bounds: AreaBounds;
  events: HotspotEvent[];
  stations: Station[];
  nasaFires: NasaFire[] | null;
  historyFires: NasaFire[] | null;
  historyMonth: string;
  forecast: ModelForecast | null;
  weeklyForecast: WeeklyForecast | null;
  onClear: () => void;
  onReselect: () => void;
}) {
  const [boxStartDate, setBoxStartDate] = useState("2020-01-01");
  const [boxEndDate, setBoxEndDate] = useState("2026-07-31");
  const archive = useHarmonizedArchive(true);

  const inBounds = (lat: number, lon: number) =>
    lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east;

  const archiveBoxFires = archive.data
    ? Object.entries(archive.data)
        .filter(([ym]) => ym >= boxStartDate.slice(0, 7) && ym <= boxEndDate.slice(0, 7))
        .flatMap(([, rows]) =>
          rows.filter((f) => f.date >= boxStartDate && f.date <= boxEndDate && inBounds(f.lat, f.lon))
        )
    : null;
  const archiveAvgBright =
    archiveBoxFires && archiveBoxFires.length > 0
      ? (
          archiveBoxFires.reduce((s, f) => s + (f.brightnessK ?? 0), 0) / archiveBoxFires.length
        ).toFixed(1)
      : null;
  const archiveAvgFrpDensity =
    archiveBoxFires && archiveBoxFires.length > 0
      ? (
          archiveBoxFires.reduce(
            (s, f) => s + (f.pixelAreaKm2 && f.pixelAreaKm2 > 0 ? f.frpMw / f.pixelAreaKm2 : 0),
            0
          ) / archiveBoxFires.length
        ).toFixed(1)
      : null;

  const areaEvents = events.filter((e) => inBounds(e.lat, e.lon));
  const areaStations = stations.filter((s) => inBounds(s.lat, s.lon));
  const areaNasa = nasaFires ? nasaFires.filter((f) => inBounds(f.lat, f.lon)) : null;
  const areaHistory = historyFires ? historyFires.filter((f) => inBounds(f.lat, f.lon)) : null;
  const areaHistoryInCal = areaHistory
    ? areaHistory.filter(
        (f) =>
          f.inCalendar === true
      )
    : null;
  const areaCells = forecast ? forecast.cells.filter((c) => inBounds(c.lat, c.lon)) : null;
  const areaWeeklyCells = weeklyForecast ? weeklyForecast.cells.filter((c) => inBounds(c.lat, c.lon)) : null;
  const maxWeeklyProb =
    areaWeeklyCells && areaWeeklyCells.length > 0
      ? Math.max(...areaWeeklyCells.map((c) => c.probability))
      : null;

  const midLatRad = (((bounds.north + bounds.south) / 2) * Math.PI) / 180;
  const heightKm = Math.abs(bounds.north - bounds.south) * 111.32;
  const widthKm = Math.abs(bounds.east - bounds.west) * 111.32 * Math.cos(midLatRad);
  const areaKm2 = Math.round(heightKm * widthKm);

  const maxFrp = areaEvents.length > 0 ? Math.max(...areaEvents.map((e) => e.frpMw)) : 0;
  const maxRiskLevel =
    areaCells && areaCells.length > 0
      ? Math.max(...areaCells.map((c) => c.level))
      : areaStations.length > 0
        ? Math.max(...areaStations.map((s) => s.riskLevel))
        : null;
  const maxRisk = maxRiskLevel !== null ? riskFor(maxRiskLevel) : null;

  const avgTemp =
    areaStations.length > 0
      ? (areaStations.reduce((s, st) => s + st.temperatureC, 0) / areaStations.length).toFixed(1)
      : null;
  const avgHumidity =
    areaStations.length > 0
      ? Math.round(areaStations.reduce((s, st) => s + st.humidityPct, 0) / areaStations.length)
      : null;
  const totalStrikes = areaStations.reduce((s, st) => s + st.lightningStrikes, 0);

  return (
    <div className="space-y-4 text-sm text-white/85">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-black/25 px-3 py-2 text-xs tabular-nums">
        <span>
          Bounds: <strong>{bounds.south.toFixed(3)}°</strong> to <strong>{bounds.north.toFixed(3)}° N</strong>,{" "}
          <strong>{bounds.west.toFixed(3)}°</strong> to <strong>{bounds.east.toFixed(3)}° E</strong>
        </span>
        <span className="font-semibold text-fd-gold">≈ {areaKm2.toLocaleString()} km²</span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase text-white/60">Active hotspots</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{areaEvents.length}</p>
          <p className="mt-0.5 text-xs text-white/65">
            {areaEvents.length > 0 ? `Max FRP ${maxFrp} MW · cause not determined` : "None in selected area"}
          </p>
        </div>

        <div className="rounded border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase text-white/60">NASA FIRMS (48 h)</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{areaNasa ? areaNasa.length : "—"}</p>
          <p className="mt-0.5 text-xs text-white/65">
            {areaNasa ? "VIIRS detections in box" : "Enable NASA layer to count"}
          </p>
        </div>

        <div className="rounded border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase text-white/60">Field stations</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">{areaStations.length}</p>
          <p className="mt-0.5 text-xs text-white/65">
            {avgTemp !== null ? `${avgTemp} °C · ${avgHumidity}% RH · ${totalStrikes} strikes` : "No stations inside box"}
          </p>
        </div>

        <div className="rounded border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase text-white/60">Peak danger / History</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {maxRisk ? (
              <span className="rounded px-2 py-0.5 text-sm font-bold uppercase" style={{ backgroundColor: maxRisk.bg, color: maxRisk.fg }}>
                {maxRisk.level}
              </span>
            ) : (
              "—"
            )}
          </p>
          <p className="mt-0.5 text-xs text-white/65">
            {areaHistory !== null && areaHistoryInCal !== null
              ? `${areaHistoryInCal.length} in_calendar=1 / ${areaHistory.length} total`
              : maxWeeklyProb !== null && areaWeeklyCells !== null
                ? `7-day max ${(maxWeeklyProb * 100).toFixed(1)}% (${areaWeeklyCells.length} 0.1° cells)`
                : "Enable History for harmonized count"}
          </p>
        </div>
      </div>

      {/* Recorte del archivo armonizado 2002-2026 (harmonized_hotspots.csv) por área + rango de fechas */}
      <div className="rounded border border-sky-400/30 bg-sky-500/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
              Harmonized Archive Box Query (<code>harmonized_hotspots.csv</code> · <code>in_calendar = 1</code>)
            </p>
            <p className="text-[11px] text-white/70">
              Filter the 55,902 consistent series rows (2002-07-04 → 2026-07-31) inside this bounding box by date range:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <input
              type="date"
              value={boxStartDate}
              min="2002-07-04"
              max="2026-07-31"
              onChange={(e) => setBoxStartDate(e.target.value)}
              aria-label="Start date"
              className="rounded border border-white/20 bg-[#141416] px-2 py-1 text-xs text-white"
            />
            <span className="text-white/60">to</span>
            <input
              type="date"
              value={boxEndDate}
              min="2002-07-04"
              max="2026-07-31"
              onChange={(e) => setBoxEndDate(e.target.value)}
              aria-label="End date"
              className="rounded border border-white/20 bg-[#141416] px-2 py-1 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => {
                setBoxStartDate("2002-07-04");
                setBoxEndDate("2026-07-31");
              }}
              className="cursor-pointer rounded border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
            >
              Full 2002–2026
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs">
          <div className="flex flex-wrap gap-4 tabular-nums">
            <span>
              Matches: <strong className="text-white">{archiveBoxFires ? archiveBoxFires.length.toLocaleString() : "Loading…"}</strong> rows
            </span>
            {archiveAvgBright && (
              <span>
                Mean brightness: <strong className="text-sky-300">{archiveAvgBright} K</strong>
              </span>
            )}
            {archiveAvgFrpDensity && (
              <span>
                Mean FRP/pixel: <strong className="text-fd-gold">{archiveAvgFrpDensity} MW/km²</strong>
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={!archiveBoxFires || archiveBoxFires.length === 0}
            onClick={() =>
              archiveBoxFires &&
              downloadHistoricalCsv(archiveBoxFires, `${boxStartDate}_to_${boxEndDate}`)
            }
            className="cursor-pointer rounded bg-sky-400 px-3 py-1 text-xs font-bold text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download selection.csv ({archiveBoxFires ? archiveBoxFires.length.toLocaleString() : 0})
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white"
        >
          Clear selection
        </button>
        <button
          type="button"
          onClick={onReselect}
          className="cursor-pointer rounded border border-fd-gold/40 bg-fd-gold/15 px-3 py-1.5 text-xs font-semibold text-fd-gold hover:bg-fd-gold/25"
        >
          Select another area
        </button>
        {areaHistory && areaHistory.length > 0 && (
          <button
            type="button"
            onClick={() => downloadHistoricalCsv(areaHistory, historyMonth)}
            className="cursor-pointer rounded border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
          >
            Download history CSV ({areaHistory.length} · in_calendar)
          </button>
        )}
        <button
          type="button"
          disabled={areaEvents.length === 0}
          onClick={() => downloadHotspotsCsv(areaEvents)}
          className="cursor-pointer rounded bg-fd-gold px-3.5 py-1.5 text-xs font-bold text-black hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Download area CSV ({areaEvents.length})
        </button>
      </div>
    </div>
  );
}

/** Modal del modelo semanal LightGBM (7, 14 y 28 días a 0.1° sobre in_calendar = 1). */
function WeeklyRiskModal({
  weekly,
  onLocateCell,
}: {
  weekly: WeeklyForecast | null;
  onLocateCell: (lat: number, lon: number) => void;
}) {
  if (!weekly) {
    return <p className="text-sm text-white/75">Loading weekly LightGBM forecast…</p>;
  }
  return (
    <div className="space-y-4 text-xs text-white/85">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-white/10 bg-white/5 p-2.5">
          <p className="text-[10px] uppercase text-white/55">Forecast week (7 d)</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{weekly.weekStart}</p>
          <p className="text-[11px] text-white/65">{weekly.cells.length.toLocaleString()} active 0.1° (~11 km) cells</p>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-2.5">
          <p className="text-[10px] uppercase text-white/55">Held-out PR-AUC (2023–26)</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-300">{weekly.prAuc}</p>
          <p className="text-[11px] text-white/65">ROC-AUC {weekly.rocAuc} · base rate {(weekly.baseRate * 100).toFixed(2)}%</p>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-2.5">
          <p className="text-[10px] uppercase text-white/55">Top-5% cells capture</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-fd-gold">{(weekly.topCapture * 100).toFixed(1)}%</p>
          <p className="text-[11px] text-white/65">Beats climatology in all 18 backtest years (2009–2026)</p>
        </div>
        <div className="rounded border border-white/10 bg-white/5 p-2.5">
          <p className="text-[10px] uppercase text-white/55">Training source</p>
          <p className="mt-0.5 text-lg font-bold text-sky-300">FIRMS only</p>
          <p className="text-[11px] text-white/65">22 spatiotemporal features from in_calendar = 1</p>
        </div>
      </div>

      {weekly.horizons.length > 0 && (
        <div className="rounded border border-white/10 bg-black/25 p-3">
          <p className="font-semibold text-white">Multi-horizon test results (2023-01 → 2026-07)</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-[11px] tabular-nums">
              <thead>
                <tr className="border-b border-white/10 text-white/60">
                  <th className="py-1 pr-2">Horizon</th>
                  <th className="py-1 pr-2 text-right">LightGBM PR-AUC</th>
                  <th className="py-1 pr-2 text-right">Climatology (B1)</th>
                  <th className="py-1 pr-2 text-right">Persistence (B2)</th>
                  <th className="py-1 pr-2 text-right">Brier</th>
                  <th className="py-1 text-right">Top-5% capture</th>
                </tr>
              </thead>
              <tbody>
                {weekly.horizons.map((h) => (
                  <tr key={h.horizonDays} className="border-b border-white/5">
                    <td className="py-1 pr-2 font-semibold text-white">{h.horizonDays} days</td>
                    <td className="py-1 pr-2 text-right font-semibold text-emerald-300">{h.lgbmPrAuc.toFixed(3)}</td>
                    <td className="py-1 pr-2 text-right">{h.b1PrAuc.toFixed(3)}</td>
                    <td className="py-1 pr-2 text-right">{h.b2PrAuc.toFixed(3)}</td>
                    <td className="py-1 pr-2 text-right">{h.lgbmBrier.toFixed(5)}</td>
                    <td className="py-1 text-right font-semibold text-fd-gold">
                      {(h.lgbmTopCapture * 100).toFixed(1)}% <span className="text-white/50">(vs {(h.b1TopCapture * 100).toFixed(1)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded border border-white/10 bg-black/25 p-3">
          <p className="font-semibold text-white">Top-25 highest-risk 0.1° cells (click to locate on map)</p>
          <div className="mt-2 max-h-60 overflow-y-auto">
            <table className="w-full text-left text-[11px] tabular-nums">
              <thead className="sticky top-0 bg-[#141416]">
                <tr className="border-b border-white/10 text-white/60">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Cell</th>
                  <th className="py-1 pr-2">Lat / Lon</th>
                  <th className="py-1 pr-2 text-right">7d Prob</th>
                  <th className="py-1 text-right">vs Clim</th>
                </tr>
              </thead>
              <tbody>
                {weekly.top25.map((c, idx) => (
                  <tr
                    key={c.cellId}
                    onClick={() => onLocateCell(c.lat, c.lon)}
                    className="cursor-pointer border-b border-white/5 hover:bg-white/10"
                  >
                    <td className="py-1 pr-2 text-white/55">{idx + 1}</td>
                    <td className="py-1 pr-2 font-mono text-sky-300">#{c.cellId}</td>
                    <td className="py-1 pr-2">{c.lat.toFixed(2)}°, {c.lon.toFixed(2)}°</td>
                    <td className="py-1 pr-2 text-right font-semibold text-fd-gold">{(c.probability * 100).toFixed(2)}%</td>
                    <td className="py-1 text-right">{c.ratioVsClimatology.toFixed(2)}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded border border-amber-400/30 bg-amber-500/10 p-3">
            <p className="font-semibold text-fd-gold">Model limits &amp; calibration notes</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] leading-snug text-white/85">
              <li><strong>No weather or NDVI:</strong> Uses FIRMS hotspot history only; unusually dry or wet anomalies are not anticipated (use the 72 h model for weather).</li>
              <li><strong>~18% over-prediction (2023–26):</strong> Predicted 3,318 vs 2,780 observed cell-weeks at 7 days.</li>
              <li><strong>Latest week:</strong> Series ends 2026-07-31, so the forecast covers the week starting {weekly.weekStart}.</li>
            </ul>
          </div>
          <details className="rounded border border-white/10 bg-black/25 p-2.5">
            <summary className="cursor-pointer font-semibold text-white hover:text-fd-gold">
              View 7-day backtest &amp; calibration summary plot
            </summary>
            <div className="mt-2 overflow-hidden rounded bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset("/images/weekly_risk_h7_summary.png")}
                alt="Weekly 7-day LightGBM fire-risk model validation summary"
                className="h-auto w-full"
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

/** Abre una vista limpia lista para imprimir con los focos históricos de la fecha o mes seleccionado. */
function printHistoricalReport(fires: NasaFire[], label: string): void {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const maxFrp = fires.length > 0 ? Math.max(...fires.map((f) => f.frpMw)).toFixed(1) : "0";
  const avgFrp = fires.length > 0 ? (fires.reduce((s, f) => s + f.frpMw, 0) / fires.length).toFixed(1) : "0";
  const inCalCount = fires.filter((f) => f.inCalendar).length;
  const rowsHtml = fires
    .slice(0, 500)
    .map(
      (f) =>
        `<tr><td>${f.date}</td><td>${f.lat.toFixed(4)}</td><td>${f.lon.toFixed(4)}</td><td>${f.frpMw}</td><td>${f.brightnessK ?? "—"}</td><td>${f.brightT31K ?? "—"}</td><td>${f.satellite || "—"}</td><td>${f.confidence}</td><td>${f.inCalendar ? "1" : "0"}</td></tr>`
    )
    .join("");
  win.document.write(`<!doctype html><html><head><title>FuegoData · ${label}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:18px;margin:0 0 6px}p{margin:0 0 14px;font-size:13px;color:#444}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f4f4f5}</style>
    </head><body>
    <h1>FuegoData · Harmonized Fire Detections (${label})</h1>
    <p>Total rows: <b>${fires.length}</b> · in_calendar = 1: <b>${inCalCount}</b> · Mean FRP: <b>${avgFrp} MW</b> · Max FRP: <b>${maxFrp} MW</b>${fires.length > 500 ? " (showing first 500 rows)" : ""}</p>
    <table><thead><tr><th>Date</th><th>Lat</th><th>Lon</th><th>FRP (MW)</th><th>Bright (K)</th><th>T31 (K)</th><th>Satellite</th><th>Conf</th><th>in_calendar</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
