import Decimal from 'break_eternity.js';
import type { GameState, TrackKey } from '../types/game';
import type { Page } from '../types/nav';
import { CONFIG } from './config';
import { deriveUnlocksFromResources, initialState, toDecimal } from './utils';

const STORAGE_KEY = 'republica.save.v2';
const THEME_KEY = 'republica.theme';
const PAGE_KEY = 'republica.page';
/** Bumped to 2 when we migrated runtime numbers to break_eternity.js Decimals.
 *  V1 saves stored plain JS numbers in `resources` and `generators`; loading
 *  them as Decimals would silently produce zeros / NaNs in some edge cases,
 *  so by user request we wipe v1 data instead of attempting a migration. */
const SAVE_VERSION = 2;
/** Legacy keys we proactively delete so a re-installed/old player doesn't
 *  see stale data shadow the new save. */
const LEGACY_STORAGE_KEYS = ['republica.save.v1'];

const VALID_PAGES: ReadonlySet<Page> = new Set(['trilha', 'aprimoramentos', 'compendio']);

/**
 * Wire format on disk. Versioned so future schema changes can be migrated
 * (or rejected) without losing user data. Sets are serialized as arrays
 * because JSON has no native Set type. Decimals are serialized as their
 * canonical string form (Decimal.toJSON()) so they survive any precision
 * the JSON layer would otherwise apply to JS numbers.
 */
interface SerializedSave {
  version: number;
  savedAt: number;
  state: {
    resources: Record<TrackKey, string>;
    generators: Record<TrackKey, string[]>;
    milestones: string[];
    totalActions: number;
    upgrades: GameState['upgrades'];
    globalUpgrades: GameState['globalUpgrades'];
  };
}

function clearLegacy(): void {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable — nothing to do */
    }
  }
}

/**
 * Persists `state` to localStorage. Returns the save timestamp (ms since
 * epoch) on success, or `null` if storage was unavailable / threw.
 */
export function saveGame(state: GameState): number | null {
  try {
    const savedAt = Date.now();
    const payload: SerializedSave = {
      version: SAVE_VERSION,
      savedAt,
      state: {
        resources: { letters: state.resources.letters.toJSON() },
        generators: { letters: state.generators.letters.map((d) => d.toJSON()) },
        milestones: Array.from(state.milestones),
        totalActions: state.totalActions,
        upgrades: state.upgrades,
        globalUpgrades: state.globalUpgrades,
      },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return savedAt;
  } catch {
    return null;
  }
}

/**
 * Loads a saved game, returning a fresh `initialState()` if no save exists,
 * the save is from a different version, or storage is unavailable / corrupt.
 * v1 saves (pre-Decimal) are intentionally discarded per design decision.
 */
export function loadGame(): GameState {
  // Always sweep legacy keys, even on first load with no current save —
  // keeps storage tidy and prevents version mismatches from silently
  // resurrecting old data later.
  clearLegacy();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();

    const parsed = JSON.parse(raw) as Partial<SerializedSave> | null;
    if (!parsed || parsed.version !== SAVE_VERSION || !parsed.state) {
      return initialState();
    }

    const s = parsed.state;
    if (
      !s.resources ||
      !s.generators ||
      !Array.isArray(s.generators.letters) ||
      typeof s.totalActions !== 'number'
    ) {
      return initialState();
    }

    const normalizedGenerators: GameState['generators'] = {
      letters: normalizeDecimalArrayToConfig('letters', s.generators.letters),
    };

    const normalizedResources: GameState['resources'] = {
      letters: toDecimal(s.resources.letters),
    };

    const normalizedUpgrades: GameState['upgrades'] = {
      letters: normalizeUpgradesToConfig('letters', s.upgrades?.letters),
    };
    const normalizedGlobalUpgrades: GameState['globalUpgrades'] = {
      production: sanitizeNumber(s.globalUpgrades?.production),
      cost: sanitizeNumber(s.globalUpgrades?.cost),
    };

    const loaded: GameState = {
      resources: normalizedResources,
      generators: normalizedGenerators,
      milestones: new Set(Array.isArray(s.milestones) ? s.milestones : []),
      totalActions: sanitizeNumber(s.totalActions),
      upgrades: normalizedUpgrades,
      globalUpgrades: normalizedGlobalUpgrades,
    };

    // Backfill sticky unlock milestones for self-defense — a tier whose
    // baseCost has already been reached should always be considered unlocked.
    for (const key of deriveUnlocksFromResources(loaded)) {
      loaded.milestones.add(key);
    }

    return loaded;
  } catch {
    return initialState();
  }
}

/** Coerce any value to a finite, non-negative integer (used for plain-number
 *  fields like totalActions and upgrade levels). */
function sanitizeNumber(v: unknown): number {
  return typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0;
}

/** Resize a stored generator array to match the current track's tier count.
 *  Existing values keep their indices; missing/invalid slots become 0. */
function normalizeDecimalArrayToConfig(
  trackKey: TrackKey,
  stored: unknown[],
): Decimal[] {
  const expectedLength = CONFIG[trackKey].tiers.length;
  const out: Decimal[] = new Array(expectedLength).fill(null).map(() => new Decimal(0));
  for (let i = 0; i < Math.min(stored.length, expectedLength); i++) {
    out[i] = toDecimal(stored[i]);
  }
  return out;
}

/** Like normalizeDecimalArrayToConfig but for the per-tier upgrade levels
 *  object (which holds plain ints, not Decimals). */
function normalizeUpgradesToConfig(
  trackKey: TrackKey,
  stored: GameState['upgrades'][TrackKey] | undefined,
): GameState['upgrades'][TrackKey] {
  const expectedLength = CONFIG[trackKey].tiers.length;
  const out: GameState['upgrades'][TrackKey] = new Array(expectedLength)
    .fill(null)
    .map(() => ({ production: 0, cost: 0 }));
  if (!Array.isArray(stored)) return out;
  for (let i = 0; i < Math.min(stored.length, expectedLength); i++) {
    const entry = stored[i];
    if (entry && typeof entry === 'object') {
      out[i] = {
        production: sanitizeNumber((entry as { production?: number }).production),
        cost: sanitizeNumber((entry as { cost?: number }).cost),
      };
    }
  }
  return out;
}

export function clearSave(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    clearLegacy();
  } catch {
    /* storage unavailable — nothing to do */
  }
}

// ── Theme persistence ──────────────────────────────────────────────────

export type Theme = 'light' | 'dark';

export function loadTheme(): Theme {
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch {
    /* fall through to default */
  }
  return 'light';
}

export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable */
  }
}

// ── Active page persistence ────────────────────────────────────────────

export function loadPage(): Page {
  try {
    const raw = window.localStorage.getItem(PAGE_KEY);
    if (raw && VALID_PAGES.has(raw as Page)) return raw as Page;
  } catch {
    /* fall through to default */
  }
  return 'trilha';
}

export function savePage(page: Page): void {
  try {
    window.localStorage.setItem(PAGE_KEY, page);
  } catch {
    /* storage unavailable */
  }
}
