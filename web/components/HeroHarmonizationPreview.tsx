"use client";

import { useState } from "react";

type Mode = "harmonized" | "raw";

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const MONTHS_SHORT = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTHS_FULL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Muestra ilustrativa de estacionalidad en Sierra de Chihuahua (pico abr-jun)
const HEATMAP_HARMONIZED: number[][] = [
  [12, 18, 36, 74, 88, 62, 20, 9, 6, 8, 11, 10],
  [14, 22, 45, 82, 95, 70, 24, 11, 7, 9, 14, 12],
  [18, 28, 52, 90, 100, 76, 19, 8, 6, 10, 15, 14],
  [15, 24, 48, 86, 94, 65, 22, 10, 8, 11, 13, 11],
  [20, 31, 58, 92, 98, 72, 28, 12, 9, 12, 16, 15],
  [22, 34, 64, 96, 100, 81, 30, 14, 10, 13, 18, 16],
  [19, 29, 55, 88, 96, 68, 25, 11, 8, 11, 14, 13],
];

const SERIES_COMPARE = [
  { year: "2004", rawModis: 24, rawViirs: null, harmonized: 62 },
  { year: "2008", rawModis: 29, rawViirs: null, harmonized: 74 },
  { year: "2012", rawModis: 27, rawViirs: 71, harmonized: 71 },
  { year: "2016", rawModis: 31, rawViirs: 82, harmonized: 81 },
  { year: "2020", rawModis: 35, rawViirs: 91, harmonized: 90 },
  { year: "2024", rawModis: 33, rawViirs: 95, harmonized: 95 },
];

function getHeatClass(value: number, mode: Mode): string {
  const v = mode === "raw" ? Math.round(value * 0.42) : value;
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
    m: 4, // Mayo
  });

  const activeValue = HEATMAP_HARMONIZED[selectedCell.y][selectedCell.m];
  const displayValue =
    mode === "raw" ? Math.round(activeValue * 0.42) : activeValue;

  return (
    /* Double-Bezel Outer Shell (paleta violeta cósmico + flama) */
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
                Muestra ilustrativa · Sierra de Chihuahua
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-100">
              Calendario de actividad de quema (MODIS → VIIRS)
            </p>
          </div>

          {/* Toggle Crudo vs Armonizado */}
          <div
            className="inline-flex rounded-full border border-white/10 bg-[#0d0818] p-1"
            role="group"
            aria-label="Modo de visualización de serie"
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
              Sin armonizar
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
              Armonizado
            </button>
          </div>
        </div>

        {/* Comparativa de barras 2004–2024 */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
            <span>
              {mode === "harmonized"
                ? "Serie unificada (factor mensual kₘ)"
                : "Discrepancia cruda: MODIS (azul) vs VIIRS (naranja)"}
            </span>
            <span className="tabular-nums text-slate-500">2004–2024</span>
          </div>
          <div className="grid grid-cols-6 gap-2 rounded-2xl border border-white/[0.06] bg-[#0d0818] p-3.5">
            {SERIES_COMPARE.map((item) => (
              <div key={item.year} className="flex flex-col items-center gap-1.5">
                <div className="flex h-20 w-full items-end justify-center gap-1">
                  {mode === "raw" ? (
                    <>
                      <div
                        className="w-2.5 rounded-t bg-sky-400/80 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                        style={{ height: `${item.rawModis}%` }}
                        title={`MODIS ${item.year}: ${item.rawModis}`}
                      />
                      {item.rawViirs !== null && (
                        <div
                          className="w-2.5 rounded-t bg-[#e85d3f] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                          style={{ height: `${item.rawViirs}%` }}
                          title={`VIIRS ${item.year}: ${item.rawViirs}`}
                        />
                      )}
                    </>
                  ) : (
                    <div
                      className="w-4 rounded-t bg-gradient-to-t from-[#d9532f] to-[#f59e0b] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                      style={{ height: `${item.harmonized}%` }}
                      title={`Armonizado ${item.year}: ${item.harmonized}`}
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

        {/* Matriz interactiva Años x Meses */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
            <span>Matriz mensual interactiva</span>
            <span className="tabular-nums text-[#f59e0b]">
              {MONTHS_FULL[selectedCell.m]} {YEARS[selectedCell.y]} ·{" "}
              {displayValue} pts rel.
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
                {HEATMAP_HARMONIZED[yIdx].map((val, mIdx) => {
                  const isSelected =
                    selectedCell.y === yIdx && selectedCell.m === mIdx;
                  return (
                    <button
                      key={mIdx}
                      type="button"
                      onClick={() => setSelectedCell({ y: yIdx, m: mIdx })}
                      aria-label={`${MONTHS_FULL[mIdx]} ${year}: índice ${
                        mode === "raw" ? Math.round(val * 0.42) : val
                      }`}
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

          {/* Leyenda de escala accesible */}
          <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-slate-500">
            <span>Menor actividad</span>
            <div className="flex items-center gap-1" aria-hidden="true">
              <span className="h-2.5 w-4 rounded-sm bg-[#151e28]" />
              <span className="h-2.5 w-4 rounded-sm bg-[#1d3c4d]" />
              <span className="h-2.5 w-4 rounded-sm bg-[#27636e]" />
              <span className="h-2.5 w-4 rounded-sm bg-[#b46927]" />
              <span className="h-2.5 w-4 rounded-sm bg-[#d9532f]" />
              <span className="h-2.5 w-4 rounded-sm bg-[#ef4444]" />
            </div>
            <span>Temporada crítica</span>
          </div>
        </div>

        {/* Pie de telemetría IoT + Origen */}
        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-white/[0.07] pt-3 font-mono text-[11px] sm:grid-cols-2">
          <div className="rounded-xl bg-[#0d0818] px-3.5 py-2.5">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500">
              Estación IoT (ejemplo)
            </span>
            <span className="mt-0.5 block text-sky-400">
              HDW Alto · 0 rayos / 5d
            </span>
          </div>
          <div className="rounded-xl bg-[#0d0818] px-3.5 py-2.5">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500">
              Origen probable
            </span>
            <span className="mt-0.5 block text-amber-400">
              82% actividad humana
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
