"use client";

import { useRef, useState } from "react";
import { prepareShowPosterUpload } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { getPosterFileError, posterAcceptAttribute } from "@/lib/poster-upload";

export function PosterUploadField({
  showId,
  value,
  onChange,
}: {
  showId: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function onFile(file: File) {
    const validationError = getPosterFileError(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
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
          {isUploading ? "Envoi..." : "Choisir une image (JPG, PNG, WebP)"}
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
      {!value && !error ? (
        <p className="text-xs text-muted">
          Aucune affiche pour l&apos;instant. L&apos;image sera stockee dans TaDiff.
        </p>
      ) : null}
    </div>
  );
}
