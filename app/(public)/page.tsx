import { ProfitabilityCalculator } from "@/components/calculator/profitability-calculator";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  commercialPacks,
  grantOpportunities,
  pipelineDeals,
  quoteItems,
} from "@/data/mock-data";
import { formatCurrency } from "@/lib/finance";
import { theatreThemes } from "@/lib/theatre-themes";

const problems = [
  "Dates signees a perte sans le savoir",
  "Relances oubliees et dates perdues",
  "Subventions manquees faute de deadline claire",
  "Administration eparpillee entre Excel, Drive et emails",
];

const modules = [
  {
    title: "Calculateur de rentabilite",
    detail: "Point mort, marge, verdict et actions correctives avant signature.",
    tags: ["Point mort", "SACD", "Couts tournee"],
  },
  {
    title: "Carnet de diffusion",
    detail: "Programmateurs, lieux, relances et dates possibles dans une vue commune.",
    tags: ["Contacts", "Dates", "Relances"],
  },
  {
    title: "Radar subventions",
    detail: "DRAC, Regions, fondations et SACD avec montants, statuts et echeances.",
    tags: ["Deadlines", "Montants", "Alertes"],
  },
  {
    title: "Finances et devis",
    detail: "CA signe, previsionnel, acomptes, soldes et export comptable prepare.",
    tags: ["Acomptes", "FEC", "Tresorerie"],
  },
  {
    title: "Mecenat",
    detail: "Entreprises a approcher, deduction loi Aillagon et packs prets a envoyer.",
    tags: ["60%", "Packs", "Argumentaire"],
  },
  {
    title: "Campagnes email",
    detail: "Templates de diffusion, audiences, variables et suivi des envois.",
    tags: ["Templates", "Stats", "Quotas"],
  },
];

export default function LandingPage() {
  const signedOrWeighted = pipelineDeals.reduce(
    (total, deal) => total + Math.round((deal.value * deal.probability) / 100),
    0,
  );
  const grantsTotal = grantOpportunities.reduce((total, grant) => total + grant.amount, 0);
  const quotesTotal = quoteItems.reduce((total, quote) => total + quote.amount, 0);

  return (
    <main>
      <section className="border-b border-border bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <Badge className="w-fit bg-white/10 text-white">Cockpit spectacle vivant</Badge>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Votre compagnie lisible en un coup d&apos;oeil.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
              TaDiff rassemble spectacles, contacts, dates a vendre, relances,
              aides, devis et tresorerie dans un cockpit concu pour les compagnies.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/beta">Reserver la beta</ButtonLink>
              <ButtonLink href="/#calculateur" variant="secondary">
                Tester le calculateur
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-white/60">
              Beta limitee a 10 compagnies le 6 aout, puis liste d&apos;attente
              prioritaire pour les 30 suivantes.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HeroMetric label="Dates a vendre" value={formatCurrency(signedOrWeighted)} />
              <HeroMetric label="Aides suivies" value={formatCurrency(grantsTotal)} />
              <HeroMetric label="Devis actifs" value={formatCurrency(quotesTotal)} />
            </div>
          </div>

          <Card className="grid gap-4 bg-panel p-4 text-foreground">
            <div className="grid grid-cols-2 gap-3">
              <PreviewMetric label="Rentabilite" value="Avant signature" />
              <PreviewMetric label="Relances" value="Priorisees" />
              <PreviewMetric label="Subventions" value="Deadlines" />
              <PreviewMetric label="FEC" value="Prepare" />
            </div>
            <div className="rounded-lg border border-border bg-panel-strong/50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Dates a faire avancer</p>
                <Badge tone="warning">A traiter</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {pipelineDeals.map((deal) => (
                  <div key={deal.id} className="rounded-md border border-border bg-panel p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{deal.title}</p>
                        <p className="text-sm text-muted">{deal.contactOrganization}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(deal.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Badge tone="warning">Probleme</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Les compagnies meritent mieux qu Excel et les oublis.
            </h2>
            <p className="mt-4 text-muted">
              La diffusion professionnelle demande une lecture claire du risque economique,
              des prochaines actions et des dossiers administratifs.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {problems.map((problem) => (
              <Card key={problem} className="p-4">
                <p className="font-medium">{problem}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-panel">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge>5 interfaces</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Cinq directions de cockpit, toutes ancrees dans le theatre.
            </h2>
            <p className="mt-4 text-muted">
              Le bandeau de direction artistique permet de tester ces univers
              sur la landing et dans le cockpit sans changer le produit.
            </p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-5">
            {theatreThemes.map((theme) => (
              <Card key={theme.id} className="flex flex-col p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ background: theme.accent }}
                  />
                  <p className="font-semibold">{theme.name}</p>
                </div>
                <p className="mt-3 text-sm text-muted">{theme.mood}</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="font-medium">Landing</p>
                    <p className="mt-1 text-muted">{theme.landing}</p>
                  </div>
                  <div>
                    <p className="font-medium">Cockpit</p>
                    <p className="mt-1 text-muted">{theme.cockpit}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="border-y border-border bg-panel">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge>Ateliers</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Tout ce dont une compagnie a besoin pour diffuser proprement.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <Card key={module.title} className="p-5">
                <p className="text-lg font-semibold">{module.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{module.detail}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {module.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="calculateur" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <ProfitabilityCalculator />
      </section>

      <section id="subventions" className="border-y border-border bg-panel">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <Badge tone="warning">Radar subventions</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Ne manquez plus aucune aide publique.
            </h2>
            <p className="mt-4 text-muted">
              Le dashboard garde les dispositifs, montants attendus et prochaines
              deadlines au meme endroit que les spectacles et les dates a vendre.
            </p>
            <ButtonLink href="/subventions" className="mt-6">
              Ouvrir le radar
            </ButtonLink>
          </div>
          <div className="grid gap-3">
            {grantOpportunities.map((grant) => (
              <Card key={grant.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{grant.funder}</p>
                    <p className="mt-1 text-sm text-muted">{grant.title}</p>
                  </div>
                  <Badge tone={grant.status === "En montage" ? "warning" : "neutral"}>
                    {formatCurrency(grant.amount)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted">
                  Deadline {new Date(grant.deadline).toLocaleDateString("fr-FR")} - {grant.territory}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {commercialPacks.map((pack) => (
            <Card key={pack.id} className="p-5">
              <p className="font-semibold">{pack.name}</p>
              <p className="mt-2 text-sm text-muted">{pack.description}</p>
              <p className="mt-4 text-2xl font-semibold">x{pack.multiplier.toFixed(2)}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-panel p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
