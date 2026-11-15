"use client";

import { useEffect, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import { API_URL } from "../../lib/api";

interface StationData {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  temperature_c: number;
  humidity_pct: number;
  luminosity_pct: number | null;
  wind_kmh: number;
  rain_mm: number;
  lightning_strikes: number;
  battery_v: number;
  pressure_hpa: number | null;
  noise_db: number | null;
  rssi_dbm: number | null;
  link_type: string;
  risk_level: number;
  risk_label: string;
  source: string;
  timestamp: string;
  fallback_active: boolean;
}

export default function AgoraPage() {
  const [stations, setStations] = useState<StationData[]>([]);
  const [selectedId, setSelectedId] = useState<string>("ESP32-CHIH-04");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isLive, setIsLive] = useState(true);

  const fetchStations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/iot/stations`, { cache: "no-store" });
      if (!res.ok) throw new Error("Error al obtener estaciones");
      const data = await res.json();
      if (data && Array.isArray(data.stations)) {
        setStations(data.stations);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Error consultando estaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
    if (!isLive) return;
    const interval = setInterval(fetchStations, 4000);
    return () => clearInterval(interval);
  }, [isLive]);

  const selectedStation = stations.find((s) => s.station_id === selectedId) || stations[0];

  return (
    <div className="min-h-screen bg-[#0e1117] text-white flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Cabecera Agora */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Agora · Telemetría IoT en Vivo
              </h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Monitoreo y telemetría de campo transmitida por sensores ESP32 hacia la red satelital FuegoData
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Última actualización: <strong className="text-gray-200">{lastUpdated || "Consultando..."}</strong>
            </span>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                isLive
                  ? "bg-emerald-950/60 border-emerald-500 text-emerald-400"
                  : "bg-gray-800 border-gray-600 text-gray-400"
              }`}
            >
              {isLive ? "● En vivo (4s)" : "Pausado"}
            </button>
          </div>
        </div>

        {/* Selector de estación */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Selecciona una Estación de Monitoreo:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {stations.map((st) => {
              const active = st.station_id === (selectedStation?.station_id || selectedId);
              return (
                <button
                  key={st.station_id}
                  onClick={() => setSelectedId(st.station_id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    active
                      ? "bg-gradient-to-b from-gray-800 to-gray-900 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50"
                      : "bg-gray-900/60 border-gray-800 hover:border-gray-700 hover:bg-gray-850"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{st.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        st.fallback_active ? "bg-amber-900/50 text-amber-300" : "bg-emerald-900/50 text-emerald-300"
                      }`}
                    >
                      {st.fallback_active ? "Fallback" : "Hardware ESP32"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-400 flex items-center justify-between font-mono">
                    <span>ID: {st.station_id}</span>
                    <span>{st.temperature_c}°C · {st.humidity_pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel de datos de la estación seleccionada */}
        {selectedStation && (
          <div className="space-y-6">
            {/* Tarjeta de Resumen / Estado */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-amber-400">
                    Estación Activa · {selectedStation.station_id}
                  </span>
                  <h2 className="text-2xl font-bold text-white mt-1">{selectedStation.name}</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Coordenadas: {selectedStation.lat} N, {selectedStation.lon} W · Enlace: {selectedStation.link_type?.toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Nivel de Riesgo Fuego</span>
                    <span
                      className={`text-lg font-black uppercase ${
                        selectedStation.risk_level >= 4
                          ? "text-red-500"
                          : selectedStation.risk_level === 3
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {selectedStation.risk_label} ({selectedStation.risk_level}/5)
                    </span>
                  </div>
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl font-bold ${
                      selectedStation.risk_level >= 4
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : selectedStation.risk_level === 3
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    }`}
                  >
                    {selectedStation.risk_level}
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de Sensores en Vivo */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Temperatura */}
              <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Temperatura</span>
                <div className="text-3xl font-extrabold text-amber-400 mt-2">
                  {selectedStation.temperature_c ?? "--"} <span className="text-lg font-medium text-gray-400">°C</span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">DHT Sensor Digital (GPIO 16)</span>
              </div>

              {/* Humedad */}
              <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Humedad Relativa</span>
                <div className="text-3xl font-extrabold text-sky-400 mt-2">
                  {selectedStation.humidity_pct ?? "--"} <span className="text-lg font-medium text-gray-400">%</span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">DHT Sensor Digital (GPIO 16)</span>
              </div>

              {/* Luz */}
              <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Luminosidad</span>
                <div className="text-3xl font-extrabold text-yellow-400 mt-2">
                  {selectedStation.luminosity_pct !== null ? `${selectedStation.luminosity_pct}%` : "--"}
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">Fotovoltaico ADC (GPIO 32)</span>
              </div>

              {/* Presión */}
              <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Presión Atmosférica</span>
                <div className="text-3xl font-extrabold text-indigo-400 mt-2">
                  {selectedStation.pressure_hpa ?? "--"} <span className="text-lg font-medium text-gray-400">hPa</span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">Sensor de Presión (GPIO 34)</span>
              </div>

              {/* Ruido / Sonido */}
              <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nivel Acústico</span>
                <div className="text-3xl font-extrabold text-purple-400 mt-2">
                  {selectedStation.noise_db ?? "--"} <span className="text-lg font-medium text-gray-400">dB</span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">Micrófono Grande (GPIO 33)</span>
              </div>

              {/* Batería / Alimentación */}
              <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Voltaje Estación</span>
                <div className="text-3xl font-extrabold text-emerald-400 mt-2">
                  {selectedStation.battery_v ?? "--"} <span className="text-lg font-medium text-gray-400">V</span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">Batería LiPo / Fuente</span>
              </div>

              {/* Viento */}
              <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Viento</span>
                <div className="text-3xl font-extrabold text-teal-400 mt-2">
                  {selectedStation.wind_kmh ?? 0} <span className="text-lg font-medium text-gray-400">km/h</span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">Velocidad Anemómetro</span>
              </div>

              {/* Enlace de Radio */}
              <div className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Señal WiFi / RSSI</span>
                <div className="text-3xl font-extrabold text-rose-400 mt-2">
                  {selectedStation.rssi_dbm ?? "--"} <span className="text-lg font-medium text-gray-400">dBm</span>
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">Red Institucional Tec</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
