"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { type HotspotEvent, ORIGIN_COLORS } from "../lib/fire-data";

interface ChihuahuaOsmMapProps {
  events: HotspotEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const DEFAULT_CENTER: [number, number] = [27.85, -107.45];
const DEFAULT_ZOOM = 7;

export default function ChihuahuaOsmMap({
  events,
  selectedId,
  onSelect,
}: ChihuahuaOsmMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    events.forEach((ev) => {
      const isSelected = ev.id === selectedId;
      const colorHex = ORIGIN_COLORS[ev.origin].hex;

      if (isSelected) {
        L.circleMarker([ev.latNum, ev.lngNum], {
          radius: 16,
          color: colorHex,
          weight: 1.5,
          opacity: 0.55,
          fillColor: colorHex,
          fillOpacity: 0.18,
          interactive: false,
        }).addTo(layerGroup);
      }

      const marker = L.circleMarker([ev.latNum, ev.lngNum], {
        radius: isSelected ? 8 : 6,
        color: isSelected ? "#ffffff" : "#0d0818",
        weight: isSelected ? 2.5 : 1.5,
        fillColor: colorHex,
        fillOpacity: 0.95,
      });

      marker.bindTooltip(
        `${ev.municipality} · ${ev.origin} (${ev.probability}%)`,
        { direction: "top", offset: [0, -6] }
      );

      marker.on("click", () => {
        onSelect(ev.id);
      });

      marker.addTo(layerGroup);
    });
  }, [events, selectedId, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const selected = events.find((ev) => ev.id === selectedId);
    if (selected) {
      map.panTo([selected.latNum, selected.lngNum], { animate: true });
    }
  }, [selectedId, events]);

  return (
    <div className="relative h-full min-h-96 w-full lg:min-h-[420px]">
      <div
        ref={containerRef}
        className="osm-dark-map h-full min-h-96 w-full lg:min-h-[420px]"
      />

      {/* Controles de zoom arriba derecha */}
      <div className="absolute right-3 top-3 z-400 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Acercar mapa"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-[#140d24]/90 font-mono text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/10"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Alejar mapa"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-[#140d24]/90 font-mono text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/10"
        >
          −
        </button>
        <button
          type="button"
          onClick={() =>
            mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM, {
              animate: true,
            })
          }
          aria-label="Restablecer vista del mapa"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-[#140d24]/90 font-mono text-[10px] text-slate-300 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
        >
          1:1
        </button>
      </div>
    </div>
  );
}
