"use client";

import { BookOpenCheck, FileSearch, MessageSquareText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const STORAGE_KEY = "tadiff:william-beta-credit-welcome:v1";

export function WilliamCreditWelcome({ bonusBalance }: { bonusBalance: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (bonusBalance >= 200_000 && window.localStorage.getItem(STORAGE_KEY) !== "seen") setOpen(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [bonusBalance]);

  function close() {
    window.localStorage.setItem(STORAGE_KEY, "seen");
    setOpen(false);
  }

  return (
    <Dialog open={open} onClose={close} eyebrow="Accès bêta" title="Vous avez 200 000 tokens William" description="Un crédit supplémentaire pour tester l'assistant sur vos vrais sujets de compagnie.">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Feature icon={MessageSquareText} title="Préparer" text="Une relance, un dossier, une décision ou vos prochaines actions." />
          <Feature icon={FileSearch} title="Lire un document" text="Seulement si vous choisissez ou joignez explicitement le document à utiliser." />
          <Feature icon={BookOpenCheck} title="Garder la main" text="William propose et synthétise ; vous relisez avant toute action extérieure." />
        </div>
        <div className="rounded-md border border-accent/25 bg-accent/5 p-4 text-sm leading-6">
          <p className="font-semibold">Pour commencer</p>
          <p className="mt-1 text-muted">Fermez cette fenêtre puis ouvrez William en bas à droite. Vous pouvez lui demander : « Quelles sont mes priorités cette semaine ? »</p>
        </div>
        <div className="flex justify-end"><Button type="button" onClick={close}><Sparkles className="mr-2 h-4 w-4" />J’ai compris, découvrir William</Button></div>
      </div>
    </Dialog>
  );
}

function Feature({ icon: Icon, text, title }: { icon: typeof Sparkles; text: string; title: string }) {
  return <div className="rounded-md border border-border bg-panel-strong/45 p-4"><Icon aria-hidden="true" className="h-5 w-5 text-accent" /><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-sm leading-5 text-muted">{text}</p></div>;
}
