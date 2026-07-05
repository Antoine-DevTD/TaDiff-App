import Link from "next/link";
import { notFound } from "next/navigation";
import { ShowDocumentDeleteButton } from "@/components/documents/show-document-delete-button";
import { ShowDocumentForm } from "@/components/documents/show-document-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDealProfitability, formatCurrency, getShowCostProfile, getVerdictMeta } from "@/lib/finance";
import {
  getDocumentStatusTone,
  getShowDocumentReadiness,
  requiredShowDocumentTypes,
} from "@/lib/show-documents";
import { getShowById } from "@/lib/supabase/queries";
import type { Show, ShowDocument } from "@/types";

type ShowDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  const { id } = await params;
  const { documents, opportunities, reminders, show } = await getShowById(id);

  if (!show) {
    notFound();
  }

  const weightedRevenue = opportunities.reduce(
    (total, deal) => total + Math.round((deal.value * deal.probability) / 100),
    0,
  );
  const costProfile = getShowCostProfile(show);
  const profitabilityRows = opportunities.map((deal) => ({
    deal,
    result: buildDealProfitability({ deal, show }),
  }));
  const documentReadiness = getShowDocumentReadiness(documents);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Fiche spectacle</p>
          <h2 className="mt-2 text-3xl font-semibold">{show.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {show.notes || "Aucune note de production pour le moment."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={show.status === "En diffusion" ? "success" : "neutral"}>{show.status}</Badge>
          <ButtonLink href={`/shows/${show.id}/edit`}>Modifier</ButtonLink>
          <ButtonLink href="/shows/new" variant="secondary">
            Nouveau spectacle
          </ButtonLink>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatBlock label="Discipline" value={show.discipline} />
        <StatBlock
          label="Prochaine date"
          value={show.nextDate ? new Date(show.nextDate).toLocaleDateString("fr-FR") : "A planifier"}
        />
        <StatBlock label="Budget" value={`${show.budget.toLocaleString("fr-FR")} EUR`} />
        <StatBlock label="CA pondere" value={`${weightedRevenue.toLocaleString("fr-FR")} EUR`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="overflow-hidden p-0">
          <ShowPoster show={show} />
          <div className="p-5">
            <p className="text-base font-semibold">Affiche et dossier</p>
            <p className="mt-2 text-sm text-muted">
              L&apos;affiche et les pieces du spectacle doivent pouvoir servir aux
              programmateurs, aux devis et aux depots de subventions.
            </p>
            <div className="mt-4 rounded-md border border-border bg-panel-strong/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Pieces essentielles</p>
                <Badge tone={documentReadiness.missingCount === 0 ? "success" : "warning"}>
                  {documentReadiness.percent}%
                </Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${documentReadiness.percent}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted">
                {documentReadiness.missingCount === 0
                  ? "Le dossier de base est pret pour un depot."
                  : `${documentReadiness.missingCount} piece(s) restent a completer.`}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dossier de subvention</CardTitle>
            <CardDescription>
              Checklist de pieces reutilisables pour preparer les depots sans repartir de zero.
            </CardDescription>
          </CardHeader>
          <DocumentChecklist documents={documents} />
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Documents lies</CardTitle>
            <CardDescription>
              Pieces du spectacle : fichiers stockes dans TaDiff ou liens externes references.
            </CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {documents.length === 0 ? (
              <EmptyPanel text="Aucun document lie a ce spectacle." />
            ) : (
              documents.map((document) => (
                <div key={document.id} className="rounded-md border border-border bg-panel-strong/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{document.title}</p>
                      <p className="mt-1 text-sm text-muted">{document.documentType}</p>
                    </div>
                    <Badge tone={getDocumentStatusTone(document.status)}>{document.status}</Badge>
                  </div>
                  {document.notes ? (
                    <p className="mt-3 text-sm text-muted">{document.notes}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    {document.fileUrl ? (
                      <a
                        className="inline-flex text-sm font-medium text-accent hover:text-accent-strong"
                        href={document.fileUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {document.storagePath ? "Telecharger le fichier" : "Ouvrir le lien"}
                      </a>
                    ) : null}
                    <ShowDocumentDeleteButton documentId={document.id} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ajouter une piece</CardTitle>
            <CardDescription>
              Televersez le fichier dans TaDiff ou referencez un lien externe. Les pieces
              stockees partent directement dans le zip de depot subvention.
            </CardDescription>
          </CardHeader>
          <ShowDocumentForm showId={show.id} />
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Structure de couts</CardTitle>
            <CardDescription>Base utilisee par le calculateur de rentabilite.</CardDescription>
          </CardHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoCell label="Artistes" value={formatCurrency(costProfile.artistFees)} />
            <InfoCell label="Technique" value={formatCurrency(costProfile.technicalFees)} />
            <InfoCell label="Droits" value={formatCurrency(costProfile.rights)} />
            <InfoCell label="Production" value={formatCurrency(costProfile.production)} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rentabilite des dates</CardTitle>
            <CardDescription>Les dates a perte remontent avant signature.</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {profitabilityRows.length === 0 ? (
              <EmptyPanel text="Aucune date a calculer." />
            ) : (
              profitabilityRows.map(({ deal, result }) => {
                const verdict = getVerdictMeta(result.verdict);

                return (
                  <div key={deal.id} className="rounded-md border border-border bg-panel-strong/45 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{deal.title}</p>
                        <p className="mt-1 text-sm text-muted">
                          Marge {formatCurrency(result.margin)} - point mort {formatCurrency(result.breakEven)}
                        </p>
                      </div>
                      <Badge tone={verdict.tone}>{verdict.label}</Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dates liees</CardTitle>
            <CardDescription>Diffusion, negociation et prochaines actions sur ce spectacle.</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {opportunities.length === 0 ? (
              <EmptyPanel text="Aucune date liee a ce spectacle." />
            ) : (
              opportunities.map((deal) => (
                <div
                  key={deal.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-panel-strong/45 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{deal.title}</p>
                    <p className="mt-1 text-sm text-muted">
                      {deal.contactName} - {deal.contactOrganization || deal.venue}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {deal.nextAction || "Prochaine action a definir"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <p className="font-medium">{deal.value.toLocaleString("fr-FR")} EUR</p>
                      <p className="text-xs text-muted">{deal.probability}%</p>
                    </div>
                    <Badge>{deal.stage}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relances associees</CardTitle>
              <CardDescription>Suivi des actions prevues pour ce spectacle.</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {reminders.length === 0 ? (
                <EmptyPanel text="Aucune relance ouverte sur ce spectacle." />
              ) : (
                reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-md border border-border bg-panel-strong/45 p-4">
                    <p className="font-medium">{reminder.label}</p>
                    <p className="mt-1 text-sm text-muted">{reminder.relatedTo || show.title}</p>
                    <p className="mt-2 text-xs text-muted">
                      {new Date(reminder.dueDate).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Navigation rapide</CardTitle>
              <CardDescription>Aller directement aux modules relies.</CardDescription>
            </CardHeader>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/pipeline" variant="secondary">
                Ouvrir la diffusion
              </ButtonLink>
              <ButtonLink href="/reminders" variant="secondary">
                Voir les relances
              </ButtonLink>
              <Link className="inline-flex min-h-10 items-center text-sm font-medium text-accent hover:text-accent-strong" href="/shows">
                Retour a la liste
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-xl font-semibold">{value}</p>
    </Card>
  );
}

function ShowPoster({ show }: { show: Show }) {
  const style = show.posterUrl
    ? { backgroundImage: `url(${show.posterUrl})` }
    : undefined;

  return (
    <div
      className="flex aspect-[4/3] items-end bg-ink bg-cover bg-center p-5 text-white"
      style={style}
    >
      <div className="w-full rounded-md bg-ink/76 p-4 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.14em] text-white/55">Affiche spectacle</p>
        <p className="mt-2 text-xl font-semibold">{show.title}</p>
        <p className="mt-1 text-sm text-white/65">{show.discipline}</p>
      </div>
    </div>
  );
}

function DocumentChecklist({ documents }: { documents: ShowDocument[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {requiredShowDocumentTypes.map((type) => {
        const document = documents.find((item) => item.documentType === type);
        const status = document?.status ?? "Manquant";

        return (
          <div key={type} className="rounded-md border border-border bg-panel-strong/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{type}</p>
                <p className="mt-1 text-sm text-muted">
                  {document?.title || "A ajouter au dossier"}
                </p>
              </div>
              <Badge tone={getDocumentStatusTone(status)}>{status}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-panel-strong/35 p-4 text-sm text-muted">
      {text}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-panel-strong/45 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}
