import { useEffect, useRef, type ReactNode } from 'react';
import { useHoldToTrigger } from '../hooks/useHoldToTrigger';

export interface ConfirmDialogProps {
  /** Whether the dialog is currently mounted/visible. */
  open: boolean;
  /** Heading shown at the top of the letter (display italic). */
  title: string;
  /** Body text below the title. Plain string or React node for richer copy. */
  message: ReactNode;
  /** Label on the "go ahead" button (must be held to fire). */
  confirmLabel?: string;
  /** Hint text under the confirm button while idle (e.g. "segure para confirmar"). */
  confirmHint?: string;
  /** Label on the cancel button. */
  cancelLabel?: string;
  /** Whether this is a destructive action (changes accent color to bordeaux). */
  danger?: boolean;
  /** How long the user must hold the confirm button. Defaults to 1500ms. */
  holdMs?: number;
  /** Fired when the user completes the hold. The dialog stays open — the
   *  caller is expected to close it via the `open` prop. */
  onConfirm: () => void;
  /** Fired when the user cancels (button, backdrop click, or Escape). */
  onCancel: () => void;
}

/**
 * Editorial confirmation dialog. Renders as a slightly-rotated paper letter
 * over a dimmed backdrop, in the same visual language as the rest of the
 * game's cards. The confirm button must be held (default 1.5s) to fire,
 * preventing accidental destructive actions.
 *
 * Accessibility:
 *   - `role="dialog"` + `aria-modal="true"` + `aria-labelledby/describedby`
 *   - Initial focus on cancel button (safer default)
 *   - Escape key cancels
 *   - Backdrop click cancels
 *   - Focus is restored to the previously focused element on close
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  confirmHint = 'segure para confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  holdMs = 1500,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const { handlers, progress, isHolding, reset } = useHoldToTrigger(onConfirm, {
    durationMs: holdMs,
  });

  // Reset progress whenever the dialog opens/closes so a re-open starts fresh
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  // Focus management: focus cancel on open, restore on close
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    // Tiny delay so the browser doesn't fight a focus-restore from outside
    const id = window.setTimeout(() => cancelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  // Escape to cancel + Tab trap between the two buttons
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;
      const cancel = cancelRef.current;
      const confirm = confirmRef.current;
      if (!cancel || !confirm) return;
      if (e.shiftKey && document.activeElement === cancel) {
        e.preventDefault();
        confirm.focus();
      } else if (!e.shiftKey && document.activeElement === confirm) {
        e.preventDefault();
        cancel.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const titleId = 'confirm-title';
  const descId = 'confirm-desc';

  return (
    <div
      className="confirm-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className={`confirm-letter${danger ? ' danger' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="confirm-corner top-left" aria-hidden="true">·</div>
        <div className="confirm-corner top-right" aria-hidden="true">·</div>
        <div className="confirm-corner bottom-left" aria-hidden="true">·</div>
        <div className="confirm-corner bottom-right" aria-hidden="true">·</div>

        <div className="confirm-eyebrow" aria-hidden="true">
          <span>·</span>
          <span>{danger ? 'aviso' : 'confirmação'}</span>
          <span>·</span>
        </div>

        <h2 className="confirm-title" id={titleId}>
          {title}
        </h2>
        <div className="confirm-message" id={descId}>
          {message}
        </div>

        {/* Wax seal as a decorative divider */}
        <div className="confirm-seal" aria-hidden="true">
          <span>✦</span>
        </div>

        <div className="confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="confirm-btn confirm-btn-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <div className="confirm-confirm-wrap">
            <button
              ref={confirmRef}
              type="button"
              className={`confirm-btn confirm-btn-confirm${isHolding ? ' is-holding' : ''}`}
              onPointerDown={handlers.onPointerDown}
              onPointerUp={handlers.onPointerUp}
              onPointerLeave={handlers.onPointerLeave}
              onPointerCancel={handlers.onPointerCancel}
              onKeyDown={handlers.onKeyDown}
              onKeyUp={handlers.onKeyUp}
              onBlur={handlers.onBlur}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span
                className="confirm-btn-fill"
                style={{ width: `${progress * 100}%` }}
                aria-hidden="true"
              />
              <span className="confirm-btn-label">{confirmLabel}</span>
            </button>
            <div className="confirm-hint">{confirmHint}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
