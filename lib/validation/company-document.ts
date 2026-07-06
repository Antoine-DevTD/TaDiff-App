import { z } from "zod";

export const companyDocumentSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(160),
  docType: z.string().min(1).max(80),
  storagePath: z.string().optional(),
  fileUrl: z.string().url("Lien invalide").optional().or(z.literal("")),
  note: z.string().max(600).optional().or(z.literal("")),
});

export type CompanyDocumentInput = z.input<typeof companyDocumentSchema>;
export type CompanyDocumentValues = z.infer<typeof companyDocumentSchema>;
