import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FuegoData — Inteligencia Ambiental",
  description:
    "Plataforma de armonización de puntos calientes MODIS y VIIRS (FIRMS), telemetría IoT en campo y estimación probabilística del origen de quemas. NASA Space Apps Challenge 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${nunito.variable} h-full antialiased scroll-smooth`}>
      <body className="min-h-full flex flex-col bg-[#0b1015] text-[#f1f5f9] font-sans selection:bg-[#e85d3f]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
