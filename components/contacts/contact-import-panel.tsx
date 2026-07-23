"use client";

import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { importContacts } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";

type ImportMessage = {
  ok: boolean;
  text: string;
};

type SheetRow = string[];

type RejectedRow = {
  line: number;
  reason: string;
};

type ContactField =
  | "contactType"
  | "name"
  | "organization"
  | "role"
  | "email"
  | "phone"
  | "city"
  | "address"
  | "postalCode"
  | "department"
  | "region"
  | "website"
  | "capacity"
  | "latitude"
  | "longitude"
  | "status"
  | "tags";

type ColumnMapping = Record<ContactField, string>;

const contactFields: { key: ContactField; label: string; required?: boolean }[] = [
  { key: "contactType", label: "Type de fiche" },
  { key: "name", label: "Nom", required: true },
  { key: "organization", label: "Structure" },
  { key: "role", label: "Rôle" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Téléphone" },
  { key: "city", label: "Ville" },
  { key: "address", label: "Adresse" },
  { key: "postalCode", label: "Code postal" },
  { key: "department", label: "Département" },
  { key: "region", label: "Région" },
  { key: "website", label: "Site web" },
  { key: "capacity", label: "Jauge" },
  { key: "latitude", label: "Latitude" },
  { key: "longitude", label: "Longitude" },
  { key: "status", label: "Statut" },
  { key: "tags", label: "Tags / catégories" },
];

const emptyMapping: ColumnMapping = {
  contactType: "",
  name: "",
  organization: "",
  role: "",
  email: "",
  phone: "",
  city: "",
  address: "",
  postalCode: "",
  department: "",
  region: "",
  website: "",
  capacity: "",
  latitude: "",
  longitude: "",
  status: "",
  tags: "",
};

export function ContactImportPanel({ contactType }: { contactType: "person" | "venue" }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);
  const [message, setMessage] = useState<ImportMessage | null>(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });

  const headers = rows[0] ?? [];
  const bodyRows = rows.slice(1);
  const previewRows = bodyRows.slice(0, 3);
  const mappedRows = rows.length > 1
    ? mapRowsToContacts(bodyRows, mapping, contactType)
    : { contacts: [], rejectedRows: [] };
  const contacts = mappedRows.contacts;
  const rejectedRows = mappedRows.rejectedRows;
  const itemLabel = contactType === "venue" ? "lieu" : "personne";

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

      if (parsedRows.length > 10001) {
        setRows([]);
        setMapping(emptyMapping);
        setMessage({
          ok: false,
          text: "Ce fichier dépasse 10 000 contacts. Découpez-le en plusieurs imports pour garder un contrôle fiable.",
        });
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
      const geocoding = contactType === "venue"
        ? await geocodeImportedVenues(contacts, (current, total) => setGeocodingProgress({ current, total }))
        : { contacts, positioned: 0, unresolved: 0 };
      const contactsToImport = geocoding.contacts;
      const batchSize = 300;
      const batches = Array.from(
        { length: Math.ceil(contactsToImport.length / batchSize) },
        (_, index) => contactsToImport.slice(index * batchSize, (index + 1) * batchSize),
      );
      let imported = 0;
      let skipped = rejectedRows.length;

      setImportProgress({ current: 0, total: batches.length });

      for (let index = 0; index < batches.length; index += 1) {
        const result = await importContacts(batches[index]);

        if (!result.ok) {
          setMessage({
            ok: false,
            text: `${imported} contact(s) importe(s) avant l'erreur du lot ${index + 1}/${batches.length} : ${result.message}`,
          });
          setImportProgress({ current: index, total: batches.length });
          return;
        }

        imported += result.imported;
        skipped += result.skipped;
        setImportProgress({ current: index + 1, total: batches.length });
      }

      setMessage({
        ok: true,
        text: [
          `${imported} ${contactType === "venue" ? "lieu(x) importé(s)" : "contact(s) importé(s)"}.`,
          skipped > 0 ? `${skipped} ligne(s) ignorée(s).` : "",
          contactType === "venue" && geocoding.positioned > 0
            ? `${geocoding.positioned} lieu(x) positionné(s) automatiquement.`
            : "",
          contactType === "venue" && geocoding.unresolved > 0
            ? `${geocoding.unresolved} lieu(x) restent sans position faute d'adresse suffisamment précise.`
            : "",
        ].filter(Boolean).join(" "),
      });

      if (imported > 0) {
        setRows([]);
        setMapping(emptyMapping);
        setFileName("");
        setGeocodingProgress({ current: 0, total: 0 });
        router.refresh();
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
        title={contactType === "venue" ? "Importer des lieux" : "Importer des personnes"}
        description={`Chargez un export Excel, CSV ou TSV, puis associez les colonnes à TaDiff avant d'importer chaque ${itemLabel}.`}
        className="max-w-4xl"
      >
        <div className="space-y-5">
          <div className="rounded-md border border-border bg-panel-strong/45 p-4">
            <p className="text-sm font-semibold">Fichiers acceptés</p>
            <p className="mt-1 text-sm text-muted">
              .xlsx, .csv, .tsv, .txt. Les 3 premières lignes servent à vérifier le mapping.
            </p>
            {contactType === "venue" ? (
              <p className="mt-2 text-sm text-muted">
                Adresse, code postal et ville suffisent : TaDiff positionnera automatiquement les lieux sur la carte.
              </p>
            ) : null}
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
            <Button type="button" variant="ghost" className="gap-2" onClick={() => downloadCsvExample(contactType)}>
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
                  {contacts.length} {contactType === "venue" ? "lieu(x) détecté(s)" : "contact(s) détecté(s)"} sur {bodyRows.length} ligne(s).
                </p>
                {rejectedRows.length > 0 ? (
                  <div className="mt-3 rounded-md border border-warning/35 bg-warning/10 p-3 text-sm">
                    <p className="font-medium text-warning">
                      {rejectedRows.length} ligne(s) ne seront pas importées
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted">
                      {rejectedRows.slice(0, 5).map((row) => (
                        <li key={`${row.line}-${row.reason}`}>Ligne {row.line} : {row.reason}</li>
                      ))}
                    </ul>
                    {rejectedRows.length > 5 ? (
                      <p className="mt-2 text-xs text-muted">Et {rejectedRows.length - 5} autre(s) ligne(s).</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {contactFields
                  .filter((field) => !["contactType", "latitude", "longitude"].includes(field.key))
                  .map((field) => (
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
                {isPending ? "Import en cours..." : `Importer ${contacts.length} ${contactType === "venue" ? "lieu(x)" : "personne(s)"}`}
              </Button>
              {isPending && geocodingProgress.total > 0 && geocodingProgress.current < geocodingProgress.total ? (
                <p className="text-xs text-muted" aria-live="polite">
                  Positionnement des lieux : {geocodingProgress.current}/{geocodingProgress.total}
                </p>
              ) : null}
              {isPending && importProgress.total > 0 ? (
                <div aria-live="polite" className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-border/70">
                    <div
                      className="h-full bg-accent transition-[width] duration-300"
                      style={{
                        width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted">
                    Lot {Math.min(importProgress.current + 1, importProgress.total)} sur {importProgress.total}
                  </p>
                </div>
              ) : null}
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
    contactType: findIndexValue(normalizedHeaders, ["type", "type de fiche", "type de lieu", "categorie"]),
    name: findIndexValue(normalizedHeaders, [
      "nom",
      "name",
      "contact",
      "prenom nom",
      "nom du lieu",
      "nom lieu",
      "etablissement",
      "nom de l etablissement",
      "raison sociale",
    ]),
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
    address: findIndexValue(normalizedHeaders, ["adresse", "address", "adresse postale"]),
    postalCode: findIndexValue(normalizedHeaders, ["code postal", "cp", "postal code"]),
    department: findIndexValue(normalizedHeaders, ["departement", "department"]),
    region: findIndexValue(normalizedHeaders, ["region"]),
    website: findIndexValue(normalizedHeaders, ["web", "site", "site web", "website", "url"]),
    capacity: findIndexValue(normalizedHeaders, ["jauge", "capacite", "capacity"]),
    latitude: findIndexValue(normalizedHeaders, ["latitude", "lat"]),
    longitude: findIndexValue(normalizedHeaders, ["longitude", "lon", "lng"]),
    status: findIndexValue(normalizedHeaders, ["statut", "status"]),
    tags: findIndexValue(normalizedHeaders, ["tags", "tag", "categorie", "categories", "type"]),
  };
}

function mapRowsToContacts(
  rows: SheetRow[],
  mapping: ColumnMapping,
  forcedContactType: ContactFormValues["contactType"],
): { contacts: ContactFormValues[]; rejectedRows: RejectedRow[] } {
  const contacts: ContactFormValues[] = [];
  const rejectedRows: RejectedRow[] = [];

  for (const [index, row] of rows.entries()) {
    const name = getMappedCell(row, mapping.name);
    const email = getMappedCell(row, mapping.email);
    const organization = getMappedCell(row, mapping.organization);
    const contactType = forcedContactType;

    if ((contactType === "venue" && !name) || (contactType === "person" && !name && !email)) {
      rejectedRows.push({
        line: index + 2,
        reason: contactType === "venue" ? "nom du lieu absent ou colonne non associée" : "nom et email absents",
      });
      continue;
    }

    const candidate = {
      contactType,
      name: name || email,
      organization: contactType === "venue" ? name || organization : organization || "À renseigner",
      role: getMappedCell(row, mapping.role),
      email: normalizeEmail(email),
      phone: getMappedCell(row, mapping.phone),
      city: getMappedCell(row, mapping.city),
      address: getMappedCell(row, mapping.address),
      postalCode: getMappedCell(row, mapping.postalCode),
      department: getMappedCell(row, mapping.department),
      region: getMappedCell(row, mapping.region),
      website: normalizeWebsite(getMappedCell(row, mapping.website)),
      capacity: parseOptionalNumber(getMappedCell(row, mapping.capacity)),
      latitude: parseOptionalNumber(getMappedCell(row, mapping.latitude)),
      longitude: parseOptionalNumber(getMappedCell(row, mapping.longitude)),
      status: normalizeStatus(getMappedCell(row, mapping.status)),
      tags: splitTags(getMappedCell(row, mapping.tags)),
    } satisfies ContactFormValues;
    const parsed = contactSchema.safeParse(candidate);

    if (!parsed.success) {
      rejectedRows.push({
        line: index + 2,
        reason: parsed.error.issues.map((issue) => issue.message).join(", "),
      });
      continue;
    }

    contacts.push(parsed.data);
  }

  return { contacts, rejectedRows };
}

function normalizeEmail(value: string) {
  const normalized = value.trim().replace(/^mailto:/i, "").replace(/\s+/g, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function normalizeWebsite(value: string) {
  const normalized = value.trim();
  if (!normalized || /^https?:\/\//i.test(normalized)) return normalized;
  return `https://${normalized}`;
}

async function geocodeImportedVenues(
  contacts: ContactFormValues[],
  onProgress: (current: number, total: number) => void,
) {
  const resolved = [...contacts];
  const pendingIndexes = resolved.flatMap((contact, index) => {
    const query = [contact.address, contact.postalCode, contact.city].filter(Boolean).join(" ").trim();
    return contact.contactType === "venue" && !contact.latitude && !contact.longitude && query.length >= 3
      ? [index]
      : [];
  });
  let cursor = 0;
  let completed = 0;
  let positioned = 0;

  onProgress(0, pendingIndexes.length);

  async function worker() {
    while (cursor < pendingIndexes.length) {
      const pendingIndex = pendingIndexes[cursor];
      cursor += 1;
      const contact = resolved[pendingIndex];
      const query = [contact.address, contact.postalCode, contact.city].filter(Boolean).join(" ");

      try {
        const response = await fetch(`/api/geocoding/address?q=${encodeURIComponent(query)}`, {
          headers: { Accept: "application/json" },
        });
        const payload = await response.json() as {
          suggestions?: Array<{
            city: string;
            department: string;
            latitude: number;
            longitude: number;
            postalCode: string;
            region: string;
          }>;
        };
        const suggestion = response.ok ? payload.suggestions?.[0] : null;

        if (suggestion) {
          resolved[pendingIndex] = {
            ...contact,
            city: contact.city || suggestion.city,
            department: contact.department || suggestion.department,
            latitude: String(suggestion.latitude),
            longitude: String(suggestion.longitude),
            postalCode: contact.postalCode || suggestion.postalCode,
            region: contact.region || suggestion.region,
          };
          positioned += 1;
        }
      } catch {
        // L'import reste possible : le lieu sera simplement absent de la carte.
      } finally {
        completed += 1;
        onProgress(completed, pendingIndexes.length);
        await new Promise((resolve) => window.setTimeout(resolve, 150));
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(5, pendingIndexes.length) }, () => worker()));

  return {
    contacts: resolved,
    positioned,
    unresolved: pendingIndexes.length - positioned,
  };
}

function parseOptionalNumber(value: string) {
  if (!value) return "" as const;
  const parsed = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(parsed) ? String(parsed) : "" as const;
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
  const exactIndex = headers.findIndex((header) => aliases.includes(header));
  if (exactIndex >= 0) return String(exactIndex);

  const index = headers.findIndex((header) =>
    aliases.some((alias) => alias.length >= 4 && (header.includes(alias) || alias.includes(header))),
  );
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

function downloadCsvExample(contactType: "person" | "venue") {
  const content = contactType === "venue"
    ? [
        "nom,email,téléphone,adresse,code postal,ville,département,région,web,jauge,statut,tags",
        "Theatre municipal,contact@theatre.fr,0546000000,12 rue du Theatre,17000,La Rochelle,Charente-Maritime,Nouvelle-Aquitaine,https://theatre.example,450,En discussion,Theatre",
      ].join("\n")
    : [
        "nom,email,téléphone,structure,rôle,ville,statut,tags",
        "Mina Laurent,mina@example.com,0612345678,Scene nationale,Programmatrice,La Rochelle,Prospect,Theatre;Grand plateau",
      ].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = contactType === "venue" ? "lieux-tadiff-exemple.csv" : "personnes-tadiff-exemple.csv";
  link.click();
  URL.revokeObjectURL(url);
}
