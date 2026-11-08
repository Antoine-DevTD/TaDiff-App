"use client";

import { Button, ButtonLink } from "@/components/ui/button";

export default function ResourceError({ reset }: { reset: () => void }) {
  return <section role="alert" className="mx-auto max-w-xl py-10"><h1 className="text-2xl font-semibold">La ressource n’a pas pu être chargée</h1><p className="mt-3 text-sm leading-7 text-muted">Votre connexion a peut-être été interrompue. Réessayez pour retrouver la page.</p><div className="mt-6 flex flex-wrap gap-3"><Button type="button" onClick={reset}>Réessayer</Button><ButtonLink href="/ressources" variant="secondary">Toutes les ressources</ButtonLink></div></section>;
}
