import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * "Hold to confirm" helper. Tracks how long the user has been holding the
 * input down (mouse, touch, pen, or Enter/Space on keyboard) and fires the
 * action exactly once when the hold reaches `durationMs`. Releasing early
 * cancels the hold and resets progress to 0.
 *
 * Designed for destructive confirmations (reset, delete) where a deliberate,
 * sustained gesture replaces a yes/no dialog. Returns the handlers to spread
 * onto the trigger element plus a `progress` value (0 → 1) so the UI can
 * render a fill bar that grows as the hold continues.
 *
 * Implementation notes:
 *   - Uses requestAnimationFrame instead of setInterval so the progress is
 *     sampled in lockstep with the browser's paint cycle. This is critical
 *     when the host component (the App) is already re-rendering at 60fps:
 *     setInterval can drift / be starved by long render frames, while rAF
 *     is naturally synchronized with the next repaint.
 *   - The progress value is published through React state so the fill bar
 *     can re-render — we throttle redundant identical values to avoid extra
 *     work, but otherwise we want one render per frame while held.
 */
export interface UseHoldToTriggerOptions {
  /** Total hold time required to fire the action. */
  durationMs?: number;
  /** Called when the hold is started (useful for haptics, sound, etc). */
  onStart?: () => void;
  /** Called if the hold is cancelled before completion. */
  onCancel?: () => void;
}

export interface HoldToTriggerHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLElement>) => void;
  onBlur: () => void;
}

export interface UseHoldToTrigger {
  /** Spread these onto the trigger element (e.g. a button). */
  handlers: HoldToTriggerHandlers;
  /** 0 → 1, suitable for a CSS width or transform on a progress bar. */
  progress: number;
  /** True between pointerDown and pointerUp/cancel. */
  isHolding: boolean;
  /** Stop and reset programmatically (e.g. when the dialog closes). */
  reset: () => void;
}

const DEFAULT_DURATION_MS = 1500;

export function useHoldToTrigger(
  action: () => void,
  options: UseHoldToTriggerOptions = {},
): UseHoldToTrigger {
  const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;

  const actionRef = useRef(action);
  actionRef.current = action;
  const onStartRef = useRef(options.onStart);
  onStartRef.current = options.onStart;
  const onCancelRef = useRef(options.onCancel);
  onCancelRef.current = options.onCancel;
  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;

  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  // Mutable, render-independent state — the rAF callback reads/writes here
  // without triggering re-renders (only setProgress / setIsHolding do).
  const internal = useRef<{
    rafId: number;
    startedAt: number;
    completed: boolean;
    holding: boolean;
    keyDown: boolean;
  }>({
    rafId: 0,
    startedAt: 0,
    completed: false,
    holding: false,
    keyDown: false,
  });

  const stop = useCallback(() => {
    if (internal.current.rafId !== 0) {
      cancelAnimationFrame(internal.current.rafId);
      internal.current.rafId = 0;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    internal.current.completed = false;
    internal.current.holding = false;
    internal.current.keyDown = false;
    setIsHolding(false);
    setProgress(0);
  }, [stop]);

  const cancel = useCallback(() => {
    if (internal.current.completed) {
      reset();
      return;
    }
    if (internal.current.holding) {
      onCancelRef.current?.();
    }
    reset();
  }, [reset]);

  const start = useCallback(() => {
    const s = internal.current;
    if (s.holding || s.completed) return;
    s.holding = true;
    s.completed = false;
    s.startedAt = performance.now();
    setIsHolding(true);
    setProgress(0);
    onStartRef.current?.();

    const tick = () => {
      const cur = internal.current;
      if (!cur.holding) return;
      const elapsed = performance.now() - cur.startedAt;
      const p = Math.min(1, elapsed / durationRef.current);
      setProgress(p);
      if (p >= 1 && !cur.completed) {
        cur.completed = true;
        cur.rafId = 0;
        // Fire the action; the parent typically closes the dialog in
        // response, which will trigger reset() through the open prop.
        actionRef.current();
        return;
      }
      cur.rafId = requestAnimationFrame(tick);
    };
    s.rafId = requestAnimationFrame(tick);
  }, []);

  // Cleanup on unmount + safety nets when the page becomes hidden or the
  // window loses focus (e.g. user alt-tabs away mid-hold).
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', cancel);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', cancel);
      stop();
    };
  }, [cancel, stop]);

  const handlers = useMemo<HoldToTriggerHandlers>(
    () => ({
      onPointerDown: (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start();
      },
      onPointerUp: cancel,
      onPointerLeave: () => {
        if (internal.current.holding) cancel();
      },
      onPointerCancel: cancel,
      onKeyDown: (e) => {
        if (e.repeat) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        internal.current.keyDown = true;
        start();
      },
      onKeyUp: (e) => {
        if (!internal.current.keyDown) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        cancel();
      },
      onBlur: cancel,
    }),
    [start, cancel],
  );

  return { handlers, progress, isHolding, reset };
}
