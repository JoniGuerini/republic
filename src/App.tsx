import { useCallback, useEffect, useRef, useState } from 'react';
import Decimal from 'break_eternity.js';
import type { GameState, TrackKey } from './types/game';
import type { Page } from './types/nav';
import type { UpgradeId } from './game/upgrades';
import { CONFIG } from './game/config';
import { applyTick, costOf, initialState, isTierUnlocked } from './game/utils';
import {
  globalUpgradeCost,
  individualUpgradeCost,
  isGlobalCostMaxed,
  isIndividualCostMaxed,
} from './game/upgrades';
import {
  clearSave,
  loadGame,
  loadPage,
  loadTheme,
  savePage,
  saveGame,
  saveTheme,
} from './game/storage';
import { useGameLoop } from './hooks/useGameLoop';
import { useScreenWakeLock } from './hooks/useScreenWakeLock';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { FPSCounter } from './components/FPSCounter';
import { ConfirmDialog } from './components/ConfirmDialog';
import { TrilhaPage } from './components/pages/TrilhaPage';
import { UpgradesPage } from './components/pages/UpgradesPage';
import { CompendioPage } from './components/pages/CompendioPage';

const AUTO_SAVE_INTERVAL_MS = 10_000;

function emptyPulseKeys(): Record<TrackKey, number[]> {
  return {
    letters: new Array(CONFIG.letters.tiers.length).fill(0),
  };
}

export default function App() {
  // The authoritative game state lives in a ref so the rAF loop can mutate it
  // every frame without forcing React to re-render at 60Hz unnecessarily.
  // We then `setRenderState` once per frame to publish a new immutable copy
  // for components to render — but since React only re-renders when the value
  // changes by reference, this still gives us 60fps display in practice.
  // Lazy initializer reads any persisted save once on mount.
  const stateRef = useRef<GameState>(loadGame());
  const [renderState, setRenderState] = useState<GameState>(stateRef.current);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [page, setPage] = useState<Page>(() => loadPage());

  const [toast, setToast] = useState({ text: '', visible: false });
  const toastTimerRef = useRef<number | null>(null);

  const [pulseKeys, setPulseKeys] = useState<Record<TrackKey, number[]>>(emptyPulseKeys);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // While the window is focused, ask the OS to keep the display awake so
  // long idle sessions (this is, after all, an idle game) don't get cut
  // short by screen sleep / OS hibernation. Silently no-ops where the
  // Wake Lock API isn't available.
  useScreenWakeLock();

  // Apply theme to document element so the original CSS rules ([data-theme="dark"]) work,
  // and persist the choice across sessions.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  // Persist active page so reloads land where the player left off.
  useEffect(() => {
    savePage(page);
  }, [page]);

  // ── helpers ────────────────────────────────────────────────────────────
  const showToast = useCallback((text: string) => {
    setToast({ text, visible: true });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 2800);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // ── auto-save ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => {
      saveGame(stateRef.current);
    }, AUTO_SAVE_INTERVAL_MS);

    // Best-effort flush when the tab is hidden or unloaded so the player
    // doesn't lose the seconds between the last interval tick and exit.
    const flush = () => {
      saveGame(stateRef.current);
    };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', flush);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
      saveGame(stateRef.current);
    };
  }, []);

  // ── game tick ──────────────────────────────────────────────────────────
  const fps = useGameLoop((dt) => {
    if (dt <= 0) return;
    const result = applyTick(stateRef.current, dt);
    stateRef.current = result.state;
    setRenderState(result.state);

    if (result.unlocked.length > 0) {
      for (const { trackKey, tierIdx } of result.unlocked) {
        const tier = CONFIG[trackKey].tiers[tierIdx];
        showToast(`${tier.name} desbloqueado em ${CONFIG[trackKey].name}`);
      }
    }
  });

  // ── actions ────────────────────────────────────────────────────────────
  const buy = useCallback(
    (trackKey: TrackKey, tierIdx: number) => {
      const current = stateRef.current;
      const cost = costOf(current, trackKey, tierIdx);

      // Sticky-unlock guard (UI already hides locked cards' buy button, but
      // this protects against race conditions / programmatic calls).
      if (!isTierUnlocked(current, trackKey, tierIdx)) return;
      if (current.resources[trackKey].lt(cost)) return;

      const nextResources: GameState['resources'] = {
        letters: current.resources.letters.sub(cost),
      };

      const nextGenerators: GameState['generators'] = {
        letters: [...current.generators.letters],
      };
      nextGenerators[trackKey][tierIdx] = nextGenerators[trackKey][tierIdx].add(1);

      const newState: GameState = {
        ...current,
        resources: nextResources,
        generators: nextGenerators,
        totalActions: current.totalActions + 1,
      };
      stateRef.current = newState;
      setRenderState(newState);

      setPulseKeys((prev) => {
        const copy: Record<TrackKey, number[]> = {
          letters: [...prev.letters],
        };
        copy[trackKey][tierIdx] = copy[trackKey][tierIdx] + 1;
        return copy;
      });
    },
    [],
  );

  const buyUpgrade = useCallback((id: UpgradeId) => {
    const current = stateRef.current;

    // Compute price from the *current* level so this is safe to call from
    // the auto-buy press-and-hold loop (each invocation re-reads state).
    const level =
      id.scope === 'global'
        ? current.globalUpgrades[id.family]
        : current.upgrades[id.trackKey as TrackKey][id.tierIdx!][id.family];
    const cost: Decimal =
      id.scope === 'global'
        ? globalUpgradeCost(level)
        : individualUpgradeCost(id.trackKey as TrackKey, id.tierIdx!, level);

    // Reject the buy when the cost upgrade has hit its hard floor — the
    // next level would have no effect, so taking the player's letters
    // would just be a tax. Production upgrades have no such cap.
    if (id.family === 'cost') {
      const maxed =
        id.scope === 'global'
          ? isGlobalCostMaxed(current)
          : isIndividualCostMaxed(current, id.trackKey as TrackKey, id.tierIdx!);
      if (maxed) return;
    }

    if (current.resources.letters.lt(cost)) return;

    const nextResources: GameState['resources'] = {
      letters: current.resources.letters.sub(cost),
    };

    let nextUpgrades = current.upgrades;
    let nextGlobal = current.globalUpgrades;
    if (id.scope === 'global') {
      nextGlobal = { ...current.globalUpgrades, [id.family]: level + 1 };
    } else {
      const trackKey = id.trackKey as TrackKey;
      const updatedTrack = current.upgrades[trackKey].map((entry, idx) =>
        idx === id.tierIdx ? { ...entry, [id.family]: level + 1 } : entry,
      );
      nextUpgrades = { ...current.upgrades, [trackKey]: updatedTrack };
    }

    const newState: GameState = {
      ...current,
      resources: nextResources,
      upgrades: nextUpgrades,
      globalUpgrades: nextGlobal,
      totalActions: current.totalActions + 1,
    };
    stateRef.current = newState;
    setRenderState(newState);
  }, []);

  const handleReset = useCallback(() => {
    setResetConfirmOpen(true);
  }, []);

  const confirmReset = useCallback(() => {
    clearSave();
    const fresh = initialState();
    stateRef.current = fresh;
    setRenderState(fresh);
    setPulseKeys(emptyPulseKeys());
    setResetConfirmOpen(false);
    showToast('A república foi refundada');
  }, [showToast]);

  const cancelReset = useCallback(() => {
    setResetConfirmOpen(false);
  }, []);

  const handleSave = useCallback(() => {
    const ok = saveGame(stateRef.current) !== null;
    showToast(
      ok ? 'Anotado no diário' : 'Não foi possível anotar no diário',
    );
  }, [showToast]);

  const handleToggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      showToast(
        next === 'dark' ? 'Noite estendida sobre a república' : 'Dia claro sobre a república',
      );
      return next;
    });
  }, [showToast]);

  return (
    <>
      <div className="app">
        <Header
          era="Primeira era — Fundação"
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onSave={handleSave}
          onReset={handleReset}
        />
        {page === 'trilha' && (
          <TrilhaPage state={renderState} pulseKeys={pulseKeys} onBuy={buy} />
        )}
        {page === 'aprimoramentos' && (
          <UpgradesPage state={renderState} onBuyUpgrade={buyUpgrade} />
        )}
        {page === 'compendio' && <CompendioPage />}
        <Footer active={page} onNavigate={setPage} />
      </div>
      <Toast text={toast.text} visible={toast.visible} />
      <FPSCounter fps={fps} />
      <ConfirmDialog
        open={resetConfirmOpen}
        danger
        title="Refundar a república?"
        message={
          <>
            Todo o progresso da sessão atual será apagado para sempre:
            recursos acumulados, geradores contratados, marcos alcançados.
            <br />
            Esta ação não pode ser desfeita.
          </>
        }
        confirmLabel="Refundar"
        confirmHint="segure para confirmar"
        cancelLabel="Cancelar"
        holdMs={1500}
        onConfirm={confirmReset}
        onCancel={cancelReset}
      />
    </>
  );
}
