"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
};

const questions: Question[] = [
  {
    id: "stage",
    label: "Ou en est votre spectacle ?",
    options: [
      { value: "creation", label: "En creation" },
      { value: "diffusion", label: "En diffusion" },
      { value: "both", label: "Plusieurs spectacles" },
    ],
  },
  {
    id: "dates",
    label: "Combien de dates visez-vous cette saison ?",
    options: [
      { value: "few", label: "1 a 5 dates" },
      { value: "some", label: "6 a 15 dates" },
      { value: "many", label: "Plus de 15 dates" },
    ],
  },
  {
    id: "pain",
    label: "Qu'est-ce qui vous prend le plus de temps ?",
    options: [
      { value: "sales", label: "Actions et contacts" },
      { value: "grants", label: "Subventions et dossiers" },
      { value: "money", label: "Devis et tresorerie" },
      { value: "all", label: "Un peu tout a la fois" },
    ],
  },
];

const painRecommendations: Record<string, { title: string; detail: string }[]> = {
  sales: [
    { title: "Carnet de contacts", detail: "Contacts, dates possibles et actions au bon moment." },
    { title: "Cockpit du jour", detail: "Ce qu'il faut faire aujourd'hui, sans rien oublier." },
  ],
  grants: [
    { title: "Radar subventions", detail: "Deadlines, montants et pieces manquantes par dossier." },
    { title: "Documents de compagnie", detail: "RIB, statuts, licence : televerses une fois, prets partout." },
  ],
  money: [
    { title: "Calculateur de rentabilite", detail: "Point mort et marge avant de signer une date." },
    { title: "Tresorerie", detail: "Solde, projection et date de risque en un coup d'oeil." },
  ],
  all: [
    { title: "Cockpit complet", detail: "Dates, dossiers, tresorerie et echeances au meme endroit." },
    { title: "William, ton copilote", detail: "Il te dit quoi faire en priorite, sans IA opaque." },
  ],
};

export function SalesFunnel() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const done = step >= questions.length;
  const current = questions[step];

  function choose(value: string) {
    const next = { ...answers, [current.id]: value };
    setAnswers(next);
    setStep((s) => s + 1);
  }

  function reset() {
    setAnswers({});
    setStep(0);
  }

  if (done) {
    const recos = painRecommendations[answers.pain] ?? painRecommendations.all;
    const stageLabel =
      answers.stage === "creation"
        ? "En pleine creation"
        : answers.stage === "diffusion"
          ? "En diffusion active"
          : "Avec plusieurs spectacles";

    return (
      <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm shadow-ink/10 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          Votre cockpit sur mesure
        </p>
        <h3 className="mt-2 text-2xl font-semibold">
          {stageLabel} : voici ce que TaDiff ferait pour vous.
        </h3>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {recos.map((reco) => (
            <div key={reco.title} className="rounded-xl border border-border bg-panel-strong/40 p-4">
              <p className="font-medium">{reco.title}</p>
              <p className="mt-1 text-sm text-muted">{reco.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/beta"
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-semibold !text-white transition hover:bg-accent-strong"
          >
            Reserver ma place beta
          </Link>
          <button
            type="button"
            onClick={reset}
            className="text-sm font-medium text-muted transition hover:text-foreground"
          >
            Recommencer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-panel p-6 shadow-sm shadow-ink/10 sm:p-8">
      <div className="flex items-center gap-2">
        {questions.map((question, index) => (
          <span
            key={question.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition",
              index <= step ? "bg-accent" : "bg-border",
            )}
          />
        ))}
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Question {step + 1} / {questions.length}
      </p>
      <h3 className="mt-2 text-2xl font-semibold">{current.label}</h3>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {current.options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => choose(option.value)}
            className="rounded-xl border border-border bg-panel-strong/40 p-4 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:border-accent hover:bg-accent/5"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
