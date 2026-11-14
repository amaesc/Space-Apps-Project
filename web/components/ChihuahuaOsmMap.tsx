"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { directionsUrl, type HotspotEvent, minutesSince, ORIGIN_COLORS, type Station } from "../lib/fire-data";

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
}

const CENTER: [number, number] = [27.85, -107.45];
const ZOOM = 7;
const RECENT_MINUTES = 60;

// Mapas de Esri, sin clave de API.
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

/** Diámetro en px según la intensidad (FRP): más grande = fuego más intenso. */
const sizeFor = (frpMw: number) => Math.round(12 + Math.sqrt(frpMw) * 3.2);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function ChihuahuaOsmMap({ events, stations, showStations, basemap, selectedId, onSelect, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const meRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: CENTER, zoom: ZOOM, zoomControl: false });
    L.control.zoom({ position: "topleft" }).addTo(map);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);
    baseRef.current = L.layerGroup().addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
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
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // onReady solo se usa al crear el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;
    base.clearLayers();
    const cfg = BASEMAPS[basemap];
    L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 17 }).addTo(base);
    L.tileLayer(cfg.labels, { maxZoom: 17 }).addTo(base);
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (showStations) {
      for (const s of stations) {
        L.marker([s.lat, s.lon], {
          icon: L.divIcon({ className: "", iconSize: [12, 12], iconAnchor: [-4, 16], html: '<span class="station-marker"></span>' }),
          title: `Field station ${s.name}`,
          interactive: false,
        }).addTo(layer);
      }
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
        title: `${ev.municipality} · ${ev.origin} ${ev.probability}%`,
        zIndexOffset: selected ? 1000 : recent ? 500 : 0,
      })
        .on("click", () => onSelect(ev.id))
        .addTo(layer);
    }

    const sel = events.find((e) => e.id === selectedId);
    if (sel) {
      L.popup({ className: "fd-popup", offset: [0, -sizeFor(sel.frpMw) / 2], autoPan: true, closeButton: true })
        .setLatLng([sel.lat, sel.lon])
        .setContent(
          `<strong>${esc(sel.municipality)}</strong><br>${esc(sel.zone)}<br>` +
            `<span style="color:${ORIGIN_COLORS[sel.origin].hex};font-weight:700">${sel.origin} ${sel.probability}%</span> · FRP ${sel.frpMw} MW<br>` +
            `<a href="${directionsUrl(sel)}" target="_blank" rel="noopener noreferrer">Directions ↗</a>`
        )
        .openOn(map);
    } else {
      map.closePopup();
    }
  }, [events, stations, showStations, selectedId, onSelect]);

  return <div ref={containerRef} className="fuego-map absolute inset-0" />;
}
