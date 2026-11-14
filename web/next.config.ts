import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sitio estático para GitHub Pages: los datos llegan de la API de la Raspberry Pi.
  output: "export",
  // GitHub Pages sirve el proyecto en /<repo>; en local queda vacío.
  basePath: process.env.PAGES_BASE_PATH || "",
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: {
    agentFeedback: true,
  },
  // cacheComponents / partialPrefetching (PPR) no son compatibles con output: "export".
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
