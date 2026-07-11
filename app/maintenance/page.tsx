import type { Metadata } from "next";
import { ServanteLoader } from "@/components/ui/servante-loader";

export const metadata: Metadata = {
  title: "Maintenance - TaDiff",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MaintenancePage() {
  return (
    <ServanteLoader
      label="En maintenance"
      description="Le cockpit est temporairement indisponible pendant une intervention technique. Revenez un peu plus tard."
    />
  );
}
