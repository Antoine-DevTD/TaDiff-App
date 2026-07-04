"use client";

import { useState } from "react";
import { OpportunityForm } from "@/components/pipeline/opportunity-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Contact, Show } from "@/types";

export function PipelineCreatePanel({
  contacts,
  shows,
}: {
  contacts: Contact[];
  shows: Show[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setIsOpen(true)}>
          Ajouter une date possible
        </Button>
      </div>

      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/35 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <button
            aria-label="Fermer la modale"
            className="absolute inset-0 cursor-default"
            type="button"
            onClick={() => setIsOpen(false)}
          />
          <Card className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto p-0">
            <div className="sticky top-0 z-10 border-b border-border bg-panel/95 px-5 py-4 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    Nouvelle carte
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">Ajouter une date possible</h3>
                  <p className="mt-1 text-sm text-muted">
                    Choisissez un contact existant ou creez-le directement ici.
                  </p>
                </div>
                <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
            <div className="p-5">
              <OpportunityForm
                contacts={contacts}
                shows={shows}
                onSuccess={() => setIsOpen(false)}
              />
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
