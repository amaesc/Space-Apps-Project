import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNDEFINED — Calendario Armonizado de Quema y Riesgo de Incendio",
  description:
    "Plataforma de armonización de puntos calientes MODIS y VIIRS (FIRMS), telemetría IoT en campo y estimación probabilística del origen de quemas. NASA Space Apps Challenge 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-[#0b1015] text-[#f1f5f9] font-sans selection:bg-[#e85d3f]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
