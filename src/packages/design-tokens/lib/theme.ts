export type ThemeId = "dark" | "light";

const STORAGE_KEY = "anato-mapping.theme";
let transitionTimer: ReturnType<typeof setTimeout> | null = null;

export function getInitialTheme(): ThemeId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // Ignore storage access errors in restricted environments.
  }

  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }

  return "dark";
}

export function applyTheme(
  theme: ThemeId,
  options?: { animate?: boolean },
): void {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (options?.animate) {
      root.classList.add("theme-transitioning");
      if (transitionTimer) clearTimeout(transitionTimer);
      transitionTimer = setTimeout(() => {
        root.classList.remove("theme-transitioning");
        transitionTimer = null;
      }, 210);
    }
    root.setAttribute("data-theme", theme);
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage write errors.
  }
}

export function toggleTheme(current: ThemeId): ThemeId {
  return current === "dark" ? "light" : "dark";
}

export function cssVarForToken(token: string): string {
  return `var(${token})`;
}
