"use client";

import { useEffect } from "react";
import { applyTheatreTheme, modeStorageKey, resolveTheme } from "@/lib/theme-apply";

/** Applique le theme enregistre au chargement, sur toutes les pages (pas d'UI). */
export function ThemeApplier() {
  useEffect(() => {
    applyTheatreTheme(resolveTheme());

    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (window.localStorage.getItem(modeStorageKey) === "system") {
        applyTheatreTheme(resolveTheme());
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return null;
}
