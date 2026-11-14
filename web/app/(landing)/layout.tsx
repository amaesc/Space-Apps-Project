import { Nunito } from "next/font/google";

// La fuente de marca solo se descarga en las páginas de presentación (About),
// nunca en la herramienta, que debe cargar lo mínimo.
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-nunito",
  display: "swap",
});

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${nunito.variable} contents`}>{children}</div>;
}
