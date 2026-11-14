import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servidor autocontenido para la Raspberry Pi (.next/standalone/server.js)
  output: "standalone",
  // Rutas antiguas (en español y el login retirado) para no romper enlaces compartidos.
  async redirects() {
    return [
      { source: "/login", destination: "/", permanent: false },
      { source: "/dashboard", destination: "/", permanent: true },
      { source: "/reto", destination: "/challenge", permanent: true },
      { source: "/funcionamiento", destination: "/how-it-works", permanent: true },
      { source: "/equipo", destination: "/team", permanent: true },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
