"use client";

import { ImagePlus, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { prepareShowPosterUpload } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { getPosterFileError, posterAcceptAttribute } from "@/lib/poster-upload";

async function resizeImage(file: File, maxDimension: number): Promise<File> {
  if (typeof document === "undefined" || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, type, 0.9),
    );
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, type === "image/png" ? ".png" : ".jpg");
    return new File([blob], name, { type });
  } catch {
    return file;
  }
}

export function PosterUploadField({
  showId,
  value,
  onChange,
  chooseLabel = "Choisir une image (JPG, PNG, WebP)",
  emptyHint = "Aucune affiche pour l'instant. L'image sera stockée dans TaDiff.",
  maxDimension,
}: {
  showId: string;
  value: string;
  onChange: (url: string) => void;
  chooseLabel?: string;
  emptyHint?: string;
  maxDimension?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  async function onFile(input: File) {
    setError(null);
    setIsUploading(true);

    try {
      const file = maxDimension ? await resizeImage(input, maxDimension) : input;

      const validationError = getPosterFileError(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const prepared = await prepareShowPosterUpload({
        showId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      if (!prepared.ok || !prepared.signedUrl || !prepared.publicUrl) {
        setError(prepared.message);
        return;
      }

      const uploadResponse = await fetch(prepared.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        setError("L'envoi de l'image a échoué. Réessayez.");
        return;
      }

      onChange(prepared.publicUrl);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Aperçu de l'image"
            className="h-28 w-28 rounded-md border border-border bg-panel object-contain p-2"
          />
          <div className="space-y-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {isUploading ? "Envoi..." : "Remplacer l'image"}
            </Button>
            <button
              type="button"
              className="block text-xs font-medium text-danger hover:underline"
              onClick={() => onChange("")}
            >
              Retirer l&apos;image
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void onFile(file);
        }}
        className={
          isDragging
            ? "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-accent bg-accent/10 px-5 py-6 text-center text-accent transition"
            : "flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-panel-strong/45 px-5 py-6 text-center text-muted transition hover:border-accent/60 hover:bg-accent/5 hover:text-foreground"
        }
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-panel shadow-sm">
          {isUploading ? (
            <Upload className="h-5 w-5 animate-pulse" aria-hidden />
          ) : (
            <ImagePlus className="h-5 w-5" aria-hidden />
          )}
        </span>
        <span className="text-sm font-medium">
          {isUploading
            ? "Envoi de l'image..."
            : value
              ? "Déposer une nouvelle image"
              : "Déposer une image ici"}
        </span>
        {!isUploading ? (
          <span className="text-xs">{chooseLabel} ou glissez-déposez un fichier</span>
        ) : null}
        <span className="text-xs text-muted">JPG, PNG ou WebP · 8 Mo maximum</span>
      </button>

      <input
        ref={inputRef}
        accept={posterAcceptAttribute}
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onFile(file);
          event.target.value = "";
        }}
      />

      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {!value && !error ? <p className="text-xs text-muted">{emptyHint}</p> : null}
    </div>
  );
}
