import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TaDiff - Pilotage de diffusion pour le spectacle vivant",
    template: "%s | TaDiff",
  },
  description:
    "Une web app SaaS pour piloter diffusion, rentabilite, subventions, mecenat, devis et finances des compagnies.",
  applicationName: "TaDiff",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "TaDiff",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
