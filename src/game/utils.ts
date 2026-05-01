import Decimal from 'break_eternity.js';
import { CONFIG } from './config';
import { totalCostMultiplier, totalProductionMultiplier } from './upgrades';
import type { GameState, TrackKey } from '../types/game';

/* ─────────── Number formatting ───────────
 * Steps (operate on Decimal so there's no upper bound):
 *   - n < 1.000          → up to 2 decimals (small live values)
 *   - n < 10.000         → integer with pt-BR thousand separator (1.234, 9.999)
 *   - 10.000 ≤ n < 1e33  → short-scale suffix: K, M, B, T, Qa, Qi, Sx, Sp, Oc, No
 *   - n ≥ 1e33           → alphabetic suffix replacing what would be Dc onwards:
 *                          aa, ab, ac, …, az, ba, …, zz, aaa, aab, … (Excel-style,
 *                          26 letters per "digit", zero-indexed at 'aa'). One slot
 *                          per power of 1000.
 *
 * Above ~1e308 (the float64 ceiling) we still produce the same family of
 * suffixes because Decimal carries the exponent natively; the alphabetic
 * sequence simply continues forever.
 */
const NAMED_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
const ALPHA_START_INDEX = NAMED_SUFFIXES.length; // 11 → would be Dc

/** Excel-style alphabetic label, zero-indexed: 0='a', 25='z', 26='aa', 27='ab', 701='zz', 702='aaa', … */
function alphaLabel(zeroBasedIndex: number): string {
  let n = zeroBasedIndex;
  let out = '';
  do {
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function suffixForGroup(group: number): string {
  // group = floor(log1000(n)). 1 => K, 2 => M, …, 10 => No, 11+ => aa, ab, …
  // We start the alphabetic sequence at "aa" (skip single letters) so the
  // very first alpha suffix has the same visual weight as the named ones.
  if (group < ALPHA_START_INDEX) return NAMED_SUFFIXES[group];
  return alphaLabel(group - ALPHA_START_INDEX + 26); // 11 → alphaLabel(26) = 'aa'
}

/** Coerce any value into a Decimal. null/undefined/NaN/non-numeric all
 *  collapse to dZero so downstream code never crashes on bad data. */
export function toDecimal(value: unknown): Decimal {
  if (value instanceof Decimal) return value;
  if (typeof value === 'number') {
    if (!isFinite(value)) return new Decimal(0);
    return new Decimal(value);
  }
  if (typeof value === 'string' && value.length > 0) {
    try {
      return new Decimal(value);
    } catch {
      return new Decimal(0);
    }
  }
  return new Decimal(0);
}

/** Format a Decimal ≥ 10.000 with a 2-decimal suffix, promoting to the next
 *  group if rounding would overflow (e.g. 999.999 → 1.00M, not 1000.00K).
 *
 *  Works for arbitrarily-large Decimals: we extract the magnitude via
 *  log10() and keep the leading-3-digit scaled value as a regular float,
 *  which is safe because mantissas always fit in [1, 1000).
 */
function formatWithSuffix(n: Decimal): string {
  const log10 = n.log10().toNumber();
  let group = Math.floor(log10 / 3);
  // Compute the 1–999.999 mantissa: 10^(log10 - 3*group)
  let scaled = Math.pow(10, log10 - 3 * group);
  if (scaled >= 999.995) {
    group += 1;
    scaled = Math.pow(10, log10 - 3 * group);
  }
  return scaled.toFixed(2) + suffixForGroup(group);
}

/** Big-number formatter for live/derived values (rates, costs, totals). */
export function formatNum(n: Decimal | number | null | undefined): string {
  const v = toDecimal(n);
  if (v.lt(0)) return '-' + formatNum(v.neg());
  if (v.lt(10)) return v.toNumber().toFixed(2);
  if (v.lt(100)) return v.toNumber().toFixed(1);
  if (v.lt(1000)) return Math.floor(v.toNumber()).toString();
  if (v.lt(10000)) return Math.floor(v.toNumber()).toLocaleString('pt-BR');
  return formatWithSuffix(v);
}

/** Integer formatter for owned counts, action totals, etc. Same suffix
 *  rules as formatNum, but never shows decimals below 10.000. */
export function formatInt(n: Decimal | number | null | undefined): string {
  const v = toDecimal(n);
  if (v.lt(0)) return '-' + formatInt(v.neg());
  if (v.lt(10000)) return Math.floor(v.toNumber()).toLocaleString('pt-BR');
  return formatWithSuffix(v);
}

/* ─────────── Game math ─────────── */

export function costOf(state: GameState, trackKey: TrackKey, tierIdx: number): Decimal {
  const tier = CONFIG[trackKey].tiers[tierIdx];
  // Flat price by design: owning N copies of a generator does NOT inflate
  // its cost — each tier always costs `baseCost`, modulated only by the
  // combined cost-reduction upgrades (individual × global). The hard floor
  // of 1 letter prevents the price from ever reading as "free".
  const reduction = totalCostMultiplier(state, trackKey, tierIdx);
  const raw = new Decimal(tier.baseCost).mul(reduction);
  return Decimal.max(1, raw.ceil());
}

export function productionPerSecond(
  state: GameState,
  trackKey: TrackKey,
  tierIdx: number,
): Decimal {
  const tier = CONFIG[trackKey].tiers[tierIdx];
  const mult = totalProductionMultiplier(state, trackKey, tierIdx);
  return state.generators[trackKey][tierIdx].mul(tier.baseProduction).mul(mult);
}

/* ─────────── Unlocks ─────────── */
export function unlockKey(trackKey: TrackKey, tierIdx: number): string {
  return `unlock:${trackKey}:${tierIdx}`;
}

export function isTierUnlocked(state: GameState, trackKey: TrackKey, tierIdx: number): boolean {
  if (tierIdx === 0) return true;
  return state.milestones.has(unlockKey(trackKey, tierIdx));
}

/** Returns the set of unlock-milestone keys that should already be granted
 *  given a state's current resources. Used to backfill saves created before
 *  unlocks were sticky, and as a defensive measure on load. */
export function deriveUnlocksFromResources(state: GameState): string[] {
  const out: string[] = [];
  (Object.keys(CONFIG) as TrackKey[]).forEach((trackKey) => {
    const track = CONFIG[trackKey];
    const resource = state.resources[trackKey];
    for (let i = 1; i < track.tiers.length; i++) {
      if (resource.gte(track.tiers[i].baseCost)) out.push(unlockKey(trackKey, i));
    }
  });
  return out;
}

export interface TickResult {
  state: GameState;
  /** Tiers that crossed the unlock threshold during this tick (newly unlocked). */
  unlocked: Array<{ trackKey: TrackKey; tierIdx: number }>;
}

/** Advance the simulation by `dtSeconds`. Production cascades top-down so each
 *  tier can feed the one below within the same tick. Newly-crossed unlock
 *  thresholds are detected and reported back to the caller (and persisted as
 *  milestones on the returned state). */
export function applyTick(state: GameState, dtSeconds: number): TickResult {
  if (dtSeconds <= 0) return { state, unlocked: [] };

  const resources: Record<TrackKey, Decimal> = {
    letters: state.resources.letters,
  };
  const generators: Record<TrackKey, Decimal[]> = {
    letters: [...state.generators.letters],
  };

  (Object.keys(CONFIG) as TrackKey[]).forEach((trackKey) => {
    const track = CONFIG[trackKey];
    for (let i = track.tiers.length - 1; i >= 0; i--) {
      const tier = track.tiers[i];
      const mult = totalProductionMultiplier(state, trackKey, i);
      // produced = owned × baseProduction × mult × dt
      const produced = generators[trackKey][i]
        .mul(tier.baseProduction)
        .mul(mult)
        .mul(dtSeconds);
      if (produced.lte(0)) continue;
      if (i === 0) {
        resources[trackKey] = resources[trackKey].add(produced);
      } else {
        generators[trackKey][i - 1] = generators[trackKey][i - 1].add(produced);
      }
    }
  });

  // Detect newly-crossed unlock thresholds
  const unlocked: Array<{ trackKey: TrackKey; tierIdx: number }> = [];
  let nextMilestones: Set<string> | null = null;
  (Object.keys(CONFIG) as TrackKey[]).forEach((trackKey) => {
    const track = CONFIG[trackKey];
    const resource = resources[trackKey];
    for (let i = 1; i < track.tiers.length; i++) {
      const key = unlockKey(trackKey, i);
      if (resource.gte(track.tiers[i].baseCost) && !state.milestones.has(key)) {
        if (nextMilestones === null) nextMilestones = new Set(state.milestones);
        nextMilestones.add(key);
        unlocked.push({ trackKey, tierIdx: i });
      }
    }
  });

  return {
    state: {
      ...state,
      resources,
      generators,
      milestones: nextMilestones ?? state.milestones,
    },
    unlocked,
  };
}

export function initialState(): GameState {
  return {
    resources: { letters: new Decimal(10) },
    generators: {
      letters: CONFIG.letters.tiers.map(() => new Decimal(0)),
    },
    milestones: new Set<string>(),
    totalActions: 0,
    upgrades: {
      letters: CONFIG.letters.tiers.map(() => ({ production: 0, cost: 0 })),
    },
    globalUpgrades: { production: 0, cost: 0 },
  };
}
