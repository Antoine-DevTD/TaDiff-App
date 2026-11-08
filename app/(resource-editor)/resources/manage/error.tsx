"use client";
import { Button } from "@/components/ui/button";

export default function ResourcesError({ reset }: { reset: () => void }) {
  return <section className="space-y-4"><h1 className="text-2xl font-semibold">L’éditeur est momentanément indisponible</h1><p role="alert" className="text-sm text-muted">Vérifiez votre connexion puis réessayez. Vos pages enregistrées sont conservées.</p><Button onClick={reset}>Réessayer</Button></section>;
}
