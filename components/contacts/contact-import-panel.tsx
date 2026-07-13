"use client";

import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { importContacts } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import type { ContactFormValues } from "@/lib/validation/contact";

type ImportMessage = {
  ok: boolean;
  text: string;
};

type SheetRow = string[];

type ContactField =
  | "name"
  | "organization"
  | "role"
  | "email"
  | "phone"
  | "city"
  | "status"
  | "tags";

type ColumnMapping = Record<ContactField, string>;

const contactFields: { key: ContactField; label: string; required?: boolean }[] = [
  { key: "name", label: "Nom", required: true },
  { key: "organization", label: "Structure" },
  { key: "role", label: "Role" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telephone" },
  { key: "city", label: "Ville" },
  { key: "status", label: "Statut" },
  { key: "tags", label: "Tags / categories" },
];

const emptyMapping: ColumnMapping = {
  name: "",
  organization: "",
  role: "",
  email: "",
  phone: "",
  city: "",
  status: "",
  tags: "",
};

export function ContactImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);
  const [message, setMessage] = useState<ImportMessage | null>(null);

  const headers = rows[0] ?? [];
  const bodyRows = rows.slice(1);
  const previewRows = bodyRows.slice(0, 3);
  const contacts = rows.length > 1 ? mapRowsToContacts(bodyRows, mapping) : [];

  async function handleFile(file: File) {
    setMessage(null);
    setFileName(file.name);

    try {
      const parsedRows = await parseImportFile(file);

      if (parsedRows.length < 2) {
        setRows([]);
        setMapping(emptyMapping);
        setMessage({ ok: false, text: "Le fichier doit contenir une ligne d'en-tete et au moins un contact." });
        return;
      }

      setRows(parsedRows);
      setMapping(autoMapColumns(parsedRows[0]));
    } catch (error) {
      setRows([]);
      setMapping(emptyMapping);
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "Impossible de lire ce fichier.",
      });
    }
  }

  function runImport() {
    if (contacts.length === 0) {
      setMessage({
        ok: false,
        text: "Aucun contact valide. Mappez au moins une colonne nom ou email.",
      });
      return;
    }

    startTransition(async () => {
      const result = await importContacts(contacts);
      setMessage({ ok: result.ok, text: result.message });

      if (result.ok) {
        setRows([]);
        setMapping(emptyMapping);
        setFileName("");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="gap-2"
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
      >
        <Upload className="h-4 w-4" aria-hidden />
        Importer
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Carnet de contacts"
        title="Importer des contacts"
        description="Chargez un export Excel, CSV ou TSV, puis associez les colonnes a TaDiff avant import."
        className="max-w-4xl"
      >
        <div className="space-y-5">
          <div className="rounded-md border border-border bg-panel-strong/45 p-4">
            <p className="text-sm font-semibold">Fichiers acceptes</p>
            <p className="mt-1 text-sm text-muted">
              .xlsx, .csv, .tsv, .txt. Les 3 premieres lignes servent a verifier le mapping.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="gap-2"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              Choisir un fichier
            </Button>
            <Button type="button" variant="ghost" className="gap-2" onClick={downloadCsvExample}>
              <Download className="h-4 w-4" aria-hidden />
              Exemple CSV
            </Button>
          </div>

          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept=".xlsx,.csv,.tsv,.txt,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";

              if (file) {
                void handleFile(file);
              }
            }}
          />

          {rows.length > 1 ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold">{fileName}</p>
                <p className="mt-1 text-sm text-muted">
                  {contacts.length} contact(s) detecte(s) sur {bodyRows.length} ligne(s).
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {contactFields.map((field) => (
                  <label key={field.key} className="text-sm font-medium">
                    {field.label}
                    {field.required ? <span className="text-danger"> *</span> : null}
                    <Select
                      className="mt-2"
                      value={mapping[field.key]}
                      onChange={(event) =>
                        setMapping((current) => ({ ...current, [field.key]: event.target.value }))
                      }
                    >
                      <option value="">Ignorer</option>
                      {headers.map((header, index) => (
                        <option key={`${header}-${index}`} value={String(index)}>
                          {header || `Colonne ${index + 1}`}
                        </option>
                      ))}
                    </Select>
                  </label>
                ))}
              </div>

              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-panel-strong/60 text-muted">
                    <tr>
                      {headers.map((header, index) => (
                        <th key={`${header}-${index}`} className="px-3 py-2 font-semibold">
                          {header || `Colonne ${index + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-border">
                        {headers.map((_, cellIndex) => (
                          <td key={cellIndex} className="max-w-[220px] truncate px-3 py-2">
                            {row[cellIndex] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button type="button" className="gap-2" onClick={runImport} disabled={isPending}>
                <Upload className="h-4 w-4" aria-hidden />
                {isPending ? "Import en cours..." : `Importer ${contacts.length} contact(s)`}
              </Button>
            </div>
          ) : null}

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
        </div>
      </Dialog>
    </>
  );
}

async function parseImportFile(file: File): Promise<SheetRow[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx") {
    const { readSheet } = await import("read-excel-file/browser");
    const rawRows = await readSheet(file);
    return normalizeRows(rawRows);
  }

  if (extension === "xls") {
    throw new Error("Le format .xls ancien n'est pas supporte. Exportez le fichier en .xlsx ou CSV.");
  }

  const text = await file.text();
  return parseDelimited(text);
}

function parseDelimited(text: string): SheetRow[] {
  const delimiter = guessDelimiter(text);
  const rows: SheetRow[] = [];
  let row: SheetRow = [];
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

function normalizeRows(rows: unknown[][]): SheetRow[] {
  return rows
    .map((row) => row.map((cell) => cleanCell(String(cell ?? ""))))
    .filter((row) => row.some(Boolean));
}

function autoMapColumns(headers: SheetRow): ColumnMapping {
  const normalizedHeaders = headers.map(normalizeHeader);

  return {
    name: findIndexValue(normalizedHeaders, ["nom", "name", "contact", "prenom nom"]),
    organization: findIndexValue(normalizedHeaders, [
      "structure",
      "organisation",
      "organization",
      "lieu",
      "societe",
      "company",
    ]),
    role: findIndexValue(normalizedHeaders, ["role", "fonction", "poste", "function"]),
    email: findIndexValue(normalizedHeaders, ["email", "e-mail", "mail", "courriel"]),
    phone: findIndexValue(normalizedHeaders, ["telephone", "tel", "phone", "mobile", "portable"]),
    city: findIndexValue(normalizedHeaders, ["ville", "city", "commune"]),
    status: findIndexValue(normalizedHeaders, ["statut", "status"]),
    tags: findIndexValue(normalizedHeaders, ["tags", "tag", "categorie", "categories", "type"]),
  };
}

function mapRowsToContacts(rows: SheetRow[], mapping: ColumnMapping): ContactFormValues[] {
  const contacts: ContactFormValues[] = [];

  for (const row of rows) {
    const name = getMappedCell(row, mapping.name);
    const email = getMappedCell(row, mapping.email);
    const organization = getMappedCell(row, mapping.organization);

    if (!name && !email) {
      continue;
    }

    contacts.push({
      name: name || email,
      organization: organization || "A renseigner",
      role: getMappedCell(row, mapping.role),
      email,
      phone: getMappedCell(row, mapping.phone),
      city: getMappedCell(row, mapping.city),
      status: normalizeStatus(getMappedCell(row, mapping.status)),
      tags: splitTags(getMappedCell(row, mapping.tags)),
    });
  }

  return contacts;
}

function guessDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;

  if (tabs > semicolons && tabs > commas) return "\t";
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

function findIndexValue(headers: string[], aliases: string[]) {
  const index = headers.findIndex((header) => aliases.includes(header));
  return index >= 0 ? String(index) : "";
}

function getMappedCell(row: SheetRow, indexValue: string) {
  const index = Number(indexValue);
  return Number.isInteger(index) && index >= 0 ? row[index]?.trim() ?? "" : "";
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

function splitTags(value: string) {
  return value
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function downloadCsvExample() {
  const content = [
    "nom,email,telephone,structure,role,ville,statut,tags",
    "Mina Laurent,mina@example.com,0612345678,Scene nationale,Programmatrice,La Rochelle,Prospect,Theatre;Grand plateau",
    "Hugo Martin,hugo@example.com,0698765432,Festival Off,Directeur,Avignon,En discussion,Festival",
  ].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "contacts-tadiff-exemple.csv";
  link.click();
  URL.revokeObjectURL(url);
}
