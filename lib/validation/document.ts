import { z } from "zod";
import { showDocumentStatuses, showDocumentTypes } from "@/lib/show-documents";

export const showDocumentSchema = z.object({
  showId: z.string().min(1, "Spectacle requis"),
  title: z.string().min(2, "Le titre du document est requis"),
  documentType: z.enum(showDocumentTypes),
  status: z.enum(showDocumentStatuses),
  fileUrl: z.string().url("Lien invalide").optional().or(z.literal("")),
  notes: z.string().max(600, "La note est trop longue").optional(),
});

export type ShowDocumentFormInput = z.input<typeof showDocumentSchema>;
export type ShowDocumentFormValues = z.infer<typeof showDocumentSchema>;
