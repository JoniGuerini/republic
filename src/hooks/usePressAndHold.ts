import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Press-and-hold helper for repeating actions (e.g. auto-buy a generator
 * while the buy button is held down).
 *
 * Behaviour:
 *   1. On press, fire the action once immediately.
 *   2. After `holdDelayMs`, start auto-firing at `startIntervalMs`.
 *   3. Each subsequent fire shrinks the interval by `accelerationFactor`
 *      (e.g. 0.92 = 8% faster) down to `minIntervalMs`.
 *   4. On release (or when the element loses pointer capture / blurs / the
 *      tab is hidden), stop immediately.
 *
 * The action is read through a ref, so callers don't need to memoize it.
 * The returned handlers are stable across renders.
 */
export interface PressAndHoldOptions {
  /** Delay before auto-fire kicks in. Lets a short click stay a single click. */
  holdDelayMs?: number;
  /** First auto-fire interval. */
  startIntervalMs?: number;
  /** Floor for the auto-fire interval. */
  minIntervalMs?: number;
  /** Multiplier applied to the interval after every auto-fire (< 1 accelerates). */
  accelerationFactor?: number;
}

export interface PressAndHoldHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLElement>) => void;
  onBlur: () => void;
  /** Programmatically stop the current hold (e.g. when the action becomes invalid). */
  stop: () => void;
}

const DEFAULTS: Required<PressAndHoldOptions> = {
  holdDelayMs: 300,
  startIntervalMs: 250,
  minIntervalMs: 50,
  accelerationFactor: 0.92,
};

export function usePressAndHold(
  action: () => void,
  options: PressAndHoldOptions = {},
): PressAndHoldHandlers {
  const cfg = { ...DEFAULTS, ...options };

  const actionRef = useRef(action);
  actionRef.current = action;

  // Mutable state lives in a ref to avoid re-renders on every tick.
  const stateRef = useRef<{
    holdTimer: number | null;
    repeatTimer: number | null;
    interval: number;
    active: boolean;
    keyDown: boolean;
  }>({
    holdTimer: null,
    repeatTimer: null,
    interval: cfg.startIntervalMs,
    active: false,
    keyDown: false,
  });

  const stop = useCallback(() => {
    const s = stateRef.current;
    if (s.holdTimer !== null) {
      window.clearTimeout(s.holdTimer);
      s.holdTimer = null;
    }
    if (s.repeatTimer !== null) {
      window.clearTimeout(s.repeatTimer);
      s.repeatTimer = null;
    }
    s.active = false;
    s.keyDown = false;
    s.interval = cfg.startIntervalMs;
  }, [cfg.startIntervalMs]);

  const scheduleNext = useCallback(() => {
    const s = stateRef.current;
    s.repeatTimer = window.setTimeout(() => {
      if (!s.active) return;
      actionRef.current();
      s.interval = Math.max(cfg.minIntervalMs, s.interval * cfg.accelerationFactor);
      scheduleNext();
    }, s.interval);
  }, [cfg.accelerationFactor, cfg.minIntervalMs]);

  const start = useCallback(() => {
    const s = stateRef.current;
    if (s.active) return;
    s.active = true;
    s.interval = cfg.startIntervalMs;

    actionRef.current(); // immediate fire on press

    s.holdTimer = window.setTimeout(() => {
      s.holdTimer = null;
      if (!s.active) return;
      scheduleNext();
    }, cfg.holdDelayMs);
  }, [cfg.holdDelayMs, cfg.startIntervalMs, scheduleNext]);

  // Cleanup on unmount + safety nets when the page becomes hidden
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', stop);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', stop);
      stop();
    };
  }, [stop]);

  return useMemo<PressAndHoldHandlers>(
    () => ({
      onPointerDown: (e) => {
        // Only react to primary button (left click / single touch / pen tip)
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        // Capture so we keep getting events even if the pointer leaves the element
        e.currentTarget.setPointerCapture?.(e.pointerId);
        start();
      },
      onPointerUp: stop,
      onPointerLeave: () => {
        // Pointer capture means we usually keep firing; but in case the OS
        // releases capture (e.g. system gesture), this stops us cleanly.
        if (!stateRef.current.active) return;
        stop();
      },
      onPointerCancel: stop,
      onKeyDown: (e) => {
        // Browsers auto-repeat keydown when held; we want our own cadence
        if (e.repeat) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        stateRef.current.keyDown = true;
        start();
      },
      onKeyUp: (e) => {
        if (!stateRef.current.keyDown) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        stop();
      },
      onBlur: stop,
      stop,
    }),
    [start, stop],
  );
}
