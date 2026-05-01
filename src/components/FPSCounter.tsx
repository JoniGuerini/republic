interface FPSCounterProps {
  fps: number;
}

export function FPSCounter({ fps }: FPSCounterProps) {
  return (
    <div className="fps-counter" aria-hidden="true">
      <span className="fps-counter-bullet">·</span>
      <span className="fps-counter-label">fps</span>
      <span className="fps-counter-value">{fps > 0 ? fps : '—'}</span>
      <span className="fps-counter-bullet">·</span>
    </div>
  );
}
