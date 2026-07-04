import { notFound } from "next/navigation";
import { PrintButton } from "@/components/billing/print-button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";
import { getQuoteItemById } from "@/lib/supabase/queries";

type QuoteDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { id } = await params;
  const quote = await getQuoteItemById(id);

  if (!quote) {
    notFound();
  }

  const issueDate = new Date().toLocaleDateString("fr-FR");
  const dueDate = quote.dueDate
    ? new Date(quote.dueDate).toLocaleDateString("fr-FR")
    : "A definir";

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Document commercial</p>
          <h2 className="mt-2 text-3xl font-semibold">{quote.number}</h2>
          <p className="mt-1 text-sm text-muted">
            Devis genere depuis la facturation TaDiff.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/billing" variant="secondary">
            Retour facturation
          </ButtonLink>
          {quote.dealId ? (
            <ButtonLink href="/pipeline" variant="secondary">
              Ouvrir la diffusion
            </ButtonLink>
          ) : null}
          <PrintButton />
        </div>
      </div>

      <Card className="print-document mx-auto max-w-4xl space-y-8 bg-white p-8 text-ink shadow-lg shadow-ink/10">
        <header className="flex flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-2xl font-semibold">TaDiff</p>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Pilotage, diffusion et facturation pour compagnies de spectacle vivant.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Devis</p>
            <p className="mt-2 text-xl font-semibold">{quote.number}</p>
            <div className="mt-3">
              <Badge>{quote.status}</Badge>
            </div>
          </div>
        </header>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Destinataire</p>
            <p className="mt-2 text-lg font-semibold">{quote.organization}</p>
            <p className="mt-2 text-sm text-muted">
              Informations completes a renseigner avant envoi final.
            </p>
          </div>
          <div className="grid gap-3 sm:text-right">
            <InfoLine label="Date emission" value={issueDate} />
            <InfoLine label="Echeance" value={dueDate} />
            <InfoLine label="Reference" value={quote.id.slice(0, 8).toUpperCase()} />
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Objet</p>
          <h3 className="mt-2 text-2xl font-semibold">{quote.title}</h3>
        </section>

        <section className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_140px] bg-panel-strong px-4 py-3 text-xs uppercase tracking-[0.14em] text-muted">
            <span>Designation</span>
            <span className="text-right">Montant HT</span>
          </div>
          <div className="grid grid-cols-[1fr_140px] border-t border-border px-4 py-5 text-sm">
            <div>
              <p className="font-medium">{quote.title}</p>
              <p className="mt-1 text-muted">
                Cession, prestation ou proposition commerciale rattachee a une date possible.
              </p>
            </div>
            <p className="text-right font-semibold">{formatCurrency(quote.amount)}</p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <TotalBlock label="Montant total HT" value={formatCurrency(quote.amount)} />
          <TotalBlock label="Acompte demande" value={formatCurrency(quote.depositDue)} />
          <TotalBlock label="Solde restant" value={formatCurrency(quote.balanceDue)} />
        </section>

        <section className="rounded-lg border border-border bg-panel-strong/45 p-5 text-sm text-muted">
          <p className="font-medium text-foreground">Conditions</p>
          <p className="mt-2">
            Devis valable 30 jours, sous reserve de disponibilite de l equipe artistique et
            technique. Les frais specifiques d accueil, transport ou hebergement restent a confirmer
            si non inclus dans la proposition.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <SignatureBlock label="Pour la compagnie" />
          <SignatureBlock label="Bon pour accord" />
        </section>
      </Card>

      <p className="no-print text-center text-sm text-muted">
        Le rendu impression utilise la feuille de style navigateur. Pour un PDF, choisissez
        Enregistrer au format PDF dans la boite d impression.
      </p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function TotalBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel-strong/45 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function SignatureBlock({ label }: { label: string }) {
  return (
    <div className="min-h-28 rounded-lg border border-border p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
    </div>
  );
}
