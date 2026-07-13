import {
  resolveShowPosterUrl,
  requiredShowDocumentTypes,
  showDocumentTypes,
} from "@/lib/show-documents";
import type {
  GrantOpportunity,
  Show,
  ShowDocument,
  ShowDocumentType,
} from "@/types";

export type GrantRequirementState = {
  document?: ShowDocument;
  status: "missing" | "outdated" | "ready";
  type: ShowDocumentType;
};

export type GrantDossierState = {
  grant: GrantOpportunity;
  missingCount: number;
  readyCount: number;
  requirements: GrantRequirementState[];
  show: Show | null;
  totalCount: number;
  updateCount: number;
};

export const defaultGrantRequirements: ShowDocumentType[] = [
  "Dossier artistique",
  "Note d'intention",
  "Synopsis",
  "Budget",
  "Fiche technique",
  "RIB",
  "Statuts",
];

export function getGrantRequirements(grant: GrantOpportunity): ShowDocumentType[] {
  const requirements =
    grant.requirements && grant.requirements.length > 0
      ? grant.requirements
      : defaultGrantRequirements;

  return requirements.filter((requirement) =>
    showDocumentTypes.includes(requirement),
  );
}

export function buildGrantDossierState({
  documents,
  grant,
  show,
}: {
  documents: ShowDocument[];
  grant: GrantOpportunity;
  show: Show | null;
}): GrantDossierState {
  const requirements = getGrantRequirements(grant).map((type) => {
    if (type === "Affiche" && show && resolveShowPosterUrl(show, documents)) {
      return {
        document: documents.find((item) => item.documentType === "Affiche"),
        status: "ready" as const,
        type,
      };
    }

    const document = documents.find((item) => item.documentType === type);

    if (!document) {
      return { status: "missing" as const, type };
    }

    if (document.status !== "Pret") {
      return { document, status: "outdated" as const, type };
    }

    return { document, status: "ready" as const, type };
  });
  const readyCount = requirements.filter((item) => item.status === "ready").length;
  const updateCount = requirements.filter((item) => item.status === "outdated").length;
  const missingCount = requirements.filter((item) => item.status === "missing").length;

  return {
    grant,
    missingCount,
    readyCount,
    requirements,
    show,
    totalCount: requirements.length,
    updateCount,
  };
}

export function getDossierReadinessPercent(state: GrantDossierState) {
  if (state.totalCount === 0) return 100;
  return Math.round((state.readyCount / state.totalCount) * 100);
}

export function getDossierTone(state: GrantDossierState) {
  if (state.missingCount === 0 && state.updateCount === 0) return "success" as const;
  if (state.missingCount <= 2) return "warning" as const;
  return "danger" as const;
}

export function getRequirementLabel(status: GrantRequirementState["status"]) {
  if (status === "ready") return "Pret";
  if (status === "outdated") return "A revoir";
  return "Manquant";
}

export function getRequirementTone(status: GrantRequirementState["status"]) {
  if (status === "ready") return "success" as const;
  if (status === "outdated") return "warning" as const;
  return "danger" as const;
}

export function getRequiredDocumentTypesForShow() {
  return requiredShowDocumentTypes;
}
