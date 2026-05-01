import type { ReactNode } from 'react';
import type Decimal from 'break_eternity.js';

export type TrackKey = 'letters';

export interface TierDef {
  name: string;
  namePlural: string;
  species: string;
  /** Fixed buy cost for this tier (also the unlock threshold). The price is
   *  flat — owning more of a generator does NOT increase its cost. Cost-
   *  reduction upgrades still apply on top, with a floor of 1 letter. */
  baseCost: number;
  baseProduction: number;
  icon: ReactNode;
  unlocksAt: number;
}

export interface TrackDef {
  name: string;
  motto: string;
  resourceKey: TrackKey;
  tiers: TierDef[];
}

export type GameConfig = Record<TrackKey, TrackDef>;

/** Upgrade levels for a single generator (one entry per tier). */
export interface GeneratorUpgradeLevels {
  /** Production multiplier upgrade. Effect at level N: ×(2^N) on this tier's
   *  production rate. Level 0 = no bonus. */
  production: number;
  /** Cost reduction upgrade. Effect at level N: ×(0.5^N) on this tier's
   *  buy cost. Level 0 = no reduction. */
  cost: number;
}

/** Upgrade levels that apply across all tracks/tiers. Same effect curve as
 *  the per-generator upgrades, applied multiplicatively on top of them. */
export interface GlobalUpgradeLevels {
  production: number;
  cost: number;
}

export interface GameState {
  /** Accumulated resources per track. Stored as Decimal so the running total
   *  has no practical upper bound (idle games quickly outrun float64). */
  resources: Record<TrackKey, Decimal>;
  /** Number of generators owned per tier per track. Decimal because higher
   *  tiers feed lower tiers fractional units of production, which can cross
   *  the float64 ceiling in long sessions. */
  generators: Record<TrackKey, Decimal[]>;
  milestones: Set<string>;
  totalActions: number;
  /** Per-generator upgrade levels. Same shape as `generators` (one entry per
   *  tier per track). Pre-populated to length CONFIG[track].tiers.length. */
  upgrades: Record<TrackKey, GeneratorUpgradeLevels[]>;
  /** Single set of global multiplier upgrades shared across all tracks. */
  globalUpgrades: GlobalUpgradeLevels;
}
