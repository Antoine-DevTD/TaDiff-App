import { z } from "zod";
import { showDocumentStatuses, showDocumentTypes } from "@/lib/show-documents";

export const showDocumentSchema = z.object({
  showId: z.string().min(1, "Spectacle requis"),
  title: z.string().min(2, "Le titre du document est requis"),
  documentType: z.enum(showDocumentTypes),
  status: z.enum(showDocumentStatuses),
  fileUrl: z.string().url("Lien invalide").optional().or(z.literal("")),
  storagePath: z.string().max(500).optional(),
  notes: z.string().max(600, "La note est trop longue").optional(),
});

export const documentUploadRequestSchema = z.object({
  showId: z.string().min(1, "Spectacle requis"),
  fileName: z.string().min(1, "Nom de fichier requis").max(200),
  fileSize: z.number().min(1, "Fichier vide"),
  fileType: z.string().min(1, "Type de fichier requis"),
});

export type DocumentUploadRequest = z.infer<typeof documentUploadRequestSchema>;

export type ShowDocumentFormInput = z.input<typeof showDocumentSchema>;
export type ShowDocumentFormValues = z.infer<typeof showDocumentSchema>;
