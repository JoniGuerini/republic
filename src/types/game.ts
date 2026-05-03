import type { ReactNode } from 'react';
import type Decimal from 'break_eternity.js';

export type TrackKey = 'recurso';

export interface TierDef {
  /** Display name. Identifies the generator in the UI ("Gerador 1"…"Gerador 10"). */
  name: string;
  /** Fixed buy cost for this tier (also the unlock threshold). The price is
   *  flat — owning more of a generator does NOT increase its cost.
   *
   *  Stored as a string so it can carry exponents beyond float64's ~1e308
   *  ceiling. `break_eternity.js` parses these directly via `new Decimal(str)`. */
  baseCost: string;
  /** Units produced per second per owned unit (continuous production). */
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
}
