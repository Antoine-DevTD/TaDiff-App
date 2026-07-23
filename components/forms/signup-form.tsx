"use client";

import { ButtonLink } from "@/components/ui/button";

export function SignupForm() {
  return (
    <div className="space-y-4 rounded-lg border border-accent/20 bg-panel-strong/55 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Creation fermee</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Les comptes sont actives manuellement pendant la bêta privee pour garder une cohorte
          courte et accompagnee.
        </p>
      </div>
      <ButtonLink href="/beta" className="w-full">
        Rejoindre la bêta a 19,99 EUR / mois
      </ButtonLink>
    </div>
  );
}
