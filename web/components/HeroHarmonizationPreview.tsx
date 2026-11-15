"use client";

import { useState } from "react";
import {
  HERO_BARS,
  HERO_HARMONIZED,
  HERO_RAW,
  HERO_SEAM_RATIO,
  HERO_SOURCE,
  HERO_TOTAL_SERIES,
  HERO_YEARS,
} from "../lib/hero-data";

type Mode = "harmonized" | "raw";

const MONTHS_SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Real counts for all of Mexico (lib/hero-data.ts, generated from the harmonized archive).
const YEARS = HERO_YEARS;
const MATRIX: Record<Mode, number[][]> = { harmonized: HERO_HARMONIZED, raw: HERO_RAW };
const MATRIX_MAX: Record<Mode, number> = {
  harmonized: Math.max(1, ...HERO_HARMONIZED.flat()),
  raw: Math.max(1, ...HERO_RAW.flat()),
};
// Bars share one scale per mode, so the raw view shows the real jump from MODIS to VIIRS.
const BAR_MAX: Record<Mode, number> = {
  harmonized: Math.max(1, ...HERO_BARS.map((b) => b.harmonized)),
  raw: Math.max(1, ...HERO_BARS.flatMap((b) => [b.rawModis, b.rawViirs ?? 0])),
};
const pct = (v: number, max: number) => Math.max(2, Math.round((100 * v) / max));

function getHeatClass(value: number, mode: Mode): string {
  const v = (100 * value) / MATRIX_MAX[mode];
  if (v < 15) return "bg-[#151e28]";
  if (v < 30) return "bg-[#1d3c4d]";
  if (v < 50) return "bg-[#27636e]";
  if (v < 70) return "bg-[#b46927]";
  if (v < 88) return "bg-[#d9532f]";
  return "bg-[#ef4444]";
}

export default function HeroHarmonizationPreview() {
  const [mode, setMode] = useState<Mode>("harmonized");
  const [selectedCell, setSelectedCell] = useState<{ y: number; m: number }>({
    y: 5, // 2024
    m: 4, // May
  });

  const displayValue = MATRIX[mode][selectedCell.y][selectedCell.m];

  return (
    /* Double-Bezel Outer Shell (cosmic violet + flame palette) */
    <div className="relative rounded-[1.75rem] border border-violet-400/20 bg-white/[0.03] p-1.5 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.85)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#f97316] to-transparent opacity-75"
      />
      {/* Double-Bezel Inner Core */}
      <div className="rounded-[calc(1.75rem-0.375rem)] bg-[#140d24] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-[#f59e0b]"
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Real data · {HERO_SOURCE}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-100">
              Burn activity calendar (MODIS → VIIRS)
            </p>
          </div>

          {/* Raw vs harmonized toggle */}
          <div
            className="inline-flex rounded-full border border-white/10 bg-[#0d0818] p-1"
            role="group"
            aria-label="Series display mode"
          >
            <button
              type="button"
              onClick={() => setMode("raw")}
              className={`cursor-pointer rounded-full px-3 py-1 font-mono text-[11px] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                mode === "raw"
                  ? "bg-violet-600/80 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Raw
            </button>
            <button
              type="button"
              onClick={() => setMode("harmonized")}
              className={`cursor-pointer rounded-full px-3 py-1 font-mono text-[11px] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                mode === "harmonized"
                  ? "bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Harmonized
            </button>
          </div>
        </div>

        {/* 2004–2024 bar comparison */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
            <span>
              {mode === "harmonized"
                ? "Harmonized series (in_calendar = 1), detections per year"
                : "Raw: MODIS Aqua (blue) vs VIIRS S-NPP (orange), detections per year"}
            </span>
            <span className="tabular-nums text-slate-500">{HERO_BARS[0].year}–{HERO_BARS[HERO_BARS.length - 1].year}</span>
          </div>
          <div className="grid grid-cols-6 gap-2 rounded-2xl border border-white/[0.06] bg-[#0d0818] p-3.5">
            {HERO_BARS.map((item) => (
              <div key={item.year} className="flex flex-col items-center gap-1.5">
                <div className="flex h-20 w-full items-end justify-center gap-1">
                  {mode === "raw" ? (
                    <>
                      <div
                        className="w-2.5 rounded-t bg-sky-400/80 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                        style={{ height: `${pct(item.rawModis, BAR_MAX.raw)}%` }}
                        title={`MODIS Aqua ${item.year}: ${item.rawModis.toLocaleString()}`}
                      />
                      {item.rawViirs !== null && (
                        <div
                          className="w-2.5 rounded-t bg-[#e85d3f] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                          style={{ height: `${pct(item.rawViirs, BAR_MAX.raw)}%` }}
                          title={`VIIRS S-NPP ${item.year}: ${item.rawViirs.toLocaleString()}`}
                        />
                      )}
                    </>
                  ) : (
                    <div
                      className="w-4 rounded-t bg-gradient-to-t from-[#d9532f] to-[#f59e0b] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                      style={{ height: `${pct(item.harmonized, BAR_MAX.harmonized)}%` }}
                      title={`Harmonized ${item.year}: ${item.harmonized.toLocaleString()}`}
                    />
                  )}
                </div>
                <span className="font-mono text-[10px] tabular-nums text-slate-400">
                  {item.year}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive years × months matrix */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
            <span>Interactive monthly matrix</span>
            <span className="tabular-nums text-[#f59e0b]">
              {MONTHS_FULL[selectedCell.m]} {YEARS[selectedCell.y]} ·{" "}
              {displayValue.toLocaleString()} detections
            </span>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-[36px_repeat(12,minmax(0,1fr))] gap-1 text-center font-mono text-[10px] text-slate-500">
              <span />
              {MONTHS_SHORT.map((m, idx) => (
                <span key={idx}>{m}</span>
              ))}
            </div>
            {YEARS.map((year, yIdx) => (
              <div
                key={year}
                className="grid grid-cols-[36px_repeat(12,minmax(0,1fr))] items-center gap-1"
              >
                <span className="font-mono text-[10px] tabular-nums text-slate-400">
                  {year}
                </span>
                {MATRIX[mode][yIdx].map((val, mIdx) => {
                  const isSelected =
                    selectedCell.y === yIdx && selectedCell.m === mIdx;
                  return (
                    <button
                      key={mIdx}
                      type="button"
                      onClick={() => setSelectedCell({ y: yIdx, m: mIdx })}
                      aria-label={`${MONTHS_FULL[mIdx]} ${year}: ${val} detections`}
                      className={`h-4 w-full cursor-pointer rounded-[3px] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${getHeatClass(
                        val,
                        mode
                      )} ${
                        isSelected
                          ? "ring-2 ring-white ring-offset-1 ring-offset-[#0f161e]"
                          : "hover:opacity-90"
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Accessible scale legend */}
          <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-slate-500">
            <span>Lower activity</span>
            <div className="flex items-center gap-1" aria-hidden="true">
              <span className="h-2.5 w-4 rounded-sm bg-[#151e28]" />
              <span className="h-2.5 w-4 rounded-sm bg-[#1d3c4d]" />
              <span className="h-2.5 w-4 rounded-sm bg-[#27636e]" />
              <span className="h-2.5 w-4 rounded-sm bg-[#b46927]" />
              <span className="h-2.5 w-4 rounded-sm bg-[#d9532f]" />
              <span className="h-2.5 w-4 rounded-sm bg-[#ef4444]" />
            </div>
            <span>Critical season</span>
          </div>
        </div>

        {/* Real summary footer */}
        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-white/[0.07] pt-3 font-mono text-[11px] sm:grid-cols-2">
          <div className="rounded-xl bg-[#0d0818] px-3.5 py-2.5">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500">
              Harmonized series, 2002–today
            </span>
            <span className="mt-0.5 block text-sky-400">
              {HERO_TOTAL_SERIES.toLocaleString()} detections (in_calendar = 1)
            </span>
          </div>
          <div className="rounded-xl bg-[#0d0818] px-3.5 py-2.5">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500">
              Seam check 2012–2019
            </span>
            <span className="mt-0.5 block text-amber-400">
              S-NPP / Aqua {HERO_SEAM_RATIO.min.toFixed(2)}–{HERO_SEAM_RATIO.max.toFixed(2)} per year
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
