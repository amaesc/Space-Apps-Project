import type { Metadata, Viewport } from "next";
import { Titillium_Web } from "next/font/google";
import "./globals.css";

// Tipografía técnica y compacta, estilo visor de datos geoespaciales.
const titillium = Titillium_Web({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-titillium",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FuegoData — Wildfire hotspot map · Sierra de Chihuahua",
  description:
    "Platform that harmonizes MODIS and VIIRS (FIRMS) hotspots, adds field IoT telemetry and estimates the probable origin of fires. NASA Space Apps Challenge 2026.",
};

export const viewport: Viewport = {
  themeColor: "#8f1c1c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${titillium.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#2b2b2e] text-[#f1f1f1] font-sans">
        {children}
      </body>
    </html>
  );
}
