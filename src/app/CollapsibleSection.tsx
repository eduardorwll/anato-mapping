import type { ReactNode } from "react";

interface CollapsibleSectionProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Smooth CSS grid-template-rows disclosure wrapper (0fr <-> 1fr)
 * keeping content accessible only when open and animating cleanly.
 */
export function CollapsibleSection({
  open,
  children,
  className = "",
}: CollapsibleSectionProps) {
  return (
    <div
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
      className={`collapsible-grid ${className}`}
    >
      <div className="collapsible-inner">{children}</div>
    </div>
  );
}
