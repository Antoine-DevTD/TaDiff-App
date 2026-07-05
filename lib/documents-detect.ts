// Detection sans IA du type de document a partir du nom de fichier et,
// pour les PDF, du texte de la premiere page. Table de mots-cles -> type.
// Alignee avec showDocumentTypes (lib/show-documents.ts) et ShowDocumentType.

import type { ShowDocumentType } from "@/types";

function normalize(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Ordre = priorite : le premier motif trouve gagne.
const detectionRules: { type: ShowDocumentType; keywords: string[] }[] = [
  { type: "Note d'intention", keywords: ["note d intention", "note dintention", "intention"] },
  { type: "Fiche technique", keywords: ["fiche technique", "fiche-technique", "rider", "technique"] },
  { type: "Affiche", keywords: ["affiche", "visuel", "poster", "flyer"] },
  { type: "Synopsis", keywords: ["synopsis", "resume", "pitch"] },
  { type: "Budget", keywords: ["budget", "previsionnel", "previsionnel", "cout", "depenses"] },
  { type: "Devis", keywords: ["devis", "facture", "cession"] },
  { type: "RIB", keywords: ["rib", "iban", "coordonnees bancaires", "bancaire"] },
  { type: "Statuts", keywords: ["statuts", "kbis", "association", "siret"] },
  { type: "Texte", keywords: ["texte", "script", "manuscrit"] },
  { type: "Dossier artistique", keywords: ["dossier artistique", "dossier", "artistique", "presentation"] },
];

/**
 * Deduit le type de document. `filename` est toujours utilise ;
 * `text` (texte extrait d'un PDF) affine la detection s'il est fourni.
 */
export function detectDocumentType(filename: string, text?: string): ShowDocumentType {
  const haystack = `${normalize(filename)} ${text ? normalize(text) : ""}`;

  for (const rule of detectionRules) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.type;
    }
  }

  return "Dossier artistique";
}

/**
 * Titre suggere a partir du nom de fichier (sans extension, lisible).
 */
export function suggestDocumentTitle(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  if (!cleaned) return "";

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Extrait le texte de la premiere page d'un PDF cote client (pdfjs-dist).
 * Retourne "" en cas d'echec ou pour un fichier non-PDF : la detection
 * retombe alors sur le nom de fichier seul.
 */
export async function extractPdfFirstPageText(file: File): Promise<string> {
  if (file.type !== "application/pdf") return "";

  try {
    const pdfjs = await import("pdfjs-dist");
    // Worker resolu par webpack (Next) via new URL + import.meta.url.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const buffer = await file.arrayBuffer();
    const document = await pdfjs.getDocument({ data: buffer }).promise;
    const page = await document.getPage(1);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    void document.cleanup();

    return text;
  } catch {
    return "";
  }
}
