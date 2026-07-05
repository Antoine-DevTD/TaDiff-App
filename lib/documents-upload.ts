// Regles d'upload partagees entre le client (validation avant envoi)
// et le serveur (validation avant signature d'URL).
// Doit rester aligne avec le bucket "documents" (sql/011_documents_storage.sql).

export const documentMaxFileSize = 20 * 1024 * 1024; // 20 Mo

export const documentAllowedMimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/plain",
] as const;

export const documentAcceptAttribute = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.odt,.ods,.txt";

export function isAllowedDocumentType(mimeType: string) {
  return (documentAllowedMimeTypes as readonly string[]).includes(mimeType);
}

export function getDocumentFileError(file: { size: number; type: string }) {
  if (!isAllowedDocumentType(file.type)) {
    return "Format non supporte. Utilisez PDF, image, Word, Excel ou texte.";
  }

  if (file.size > documentMaxFileSize) {
    return "Fichier trop lourd (20 Mo maximum).";
  }

  return null;
}

export function sanitizeDocumentFilename(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const extension = dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  const safeBase = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);

  return `${safeBase || "document"}${extension}`;
}
