"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { GrantDossierState } from "@/lib/grants";

export type ZipEntry = {
  data: Uint8Array;
  name: string;
};

type CentralEntry = {
  crc: number;
  dataLength: number;
  nameBytes: Uint8Array;
  offset: number;
};

const encoder = new TextEncoder();

export function GrantDossierZipButton({ state }: { state: GrantDossierState }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function downloadZip() {
    startTransition(async () => {
      setMessage(null);
      const zip = await buildGrantZip(state);
      const url = URL.createObjectURL(zip);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitizeFilename(state.grant.funder)}-${sanitizeFilename(state.grant.title)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Dossier préparé.");
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" onClick={downloadZip} disabled={isPending}>
        {isPending ? "Preparation..." : "Télécharger le dossier .zip"}
      </Button>
      {message ? <p className="text-xs text-success">{message}</p> : null}
    </div>
  );
}

async function buildGrantZip(state: GrantDossierState) {
  const entries: ZipEntry[] = [
    {
      name: "README-TaDiff.txt",
      data: textFile(buildReadme(state)),
    },
    {
      name: "manifest.json",
      data: textFile(JSON.stringify(buildManifest(state), null, 2)),
    },
  ];

  for (const requirement of state.requirements) {
    const folder = requirement.status === "ready" ? "pieces-pretes" : "pieces-a-completer";
    const baseName = sanitizeFilename(requirement.type);

    if (requirement.document?.fileUrl) {
      const fetched = await fetchDocument(requirement.document.fileUrl);

      if (fetched) {
        entries.push({
          name: `${folder}/${baseName}${fetched.extension}`,
          data: fetched.data,
        });
        continue;
      }
    }

    entries.push({
      name: `${folder}/${baseName}.txt`,
      data: textFile(buildPlaceholder(requirement)),
    });
  }

  return createZip(entries);
}

function buildReadme(state: GrantDossierState) {
  return [
    "Dossier préparé par TaDiff",
    "",
    `Subvention : ${state.grant.title}`,
    `Organisme : ${state.grant.funder}`,
    `Deadline : ${new Date(state.grant.deadline).toLocaleDateString("fr-FR")}`,
    `Spectacle : ${state.show?.title ?? "Non associé"}`,
    "",
    `Pièces prêtes : ${state.readyCount}/${state.totalCount}`,
    `Pièces à revoir : ${state.updateCount}`,
    `Pièces manquantes : ${state.missingCount}`,
    "",
    "Ce zip est une preparation de depot. Vérifier les formulaires officiels avant envoi.",
  ].join("\n");
}

function buildManifest(state: GrantDossierState) {
  return {
    grant: {
      amount: state.grant.amount,
      deadline: state.grant.deadline,
      eligibility: state.grant.eligibility ?? "",
      funder: state.grant.funder,
      sourceUrl: state.grant.sourceUrl ?? "",
      themes: state.grant.themes ?? [],
      title: state.grant.title,
    },
    requirements: state.requirements.map((requirement) => ({
      documentTitle: requirement.document?.title ?? "",
      fileUrl: requirement.document?.fileUrl ?? "",
      status: requirement.status,
      type: requirement.type,
    })),
    show: state.show
      ? {
          discipline: state.show.discipline,
          status: state.show.status,
          title: state.show.title,
        }
      : null,
  };
}

function buildPlaceholder(requirement: GrantDossierState["requirements"][number]) {
  return [
    `Piece : ${requirement.type}`,
    `Statut : ${requirement.status}`,
    "",
    requirement.document
      ? `Document de référence : ${requirement.document.title}`
      : "Document non encore ajoute dans TaDiff.",
    requirement.document?.notes ? `Note : ${requirement.document.notes}` : "",
    "",
    "Action : ajouter ou mettre à jour cette pièce avant le depot.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function fetchDocument(fileUrl: string) {
  try {
    const response = await fetch(fileUrl);

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    return {
      data: new Uint8Array(buffer),
      extension: getExtension(fileUrl, response.headers.get("content-type")),
    };
  } catch {
    return null;
  }
}

function getExtension(fileUrl: string, contentType: string | null) {
  const pathname = safeUrlPathname(fileUrl);
  const match = pathname.match(/\.[a-z0-9]{2,6}$/i);

  if (match) return match[0].toLowerCase();
  if (contentType?.includes("pdf")) return ".pdf";
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("jpeg")) return ".jpg";
  if (contentType?.includes("json")) return ".json";

  return ".bin";
}

function safeUrlPathname(fileUrl: string) {
  try {
    return new URL(fileUrl).pathname;
  } catch {
    return fileUrl;
  }
}

function textFile(value: string) {
  return encoder.encode(value);
}

export function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

export function createZip(entries: ZipEntry[]) {
  const chunks: Uint8Array[] = [];
  const centralEntries: CentralEntry[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = createLocalHeader({ crc, dataLength: entry.data.length, nameBytes });

    chunks.push(localHeader, nameBytes, entry.data);
    centralEntries.push({ crc, dataLength: entry.data.length, nameBytes, offset });
    offset += localHeader.length + nameBytes.length + entry.data.length;
  }

  const centralStart = offset;

  for (const entry of centralEntries) {
    const centralHeader = createCentralHeader(entry);
    chunks.push(centralHeader, entry.nameBytes);
    offset += centralHeader.length + entry.nameBytes.length;
  }

  chunks.push(createEndOfCentralDirectory({
    centralSize: offset - centralStart,
    centralStart,
    entryCount: centralEntries.length,
  }));

  return new Blob(chunks.map(toBlobPart), { type: "application/zip" });
}

function toBlobPart(chunk: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(chunk.length);
  copy.set(chunk);
  return copy.buffer;
}

function createLocalHeader({
  crc,
  dataLength,
  nameBytes,
}: {
  crc: number;
  dataLength: number;
  nameBytes: Uint8Array;
}) {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, dataLength, true);
  view.setUint32(22, dataLength, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  return header;
}

function createCentralHeader(entry: CentralEntry) {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, entry.crc, true);
  view.setUint32(20, entry.dataLength, true);
  view.setUint32(24, entry.dataLength, true);
  view.setUint16(28, entry.nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, entry.offset, true);
  return header;
}

function createEndOfCentralDirectory({
  centralSize,
  centralStart,
  entryCount,
}: {
  centralSize: number;
  centralStart: number;
  entryCount: number;
}) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralStart, true);
  view.setUint16(20, 0, true);
  return header;
}

let crcTable: number[] | null = null;

function crc32(data: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getCrcTable() {
  if (crcTable) return crcTable;

  crcTable = Array.from({ length: 256 }, (_, index) => {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    return value >>> 0;
  });

  return crcTable;
}
