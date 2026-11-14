"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { HotspotEvent, Station } from "../lib/fire-data";

// Leaflet y las imágenes del mapa solo se descargan cuando el mapa entra en pantalla.
const ChihuahuaOsmMap = dynamic(() => import("./ChihuahuaOsmMap"), {
  ssr: false,
  loading: () => <Placeholder text="Loading map…" />,
});

interface Props {
  events: HotspotEvent[];
  stations: Station[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function LazyMap(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full w-full">
      {visible ? <ChihuahuaOsmMap {...props} /> : <Placeholder text="Map" />}
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">{text}</div>
  );
}
