import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const outfit = localFont({ src: "./fonts/outfit.woff2", variable: "--font-outfit", weight: "400 800", display: "swap" });
const jakarta = localFont({ src: "./fonts/plus-jakarta-sans.woff2", variable: "--font-jakarta", weight: "400 700", display: "swap" });
const symbols = localFont({ src: "./fonts/material-symbols.woff2", variable: "--font-symbols", weight: "100 700", display: "block", preload: false });

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export const metadata: Metadata = {
  title: "Sistema de Calificación — Moperita y Ñusta de Bolivia 2026",
  description:
    "Sistema oficial de calificación y escrutinio del certamen Moperita y Ñusta de Bolivia 2026, XIII Entrada Folklórica Universitaria Nacional — Trinidad, Beni.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`dark ${outfit.variable} ${jakarta.variable} ${symbols.variable}`}>
      <body className="font-body antialiased min-h-screen bg-amazon-gradient text-on-surface">
        {children}
      </body>
    </html>
  );
}
