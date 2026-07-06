// Types de pieces administratives d'une compagnie (reutilisables partout).
export const companyDocumentTypes = [
  "RIB",
  "Statuts",
  "Licence d'entrepreneur",
  "Attestation d'assurance",
  "Kbis",
  "Attestation URSSAF",
  "Numero SIRET",
  "Autre",
] as const;

export type CompanyDocumentType = (typeof companyDocumentTypes)[number];
