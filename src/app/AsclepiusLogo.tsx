interface AsclepiusLogoProps {
  className?: string;
}

/**
 * Rod of Asclepius (Bastão de Asclépio): single vertical staff entwined by a
 * single serpent, no wings — authentic medical symbol (WHO / CFM).
 */
export function AsclepiusLogo({ className = "h-4 w-4" }: AsclepiusLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Staff & top finial */}
      <line x1="12" y1="2.5" x2="12" y2="21.5" />
      <line x1="10.2" y1="2.5" x2="13.8" y2="2.5" />
      {/* Single entwined serpent */}
      <path d="M9 5.5c1-1.2 4.8-1.2 5.4.6.6 1.7-4.8 2.4-4.8 4.4 0 2 5 2.4 5 4.5 0 1.8-3.8 2.5-4.4 4" />
      {/* Serpent head */}
      <circle cx="8.6" cy="5.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
