"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  applyTheatreTheme,
  darkThemeId,
  lightThemeId,
  modeStorageKey,
  resolveTheme,
  themeStorageKey,
  type ThemeMode,
} from "@/lib/theme-apply";

const options: { value: Exclude<ThemeMode, "custom">; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Systeme", icon: Monitor },
];

export function ThemeModeSwitcher() {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem(modeStorageKey) as ThemeMode | null;
      setMode(stored ?? "custom");
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  function choose(value: Exclude<ThemeMode, "custom">) {
    window.localStorage.setItem(modeStorageKey, value);
    // Aligne le theme vignette pour clair/sombre (systeme reste dynamique).
    if (value === "light") window.localStorage.setItem(themeStorageKey, lightThemeId);
    if (value === "dark") window.localStorage.setItem(themeStorageKey, darkThemeId);
    applyTheatreTheme(resolveTheme());
    setMode(value);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const Icon = option.icon;
        const active = mode === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => choose(option.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition",
              active
                ? "border-accent bg-accent text-white"
                : "border-border bg-panel text-foreground hover:bg-panel-strong",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
