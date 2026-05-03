import type { GameConfig, TierDef } from '../types/game';
import { GeneratorGlyphIcon } from './icons';

const TIER_COUNT = 100;

/** Cost curve.
 *
 *   log10(cost(i)) = 1 + a·i + b·i·(i−1)/2
 *
 * which is the same as a "geometric" curve where the multiplier between
 * consecutive tiers is `10^(a + b·(i−1))` — it grows linearly with the
 * tier index, so the late game gets exponentially harder than the early
 * game without a single sudden cliff.
 *
 * With (a=1.5, b=0.05):
 *   tier  0 →             10        (×–   start)
 *   tier  1 →            316        (×31.6)
 *   tier  2 →         11 220        (×35.5)
 *   tier 10 → ≈ 1 × 10¹⁵            (×~50)
 *   tier 50 → ≈ 1 × 10⁷⁵            (×~530)
 *   tier 99 → ≈ 1 × 10³⁹²           (×~10⁵)
 *
 * `break_eternity.js` parses these via `new Decimal("1.23e392")` without
 * losing precision; `formatNum` already promotes anything past 1e33 to
 * the alphabetic suffix family (aa, ab, …, aaa, …). */
const COST_A = 1.5;
const COST_B = 0.05;

/** Production curve — geometric decay, much gentler than the cost growth
 *  on purpose so the player still wants many of each tier instead of just
 *  one of the top one. */
const PROD_BASE = 0.2;
const PROD_DECAY = 0.95;

/** Render a base-10 logarithm as a Decimal-parseable string ("1.234e567").
 *  Required because `Math.pow(10, x)` returns Infinity for x ≳ 308 — we
 *  manually extract the integer/fractional parts of the exponent and
 *  compute only the in-range mantissa. */
function pow10String(log10: number): string {
  const intPart = Math.floor(log10);
  const fracPart = log10 - intPart;
  // Mantissa is always in [1, 10) by construction.
  const mantissa = Math.pow(10, fracPart);
  return `${mantissa.toFixed(6)}e${intPart}`;
}

function costForTier(i: number): string {
  const log10 = 1 + COST_A * i + (COST_B * i * (i - 1)) / 2;
  return pow10String(log10);
}

function productionForTier(i: number): number {
  return PROD_BASE * Math.pow(PROD_DECAY, i);
}

function makeTier(idx: number): TierDef {
  const number = idx + 1;
  return {
    name: `Gerador ${number}`,
    baseCost: costForTier(idx),
    baseProduction: productionForTier(idx),
    icon: <GeneratorGlyphIcon number={number} color="var(--terracotta-d)" />,
    unlocksAt: idx,
  };
}

export const CONFIG: GameConfig = {
  recurso: {
    name: 'Recurso',
    motto: 'uma trilha de geradores',
    resourceKey: 'recurso',
    tiers: Array.from({ length: TIER_COUNT }, (_, i) => makeTier(i)),
  },
};

export const TRACK_KEYS = Object.keys(CONFIG) as Array<keyof typeof CONFIG>;
