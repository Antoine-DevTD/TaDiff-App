import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  themeColor: "#8f3f2b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
