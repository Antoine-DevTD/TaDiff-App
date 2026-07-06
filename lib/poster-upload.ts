// Regles d'upload de l'affiche d'un spectacle (image seulement).
// L'affiche va dans un bucket PUBLIC "posters" : URL permanente, pas de lien externe.

export const posterMaxFileSize = 8 * 1024 * 1024; // 8 Mo

export const posterAllowedMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const posterAcceptAttribute = ".png,.jpg,.jpeg,.webp";

export function isAllowedPosterType(mimeType: string) {
  return (posterAllowedMimeTypes as readonly string[]).includes(mimeType);
}

export function getPosterFileError(file: { size: number; type: string }) {
  if (!isAllowedPosterType(file.type)) {
    return "Format non supporte. Utilisez une image JPG, PNG ou WebP.";
  }

  if (file.size > posterMaxFileSize) {
    return "Image trop lourde (8 Mo maximum).";
  }

  return null;
}
