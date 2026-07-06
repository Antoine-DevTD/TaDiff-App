"use client";

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
  emptyHint = "Aucune affiche pour l'instant. L'image sera stockee dans TaDiff.",
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
        setError("L'envoi de l'image a echoue. Reessayez.");
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
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Apercu de l'affiche"
            className="h-28 w-auto rounded-md border border-border object-cover"
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
              Retirer l&apos;affiche
            </button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "Envoi..." : chooseLabel}
        </Button>
      )}

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
