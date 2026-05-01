import Decimal from 'break_eternity.js';
import type { GameState, TrackKey } from '../types/game';
import { CONFIG } from './config';

/* ═══════════════ UPGRADE SYSTEM ═══════════════
 *
 * The republic has two upgrade families and one pair of global upgrades:
 *
 *   Per-generator (10 tiers × 2 = 20 upgrades):
 *     - production : ×2  per level  (cumulative; level N → ×2ⁿ)
 *     - cost       : ×½  per level  (cumulative; level N → ×0.5ⁿ on buy cost)
 *
 *   Global (2 upgrades):
 *     - production : ×2  per level on every generator simultaneously
 *     - cost       : ×½  per level on every generator's buy cost
 *
 * All upgrades have NO LEVEL CAP — costs grow geometrically so they
 * eventually outrun production, but the player can always buy more.
 * Returned values are Decimal across the board so downstream math composes
 * with the rest of the simulation without lossy conversions.
 */

/** Floor for the cost-reduction multiplier. We DO clamp here even though
 *  Decimal could store smaller values, because (a) numerically a cost
 *  ratio below ~1e-30 is indistinguishable from zero in practice, and (b)
 *  it gives the player a clean asymptote ("can't get below 1 letter") that
 *  matches the costOf() floor of 1. */
const COST_REDUCTION_FLOOR_LEVEL = 30;

/* ── Tunables ─────────────────────────────────────────────────────────── */

/** Multiplier applied to the target generator's `baseCost` to anchor the
 *  starting price of an INDIVIDUAL upgrade (production OR cost). */
const ANCHOR_INDIVIDUAL = 10;

/** Same idea for GLOBAL upgrades, but anchored to the geometric mean of
 *  all generators' baseCosts so the price reflects the whole production
 *  chain rather than any single tier. */
const ANCHOR_GLOBAL = 10;

/** Progressive cost-growth curve.
 *
 *  Every additional level multiplies the previous cost by
 *      GROWTH_BASE + GROWTH_SLOPE × currentLevel
 *  so the scaling starts gentle (level 0→1 ≈ ×2.5) and then ramps up:
 *
 *      0→1 : ×2.5   |   9→10 : ×5.2   |   19→20 : ×8.2   |   29→30 : ×11.2
 *
 *  Cumulative cost of level (N+1) over level 1 grows roughly factorially
 *  with N, which is the "muito mais escalonado" the player asked for —
 *  the first few upgrades stay snappy, but level 15+ becomes a real
 *  resource decision. */
const GROWTH_BASE = 2.5;
const GROWTH_SLOPE = 0.3;

/* ── Effect helpers (level → multiplier) ──────────────────────────────── */

/** Production multiplier from a single upgrade at level N. */
export function productionMultiplierAtLevel(level: number): Decimal {
  if (level <= 0) return new Decimal(1);
  return Decimal.pow(2, level);
}

/** Cost multiplier from a single upgrade at level N. Floored at level 30
 *  so we never approach Decimal.dLayerMin in pathological cases. */
export function costMultiplierAtLevel(level: number): Decimal {
  if (level <= 0) return new Decimal(1);
  const clamped = Math.min(level, COST_REDUCTION_FLOOR_LEVEL);
  return Decimal.pow(0.5, clamped);
}

/* ── Combined multipliers (individual × global) ───────────────────────── */

export function totalProductionMultiplier(
  state: GameState,
  trackKey: TrackKey,
  tierIdx: number,
): Decimal {
  const ind = state.upgrades[trackKey][tierIdx]?.production ?? 0;
  const glob = state.globalUpgrades.production;
  return productionMultiplierAtLevel(ind).mul(productionMultiplierAtLevel(glob));
}

export function totalCostMultiplier(
  state: GameState,
  trackKey: TrackKey,
  tierIdx: number,
): Decimal {
  const ind = state.upgrades[trackKey][tierIdx]?.cost ?? 0;
  const glob = state.globalUpgrades.cost;
  return costMultiplierAtLevel(ind).mul(costMultiplierAtLevel(glob));
}

/* ── Projected effects (used by the upgrade UI) ──────────────────────── */

export function projectedProductionMultiplier(
  state: GameState,
  trackKey: TrackKey,
  tierIdx: number,
  scope: 'individual' | 'global',
): Decimal {
  const ind = state.upgrades[trackKey][tierIdx]?.production ?? 0;
  const glob = state.globalUpgrades.production;
  const indNext = scope === 'individual' ? ind + 1 : ind;
  const globNext = scope === 'global' ? glob + 1 : glob;
  return productionMultiplierAtLevel(indNext).mul(productionMultiplierAtLevel(globNext));
}

export function projectedCostMultiplier(
  state: GameState,
  trackKey: TrackKey,
  tierIdx: number,
  scope: 'individual' | 'global',
): Decimal {
  const ind = state.upgrades[trackKey][tierIdx]?.cost ?? 0;
  const glob = state.globalUpgrades.cost;
  const indNext = scope === 'individual' ? ind + 1 : ind;
  const globNext = scope === 'global' ? glob + 1 : glob;
  return costMultiplierAtLevel(indNext).mul(costMultiplierAtLevel(globNext));
}

/* ── Pricing helpers (next-level cost) ────────────────────────────────── */

/** Geometric mean of a numeric array, in log space for stability across
 *  the huge range of base costs. */
function geometricMean(values: number[]): number {
  if (values.length === 0) return 1;
  let logSum = 0;
  for (const v of values) logSum += Math.log(v);
  return Math.exp(logSum / values.length);
}

/** Cached: anchor value for global upgrade pricing.
 *
 *  We deliberately use the geometric mean of only the *early* tiers (1..4
 *  here) instead of every baseCost. With the new curve climbing to 1e200,
 *  averaging across the whole table would make the very first global
 *  upgrade cost ~1e63 letters — proibitivo logo na primeira sessão.
 *
 *  Anchoring on the early game keeps globals reachable from the first
 *  Editor/Biblioteca, while the progressive growth curve still ramps the
 *  later levels into the trillions and beyond. */
const GLOBAL_ANCHOR_VALUE = (() => {
  const earlyTiers = CONFIG.letters.tiers.slice(0, 4).map((t) => t.baseCost);
  return geometricMean(earlyTiers);
})();

/** Cumulative growth factor from level 0 to `currentLevel`, applying the
 *  progressive curve described above:
 *      ∏  (GROWTH_BASE + GROWTH_SLOPE × k)   for k = 0 .. currentLevel-1
 *  At level 0 the product is empty and the factor is 1 (so the first
 *  upgrade still costs exactly ANCHOR × baseCost). */
function progressiveGrowthFactor(currentLevel: number): Decimal {
  if (currentLevel <= 0) return new Decimal(1);
  let factor = new Decimal(1);
  for (let k = 0; k < currentLevel; k += 1) {
    factor = factor.mul(GROWTH_BASE + GROWTH_SLOPE * k);
  }
  return factor;
}

/** Cost (in letters) to go from level N to level N+1 of an individual
 *  upgrade for a given generator. */
export function individualUpgradeCost(
  trackKey: TrackKey,
  tierIdx: number,
  currentLevel: number,
): Decimal {
  const baseCost = CONFIG[trackKey].tiers[tierIdx].baseCost;
  const growth = progressiveGrowthFactor(currentLevel);
  return new Decimal(ANCHOR_INDIVIDUAL).mul(baseCost).mul(growth).ceil();
}

/** Cost (in letters) to go from level N to level N+1 of a global upgrade. */
export function globalUpgradeCost(currentLevel: number): Decimal {
  const growth = progressiveGrowthFactor(currentLevel);
  return new Decimal(ANCHOR_GLOBAL).mul(GLOBAL_ANCHOR_VALUE).mul(growth).ceil();
}

/* ── Cap detection (cost upgrades only) ───────────────────────────────────
 *
 * Production upgrades have no cap — every level legitimately doubles output.
 * Cost upgrades, however, are bounded by the hard floor of 1 letter per buy
 * (see costOf in utils.ts). Once the projected next-level reduction wouldn't
 * lower the price any further (i.e. the price is already at the floor and
 * the next level would still produce a price ≤ 1), we treat the upgrade as
 * MAXED OUT and refuse to sell it.
 *
 * We use `currentLevel + 1` projected math so the check matches exactly the
 * "next" cost shown on the upgrade card.
 */

/** Returns true when the next level of an INDIVIDUAL cost upgrade for the
 *  given generator would have no further effect (price already at floor). */
export function isIndividualCostMaxed(
  state: GameState,
  trackKey: TrackKey,
  tierIdx: number,
): boolean {
  const tier = CONFIG[trackKey].tiers[tierIdx];
  const projected = projectedCostMultiplier(state, trackKey, tierIdx, 'individual');
  // Price after one more level of this individual cost upgrade.
  const projectedPrice = new Decimal(tier.baseCost).mul(projected);
  // If the projected price has already collapsed to the floor (≤ 1),
  // buying another level is wasted letters.
  return projectedPrice.lte(1);
}

/** Returns true when the next level of the GLOBAL cost upgrade would have
 *  no effect on ANY generator — meaning every generator's price is already
 *  pinned at the floor and an extra global level wouldn't drop a single
 *  one of them below 1. */
export function isGlobalCostMaxed(state: GameState): boolean {
  for (const trackKey of Object.keys(CONFIG) as TrackKey[]) {
    const tiers = CONFIG[trackKey].tiers;
    for (let tierIdx = 0; tierIdx < tiers.length; tierIdx += 1) {
      const projected = projectedCostMultiplier(state, trackKey, tierIdx, 'global');
      const projectedPrice = new Decimal(tiers[tierIdx].baseCost).mul(projected);
      // Found at least one generator that would still benefit — not maxed.
      if (projectedPrice.gt(1)) return false;
    }
  }
  return true;
}

/* ── Identity / metadata for the UI ───────────────────────────────────── */

export type UpgradeFamily = 'production' | 'cost';

export interface UpgradeId {
  scope: 'individual' | 'global';
  family: UpgradeFamily;
  /** Only present for individual upgrades. */
  trackKey?: TrackKey;
  tierIdx?: number;
}

export function upgradeIdKey(id: UpgradeId): string {
  if (id.scope === 'global') return `global:${id.family}`;
  return `ind:${id.trackKey}:${id.tierIdx}:${id.family}`;
}

export function upgradeLabel(id: UpgradeId): string {
  const familyWord = id.family === 'production' ? 'Produção' : 'Custo';
  if (id.scope === 'global') return `${familyWord} Global`;
  const tierName = CONFIG[id.trackKey!].tiers[id.tierIdx!].name;
  return `${familyWord} de ${tierName}`;
}
