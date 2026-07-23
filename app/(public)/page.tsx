import {
  ArrowRight,
  CalendarClock,
  Check,
  Clapperboard,
  FolderCheck,
  MailCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { ProfitabilityCalculator } from "@/components/calculator/profitability-calculator";
import { Reveal } from "@/components/marketing/reveal";
import { SalesFunnel } from "@/components/marketing/sales-funnel";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { pipelineDeals } from "@/data/mock-data";
import { formatCurrency } from "@/lib/finance";
import { getBetaSignupStats } from "@/lib/supabase/queries";
import { betaReservedSeatLimit } from "@/lib/beta";

const problems = [
  "Une date signée sans savoir si elle sera rentable.",
  "Une relance ou une échéance oubliée dans un fichier.",
  "Un dossier bloqué parce qu'une pièce manque au dernier moment.",
];

const outcomes = [
  {
    icon: CalendarClock,
    title: "Savoir quoi faire aujourd'hui",
    detail: "TaDiff rassemble les actions, dates et échéances dans un ordre clair.",
  },
  {
    icon: WalletCards,
    title: "Vérifier avant de signer",
    detail: "Marge, frais fixes et trésorerie restent visibles avant chaque engagement.",
  },
  {
    icon: FolderCheck,
    title: "Déposer un dossier complet",
    detail: "Les pièces indispensables sont classées par spectacle et réutilisables.",
  },
];

const steps = [
  {
    number: "1",
    title: "Ajoutez votre spectacle",
    detail: "Affiche, budget, équipe et documents trouvent leur place dans un dossier unique.",
  },
  {
    number: "2",
    title: "Faites avancer vos dates",
    detail: "Programmateurs, prochaines actions, emails et représentations restent reliés.",
  },
  {
    number: "3",
    title: "Suivez ce qui compte",
    detail: "Le cockpit fait remonter les urgences, les encaissements et les dossiers incomplets.",
  },
];

export default async function LandingPage() {
  const betaStats = await getBetaSignupStats();
  const betaFull = betaStats.remainingReservedSeats === 0;
  const betaLabel = betaFull
    ? `Les ${betaReservedSeatLimit} places sont attribuees. La liste d'attente reste ouverte.`
    : betaStats.remainingReservedSeats === 1
      ? "Derniere place disponible pour la bêta."
      : `${betaStats.remainingReservedSeats} places disponibles sur ${betaReservedSeatLimit}.`;

  return (
    <main>
      <section className="border-b border-border bg-panel">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:min-h-[calc(100vh-9rem)] lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <Badge tone="info">Cockpit du spectacle vivant</Badge>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.04] text-balance sm:text-6xl lg:text-7xl">
              Le cockpit de votre compagnie.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted text-pretty">
              Spectacles, dates, dossiers et trésorerie réunis dans un outil qui vous indique ce
              qui demande votre attention, sans jargon de gestion.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/beta" data-analytics="beta_hero" className="gap-2">
                {betaFull ? "Rejoindre la liste d'attente" : "Réserver ma place bêta"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <Link
                href="/#produit"
                className="inline-flex min-h-10 items-center justify-center px-3 text-sm font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Voir comment cela fonctionne
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm font-medium text-muted">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
              {betaLabel} Tarif pilote : 19,99 EUR / mois.
            </p>
          </div>

          <Reveal>
            <CockpitPreview />
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="problems-title" className="border-b border-border bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Le point de départ</p>
              <h2 id="problems-title" className="mt-3 text-3xl font-semibold text-balance">
                Une compagnie ne devrait pas fermer pour une information arrivée trop tard.
              </h2>
            </div>
            <div className="divide-y divide-white/15 border-y border-white/15">
              {problems.map((problem, index) => (
                <div key={problem} className="group flex gap-4 py-4">
                  <span className="mt-0.5 text-sm font-semibold text-white/45">0{index + 1}</span>
                  <p className="relative flex-1 pb-1 font-medium text-white/85 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-white after:transition-transform after:duration-200 group-hover:after:scale-x-100">
                    {problem}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="produit" className="scroll-mt-36 border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Reveal className="max-w-3xl">
            <Badge tone="info">Le produit</Badge>
            <h2 className="mt-4 text-3xl font-semibold text-balance sm:text-4xl">
              Une lecture simple de toute la compagnie.
            </h2>
            <p className="mt-4 max-w-2xl text-muted text-pretty">
              Chaque information est reliée à une décision : relancer, compléter, encaisser ou
              préparer la prochaine représentation.
            </p>
          </Reveal>

          <div className="mt-10 grid border-y border-border lg:grid-cols-3 lg:divide-x lg:divide-border">
            {outcomes.map(({ detail, icon: Icon, title }, index) => (
              <Reveal key={title} delay={index * 80} className="border-b border-border p-6 last:border-b-0 lg:border-b-0">
                <Icon className="h-6 w-6 text-accent" strokeWidth={1.8} aria-hidden />
                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{detail}</p>
              </Reveal>
            ))}
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="lg:sticky lg:top-40">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Premier parcours</p>
              <h2 className="mt-3 text-3xl font-semibold text-balance">De l&apos;affiche à la date signée.</h2>
              <p className="mt-4 text-muted">
                Trois étapes suffisent pour que le cockpit commence à vous guider.
              </p>
            </div>
            <div className="divide-y divide-border border-y border-border">
              {steps.map((step) => (
                <div key={step.number} className="grid gap-3 py-6 sm:grid-cols-[3rem_1fr]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-sm font-semibold text-white">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="demonstration" className="mx-auto max-w-5xl scroll-mt-36 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Badge tone="info">Démonstration personnalisee</Badge>
          <h2 className="mt-4 text-3xl font-semibold text-balance sm:text-4xl">
            Que devrait vous montrer TaDiff en premier ?
          </h2>
          <p className="mt-4 text-muted">
            Répondez à trois questions et obtenez un exemple adapté à votre situation.
          </p>
        </Reveal>
        <Reveal className="mt-8" delay={100}>
          <SalesFunnel />
        </Reveal>
      </section>

      <section className="beta-band border-y border-white/15 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Bêta accompagnée</p>
            <h2 className="mt-3 text-3xl font-semibold text-balance">
              {betaReservedSeatLimit} compagnies pour construire la bonne version.
            </h2>
            <p className="mt-3 max-w-2xl text-white/80">
              Accès à 19,99 EUR / mois pendant la bêta, retours réguliers et accompagnement
              prioritaire. {betaLabel}
            </p>
          </div>
          <ButtonLink
            href="/beta"
            variant="secondary"
            data-analytics="beta_midpage"
            className="gap-2 border-white bg-white shadow-lg shadow-ink/15 hover:bg-white/90"
          >
            {betaFull ? "Liste d'attente" : "Réserver ma place"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>

      <section id="calculateur" className="mx-auto max-w-7xl scroll-mt-36 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal>
          <ProfitabilityCalculator />
        </Reveal>
      </section>

      <section className="border-t border-border bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Avant de commencer</p>
            <h2 className="mt-3 text-3xl font-semibold text-balance sm:text-4xl">
              Vous gardez la main sur votre compagnie.
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                "Vos données restent séparées de celles des autres compagnies.",
                "Vous pouvez exporter vos informations et vos documents.",
                "Les fonctions encore en préparation sont annoncées clairement.",
                "La bêta sert à adapter le produit à vos usages réels.",
              ].map((item) => (
                <p key={item} className="flex gap-3 text-sm leading-6 text-white/75">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-white" aria-hidden />
                  {item}
                </p>
              ))}
            </div>
          </div>
          <div className="border-t border-white/15 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <p className="text-sm text-white/65">Prêt à voir le cockpit avec vos propres spectacles ?</p>
            <p className="mt-3 text-2xl font-semibold">19,99 EUR / mois pendant la bêta.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col">
              <ButtonLink
                href="/beta"
                variant="secondary"
                data-analytics="beta_final"
                className="gap-2 border-white bg-white shadow-lg shadow-black/15 hover:bg-white/90"
              >
                {betaFull ? "Rejoindre la liste d'attente" : "Réserver ma place bêta"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/login" variant="ghost" data-analytics="login_final" className="border border-white/20 !text-white hover:bg-white/10">
                J&apos;ai déjà un compte
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function CockpitPreview() {
  return (
    <div className="relative border border-border bg-background p-3 shadow-xl shadow-ink/10 sm:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-accent" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Exemple de cockpit</p>
        </div>
        <Badge tone="success">Compagnie en bonne voie</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <PreviewMetric label="Trésorerie" value="Sous contrôle" />
        <PreviewMetric label="Dossier prioritaire" value="2 pièces" />
        <PreviewMetric label="Prochaine date" value="28 juillet" />
      </div>

      <div className="mt-4 border border-border bg-panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">À faire maintenant</p>
            <p className="text-xs text-muted">Les actions classées par priorité</p>
          </div>
          <Badge tone="warning">1 urgence</Badge>
        </div>
        <div className="divide-y divide-border">
          {pipelineDeals.slice(0, 3).map((deal, index) => (
            <div key={deal.id} className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-xs font-semibold text-accent">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{deal.nextAction || deal.title}</p>
                <p className="truncate text-xs text-muted">{deal.contactOrganization}</p>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(deal.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted">
        <MailCheck className="h-4 w-4 text-accent" aria-hidden />
        Le prochain email est prêt à être relu.
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-panel p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
