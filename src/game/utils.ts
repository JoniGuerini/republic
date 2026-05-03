import Decimal from 'break_eternity.js';
import { CONFIG } from './config';
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
const ALPHA_START_INDEX = NAMED_SUFFIXES.length;

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
  if (group < ALPHA_START_INDEX) return NAMED_SUFFIXES[group];
  return alphaLabel(group - ALPHA_START_INDEX + 26);
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

function formatWithSuffix(n: Decimal): string {
  const log10 = n.log10().toNumber();
  let group = Math.floor(log10 / 3);
  let scaled = Math.pow(10, log10 - 3 * group);
  if (scaled >= 999.995) {
    group += 1;
    scaled = Math.pow(10, log10 - 3 * group);
  }
  return scaled.toFixed(2) + suffixForGroup(group);
}

/** Big-number formatter for live/derived values (rates, costs, totals).
 *  Accepts strings too so it can format Decimal-encoded values straight
 *  from CONFIG (where late-tier baseCosts overflow float64). */
export function formatNum(n: Decimal | number | string | null | undefined): string {
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
export function formatInt(n: Decimal | number | string | null | undefined): string {
  const v = toDecimal(n);
  if (v.lt(0)) return '-' + formatInt(v.neg());
  if (v.lt(10000)) return Math.floor(v.toNumber()).toLocaleString('pt-BR');
  return formatWithSuffix(v);
}

/* ─────────── Game math ─────────── */

/** Buy cost for one unit of a given generator. Flat by design — owning
 *  more does NOT inflate the price. */
export function costOf(_state: GameState, trackKey: TrackKey, tierIdx: number): Decimal {
  const tier = CONFIG[trackKey].tiers[tierIdx];
  return new Decimal(tier.baseCost);
}

/** Production rate per second for a given tier of generators. */
export function productionPerSecond(
  state: GameState,
  trackKey: TrackKey,
  tierIdx: number,
): Decimal {
  const tier = CONFIG[trackKey].tiers[tierIdx];
  return state.generators[trackKey][tierIdx].mul(tier.baseProduction);
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
 *  given a state's current resources. Used as a defensive measure on load. */
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
    recurso: state.resources.recurso,
  };
  const generators: Record<TrackKey, Decimal[]> = {
    recurso: [...state.generators.recurso],
  };

  (Object.keys(CONFIG) as TrackKey[]).forEach((trackKey) => {
    const track = CONFIG[trackKey];
    for (let i = track.tiers.length - 1; i >= 0; i--) {
      const tier = track.tiers[i];
      const produced = generators[trackKey][i]
        .mul(tier.baseProduction)
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
    resources: { recurso: new Decimal(10) },
    generators: {
      recurso: CONFIG.recurso.tiers.map(() => new Decimal(0)),
    },
    milestones: new Set<string>(),
    totalActions: 0,
  };
}
