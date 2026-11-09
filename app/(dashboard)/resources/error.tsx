"use client";

import { Button } from "@/components/ui/button";

export default function ResourceError({ reset }: { reset: () => void }) {
  return <section role="alert" className="py-10"><h1 className="text-2xl font-semibold">Les ressources n’ont pas pu être chargées</h1><p className="mt-3 text-sm leading-7 text-muted">Votre connexion a peut-être été interrompue. Réessayez pour retrouver les ressources.</p><Button type="button" className="mt-6" onClick={reset}>Réessayer</Button></section>;
}
