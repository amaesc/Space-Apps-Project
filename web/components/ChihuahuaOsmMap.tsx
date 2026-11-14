"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { type HotspotEvent, minutesSince, ORIGIN_COLORS, ORIGINS, type Station } from "../lib/fire-data";

interface Props {
  events: HotspotEvent[];
  stations: Station[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const CENTER: [number, number] = [27.85, -107.45];
const ZOOM = 7;
const RECENT_MINUTES = 60;

// Mapas de Esri, sin clave de API. El satélite solo se descarga si se elige.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
const BASEMAPS = {
  map: {
    url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    attribution: "&copy; Esri, HERE, Garmin, OpenStreetMap",
  },
  satellite: {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
  },
};
type Basemap = keyof typeof BASEMAPS;

/** Diámetro en px según la intensidad (FRP): más grande = fuego más intenso. */
const sizeFor = (frpMw: number) => Math.round(12 + Math.sqrt(frpMw) * 3.2);

export default function ChihuahuaOsmMap({ events, stations, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("map");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: CENTER, zoom: ZOOM, zoomControl: false });
    baseRef.current = L.layerGroup().addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;
    base.clearLayers();
    const cfg = BASEMAPS[basemap];
    L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 16 }).addTo(base);
    L.tileLayer(cfg.labels, { maxZoom: 16 }).addTo(base);
  }, [basemap]);

  useEffect(() => {
    const layer = markersRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const s of stations) {
      L.marker([s.lat, s.lon], {
        icon: L.divIcon({ className: "", iconSize: [12, 12], iconAnchor: [-4, 16], html: '<span class="station-marker"></span>' }),
        title: `Station ${s.name}`,
        interactive: false,
      }).addTo(layer);
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
        title: `${ev.municipality} · ${ev.origin} ${ev.probability}% · FRP ${ev.frpMw} MW`,
        zIndexOffset: selected ? 1000 : recent ? 500 : 0,
      })
        .on("click", () => onSelect(ev.id))
        .addTo(layer);
    }

    const sel = events.find((e) => e.id === selectedId);
    if (sel) mapRef.current?.panTo([sel.lat, sel.lon]);
  }, [events, stations, selectedId, onSelect]);

  const btn =
    "flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-[#0d0818]/90 px-2 text-base font-bold text-white hover:bg-[#241c3a]";

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="fuego-map absolute inset-0" />

      {/* Leyenda: fija en escritorio; desplegable en celular */}
      <div className="absolute left-2 top-2 z-400 hidden rounded-lg border border-white/20 bg-[#0d0818]/90 px-3 py-2 text-sm sm:block">
        <MapLegend />
      </div>
      <details className="absolute left-2 top-2 z-400 max-w-[calc(100%-8rem)] rounded-lg border border-white/20 bg-[#0d0818]/90 text-sm sm:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 font-semibold">Legend</summary>
        <div className="px-3 pb-2">
          <MapLegend />
        </div>
      </details>

      <div className="absolute right-2 top-2 z-400 flex flex-col items-end gap-1.5">
        <div role="group" aria-label="Basemap" className="flex overflow-hidden rounded-lg border border-white/20">
          {(["map", "satellite"] as Basemap[]).map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={basemap === b}
              onClick={() => setBasemap(b)}
              className={`h-11 cursor-pointer px-3 text-sm font-semibold ${
                basemap === b ? "bg-white text-[#0d0818]" : "bg-[#0d0818]/90 text-slate-200 hover:bg-[#241c3a]"
              }`}
            >
              {b === "map" ? "Map" : "Satellite"}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in" className={btn}>+</button>
        <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out" className={btn}>−</button>
        <button
          type="button"
          onClick={() => mapRef.current?.setView(CENTER, ZOOM)}
          aria-label="Reset map view"
          className={`${btn} text-xs`}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
        {ORIGINS.map((o) => (
          <li key={o} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: ORIGIN_COLORS[o].hex }} />
            {o}
          </li>
        ))}
      </ul>
      <ul className="mt-1.5 space-y-0.5 border-t border-white/15 pt-1.5 text-xs text-slate-300">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-slate-300" />
          <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full bg-slate-300" />
          Size = intensity (FRP)
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="hotspot hotspot--recent h-3 w-3" style={{ ["--c" as string]: "#e2e8f0" }} />
          Pulsing = last hour
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="station-marker" />
          Field station (IoT)
        </li>
      </ul>
    </>
  );
}
