import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FuegoData — Wildfire hotspot map · Sierra de Chihuahua",
  description:
    "Platform that harmonizes MODIS and VIIRS (FIRMS) hotspots, adds field IoT telemetry and estimates the probable origin of fires. NASA Space Apps Challenge 2026.",
};

export const viewport: Viewport = {
  themeColor: "#0d0818",
};

// Sin fuentes web: la herramienta usa la fuente del sistema (0 KB extra).
// La fuente de marca solo se carga en app/(landing)/layout.tsx.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0d0818] text-[#f1f5f9] font-sans">
        {children}
      </body>
    </html>
  );
}
