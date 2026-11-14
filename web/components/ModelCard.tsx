"use client";

import { useEffect, useState } from "react";
import { API_URL } from "../lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Info = any;

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Métricas de validación del modelo predictivo (leídas de la API de la Raspberry Pi). */
export default function ModelCard() {
  const [info, setInfo] = useState<Info | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch(`${API_URL}/api/model/info`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setInfo)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="text-white/70">Model metrics are unavailable right now.</p>;
  if (!info) return <p className="text-white/70">Loading model metrics…</p>;
  const ov = info.validation.overall;
  const rows: [string, any][] = [
    ["FuegoData model (LightGBM)", ov.model],
    ["Persistence (fire last 7 days)", ov.persistence_7d],
    ["Climatology of the cell", ov.climatology],
    ["Hot-Dry-Windy weather index", ov.hdw_index],
  ];
  return (
    <div className="space-y-4">
      <p>
        <b className="text-white">Question:</b> {info.target}. Trained on {info.training_period[0]} → {info.training_period[1]}; validated by
        leaving one full year out at a time.
      </p>
      <div className="overflow-x-auto rounded border border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/75">
            <tr>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">ROC AUC</th>
              <th className="px-3 py-2">Avg. precision</th>
              <th className="px-3 py-2">Fires caught in top 10 % cells</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map(([name, m], i) => (
              <tr key={name} className={i === 0 ? "font-semibold text-fd-gold" : ""}>
                <td className="px-3 py-2">{name}</td>
                <td className="px-3 py-2 tabular-nums">{m.auc.toFixed(3)}</td>
                <td className="px-3 py-2 tabular-nums">{m.ap.toFixed(3)}</td>
                <td className="px-3 py-2 tabular-nums">{pct(m.top10_recall)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto rounded border border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/75">
            <tr>
              <th className="px-3 py-2">Risk level</th>
              <th className="px-3 py-2">From (72 h)</th>
              <th className="px-3 py-2">Share of cells</th>
              <th className="px-3 py-2">Fire actually observed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {info.levels.map((l: any) => (
              <tr key={l.level}>
                <td className="px-3 py-2">{l.name}</td>
                <td className="px-3 py-2 tabular-nums">{pct(l.min_probability)}</td>
                <td className="px-3 py-2 tabular-nums">{pct(l.share_of_cells)}</td>
                <td className="px-3 py-2 tabular-nums">{pct(l.observed_fire_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-white/75">
        Most influential inputs: {info.importance.slice(0, 5).map((r: any) => `${r.feature} (${pct(r.gain_share)})`).join(", ")}.
      </p>
    </div>
  );
}
