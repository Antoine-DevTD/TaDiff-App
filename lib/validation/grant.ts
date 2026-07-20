import { z } from "zod";
import { dossierDocumentTypes } from "@/lib/show-documents";

export const grantStatuses = ["A surveiller", "En montage", "Depose", "Attribue"] as const;

export const grantSchema = z.object({
  title: z.string().min(2, "Le nom du dispositif est requis"),
  funder: z.string().min(2, "L'organisme est requis"),
  territory: z.string().max(120).optional(),
  discipline: z.string().max(120).optional(),
  deadline: z.string().min(1, "La date limite est requise"),
  amount: z.coerce.number().min(0, "Le montant doit etre positif"),
  status: z.enum(grantStatuses),
  relatedShowId: z.string().optional(),
  requirements: z.array(z.enum(dossierDocumentTypes)).optional(),
  eligibility: z.string().max(600, "Le texte est trop long").optional(),
  sourceUrl: z.string().url("Lien invalide").optional().or(z.literal("")),
});

export type GrantFormInput = z.input<typeof grantSchema>;
export type GrantFormValues = z.infer<typeof grantSchema>;
