import type { ReactNode } from 'react';

interface IconProps {
  color: string;
}

export function FeatherIcon({ color }: IconProps): ReactNode {
  /**
   * Modern fountain pen on a 45° diagonal.
   *
   * Anatomy, from the cap end (upper-right) to the writing tip (lower-left):
   *
   *   1. Cap finial    — small rounded tip at the top of the cap
   *   2. Cap           — wider cylindrical segment with a pocket clip
   *   3. Cap band      — thin metal ring separating the cap from the barrel
   *   4. Barrel        — slightly narrower body of the pen
   *   5. Section       — short tapered grip between barrel and nib
   *   6. Nib           — triangular metal point with a slit and breather hole
   */
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      {/* Cap finial — rounded blunt end at the top of the cap */}
      <path
        d="M22.5 2.5 L 25.5 5.5 L 24.5 6.5 L 21.5 3.5 Z"
        fill={color}
        fillOpacity="0.55"
      />

      {/* Cap — the widest segment, holds the clip */}
      <path
        d="M21.5 3.5 L 24.5 6.5 L 18 13 L 15 10 Z"
        fill={color}
        fillOpacity="0.5"
      />
      {/* Pocket clip on the side of the cap */}
      <path d="M22 7 L 19 10" strokeWidth="1.4" strokeLinecap="round" />

      {/* Cap band — metallic ring marking the cap/barrel transition */}
      <path
        d="M15 10 L 18 13 L 17 14 L 14 11 Z"
        fill={color}
        fillOpacity="0.75"
      />

      {/* Barrel — slightly narrower than the cap */}
      <path
        d="M14 11 L 17 14 L 11 20 L 8 17 Z"
        fill={color}
        fillOpacity="0.5"
      />

      {/* Section — short tapered grip leading into the nib */}
      <path
        d="M8 17 L 11 20 L 9.5 21.5 L 6.5 18.5 Z"
        fill={color}
        fillOpacity="0.55"
      />

      {/* Nib — tapered metal writing point */}
      <path
        d="M6.5 18.5 L 9.5 21.5 L 4 25 Z"
        fill={color}
        fillOpacity="0.4"
      />
      {/* Slit running down the centre of the nib */}
      <path d="M8 20 L 4 25" strokeWidth="0.6" />
      {/* Breather hole at the shoulder of the nib */}
      <circle cx="7.5" cy="20.5" r="0.7" fill={color} />
    </svg>
  );
}

export function PressIcon({ color }: IconProps): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round">
      <rect x="5" y="6" width="18" height="4" fill={color} fillOpacity="0.2" />
      <rect x="5" y="6" width="18" height="4" />
      <rect x="7" y="10" width="14" height="12" />
      <line x1="10" y1="14" x2="18" y2="14" strokeWidth="0.7" />
      <line x1="10" y1="17" x2="17" y2="17" strokeWidth="0.7" />
    </svg>
  );
}

export function BookIcon({ color }: IconProps): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round">
      <path d="M5 6 L 14 8 L 23 6 L 23 22 L 14 24 L 5 22 Z" fill={color} fillOpacity="0.15" />
      <path d="M5 6 L 14 8 L 23 6 L 23 22 L 14 24 L 5 22 Z" />
      <line x1="14" y1="8" x2="14" y2="24" />
    </svg>
  );
}

export function LibraryIcon({ color }: IconProps): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round">
      <rect x="5" y="8" width="3" height="14" fill={color} fillOpacity="0.3" />
      <rect x="5" y="8" width="3" height="14" />
      <rect x="9" y="6" width="3" height="16" fill={color} fillOpacity="0.2" />
      <rect x="9" y="6" width="3" height="16" />
      <rect x="13" y="9" width="3" height="13" fill={color} fillOpacity="0.3" />
      <rect x="13" y="9" width="3" height="13" />
      <rect x="17" y="7" width="3" height="15" fill={color} fillOpacity="0.2" />
      <rect x="17" y="7" width="3" height="15" />
      <rect x="21" y="10" width="3" height="12" />
    </svg>
  );
}

/* Tier 5 — Tradutor: two mirrored open pages with crossed arrows between them
   suggesting language going back and forth. */
export function TranslatorIcon({ color }: IconProps): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      {/* Left page */}
      <path d="M3 7 L 11 8 L 11 22 L 3 21 Z" fill={color} fillOpacity="0.18" />
      <path d="M3 7 L 11 8 L 11 22 L 3 21 Z" />
      <line x1="5" y1="11" x2="9" y2="11.4" strokeWidth="0.7" />
      <line x1="5" y1="14" x2="9" y2="14.4" strokeWidth="0.7" />

      {/* Right page */}
      <path d="M25 7 L 17 8 L 17 22 L 25 21 Z" fill={color} fillOpacity="0.18" />
      <path d="M25 7 L 17 8 L 17 22 L 25 21 Z" />
      <line x1="19" y1="11.4" x2="23" y2="11" strokeWidth="0.7" />
      <line x1="19" y1="14.4" x2="23" y2="14" strokeWidth="0.7" />

      {/* Crossed arrows between pages */}
      <path d="M11.5 12.5 L 16.5 17" strokeWidth="0.9" />
      <path d="M16.5 17 L 14.8 17" strokeWidth="0.7" />
      <path d="M16.5 17 L 16.5 15.4" strokeWidth="0.7" />

      <path d="M16.5 12.5 L 11.5 17" strokeWidth="0.9" />
      <path d="M11.5 17 L 13.2 17" strokeWidth="0.7" />
      <path d="M11.5 17 L 11.5 15.4" strokeWidth="0.7" />
    </svg>
  );
}

/* Tier 6 — Academia: classical frieze with a triangular pediment over three
   columns standing on a stylobate. */
export function AcademyIcon({ color }: IconProps): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      {/* Pediment (triangle) */}
      <path d="M4 11 L 14 4 L 24 11 Z" fill={color} fillOpacity="0.18" />
      <path d="M4 11 L 14 4 L 24 11 Z" />
      {/* Architrave (horizontal beam under the pediment) */}
      <line x1="4" y1="11" x2="24" y2="11" />
      <line x1="4.5" y1="13" x2="23.5" y2="13" />

      {/* Three columns */}
      <line x1="7" y1="13" x2="7" y2="22" />
      <line x1="14" y1="13" x2="14" y2="22" />
      <line x1="21" y1="13" x2="21" y2="22" />

      {/* Stylobate (base) */}
      <line x1="3" y1="22" x2="25" y2="22" strokeWidth="1.4" />
      <line x1="3" y1="24" x2="25" y2="24" strokeWidth="0.7" />
    </svg>
  );
}

/* Tier 7 — Universidade: academic mortar board (graduation cap) seen at a
   slight angle, with a tassel hanging from one corner. */
export function UniversityIcon({ color }: IconProps): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      {/* Mortar board (flat square top, perspective rhombus) */}
      <path d="M14 6 L 25 11 L 14 16 L 3 11 Z" fill={color} fillOpacity="0.2" />
      <path d="M14 6 L 25 11 L 14 16 L 3 11 Z" />

      {/* Cap base (the round skullcap under the board) */}
      <path d="M7 13 Q 7 19 14 19 Q 21 19 21 13" fill={color} fillOpacity="0.12" />
      <path d="M7 13 Q 7 19 14 19 Q 21 19 21 13" />

      {/* Button on top */}
      <circle cx="14" cy="11" r="0.8" fill={color} />

      {/* Tassel — short cord + brush hanging from the right corner */}
      <path d="M14 11 L 22 13 L 22 18" />
      <path d="M22 18 L 21 21 M 22 18 L 22 21 M 22 18 L 23 21" strokeWidth="0.7" />
    </svg>
  );
}

/* Tier 8 — Cânon: a closed book with a circular consecration seal at its
   centre, marking it as canonical / authoritative. */
export function CanonIcon({ color }: IconProps): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      {/* Book cover (flat slab) */}
      <rect x="5" y="4" width="18" height="20" rx="0.5" fill={color} fillOpacity="0.18" />
      <rect x="5" y="4" width="18" height="20" rx="0.5" />
      {/* Spine line */}
      <line x1="7" y1="4" x2="7" y2="24" strokeWidth="0.9" />

      {/* Central seal — outer circle, inner star */}
      <circle cx="15" cy="14" r="4.5" fill={color} fillOpacity="0.15" />
      <circle cx="15" cy="14" r="4.5" />
      <circle cx="15" cy="14" r="2.4" strokeWidth="0.7" />
      {/* Four-pointed star inside the seal */}
      <path d="M15 11.5 L 15.6 13.4 L 17.5 14 L 15.6 14.6 L 15 16.5 L 14.4 14.6 L 12.5 14 L 14.4 13.4 Z" fill={color} fillOpacity="0.6" stroke="none" />
    </svg>
  );
}

/* Tier 9 — Idioma: a small globe with a meridian and two speech-arcs flanking
   it, suggesting a language alive in many mouths across the world. */
export function LanguageIcon({ color }: IconProps): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      {/* Globe */}
      <circle cx="14" cy="14" r="7" fill={color} fillOpacity="0.15" />
      <circle cx="14" cy="14" r="7" />
      {/* Equator */}
      <ellipse cx="14" cy="14" rx="7" ry="2.5" strokeWidth="0.8" />
      {/* Meridian */}
      <ellipse cx="14" cy="14" rx="2.5" ry="7" strokeWidth="0.8" />
      {/* Vertical axis line */}
      <line x1="14" y1="7" x2="14" y2="21" strokeWidth="0.8" />

      {/* Speech arcs — short curved marks on each side suggesting voices */}
      <path d="M3 10 Q 5 14 3 18" strokeWidth="0.8" />
      <path d="M25 10 Q 23 14 25 18" strokeWidth="0.8" />
    </svg>
  );
}

/* Tier 10 — Civilização: a small skyline of towers (varying heights, including
   a domed building) standing on an open book that serves as foundation. */
export function CivilizationIcon({ color }: IconProps): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
      {/* Tall left tower */}
      <rect x="5" y="6" width="3" height="14" fill={color} fillOpacity="0.18" />
      <rect x="5" y="6" width="3" height="14" />
      {/* Spire on tall tower */}
      <path d="M5 6 L 6.5 3.5 L 8 6" />

      {/* Domed central building */}
      <rect x="10" y="11" width="8" height="9" fill={color} fillOpacity="0.18" />
      <rect x="10" y="11" width="8" height="9" />
      <path d="M10 11 Q 14 6 18 11" fill={color} fillOpacity="0.22" />
      <path d="M10 11 Q 14 6 18 11" />
      {/* Small finial on dome */}
      <line x1="14" y1="6.5" x2="14" y2="5" strokeWidth="0.8" />

      {/* Right tower */}
      <rect x="20" y="9" width="3" height="11" fill={color} fillOpacity="0.18" />
      <rect x="20" y="9" width="3" height="11" />

      {/* Book base — open pages spreading under the city */}
      <path d="M3 20 L 14 22 L 25 20 L 25 24 L 14 25.5 L 3 24 Z" fill={color} fillOpacity="0.25" />
      <path d="M3 20 L 14 22 L 25 20 L 25 24 L 14 25.5 L 3 24 Z" />
      <line x1="14" y1="22" x2="14" y2="25.5" strokeWidth="0.7" />
    </svg>
  );
}

/* Resource bar glyph (larger, 36x36) */

export function LettersGlyphIcon(): ReactNode {
  /**
   * Inkwell with a quill pen dipped inside — represents "Letras"
   * as the source of all writing. The composition is read in two parts:
   *
   *   1. Inkwell  — squat trapezoidal bottle with a narrow neck and
   *                 a visible ink surface at the opening
   *   2. Quill    — feathered shaft entering the bottle on a diagonal,
   *                 with a thin metal nib resting in the ink
   */
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      stroke="var(--terracotta-d)"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Inkwell body — wide squat bottle */}
      <path
        d="M9 32 L 7 22 Q 7 19 10 19 L 26 19 Q 29 19 29 22 L 27 32 Z"
        fill="var(--terracotta)"
        fillOpacity="0.18"
      />
      {/* Neck / opening — narrow rim where the quill enters */}
      <path d="M13 19 L 13 16 L 23 16 L 23 19" />
      {/* Ink surface inside the opening — solid puddle catching the nib */}
      <path
        d="M14 17 L 22 17"
        strokeWidth="2"
        stroke="var(--terracotta-d)"
      />

      {/* Quill shaft — diagonal from the ink up to the feather */}
      <path d="M19 17 L 31 4" />

      {/* Feather vane — leaf shape at the top of the shaft */}
      <path
        d="M31 4 Q 34 7 30 11 Q 26 14 23 12 Q 25 8 31 4 Z"
        fill="var(--terracotta)"
        fillOpacity="0.25"
      />
      {/* Feather barbs — three short marks suggesting plumage */}
      <path d="M26 11 L 28 9" strokeWidth="0.8" />
      <path d="M28 9 L 30 7" strokeWidth="0.8" />
      <path d="M30 7 L 31 6" strokeWidth="0.8" />

      {/* Decorative ink drop falling from the feather */}
      <path
        d="M33 13 Q 34.5 15.5 33 17 Q 31.5 15.5 33 13 Z"
        fill="var(--terracotta-d)"
        stroke="none"
      />
    </svg>
  );
}
