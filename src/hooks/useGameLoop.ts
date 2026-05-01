import { useEffect, useRef, useState } from 'react';

/**
 * Drives a requestAnimationFrame loop and reports FPS.
 * @param onTick called every frame with the dt in seconds since the previous frame.
 * @returns the latest FPS reading (updated every ~500ms).
 */
export function useGameLoop(onTick: (dt: number) => void): number {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const [fps, setFps] = useState(0);

  useEffect(() => {
    let rafId = 0;
    let lastTick = performance.now();
    let fpsFrames = 0;
    let fpsLast = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      onTickRef.current(dt);

      fpsFrames++;
      const elapsed = now - fpsLast;
      if (elapsed >= 500) {
        setFps(Math.round((fpsFrames * 1000) / elapsed));
        fpsFrames = 0;
        fpsLast = now;
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return fps;
}
