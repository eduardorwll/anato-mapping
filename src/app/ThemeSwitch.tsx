import { Moon, Sun } from "lucide-react";
import type { ThemeId } from "../packages/design-tokens/index";

interface ThemeSwitchProps {
  theme: ThemeId;
  onToggle: () => void;
}

export function ThemeSwitch({ theme, onToggle }: ThemeSwitchProps) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Tema"
      title={isDark ? "Tema escuro" : "Tema claro"}
      onClick={onToggle}
      className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors focus-visible:outline-none"
      style={{
        backgroundColor: "var(--color-muted)",
        border: "1px solid var(--color-border-strong)",
      }}
    >
      <span className="pointer-events-none flex w-full items-center justify-between px-1.5">
        <Sun
          className="h-3.5 w-3.5 transition-opacity"
          style={{
            color: "var(--color-muted-foreground)",
            opacity: isDark ? 0.5 : 0,
          }}
        />
        <Moon
          className="h-3.5 w-3.5 transition-opacity"
          style={{
            color: "var(--color-muted-foreground)",
            opacity: isDark ? 0 : 0.5,
          }}
        />
      </span>
      <span
        className="pointer-events-none absolute left-0.5 top-0.5 flex h-5.5 w-5.5 items-center justify-center rounded-full shadow-sm transition-transform duration-200 ease-out"
        style={{
          transform: isDark ? "translateX(28px)" : "translateX(0px)",
          backgroundColor: "var(--color-interest)",
          color: "var(--color-interest-foreground)",
        }}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5" />
        ) : (
          <Sun className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}
