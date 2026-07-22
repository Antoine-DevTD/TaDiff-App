"use client";

import { ExternalLink, Plus, Save, Trash2, Users } from "lucide-react";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { saveShowBudgetProfile } from "@/app/(dashboard)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { calculateShowBudget, profitabilityAt } from "@/lib/show-budget";
import type { ShowBudgetItem, ShowBudgetPersonnel, ShowBudgetProfile } from "@/types";

const groupLabels = {
  plateau: "Au plateau",
  creation: "Création et mise en scène",
  technique: "Technique",
} as const;

export function TheatreBudgetPlanner({
  initialProfile,
  items,
  showId,
}: {
  initialProfile: ShowBudgetProfile;
  items: ShowBudgetItem[];
  showId: string;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const summary = useMemo(() => calculateShowBudget(profile, items), [profile, items]);

  function update<K extends keyof ShowBudgetProfile>(key: K, value: ShowBudgetProfile[K]) {
    setMessage("");
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function updatePerson(id: string, changes: Partial<ShowBudgetPersonnel>) {
    update("personnel", profile.personnel.map((person) => person.id === id ? { ...person, ...changes } : person));
  }

  function save() {
    setMessage("");
    startTransition(async () => {
      const result = await saveShowBudgetProfile(showId, profile);
      setMessage(result.message);
    });
  }

  return (
    <div className="space-y-10">
      <section className="border-y border-border py-6" aria-labelledby="budget-reading-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Lecture immédiate</p>
            <h3 id="budget-reading-title" className="mt-2 text-xl font-semibold">Le spectacle tient-il économiquement ?</h3>
          </div>
          <Button className="gap-2" disabled={isPending} type="button" onClick={save}>
            <Save aria-hidden="true" className="h-4 w-4" />
            Enregistrer les hypothèses
          </Button>
        </div>
        {message ? <p className={`mt-3 text-sm ${message.includes("enregistr") || message.includes("valid") ? "text-success" : "text-danger"}`}>{message}</p> : null}

        <div className="mt-6 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Création à financer" value={money(summary.remainingCreationCost)} detail={`${money(summary.securedFunding)} déjà financés`} />
          <Metric label="Coût d'un plateau" value={money(summary.performanceCost)} detail={`dont ${money(summary.performancePersonnel)} d'équipe`} />
          <Metric label="Cession conseillée" value={money(summary.recommendedCessionFee)} detail={`création lissée sur ${profile.performancesTarget} dates`} tone="accent" />
          <Metric
            label="Point d'équilibre"
            value={summary.breakEvenPerformances === null ? "Non atteint" : `${summary.breakEvenPerformances} date${summary.breakEvenPerformances > 1 ? "s" : ""}`}
            detail={summary.contributionPerPerformance > 0 ? `${money(summary.contributionPerPerformance)} récupérés par date` : "Chaque date creuse le déficit"}
            tone={summary.breakEvenPerformances === null ? "danger" : "success"}
          />
        </div>
      </section>

      <PersonnelEditor personnel={profile.personnel} onAdd={() => update("personnel", [...profile.personnel, newPerson()])} onChange={updatePerson} onRemove={(id) => update("personnel", profile.personnel.filter((person) => person.id !== id))} />

      <section className="border-t border-border pt-7" aria-labelledby="budget-exploitation-title">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Exploitation</p>
          <h3 id="budget-exploitation-title" className="mt-2 text-xl font-semibold">Tester une soirée réelle</h3>
          <p className="mt-1 text-sm leading-6 text-muted">Cession, partage de billetterie ou location : changez le scénario et voyez immédiatement le résultat.</p>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <Field label="Mode d'exploitation">
            <Select value={profile.exploitationMode} onChange={(event) => update("exploitationMode", event.target.value as ShowBudgetProfile["exploitationMode"])}>
              <option value="cession">Cession</option>
              <option value="revenue_share">Partage de billetterie</option>
              <option value="rental">Location de salle</option>
            </Select>
          </Field>
          {profile.exploitationMode === "cession" ? <NumberField label="Prix de cession envisagé" suffix="EUR" value={profile.cessionFee} onChange={(value) => update("cessionFee", value)} /> : null}
          {profile.exploitationMode === "revenue_share" ? <NumberField label="Part compagnie" suffix="%" value={profile.companySharePercent} onChange={(value) => update("companySharePercent", value)} /> : null}
          {profile.exploitationMode === "revenue_share" ? <NumberField label="Minimum garanti" suffix="EUR" value={profile.minimumGuarantee} onChange={(value) => update("minimumGuarantee", value)} /> : null}
          {profile.exploitationMode === "rental" ? <NumberField label="Location par représentation" suffix="EUR" value={profile.venueRental} onChange={(value) => update("venueRental", value)} /> : null}
          <NumberField label="Prix moyen d'une place" suffix="EUR" value={profile.averageTicketPrice} onChange={(value) => update("averageTicketPrice", value)} />
          <NumberField label="Jauge" suffix="places" value={profile.venueCapacity} onChange={(value) => update("venueCapacity", value)} />
          <NumberField label="Remplissage envisagé" suffix="%" value={profile.expectedOccupancyPercent} onChange={(value) => update("expectedOccupancyPercent", value)} />
        </div>
        <div className="mt-5 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
          <Metric label="Public attendu" value={`${summary.expectedAttendance} personnes`} detail={`${profile.expectedOccupancyPercent} % de ${profile.venueCapacity} places`} />
          <Metric label="Recette compagnie" value={money(summary.performanceIncome)} detail={`${money(summary.expectedBoxOffice)} de billetterie estimée`} />
          <Metric label="Public minimum en location" value={summary.audienceBreakEven === null ? "À compléter" : `${summary.audienceBreakEven} personnes`} detail="pour couvrir cette représentation" tone={summary.audienceBreakEven && summary.audienceBreakEven > profile.venueCapacity ? "danger" : "success"} />
        </div>
      </section>

      <section className="grid gap-8 border-t border-border pt-7 xl:grid-cols-[0.8fr_1.2fr]" aria-labelledby="budget-rights-title">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Droits et marge</p>
          <h3 id="budget-rights-title" className="mt-2 text-xl font-semibold">Ne rien oublier sur chaque date</h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Lieu de représentation"><Select value={profile.rightsTerritory} onChange={(event) => {
              const rightsTerritory = event.target.value as ShowBudgetProfile["rightsTerritory"];
              setProfile((current) => ({
                ...current,
                rightsTerritory,
                authorRightsPercent: rightsTerritory === "paris" ? 12 : 10.5,
                sacdContributionPercent: rightsTerritory === "paris" ? 1 : 2.1,
              }));
            }}><option value="outside_paris">France hors Paris</option><option value="paris">Paris</option></Select></Field>
            <NumberField label="Droits d'auteur texte" suffix="%" value={profile.authorRightsPercent} onChange={(value) => update("authorRightsPercent", value)} />
            <NumberField label="Contribution SACD" suffix="%" value={profile.sacdContributionPercent} onChange={(value) => update("sacdContributionPercent", value)} />
            <NumberField label="Droits de mise en scène" suffix="%" value={profile.directorRightsPercent} onChange={(value) => update("directorRightsPercent", value)} />
            <NumberField label="Droits musicaux" suffix="%" value={profile.musicRightsPercent} onChange={(value) => update("musicRightsPercent", value)} />
            <NumberField label="Marge de cession visée" suffix="%" value={profile.cessionMarginPercent} onChange={(value) => update("cessionMarginPercent", value)} />
            <NumberField label="Frais généraux création" suffix="%" value={profile.overheadPercent} onChange={(value) => update("overheadPercent", value)} />
            <NumberField label="Imprévus création" suffix="%" value={profile.contingencyPercent} onChange={(value) => update("contingencyPercent", value)} />
          </div>
          <p className="mt-4 border-l-2 border-warning pl-3 text-xs leading-5 text-muted">TaDiff retient la plus forte assiette entre billetterie estimée et prix de cession. La mise en scène, la musique, les accords particuliers, la TVA et les minimums garantis restent à vérifier pour chaque exploitation.</p>
          <a className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline" href="https://www.sacd.fr/fr/organisateurs-de-spectacles-r%C3%A9gler-des-droits" rel="noreferrer" target="_blank">Vérifier le barème SACD <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a>
        </div>
        <ProfitabilityChart profile={profile} summary={summary} />
      </section>

      <section className="border-t border-border pt-7" aria-labelledby="budget-reference-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Repères de rémunération</p>
            <h3 id="budget-reference-title" className="mt-2 text-lg font-semibold">Une base vérifiable, jamais un chiffre aveugle</h3>
            <p className="mt-1 text-sm leading-6 text-muted">Les taux préremplis servent de point de départ. Vérifiez la convention applicable, la jauge, le nombre de représentations et le type de contrat avec votre gestionnaire de paie.</p>
          </div>
          {profile.rateSourceUrl ? <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-panel-strong" href={profile.rateSourceUrl} rel="noreferrer" target="_blank">Source officielle <ExternalLink aria-hidden="true" className="h-4 w-4" /></a> : null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[1.4fr_0.7fr]">
          <Field label="Convention ou référentiel"><Input value={profile.convention} onChange={(event) => update("convention", event.target.value)} /></Field>
          <Field label="Taux en vigueur depuis"><Input type="date" value={profile.rateEffectiveDate} onChange={(event) => update("rateEffectiveDate", event.target.value)} /></Field>
        </div>
      </section>
    </div>
  );
}

function PersonnelEditor({ personnel, onAdd, onChange, onRemove }: {
  personnel: ShowBudgetPersonnel[];
  onAdd: () => void;
  onChange: (id: string, changes: Partial<ShowBudgetPersonnel>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section aria-labelledby="budget-team-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Montage et plateau</p>
          <h3 id="budget-team-title" className="mt-2 text-xl font-semibold">Qui travaille sur le spectacle ?</h3>
          <p className="mt-1 text-sm text-muted">Activez les métiers présents, puis indiquez les services, cachets bruts et charges estimées.</p>
        </div>
        <Button className="gap-2" type="button" variant="secondary" onClick={onAdd}><Plus aria-hidden="true" className="h-4 w-4" />Ajouter un métier</Button>
      </div>
      <div className="mt-6 space-y-7">
        {(Object.keys(groupLabels) as Array<keyof typeof groupLabels>).map((group) => {
          const rows = personnel.filter((person) => person.group === group);
          if (rows.length === 0) return null;
          return <div key={group}>
            <div className="flex items-center gap-2 border-b border-border pb-2"><Users aria-hidden="true" className="h-4 w-4 text-accent" /><h4 className="text-sm font-semibold">{groupLabels[group]}</h4></div>
            <div className="divide-y divide-border">
              {rows.map((person) => <PersonnelRow key={person.id} person={person} onChange={onChange} onRemove={onRemove} />)}
            </div>
          </div>;
        })}
      </div>
    </section>
  );
}

function PersonnelRow({ person, onChange, onRemove }: { person: ShowBudgetPersonnel; onChange: (id: string, changes: Partial<ShowBudgetPersonnel>) => void; onRemove: (id: string) => void }) {
  return (
    <div className={`grid gap-3 py-4 transition xl:grid-cols-[32px_minmax(170px,1.4fr)_80px_repeat(4,minmax(105px,0.75fr))_40px] ${person.active ? "opacity-100" : "opacity-55"}`}>
      <label className="flex min-h-11 items-center"><input aria-label={`Inclure ${person.label}`} checked={person.active} className="h-5 w-5 accent-accent" type="checkbox" onChange={(event) => onChange(person.id, { active: event.target.checked })} /></label>
      <Field label="Métier"><Input value={person.label} onChange={(event) => onChange(person.id, { label: event.target.value })} /><Select className="mt-2" aria-label={`Famille de ${person.label}`} value={person.group} onChange={(event) => onChange(person.id, { group: event.target.value as ShowBudgetPersonnel["group"] })}><option value="plateau">Au plateau</option><option value="creation">Création</option><option value="technique">Technique</option></Select></Field>
      <NumberField compact label="Nombre" value={person.count} onChange={(value) => onChange(person.id, { count: Math.max(1, value) })} />
      <NumberField compact label="Services de répétition" value={person.rehearsalServices} onChange={(value) => onChange(person.id, { rehearsalServices: value })} />
      <NumberField compact label="Brut / répétition" suffix="EUR" value={person.rehearsalGrossRate} onChange={(value) => onChange(person.id, { rehearsalGrossRate: value })} />
      <NumberField compact label="Brut / date" suffix="EUR" value={person.performanceGrossRate} onChange={(value) => onChange(person.id, { performanceGrossRate: value })} />
      <NumberField compact label="Charges" suffix="%" value={Math.round(person.chargeRate * 100)} onChange={(value) => onChange(person.id, { chargeRate: value / 100 })} />
      <button aria-label={`Supprimer ${person.label}`} className="mt-6 flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-danger/10 hover:text-danger" type="button" onClick={() => onRemove(person.id)}><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
    </div>
  );
}

function ProfitabilityChart({ profile, summary }: { profile: ShowBudgetProfile; summary: ReturnType<typeof calculateShowBudget> }) {
  const maxPerformances = Math.min(Math.max(profile.performancesTarget, (summary.breakEvenPerformances ?? 0) + 3, 10), 60);
  const points = Array.from({ length: 11 }, (_, index) => {
    const performances = Math.round((maxPerformances * index) / 10);
    return { performances, value: profitabilityAt(summary, performances) };
  });
  const values = points.map((point) => point.value).concat(0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const x = (value: number) => 38 + (value / maxPerformances) * 644;
  const y = (value: number) => 184 - ((value - min) / range) * 144;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.performances)} ${y(point.value)}`).join(" ");

  return (
    <div className="border border-border bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold">Courbe de rentabilité</h4><p className="mt-1 text-sm text-muted">Résultat cumulé selon le nombre de représentations.</p></div><Badge tone={summary.contributionPerPerformance > 0 ? "success" : "danger"}>{summary.contributionPerPerformance > 0 ? "Chaque date rapproche du vert" : "Scénario déficitaire"}</Badge></div>
      <svg aria-label="Courbe de rentabilité du spectacle" className="mt-5 h-auto w-full" role="img" viewBox="0 0 720 220">
        <line stroke="currentColor" className="text-border" x1="38" x2="682" y1={y(0)} y2={y(0)} />
        <line stroke="currentColor" className="text-border" x1="38" x2="38" y1="36" y2="184" />
        <path d={path} fill="none" stroke="currentColor" className="text-accent" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {points.map((point) => <circle key={`${point.performances}-${point.value}`} cx={x(point.performances)} cy={y(point.value)} fill="currentColor" className="text-accent" r="4" />)}
        <text className="fill-muted text-[11px]" x="38" y="207">0 date</text>
        <text className="fill-muted text-[11px]" textAnchor="end" x="682" y="207">{maxPerformances} dates</text>
        <text className="fill-muted text-[11px]" x="44" y={Math.max(y(0) - 7, 14)}>Équilibre</text>
      </svg>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) { return <label className="block text-xs font-semibold text-muted"><span className="mb-2 block">{label}</span>{children}</label>; }

function NumberField({ compact = false, label, onChange, suffix, value }: { compact?: boolean; label: string; onChange: (value: number) => void; suffix?: string; value: number }) {
  return <Field label={label}><div className="relative"><Input className={suffix ? "pr-14" : ""} min="0" step="0.01" type="number" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value) || 0)} />{suffix ? <span className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted ${compact ? "text-[10px]" : "text-xs"}`}>{suffix}</span> : null}</div></Field>;
}

function Metric({ detail, label, tone = "neutral", value }: { detail: string; label: string; tone?: "neutral" | "accent" | "success" | "danger"; value: string }) {
  return <div className="bg-panel p-5"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</p><p className={`mt-3 text-xl font-semibold tabular-nums ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : ""}`}>{value}</p><p className="mt-1 text-xs leading-5 text-muted">{detail}</p></div>;
}

function newPerson(): ShowBudgetPersonnel {
  return { id: crypto.randomUUID(), label: "Nouveau métier", group: "creation", active: true, count: 1, rehearsalServices: 1, rehearsalGrossRate: 0, performanceGrossRate: 0, chargeRate: 0.5 };
}

function money(value: number) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value); }
