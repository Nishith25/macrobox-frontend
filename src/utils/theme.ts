// frontend/src/utils/theme.ts (FRONTEND)

export type ThemeMode = "light" | "dark";

export const THEME_KEY = "macrobox_theme";

export function getSavedTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "dark" ? "dark" : "light";
}

export function applyMacroBoxTheme(theme: ThemeMode) {
  localStorage.setItem(THEME_KEY, theme);

  const root = document.documentElement;

  if (theme === "dark") {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
    document.body.style.background = "#020617";
    document.body.style.color = "#f8fafc";
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    document.body.style.background = "#f6f7f8";
    document.body.style.color = "#0f172a";
  }

  window.dispatchEvent(
    new CustomEvent("macrobox-theme-change", {
      detail: theme,
    })
  );
}

export function toggleMacroBoxTheme(): ThemeMode {
  const current = getSavedTheme();
  const next = current === "dark" ? "light" : "dark";
  applyMacroBoxTheme(next);
  return next;
}