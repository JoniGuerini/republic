import Decimal from 'break_eternity.js';
import type { GameState, TrackKey } from '../types/game';
import type { Page } from '../types/nav';
import { CONFIG } from './config';
import { deriveUnlocksFromResources, initialState, toDecimal } from './utils';

const STORAGE_KEY = 'republica.save.v3';
const THEME_KEY = 'republica.theme';
const PAGE_KEY = 'republica.page';
/** Bumped to 3 when the data model went generic — the resource & track key
 *  was renamed from 'letters' to 'recurso' and the upgrade subtree was
 *  dropped entirely. Old v2 saves carry obsolete fields and the wrong
 *  resource key, so we discard them rather than attempt a migration. */
const SAVE_VERSION = 3;
/** Legacy keys we proactively delete so a re-installed/old player doesn't
 *  see stale data shadow the new save. */
const LEGACY_STORAGE_KEYS = ['republica.save.v1', 'republica.save.v2'];

const VALID_PAGES: ReadonlySet<Page> = new Set(['trilha', 'compendio']);

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
        resources: { recurso: state.resources.recurso.toJSON() },
        generators: { recurso: state.generators.recurso.map((d) => d.toJSON()) },
        milestones: Array.from(state.milestones),
        totalActions: state.totalActions,
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
 */
export function loadGame(): GameState {
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
      !Array.isArray(s.generators.recurso) ||
      typeof s.totalActions !== 'number'
    ) {
      return initialState();
    }

    const normalizedGenerators: GameState['generators'] = {
      recurso: normalizeDecimalArrayToConfig('recurso', s.generators.recurso),
    };

    const normalizedResources: GameState['resources'] = {
      recurso: toDecimal(s.resources.recurso),
    };

    const loaded: GameState = {
      resources: normalizedResources,
      generators: normalizedGenerators,
      milestones: new Set(Array.isArray(s.milestones) ? s.milestones : []),
      totalActions: sanitizeNumber(s.totalActions),
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

/** Coerce any value to a finite, non-negative number. */
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
