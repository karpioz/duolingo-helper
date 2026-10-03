/** The Azulejo tile band across the top of every page (decorative). */
export function TileStrip() {
  return (
    <svg className="block h-3.5 w-full" aria-hidden>
      <defs>
        <pattern id="azulejo-tile" width="28" height="14" patternUnits="userSpaceOnUse">
          <rect width="28" height="14" fill="var(--teal)" />
          <path d="M14 1 21 7 14 13 7 7z" fill="var(--background)" />
          <circle cx="14" cy="7" r="2" fill="var(--saffron)" />
          <circle cx="0" cy="7" r="3" fill="var(--terracotta)" />
          <circle cx="28" cy="7" r="3" fill="var(--terracotta)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#azulejo-tile)" />
    </svg>
  );
}
