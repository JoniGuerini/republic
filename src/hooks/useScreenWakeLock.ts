import { useEffect } from 'react';

/**
 * Holds a Screen Wake Lock while the window is focused, preventing the OS
 * from dimming the screen / starting the lock-screen / putting the device
 * to sleep.
 *
 * Behavior:
 *   - Acquires on `focus`; releases on `blur`.
 *   - Re-acquires automatically when the page becomes visible again
 *     (the browser releases the lock on its own when the tab is hidden).
 *   - Silently no-ops when the API is unavailable (Safari < 16.4, http
 *     contexts, headless browsers, security-restricted iframes, etc.).
 *
 * Notes:
 *   - The Wake Lock API only requires that the document be visible at the
 *     time of the `request()` call; we additionally gate on focus per the
 *     caller's request, so background tabs never spin up a lock.
 *   - We intentionally do not surface errors. The app keeps working with
 *     or without the lock; feature detection failures are not actionable
 *     by the user.
 */
export function useScreenWakeLock(): void {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }
    const wakeLockApi = navigator.wakeLock;

    let sentinel: WakeLockSentinel | null = null;
    // Tracks the most recent acquisition attempt so a quick blur arriving
    // while a request() is still in flight cancels the resulting sentinel
    // instead of leaving a stale lock alive.
    let acquireToken = 0;

    const release = async () => {
      acquireToken += 1;
      const current = sentinel;
      sentinel = null;
      if (current && !current.released) {
        try {
          await current.release();
        } catch {
          /* lock already gone */
        }
      }
    };

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      const myToken = ++acquireToken;
      try {
        const next = await wakeLockApi.request('screen');
        if (myToken !== acquireToken) {
          // A blur (or another acquire) raced ahead; drop this one.
          try {
            await next.release();
          } catch {
            /* nothing to do */
          }
          return;
        }
        sentinel = next;
        // The browser may release the lock on its own (tab hidden, low
        // battery, etc.). When that happens, drop our reference so the
        // next focus event re-requests cleanly.
        next.addEventListener('release', () => {
          if (sentinel === next) sentinel = null;
        });
      } catch {
        /* permission denied, page hidden mid-request, etc. — ignore */
      }
    };

    const onFocus = () => void acquire();
    const onBlur = () => void release();
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        void acquire();
      }
    };

    if (document.hasFocus()) {
      void acquire();
    }
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      void release();
    };
  }, []);
}
