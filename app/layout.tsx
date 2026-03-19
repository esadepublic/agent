// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent PUBLIC · EsadeGov",
  description:
    "Agent de gestió pública basat en els continguts del butlletí PUBLIC d'EsadeGov, el Centre de Governança Pública d'Esade.",
  openGraph: {
    title: "Agent PUBLIC · EsadeGov",
    description:
      "Consulta en temps real tots els articles del butlletí PUBLIC d'EsadeGov.",
    url: "https://agent.esadepublic.esade.edu", // canvia pel teu domini
    siteName: "PUBLIC Agent",
    locale: "ca_ES",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca">
      <body>{children}</body>
    </html>
  );
}
