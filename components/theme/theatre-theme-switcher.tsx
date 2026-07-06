"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { defaultTheatreTheme, theatreThemes, type TheatreThemeId } from "@/lib/theatre-themes";

const storageKey = "tadiff-theatre-theme";

function isTheatreThemeId(value: string | null): value is TheatreThemeId {
  return theatreThemes.some((theme) => theme.id === value);
}

function applyTheme(themeId: TheatreThemeId) {
  const theme = theatreThemes.find((item) => item.id === themeId);

  document.documentElement.dataset.theatreTheme = themeId;
  document.documentElement.dataset.theatreLayout = theme?.layoutName ?? themeId;
  window.localStorage.setItem(storageKey, themeId);
}

export function TheatreThemeSwitcher({ embedded = false }: { embedded?: boolean }) {
  const [activeTheme, setActiveTheme] = useState<TheatreThemeId>(defaultTheatreTheme);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey);
    const resolvedTheme = isTheatreThemeId(storedTheme) ? storedTheme : defaultTheatreTheme;
    const frameId = window.requestAnimationFrame(() => {
      applyTheme(resolvedTheme);
      setActiveTheme(resolvedTheme);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const selectedTheme =
    theatreThemes.find((theme) => theme.id === activeTheme) ?? theatreThemes[0];

  const inner = (
    <div
      className={cn(
        "flex flex-col gap-3",
        embedded ? "" : "mx-auto max-w-7xl xl:flex-row xl:items-center xl:justify-between",
      )}
    >
      {embedded ? (
        <p className="text-sm text-foreground">
          Theme actuel : <span className="font-medium">{selectedTheme.name}</span> -{" "}
          {selectedTheme.layoutName}
        </p>
      ) : (
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Direction artistique et agencement
          </p>
          <p className="mt-1 text-sm text-foreground">
            {selectedTheme.name} - {selectedTheme.layoutName}
          </p>
          <p className="mt-1 hidden max-w-3xl text-xs text-muted md:block">
            {selectedTheme.layoutSummary} Landing : {selectedTheme.landingArrangement} Cockpit :{" "}
            {selectedTheme.cockpitArrangement}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 xl:pb-0" aria-label="Themes visuels">
          {theatreThemes.map((theme) => {
            const active = theme.id === activeTheme;

            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={active}
                className={cn(
                  "flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active
                    ? "border-accent bg-accent text-white shadow-sm shadow-ink/10"
                    : "border-border bg-background text-foreground hover:bg-panel-strong",
                )}
                onClick={() => {
                  applyTheme(theme.id);
                  setActiveTheme(theme.id);
                }}
              >
                <span
                  className="h-4 w-4 rounded-full border border-white/30"
                  style={{ background: theme.accent }}
                />
                <span className="flex flex-col items-start leading-tight">
                  <span>{theme.name}</span>
                  <span className={cn("hidden text-[11px]", active ? "text-white/75" : "text-muted", "sm:block")}>
                    {theme.layoutName}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );

  if (embedded) {
    return inner;
  }

  return (
    <section className="border-b border-border bg-panel/92 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      {inner}
    </section>
  );
}
