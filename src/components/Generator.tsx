import { useEffect, useRef } from 'react';
import Decimal from 'break_eternity.js';
import type { GameState, TrackKey } from '../types/game';
import { CONFIG } from '../game/config';
import { costOf, formatInt, formatNum, isTierUnlocked, productionPerSecond } from '../game/utils';
import { usePressAndHold } from '../hooks/usePressAndHold';

interface GeneratorProps {
  state: GameState;
  trackKey: TrackKey;
  tierIdx: number;
  pulseKey: number;
  onBuy: (trackKey: TrackKey, tierIdx: number) => void;
}

const TIER_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function Generator({ state, trackKey, tierIdx, pulseKey, onBuy }: GeneratorProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const track = CONFIG[trackKey];
  const tier = track.tiers[tierIdx];
  const owned = state.generators[trackKey][tierIdx];
  const cost = costOf(state, trackKey, tierIdx);
  const rate = productionPerSecond(state, trackKey, tierIdx);
  const resourceAmount = state.resources[trackKey];
  const unlockThreshold = new Decimal(tier.baseCost);
  // Unlocks are sticky: once the player has accumulated `baseCost` once, the
  // tier stays unlocked even if the resource later drops below the threshold.
  const locked = !isTierUnlocked(state, trackKey, tierIdx);
  const canAfford = resourceAmount.gte(cost);
  const resourceUnit = track.name.toLowerCase();
  // Tier 0 feeds the resource pool; every other tier feeds the previous tier
  // by name (e.g. "Gerador 2" produces "Gerador 1"). Names are kept verbatim
  // (not lower-cased) since they read as proper nouns.
  const unitLabel =
    tierIdx === 0 ? resourceUnit : track.tiers[tierIdx - 1].name;

  // Re-trigger CSS animation on pulseKey change
  useEffect(() => {
    if (!cardRef.current || pulseKey === 0) return;
    const el = cardRef.current;
    el.classList.remove('pulse');
    void el.offsetWidth; // force reflow
    el.classList.add('pulse');
  }, [pulseKey]);

  // Press-and-hold buy: a single click buys 1, holding the button buys
  // repeatedly with an accelerating cadence until released or out of resources.
  const buyHandlers = usePressAndHold(() => onBuy(trackKey, tierIdx));

  // If the player runs out of resources mid-hold, stop the auto-buy loop
  // immediately (the App-level guard prevents the buy itself, but the timer
  // would otherwise keep firing no-ops).
  useEffect(() => {
    if (!canAfford) buyHandlers.stop();
  }, [canAfford, buyHandlers]);

  if (locked && tierIdx > 0) {
    const remaining = Decimal.max(0, unlockThreshold.sub(resourceAmount));
    // Progress is a 0–1 ratio for the bar's CSS width — must be a plain
    // float64. Safe because both operands are bounded by tier.baseCost which
    // sits well within float range; once unlocked we leave this branch.
    const progress = Math.min(1, resourceAmount.div(unlockThreshold).toNumber());
    return (
      <div
        className="gen gen-locked"
        data-tier={tierIdx + 1}
        data-track={trackKey}
        data-idx={tierIdx}
        aria-disabled="true"
      >
        <div className="gen-locked-stamp" aria-hidden="true">
          <span className="gen-locked-stamp-bullet">·</span>
          <span className="gen-locked-stamp-text">bloqueado</span>
          <span className="gen-locked-stamp-bullet">·</span>
        </div>
        <div className="gen-locked-identity">
          <div className="gen-locked-icon" aria-hidden="true">{tier.icon}</div>
          <div className="gen-locked-name">{tier.name}</div>
        </div>
        <div className="gen-locked-progress">
          <div className="gen-locked-hint">
            desbloqueia ao acumular{' '}
            <strong>{formatNum(unlockThreshold)}</strong> {resourceUnit}
          </div>
          <div className="gen-locked-bar" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="gen-locked-bar-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="gen-locked-remaining">
            faltam <strong>{formatNum(remaining)}</strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="gen"
      data-tier={tierIdx + 1}
      data-track={trackKey}
      data-idx={tierIdx}
    >
      <div className="gen-top">
        <div className="gen-icon">{tier.icon}</div>
        <div>
          <div className="gen-name">
            <em>{tier.name}</em>
          </div>
        </div>
        <div>
          <div className="gen-count">{formatInt(owned.floor())}</div>
          <div className="gen-count-label">possuídos</div>
        </div>
      </div>
      <div className="gen-stats">
        <div>
          <div className="stat-label">{tierIdx === 0 ? 'produz' : 'gera'}</div>
          <div className="stat-value">
            {formatNum(rate)}/s · {unitLabel}
          </div>
        </div>
        <div>
          <div className="stat-label">tier</div>
          <div className="stat-value">{TIER_LABELS[tierIdx]}</div>
        </div>
      </div>
      <button
        className="buy-btn"
        disabled={!canAfford}
        onPointerDown={buyHandlers.onPointerDown}
        onPointerUp={buyHandlers.onPointerUp}
        onPointerLeave={buyHandlers.onPointerLeave}
        onPointerCancel={buyHandlers.onPointerCancel}
        onKeyDown={buyHandlers.onKeyDown}
        onKeyUp={buyHandlers.onKeyUp}
        onBlur={buyHandlers.onBlur}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="buy-action">
          contratar um <em>{tier.name}</em>
        </span>
        <span className="buy-cost">{formatNum(cost)}</span>
      </button>
    </div>
  );
}
