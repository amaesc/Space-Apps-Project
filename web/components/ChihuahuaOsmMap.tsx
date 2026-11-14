"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { type HotspotEvent, ORIGIN_COLORS } from "../lib/fire-data";

interface Props {
  events: HotspotEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const CENTER: [number, number] = [27.85, -107.45];
const ZOOM = 7;

// Mapas de Esri, sin clave de API. El oscuro pesa poco; el satélite solo se descarga si se elige.
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

export default function ChihuahuaOsmMap({ events, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("map");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: CENTER, zoom: ZOOM, zoomControl: false });
    L.control.zoom({ position: "bottomright" }).addTo(map);
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
    for (const ev of events) {
      const selected = ev.id === selectedId;
      L.circleMarker([ev.latNum, ev.lngNum], {
        radius: selected ? 10 : 8,
        color: selected ? "#ffffff" : "#000000",
        weight: selected ? 3 : 1.5,
        fillColor: ORIGIN_COLORS[ev.origin].hex,
        fillOpacity: 1,
      })
        .on("click", () => onSelect(ev.id))
        .addTo(layer);
    }
    const sel = events.find((e) => e.id === selectedId);
    if (sel) mapRef.current?.panTo([sel.latNum, sel.lngNum]);
  }, [events, selectedId, onSelect]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="fuego-map absolute inset-0" />
      <button
        type="button"
        onClick={() => setBasemap((b) => (b === "map" ? "satellite" : "map"))}
        className="absolute right-2 top-2 z-400 min-h-10 cursor-pointer rounded-md border border-white/30 bg-black/80 px-3 text-sm font-semibold text-white"
      >
        {basemap === "map" ? "Satellite" : "Map"}
      </button>
    </div>
  );
}
