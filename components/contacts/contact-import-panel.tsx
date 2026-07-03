"use client";

import { useRef, useState, useTransition } from "react";
import { importContacts } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ContactFormValues } from "@/lib/validation/contact";

type ImportMessage = {
  ok: boolean;
  text: string;
};

type CsvRow = string[];

export function ContactImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<ImportMessage | null>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    const contacts = parseContactsFromCsv(text);

    if (contacts.length === 0) {
      setMessage({
        ok: false,
        text: "Aucun contact valide. Ajoutez au moins une colonne nom ou email.",
      });
      return;
    }

    startTransition(async () => {
      const result = await importContacts(contacts);
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold">Import CSV</p>
          <p className="mt-1 text-sm text-muted">
            Colonnes reconnues : nom, email, structure, role, ville, statut.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
          >
            Importer CSV
          </Button>
          <Button type="button" variant="ghost" onClick={downloadCsvExample}>
            Exemple CSV
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";

          if (file) {
            void handleFile(file);
          }
        }}
      />

      {message ? (
        <p
          className={
            message.ok
              ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success"
              : "rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
          }
        >
          {message.text}
        </p>
      ) : null}
    </Card>
  );
}

function parseContactsFromCsv(text: string): ContactFormValues[] {
  const rows = parseCsv(text);
  const [headers, ...body] = rows;

  if (!headers || body.length === 0) {
    return [];
  }

  const normalizedHeaders = headers.map(normalizeHeader);
  const indexes = {
    name: findIndex(normalizedHeaders, ["nom", "name", "contact", "prenom nom"]),
    organization: findIndex(normalizedHeaders, [
      "structure",
      "organisation",
      "organization",
      "lieu",
      "societe",
      "company",
    ]),
    role: findIndex(normalizedHeaders, ["role", "fonction", "poste", "function"]),
    email: findIndex(normalizedHeaders, ["email", "e-mail", "mail", "courriel"]),
    city: findIndex(normalizedHeaders, ["ville", "city", "commune"]),
    status: findIndex(normalizedHeaders, ["statut", "status"]),
  };

  const contacts: ContactFormValues[] = [];

  for (const row of body) {
    const name = getCell(row, indexes.name);
    const email = getCell(row, indexes.email);
    const organization = getCell(row, indexes.organization);

    if (!name && !email) {
      continue;
    }

    contacts.push({
      name: name || email,
      organization: organization || "A renseigner",
      role: getCell(row, indexes.role),
      email,
      city: getCell(row, indexes.city),
      status: normalizeStatus(getCell(row, indexes.status)),
    });
  }

  return contacts;
}

function parseCsv(text: string): CsvRow[] {
  const delimiter = guessDelimiter(text);
  const rows: CsvRow[] = [];
  let row: CsvRow = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(cleanCell(cell));
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(cleanCell(cell));
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cleanCell(cell));
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function guessDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;

  return semicolons > commas ? ";" : ",";
}

function cleanCell(value: string) {
  return value.replace(/^\uFEFF/, "").trim();
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

function getCell(row: CsvRow, index: number) {
  return index >= 0 ? row[index]?.trim() ?? "" : "";
}

function normalizeStatus(value: string): ContactFormValues["status"] {
  const normalized = normalizeHeader(value);

  if (normalized.includes("partenaire")) {
    return "Partenaire";
  }

  if (normalized.includes("discussion") || normalized.includes("contact")) {
    return "En discussion";
  }

  return "Prospect";
}

function downloadCsvExample() {
  const content = [
    "nom,email,structure,role,ville,statut",
    "Mina Laurent,mina@example.com,Scene nationale,Programmatrice,La Rochelle,Prospect",
    "Hugo Martin,hugo@example.com,Festival Off,Directeur,Avignon,En discussion",
  ].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "contacts-tadiff-exemple.csv";
  link.click();
  URL.revokeObjectURL(url);
}
