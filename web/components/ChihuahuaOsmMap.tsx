"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import {
  directionsUrl,
  type HotspotEvent,
  minutesSince,
  type NasaFire,
  ORIGIN_COLORS,
  type Station,
  type WeatherCell,
} from "../lib/fire-data";
import type { ModelForecast } from "../lib/api";
import { RISK_SCALE } from "../lib/fire-data";
import { type ConditionDef, gibsTileUrl, probabilityColor, type SatelliteLayer } from "../lib/layers";

export type Basemap = "satellite" | "dark";

export interface MapApi {
  reset: () => void;
  locate: () => void;
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
  nasaFires: NasaFire[] | null;
  historyFires: NasaFire[] | null;
  showCause: boolean;
  satellite: SatelliteLayer | null;
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
  const { condition, grid, showProbability, forecast, nasaFires, historyFires, showCause, satellite } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);
  const layers = useRef<Record<"base" | "sat" | "grid" | "history" | "nasa" | "stations" | "hotspots", L.LayerGroup> | null>(null);
  const meRef = useRef<L.CircleMarker | null>(null);

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
      history: L.layerGroup().addTo(map),
      nasa: L.layerGroup().addTo(map),
      stations: L.layerGroup().addTo(map),
      hotspots: L.layerGroup().addTo(map),
    };
    mapRef.current = map;

    map.on("locationfound", (e: L.LocationEvent) => {
      meRef.current?.remove();
      meRef.current = L.circleMarker(e.latlng, { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 })
        .bindTooltip("You are here")
        .addTo(map);
    });

    onReady?.({ reset: () => map.setView(CENTER, ZOOM), locate: () => map.locate({ setView: true, maxZoom: 11 }) });
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

  // Histórico NASA (puntos pequeños)
  useEffect(() => {
    const g = layers.current?.history;
    if (!g) return;
    g.clearLayers();
    for (const f of historyFires ?? []) {
      L.circleMarker([f.lat, f.lon], {
        renderer: rendererRef.current!,
        radius: f.confidence === "low" ? 2 : 2.5,
        stroke: false,
        fillColor: "#ff9f1c",
        fillOpacity: f.confidence === "low" ? 0.3 : 0.65,
      })
        .bindTooltip(`Historical detection · ${f.date} · FRP ${f.frpMw} MW · ${f.confidence} confidence`)
        .addTo(g);
    }
  }, [historyFires]);

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

  return <div ref={containerRef} className="fuego-map absolute inset-0" />;
}
