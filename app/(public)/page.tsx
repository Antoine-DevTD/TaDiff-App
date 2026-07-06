import Link from "next/link";
import { ProfitabilityCalculator } from "@/components/calculator/profitability-calculator";
import { Reveal } from "@/components/marketing/reveal";
import { SalesFunnel } from "@/components/marketing/sales-funnel";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { grantOpportunities, pipelineDeals, quoteItems } from "@/data/mock-data";
import { formatCurrency } from "@/lib/finance";

const problems = [
  "Dates signees a perte sans le savoir",
  "Relances oubliees et dates perdues",
  "Subventions manquees faute de deadline claire",
  "Administration eparpillee entre Excel, Drive et emails",
];

const steps = [
  {
    n: "01",
    title: "On rassemble tout",
    detail: "Spectacles, contacts, dates, subventions, devis et tresorerie au meme endroit.",
  },
  {
    n: "02",
    title: "On calcule le risque",
    detail: "Point mort, marge et date de tresorerie tendue avant de signer quoi que ce soit.",
  },
  {
    n: "03",
    title: "On dit quoi faire",
    detail: "Le cockpit sort chaque jour les relances, dossiers et encaissements prioritaires.",
  },
  {
    n: "04",
    title: "Vous diffusez sereinement",
    detail: "Plus d'oublis, plus de ventes a perte, plus de subventions ratees.",
  },
];

const modules = [
  { title: "Calculateur de rentabilite", detail: "Point mort, marge, verdict et actions avant signature.", tags: ["Point mort", "SACD", "Couts tournee"] },
  { title: "Carnet de diffusion", detail: "Programmateurs, lieux, relances et dates possibles dans une vue commune.", tags: ["Contacts", "Dates", "Relances"] },
  { title: "Radar subventions", detail: "DRAC, Regions, fondations et SACD avec montants, statuts et echeances.", tags: ["Deadlines", "Montants", "Alertes"] },
  { title: "Finances et devis", detail: "CA signe, previsionnel, acomptes, soldes et export comptable prepare.", tags: ["Acomptes", "FEC", "Tresorerie"] },
  { title: "Mecenat", detail: "Entreprises a approcher, deduction loi Aillagon et packs prets a envoyer.", tags: ["60%", "Packs", "Argumentaire"] },
  { title: "Agenda et documents", detail: "Dates, deadlines perso et pieces de la compagnie reutilisables partout.", tags: ["iCal", "RIB", "Statuts"] },
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
      {/* HERO clair */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60rem 40rem at 80% -10%, rgba(29,78,216,0.14), transparent 60%), radial-gradient(50rem 30rem at 0% 10%, rgba(29,78,216,0.08), transparent 55%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-28">
          <div>
            <Badge className="bg-accent/10 text-accent" tone="info">
              Cockpit du spectacle vivant
            </Badge>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Pilotez votre compagnie
              <span className="block text-accent">sans rien laisser filer.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              Diffusion, subventions, devis et tresorerie reunis dans un cockpit clair.
              TaDiff vous dit quoi faire, quand, et combien ca rapporte vraiment.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/beta">Reserver la beta</ButtonLink>
              <ButtonLink href="/#usages" variant="secondary">
                A quoi pourrait vous servir TaDiff ?
              </ButtonLink>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              <HeroMetric label="Dates a vendre" value={formatCurrency(signedOrWeighted)} />
              <HeroMetric label="Aides suivies" value={formatCurrency(grantsTotal)} />
              <HeroMetric label="Devis actifs" value={formatCurrency(quotesTotal)} />
            </div>
          </div>

          <Reveal>
            <Card className="rotate-1 p-4 shadow-lg shadow-ink/10">
              <div className="grid grid-cols-2 gap-3">
                <PreviewMetric label="Rentabilite" value="Avant signature" />
                <PreviewMetric label="Relances" value="Priorisees" />
                <PreviewMetric label="Subventions" value="Deadlines" />
                <PreviewMetric label="Tresorerie" value="Sous controle" />
              </div>
              <div className="mt-3 rounded-lg border border-border bg-panel-strong/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Dates a faire avancer</p>
                  <Badge tone="warning">A traiter</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {pipelineDeals.slice(0, 3).map((deal) => (
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
          </Reveal>
        </div>
      </section>

      {/* BANDEAU BETA anime */}
      <section className="beta-band text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 text-center sm:px-6 lg:flex-row lg:justify-between lg:text-left lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              <span className="beta-dot h-2.5 w-2.5 rounded-full bg-white" />
              Inscriptions beta ouvertes
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              10 places seulement. Securisez la votre.
            </h2>
            <p className="mt-2 max-w-2xl text-white/85">
              Les 10 premieres compagnies rejoignent la beta le 6 aout, puis liste d&apos;attente
              prioritaire pour les 30 suivantes.
            </p>
          </div>
          <Link
            href="/beta"
            className="inline-flex min-h-12 shrink-0 items-center rounded-md bg-white px-6 text-sm font-semibold text-accent shadow-lg shadow-ink/20 transition hover:-translate-y-0.5"
          >
            Reserver ma place
          </Link>
        </div>
      </section>

      {/* TUNNEL DE VENTE interactif */}
      <section id="usages" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Badge tone="info">A quoi ca sert</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Parlez-nous de votre spectacle.
          </h2>
          <p className="mt-4 text-muted">
            Trois questions, et on vous montre concretement ce que TaDiff changerait pour vous.
          </p>
        </Reveal>
        <Reveal className="mt-8" delay={100}>
          <SalesFunnel />
        </Reveal>
      </section>

      {/* PROBLEME */}
      <section className="border-y border-border bg-panel">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <Reveal>
            <Badge tone="warning">Le probleme</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Les compagnies meritent mieux qu&apos;Excel et les oublis.
            </h2>
            <p className="mt-4 text-muted">
              La diffusion demande une lecture claire du risque, des prochaines actions et des
              dossiers administratifs. Eparpille, on perd des dates et de l&apos;argent.
            </p>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {problems.map((problem, index) => (
              <Reveal key={problem} delay={index * 80}>
                <Card className="h-full p-4">
                  <p className="font-medium">{problem}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <Badge tone="info">Comment ca marche</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            De la premiere date au dossier de subvention.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <Reveal key={step.n} delay={index * 90}>
              <Card className="h-full p-5">
                <p className="text-3xl font-semibold text-accent/30">{step.n}</p>
                <p className="mt-3 text-lg font-semibold">{step.title}</p>
                <p className="mt-2 text-sm text-muted">{step.detail}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* MODULES */}
      <section id="fonctionnalites" className="border-y border-border bg-panel scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <Badge>Les modules</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Tout ce qu&apos;il faut pour diffuser proprement.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module, index) => (
              <Reveal key={module.title} delay={(index % 3) * 90}>
                <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:border-accent/40">
                  <p className="text-lg font-semibold">{module.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{module.detail}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {module.tags.map((tag) => (
                      <Badge key={tag} tone="info">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CALCULATEUR */}
      <section id="calculateur" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
        <Reveal>
          <ProfitabilityCalculator />
        </Reveal>
      </section>

      {/* CTA FINAL */}
      <section className="border-t border-border bg-panel">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Pretez a piloter votre compagnie autrement ?
            </h2>
            <p className="mt-4 text-muted">
              Rejoignez la beta et arretez de deviner : voyez enfin ce qui vend, ce qui bloque et
              ce qui presse.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/beta">Reserver la beta</ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                J&apos;ai deja un compte
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4 shadow-sm shadow-ink/5">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-panel-strong/40 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
