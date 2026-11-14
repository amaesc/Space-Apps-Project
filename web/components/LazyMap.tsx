"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type ChihuahuaOsmMapType from "./ChihuahuaOsmMap";

// Leaflet se descarga aparte, después del HTML: el panel y la lista aparecen primero.
const ChihuahuaOsmMap = dynamic(() => import("./ChihuahuaOsmMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#1b1d22] text-sm text-white/70">Loading map…</div>
  ),
});

export default function LazyMap(props: ComponentProps<typeof ChihuahuaOsmMapType>) {
  return <ChihuahuaOsmMap {...props} />;
}
