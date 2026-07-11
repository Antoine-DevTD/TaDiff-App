import type { ShowDocument, ShowDocumentStatus } from "@/types";

export const showDocumentTypes = [
  "Affiche",
  "Dossier artistique",
  "Note d'intention",
  "Synopsis",
  "Texte",
  "Budget",
  "Fiche technique",
  "RIB",
  "Statuts",
  "Devis",
] as const;

export const showDocumentStatuses = [
  "Manquant",
  "A mettre a jour",
  "Pret",
] as const;

export const essentialShowDocumentTypes = [
  "Affiche",
  "Dossier artistique",
  "Note d'intention",
  "Synopsis",
  "Texte",
  "Fiche technique",
] as const;

export const optionalShowDocumentTypes = [
  "Budget",
  "Devis",
  "RIB",
  "Statuts",
] as const;

export const requiredShowDocumentTypes = essentialShowDocumentTypes;

export function getShowDocumentTypeLabel(type: ShowDocument["documentType"]) {
  if (type === "Texte") return "Texte de la piece";
  return type;
}

export function isEssentialShowDocumentType(type: ShowDocument["documentType"]) {
  return essentialShowDocumentTypes.includes(
    type as (typeof essentialShowDocumentTypes)[number],
  );
}

export function getDocumentStatusTone(status: ShowDocumentStatus) {
  if (status === "Pret") return "success" as const;
  if (status === "A mettre a jour") return "warning" as const;
  return "danger" as const;
}

export function getShowDocumentReadiness(documents: ShowDocument[]) {
  const readyRequiredCount = requiredShowDocumentTypes.filter((type) =>
    documents.some((document) => document.documentType === type && document.status === "Pret"),
  ).length;
  const totalRequiredCount = requiredShowDocumentTypes.length;
  const missingCount = Math.max(0, totalRequiredCount - readyRequiredCount);
  const percent =
    totalRequiredCount > 0 ? Math.round((readyRequiredCount / totalRequiredCount) * 100) : 100;

  return {
    missingCount,
    percent,
    readyRequiredCount,
    totalRequiredCount,
  };
}
