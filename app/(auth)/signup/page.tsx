import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md border-accent/25 bg-panel/95">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-accent">
          Beta privee
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Creation de compte suspendue</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Les nouveaux espaces TaDiff sont ouverts uniquement aux compagnies retenues pour la
          beta de lancement a 19,99 EUR / mois.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-panel-strong/60 p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Prochaine etape</p>
        <p className="mt-1">
          Reserve ta place beta. On activera ensuite ton acces manuellement pour garder une
          cohorte courte et bien accompagnee.
        </p>
      </div>
      <div className="mt-6 grid gap-3">
        <ButtonLink href="/beta" className="w-full">
          Rejoindre la beta a 19,99 EUR / mois
        </ButtonLink>
        <ButtonLink href="/login" variant="secondary" className="w-full">
          J&apos;ai deja un compte
        </ButtonLink>
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Besoin d&apos;un acces de demo ?{" "}
        <Link href="/beta" className="font-medium text-accent">
          Passe par la liste beta
        </Link>
      </p>
    </Card>
  );
}
