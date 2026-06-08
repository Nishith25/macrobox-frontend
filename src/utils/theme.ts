// frontend/src/utils/theme.ts

export type ThemeMode = "light" | "dark";

export const THEME_KEY = "macrobox_theme";

export function getSavedTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "dark" ? "dark" : "light";
}

export function applyTheme(theme: ThemeMode) {
  localStorage.setItem(THEME_KEY, theme);

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.setAttribute("data-theme", theme);

  document.body.style.background = theme === "dark" ? "#020617" : "#f6f7f8";
  document.body.style.color = theme === "dark" ? "#f8fafc" : "#0f172a";

  window.dispatchEvent(new CustomEvent("macrobox-theme-change", { detail: theme }));
}

export function toggleTheme() {
  const current = getSavedTheme();
  const next: ThemeMode = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}