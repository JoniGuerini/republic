import type { ReactNode } from 'react';

/**
 * Generic generator glyph.
 *
 * A minimalist editorial mark: the tier number rendered in the display
 * italic typeface, sitting on a thin baseline — meant to read as a
 * "grifo" / typographic monogram rather than an illustration. One glyph
 * per generator, so every card carries its own visual identity without
 * leaning on a thematic prop.
 */
export function GeneratorGlyphIcon({
  number,
  color = 'currentColor',
}: {
  number: number;
  color?: string;
}): ReactNode {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      stroke={color}
      strokeLinecap="round"
    >
      <text
        x="14"
        y="20"
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontStyle="italic"
        fontSize="18"
        fontWeight="500"
        fill={color}
        stroke="none"
      >
        {number}
      </text>
      {/* Thin underscore — gives the numeral the feel of a typographic mark
          (a grifo) instead of just a digit floating in the box. */}
      <line x1="9" y1="24" x2="19" y2="24" strokeWidth="1" />
    </svg>
  );
}

/**
 * Resource glyph — used in the track header. Same italic display family
 * as the per-generator glyphs but bolder and at a larger size, with an
 * "R" inside a soft frame so the resource pool reads as the source the
 * whole chain feeds into.
 */
export function ResourceGlyphIcon(): ReactNode {
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
      {/* Soft frame */}
      <rect
        x="5"
        y="5"
        width="26"
        height="26"
        rx="2"
        fill="var(--terracotta)"
        fillOpacity="0.12"
      />
      <rect x="5" y="5" width="26" height="26" rx="2" />
      {/* Display-italic "R" centered in the frame */}
      <text
        x="18"
        y="26"
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontStyle="italic"
        fontSize="22"
        fontWeight="500"
        fill="var(--terracotta-d)"
        stroke="none"
      >
        R
      </text>
    </svg>
  );
}
