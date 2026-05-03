import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, TrackKey } from './types/game';
import type { Page } from './types/nav';
import { CONFIG } from './game/config';
import { applyTick, costOf, initialState, isTierUnlocked } from './game/utils';
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
import { CompendioPage } from './components/pages/CompendioPage';

const AUTO_SAVE_INTERVAL_MS = 10_000;

function emptyPulseKeys(): Record<TrackKey, number[]> {
  return {
    recurso: new Array(CONFIG.recurso.tiers.length).fill(0),
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
  // long idle sessions don't get cut short by screen sleep / OS hibernation.
  useScreenWakeLock();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

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

      if (!isTierUnlocked(current, trackKey, tierIdx)) return;
      if (current.resources[trackKey].lt(cost)) return;

      const nextResources: GameState['resources'] = {
        recurso: current.resources.recurso.sub(cost),
      };

      const nextGenerators: GameState['generators'] = {
        recurso: [...current.generators.recurso],
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
          recurso: [...prev.recurso],
        };
        copy[trackKey][tierIdx] = copy[trackKey][tierIdx] + 1;
        return copy;
      });
    },
    [],
  );

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
          era="Era 1"
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onSave={handleSave}
          onReset={handleReset}
        />
        {page === 'trilha' && (
          <TrilhaPage state={renderState} pulseKeys={pulseKeys} onBuy={buy} />
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
