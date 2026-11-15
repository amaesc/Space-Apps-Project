"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import {
  directionsUrl,
  HARMONIZATION_META,
  type HotspotEvent,
  minutesSince,
  type NasaFire,
  ORIGIN_COLORS,
  type Station,
  type WeatherCell,
} from "../lib/fire-data";
import type { ModelForecast, WeeklyForecast } from "../lib/api";
import { RISK_SCALE } from "../lib/fire-data";
import { type ConditionDef, gibsTileUrl, probabilityColor, type SatelliteLayer } from "../lib/layers";

export type Basemap = "satellite" | "dark";

export interface AreaBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapApi {
  reset: () => void;
  locate: () => void;
  focus: (lat: number, lon: number, zoom?: number) => void;
}

interface Props {
  events: HotspotEvent[];
  stations: Station[];
  showStations: boolean;
  basemap: Basemap;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReady?: (api: MapApi) => void;
  /** Capa de condiciones activa (estacas + cuadrícula si aplica). */
  condition: ConditionDef | null;
  grid: { cells: WeatherCell[]; stepDeg: number } | null;
  showProbability: boolean;
  /** Pronóstico del modelo (72 h); si existe, reemplaza al índice heurístico en la capa de probabilidad. */
  forecast: ModelForecast | null;
  /** Modelo semanal LightGBM (7 días, malla de 0.1°, entrenado sobre in_calendar = 1). */
  weeklyForecast?: WeeklyForecast | null;
  showWeekly?: boolean;
  nasaFires: NasaFire[] | null;
  historyFires: NasaFire[] | null;
  historyOnlyInCalendar?: boolean;
  showHarmonizationZone?: boolean;
  showCause: boolean;
  satellite: SatelliteLayer | null;
  selectAreaMode?: boolean;
  selectedBounds?: AreaBounds | null;
  onAreaSelected?: (bounds: AreaBounds) => void;
}

const CENTER: [number, number] = [28.4, -106.2];
const ZOOM = 7;
const RECENT_MINUTES = 60;

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const BASEMAPS: Record<Basemap, { url: string; labels: string; attribution: string }> = {
  satellite: {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
  },
  dark: {
    url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    attribution: "&copy; Esri, HERE, Garmin, OpenStreetMap",
  },
};

const sizeFor = (frpMw: number) => Math.round(12 + Math.sqrt(frpMw) * 3.2);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function ChihuahuaOsmMap(props: Props) {
  const { events, stations, showStations, basemap, selectedId, onSelect, onReady } = props;
  const { condition, grid, showProbability, forecast, weeklyForecast = null, showWeekly = false, nasaFires, historyFires, showCause, satellite } = props;
  const { historyOnlyInCalendar = true, showHarmonizationZone = false } = props;
  const { selectAreaMode = false, selectedBounds = null, onAreaSelected } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);
  const layers = useRef<Record<"base" | "sat" | "grid" | "weekly" | "history" | "nasa" | "stations" | "hotspots" | "selection", L.LayerGroup> | null>(null);
  const meRef = useRef<L.CircleMarker | null>(null);
  const onAreaSelectedRef = useRef(onAreaSelected);

  useEffect(() => {
    onAreaSelectedRef.current = onAreaSelected;
  }, [onAreaSelected]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: CENTER, zoom: ZOOM, zoomControl: false });
    L.control.zoom({ position: "topleft" }).addTo(map);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);
    map.attributionControl.addAttribution('Fire data: <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener">NASA FIRMS</a> · imagery: NASA GIBS');
    rendererRef.current = L.canvas({ padding: 0.3 });
    layers.current = {
      base: L.layerGroup().addTo(map),
      sat: L.layerGroup().addTo(map),
      grid: L.layerGroup().addTo(map),
      weekly: L.layerGroup().addTo(map),
      history: L.layerGroup().addTo(map),
      nasa: L.layerGroup().addTo(map),
      stations: L.layerGroup().addTo(map),
      hotspots: L.layerGroup().addTo(map),
      selection: L.layerGroup().addTo(map),
    };
    mapRef.current = map;

    map.on("locationfound", (e: L.LocationEvent) => {
      meRef.current?.remove();
      meRef.current = L.circleMarker(e.latlng, { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 })
        .bindTooltip("You are here")
        .addTo(map);
    });

    onReady?.({
      reset: () => map.setView(CENTER, ZOOM),
      locate: () => map.locate({ setView: true, maxZoom: 11 }),
      focus: (lat, lon, zoom = 10) => map.setView([lat, lon], zoom),
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mapa base
  useEffect(() => {
    const g = layers.current?.base;
    if (!g) return;
    g.clearLayers();
    const cfg = BASEMAPS[basemap];
    L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 17 }).addTo(g);
    L.tileLayer(cfg.labels, { maxZoom: 17 }).addTo(g);
  }, [basemap]);

  // Imagen satelital de NASA GIBS (opcional)
  useEffect(() => {
    const g = layers.current?.sat;
    if (!g) return;
    g.clearLayers();
    if (!satellite) return;
    const cfg = gibsTileUrl(satellite);
    L.tileLayer(cfg.url, { maxNativeZoom: cfg.maxNativeZoom, maxZoom: 17, opacity: cfg.opacity }).addTo(g);
  }, [satellite]);

  // Cuadrícula: probabilidad de incendio (prioridad) o condición del estado
  useEffect(() => {
    const g = layers.current?.grid;
    if (!g) return;
    g.clearLayers();
    if (showProbability && forecast) {
      const h = forecast.stepDeg / 2;
      for (const c of forecast.cells) {
        const lvl = RISK_SCALE[c.level - 1];
        const why = c.drivers.map((d) => `${d.effect === "raises" ? "▲" : "▼"} ${d.label}`).join("<br>");
        const iot = c.iotReasons.length
          ? `<br><i>IoT correction: ${(c.modelProbability * 100).toFixed(1)}% → ${(c.probability * 100).toFixed(1)}% (${esc(c.iotReasons.join("; "))})</i>`
          : "";
        L.rectangle(
          [
            [c.lat - h, c.lon - h],
            [c.lat + h, c.lon + h],
          ],
          { renderer: rendererRef.current!, stroke: false, fillColor: lvl.bg, fillOpacity: c.level === 1 ? 0.25 : 0.55 }
        )
          .bindTooltip(`<b>${(c.probability * 100).toFixed(1)}% chance of fire in 72 h · ${lvl.level}</b><br>${why}${iot}`, { sticky: true })
          .addTo(g);
      }
      return;
    }
    if (!grid) return;
    const half = grid.stepDeg / 2;
    const colorOf = showProbability ? probabilityColor : condition?.grid ? condition.cellColor! : null;
    const textOf = showProbability
      ? (c: WeatherCell) => `Fire probability: level ${c.fireProbLevel}/5 · ${c.fireProbFactors.join(" · ")}`
      : condition?.cellText;
    if (!colorOf || !textOf) return;
    for (const c of grid.cells) {
      L.rectangle(
        [
          [c.lat - half, c.lon - half],
          [c.lat + half, c.lon + half],
        ],
        { renderer: rendererRef.current!, stroke: false, fillColor: colorOf(c), fillOpacity: 0.5 }
      )
        .bindTooltip(textOf(c), { sticky: true })
        .addTo(g);
    }
  }, [grid, condition, showProbability, forecast]);

  // Modelo semanal LightGBM (7 días a 0.1°, entrenado sobre in_calendar = 1)
  useEffect(() => {
    const g = layers.current?.weekly;
    if (!g) return;
    g.clearLayers();
    if (!showWeekly || !weeklyForecast) return;
    const h = weeklyForecast.cellDeg / 2;
    for (const c of weeklyForecast.cells) {
      const pct = c.probability * 100;
      if (pct < 0.15) continue;
      const fillColor =
        pct >= 5 ? "#dc2626" : pct >= 2 ? "#f97316" : pct >= 0.7 ? "#facc15" : "#16a34a";
      const fillOpacity = pct >= 5 ? 0.68 : pct >= 2 ? 0.55 : pct >= 0.7 ? 0.42 : 0.24;
      L.rectangle(
        [
          [c.lat - h, c.lon - h],
          [c.lat + h, c.lon + h],
        ],
        { renderer: rendererRef.current!, stroke: pct >= 3.5, color: "#fde047", weight: 0.8, fillColor, fillOpacity }
      )
        .bindTooltip(
          `<strong>Weekly 7-day risk · Cell #${c.cellId} (0.1° ≈ 11 km)</strong><br>` +
            `Probability: <b>${pct.toFixed(2)}%</b> (climatology ${(c.climatologyProbability * 100).toFixed(2)}%)<br>` +
            `Ratio vs climatology: <b>${c.ratioVsClimatology}×</b> · Week ${weeklyForecast.weekStart}`,
          { sticky: true }
        )
        .addTo(g);
    }
  }, [weeklyForecast, showWeekly]);

  // Histórico NASA armonizado (MODIS Aqua pre-2012-01-20 + VIIRS S-NPP celdas >= 15 MW, coloreado/escalado por FRP)
  useEffect(() => {
    const g = layers.current?.history;
    if (!g) return;
    g.clearLayers();
    if (showHarmonizationZone) {
      const b = HARMONIZATION_META.bounds;
      L.rectangle(
        [
          [b.south, b.west],
          [b.north, b.east],
        ],
        {
          color: "#38bdf8",
          weight: 1.5,
          dashArray: "5 5",
          fillColor: "#38bdf8",
          fillOpacity: 0.04,
        }
      )
        .bindTooltip(
          `<strong>Harmonization calibration domain</strong><br>` +
            `Northern Chihuahua (${b.south}°–${b.north}° N, ${b.west}° to ${b.east}° E)<br>` +
            `481,029 archive rows → 55,902 <code>in_calendar = 1</code> series (13:30 pass · ≥ ${HARMONIZATION_META.frpThresholdMw} MW cell rule)`
        )
        .addTo(g);
    }
    for (const f of historyFires ?? []) {
      const low = f.confidence === "low" || f.confidence === "l";
      const isModisEra = f.date < HARMONIZATION_META.dateRange.seam;
      const inCal = f.inCalendar ?? (!low && (isModisEra || f.frpMw >= HARMONIZATION_META.frpThresholdMw));
      if (historyOnlyInCalendar && !inCal) continue;

      const radius = low ? 2 : Math.min(6.5, Math.max(2.5, 2 + Math.sqrt(Math.max(0, f.frpMw)) * 0.42));
      const fillColor = f.frpMw >= 50 ? "#ff2a00" : inCal ? "#ff9f1c" : "#fbbf24";
      const satName = f.satellite || (isModisEra ? "Aqua" : "SNPP");
      const passLabel = f.daynight === "N" ? "Night (01:30)" : "Day (13:30)";
      const sensorLabel =
        satName === "Aqua" || satName === "Terra"
          ? `${satName} MODIS 1 km · ${passLabel}`
          : `${satName} VIIRS 375 m · ${passLabel}`;
      const calLabel = inCal
        ? `in_calendar = 1 (strongest pixel in ≥ ${HARMONIZATION_META.frpThresholdMw} MW 1.4 km cell)`
        : "in_calendar = 0 (detail row: sub-15 MW cell / neighbor pixel / low conf)";
      const brightLine =
        f.brightnessK !== undefined && f.brightT31K !== undefined
          ? `<br>Brightness <b>${f.brightnessK.toFixed(1)} K</b> (T31 ${f.brightT31K.toFixed(1)} K · ΔT +${(f.brightnessK - f.brightT31K).toFixed(1)} K)`
          : "";
      const areaLine =
        f.pixelAreaKm2 && f.pixelAreaKm2 > 0
          ? ` · <b>${(f.frpMw / f.pixelAreaKm2).toFixed(1)} MW/km²</b> (${f.pixelAreaKm2} km² px)`
          : "";

      L.circleMarker([f.lat, f.lon], {
        renderer: rendererRef.current!,
        radius,
        stroke: f.frpMw >= 50,
        color: "#ffe066",
        weight: 1,
        fillColor,
        fillOpacity: low ? 0.3 : inCal ? 0.78 : 0.45,
      })
        .bindTooltip(
          `<strong>Historical · ${f.date}</strong><br>${sensorLabel}<br>FRP <b>${f.frpMw} MW</b>${areaLine} · ${f.confidence} conf${brightLine}<br><span style="opacity:0.8">${calLabel}</span>`
        )
        .addTo(g);
    }
  }, [historyFires, historyOnlyInCalendar, showHarmonizationZone]);

  // Incendios activos NASA FIRMS
  useEffect(() => {
    const g = layers.current?.nasa;
    if (!g) return;
    g.clearLayers();
    for (const f of nasaFires ?? []) {
      const low = f.confidence === "low";
      L.circleMarker([f.lat, f.lon], {
        renderer: rendererRef.current!,
        radius: low ? 4 : f.confidence === "high" ? 7 : 5.5,
        color: "#ffe066",
        weight: 1.5,
        opacity: low ? 0.5 : 1,
        fillColor: "#ff2a00",
        fillOpacity: low ? 0.4 : 1,
      })
        .bindTooltip(`NASA FIRMS · ${f.satellite} · ${f.date} ${f.time} UTC · FRP ${f.frpMw} MW · ${f.confidence} confidence`)
        .addTo(g);
    }
  }, [nasaFires]);

  // Estacas: marcador + valor de la condición activa
  useEffect(() => {
    const g = layers.current?.stations;
    if (!g) return;
    g.clearLayers();
    if (!showStations && !condition) return;
    for (const s of stations) {
      const v = condition?.stationValue(s);
      const html = v
        ? `<span class="station-badge" style="--c:${v.color}"><span class="station-marker"></span>${esc(v.text)}</span>`
        : '<span class="station-marker"></span>';
      L.marker([s.lat, s.lon], {
        icon: L.divIcon({ className: "", iconSize: [0, 0], iconAnchor: [-4, 16], html }),
        title: `Field station ${s.name}`,
        interactive: false,
        zIndexOffset: 1500,
      }).addTo(g);
    }
  }, [stations, showStations, condition]);

  // Causa probable (focos del modelo de origen)
  useEffect(() => {
    const map = mapRef.current;
    const g = layers.current?.hotspots;
    if (!map || !g) return;
    g.clearLayers();
    if (!showCause) {
      map.closePopup();
      return;
    }
    for (const ev of events) {
      const size = sizeFor(ev.frpMw);
      const selected = ev.id === selectedId;
      const recent = minutesSince(ev.detectedAt) <= RECENT_MINUTES;
      L.marker([ev.lat, ev.lon], {
        icon: L.divIcon({
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html: `<span class="hotspot${recent ? " hotspot--recent" : ""}${selected ? " hotspot--selected" : ""}" style="--c:${ORIGIN_COLORS[ev.origin].hex};width:${size}px;height:${size}px"></span>`,
        }),
        title: `${ev.municipality} · probable cause ${ev.origin} ${ev.probability}%`,
        zIndexOffset: selected ? 1000 : recent ? 500 : 0,
      })
        .on("click", () => onSelect(ev.id))
        .addTo(g);
    }
    const sel = events.find((e) => e.id === selectedId);
    if (sel) {
      L.popup({ className: "fd-popup", offset: [0, -sizeFor(sel.frpMw) / 2], autoPan: true })
        .setLatLng([sel.lat, sel.lon])
        .setContent(
          `<strong>${esc(sel.municipality)}</strong><br>${esc(sel.zone)}<br>` +
            `Probable cause: <span style="color:${ORIGIN_COLORS[sel.origin].hex};font-weight:700">${sel.origin} ${sel.probability}%</span><br>` +
            `FRP ${sel.frpMw} MW · <a href="${directionsUrl(sel)}" target="_blank" rel="noopener noreferrer">Directions ↗</a>`
        )
        .openOn(map);
    } else {
      map.closePopup();
    }
  }, [events, selectedId, onSelect, showCause]);

  // Rectángulo del área seleccionada
  useEffect(() => {
    const g = layers.current?.selection;
    if (!g) return;
    g.clearLayers();
    if (!selectedBounds) return;
    L.rectangle(
      [
        [selectedBounds.south, selectedBounds.west],
        [selectedBounds.north, selectedBounds.east],
      ],
      {
        color: "#f59e0b",
        weight: 2,
        dashArray: "6 4",
        fillColor: "#f59e0b",
        fillOpacity: 0.14,
        interactive: false,
      }
    ).addTo(g);
  }, [selectedBounds]);

  // Modo captura de área (arrastrar de un punto a otro como recorte)
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    const g = layers.current?.selection;
    if (!map || !container || !g) return;

    if (!selectAreaMode) {
      map.dragging.enable();
      container.style.cursor = "";
      container.style.touchAction = "";
      return;
    }

    map.dragging.disable();
    container.style.cursor = "crosshair";
    container.style.touchAction = "none";

    let startPoint: L.Point | null = null;
    let startLatLng: L.LatLng | null = null;
    let previewRect: L.Rectangle | null = null;

    const toContainerPoint = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      return L.point(e.clientX - rect.left, e.clientY - rect.top);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest(".leaflet-control-container")) return;

      startPoint = toContainerPoint(e);
      startLatLng = map.containerPointToLatLng(startPoint);
      g.clearLayers();
      previewRect = L.rectangle(L.latLngBounds(startLatLng, startLatLng), {
        color: "#f59e0b",
        weight: 2,
        dashArray: "6 4",
        fillColor: "#f59e0b",
        fillOpacity: 0.18,
        interactive: false,
      }).addTo(g);

      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // Ignora si el navegador no permite captura para este puntero
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!startLatLng || !previewRect) return;
      const currentLatLng = map.containerPointToLatLng(toContainerPoint(e));
      previewRect.setBounds(L.latLngBounds(startLatLng, currentLatLng));
    };

    const finishDrag = (e: PointerEvent) => {
      if (!startPoint || !startLatLng) return;
      const originPoint = startPoint;
      const originLatLng = startLatLng;
      const endPoint = toContainerPoint(e);
      const endLatLng = map.containerPointToLatLng(endPoint);
      const movedPx = Math.hypot(endPoint.x - originPoint.x, endPoint.y - originPoint.y);

      startPoint = null;
      startLatLng = null;
      previewRect = null;

      try {
        if (container.hasPointerCapture(e.pointerId)) {
          container.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignora
      }

      if (movedPx < 8) {
        g.clearLayers();
        return;
      }

      const bounds = L.latLngBounds(originLatLng, endLatLng);
      onAreaSelectedRef.current?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", finishDrag);
    container.addEventListener("pointercancel", finishDrag);

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", finishDrag);
      container.removeEventListener("pointercancel", finishDrag);
      map.dragging.enable();
      container.style.cursor = "";
      container.style.touchAction = "";
    };
  }, [selectAreaMode]);

  return <div ref={containerRef} className="fuego-map absolute inset-0" />;
}
