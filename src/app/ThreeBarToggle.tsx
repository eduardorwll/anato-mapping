interface ThreeBarToggleProps {
  expanded: boolean;
  onToggle: () => void;
  label?: string;
  direction?: "left" | "right";
  shortcutHint?: string;
}

/**
 * Morphing three-bar ("three slashes") retractable toggle button.
 * Compact state: three crisp parallel bars.
 * Expanded state: smoothly morphs into a directional retract cue (← or →).
 */
export function ThreeBarToggle({
  expanded,
  onToggle,
  label = "Navegador",
  direction = "left",
  shortcutHint = direction === "left" ? "[" : "]",
}: ThreeBarToggleProps) {
  return (
    <button
      type="button"
      data-direction={direction}
      aria-expanded={expanded}
      aria-label={label}
      title={
        expanded
          ? `Recolher (${shortcutHint})`
          : `Expandir (${shortcutHint})`
      }
      onClick={onToggle}
      className="three-bar-btn btn-tactile flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg focus-visible:outline-none"
      style={{
        backgroundColor: expanded
          ? "var(--color-interest-soft)"
          : "transparent",
        color: expanded ? "var(--color-interest)" : "var(--color-foreground)",
        border: expanded
          ? "1px solid var(--color-interest-border)"
          : "1px solid transparent",
      }}
    >
      <span className="three-bar-box" aria-hidden="true">
        <span className="three-bar-line three-bar-top" />
        <span className="three-bar-line three-bar-mid" />
        <span className="three-bar-line three-bar-bot" />
      </span>
    </button>
  );
}
