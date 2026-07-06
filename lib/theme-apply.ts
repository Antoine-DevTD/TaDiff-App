import { defaultTheatreTheme, theatreThemes, type TheatreThemeId } from "@/lib/theatre-themes";

export const themeStorageKey = "tadiff-theatre-theme";
export const modeStorageKey = "tadiff-theme-mode";

// "custom" = un theme precis choisi dans les vignettes (hors clair/sombre).
export type ThemeMode = "light" | "dark" | "system" | "custom";

export const lightThemeId: TheatreThemeId = "velours";
export const darkThemeId: TheatreThemeId = "plateau";

export function isTheatreThemeId(value: string | null): value is TheatreThemeId {
  return theatreThemes.some((theme) => theme.id === value);
}

export function applyTheatreTheme(themeId: TheatreThemeId) {
  const theme = theatreThemes.find((item) => item.id === themeId);
  document.documentElement.dataset.theatreTheme = themeId;
  document.documentElement.dataset.theatreLayout = theme?.layoutName ?? themeId;
}

export function systemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** Theme effectif a appliquer selon le mode enregistre (ou le theme custom). */
export function resolveTheme(): TheatreThemeId {
  if (typeof window === "undefined") return defaultTheatreTheme;

  const mode = window.localStorage.getItem(modeStorageKey) as ThemeMode | null;
  if (mode === "light") return lightThemeId;
  if (mode === "dark") return darkThemeId;
  if (mode === "system") return systemPrefersDark() ? darkThemeId : lightThemeId;

  const saved = window.localStorage.getItem(themeStorageKey);
  return isTheatreThemeId(saved) ? saved : defaultTheatreTheme;
}
