import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Maintenance - TaDiff",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="max-w-lg space-y-4 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          TaDiff
        </p>
        <h1 className="text-2xl font-semibold">Maintenance en cours</h1>
        <p className="text-sm text-muted">
          Le cockpit est temporairement indisponible pendant une intervention technique.
          Revenez un peu plus tard.
        </p>
      </Card>
    </main>
  );
}
