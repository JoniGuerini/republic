import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import Decimal from 'break_eternity.js';
import type { GameState, TrackKey } from '../types/game';
import { CONFIG } from '../game/config';
import {
  costMultiplierAtLevel,
  globalUpgradeCost,
  individualUpgradeCost,
  isGlobalCostMaxed,
  isIndividualCostMaxed,
  productionMultiplierAtLevel,
  projectedCostMultiplier,
  projectedProductionMultiplier,
  upgradeIdKey,
  upgradeLabel,
  type UpgradeId,
} from '../game/upgrades';
import { costOf, formatInt, formatNum, productionPerSecond } from '../game/utils';
import { usePressAndHold } from '../hooks/usePressAndHold';

interface UpgradeCardProps {
  state: GameState;
  id: UpgradeId;
  onBuy: (id: UpgradeId) => void;
}

/* ─────────── Effect formatting ───────────
 *
 * Globals: keep the abstract multiplier / percentage form because they
 * apply to every generator simultaneously — there's no single "value"
 * to show without picking one tier arbitrarily.
 *
 * Individuals: show CONCRETE values the player cares about:
 *   - production upgrade → letters/second this generator currently emits,
 *     vs what it would emit after buying the next level.
 *   - cost upgrade       → cost in letters of buying ONE more of this
 *     generator now, vs the cost after buying the next level.
 *
 * That maps the upgrade decision directly to the in-game number the
 * player is staring at on the trilha page.
 */

function formatGlobalProductionEffect(level: number): string {
  return `×${formatNum(productionMultiplierAtLevel(level))}`;
}

function formatGlobalCostEffect(level: number): string {
  if (level <= 0) return '−0%';
  // Cost reduction shown as a 0–100 percentage. Even at the floor level
  // (~30) the multiplier stays well within float range, so converting via
  // toNumber() is safe here.
  const remaining = costMultiplierAtLevel(level).toNumber();
  const reduction = (1 - remaining) * 100;
  if (reduction >= 99.99) return '−99.99%';
  if (reduction >= 99) return `−${reduction.toFixed(2)}%`;
  if (reduction >= 10) return `−${reduction.toFixed(1)}%`;
  return `−${reduction.toFixed(0)}%`;
}

/** Compact icon shown in the card header. For individual upgrades, reuses
 *  the corresponding generator's tier icon (instant visual association).
 *  For globals, a discrete typographic ornament. */
function CardGlyph({ id }: { id: UpgradeId }): ReactNode {
  if (id.scope === 'global') {
    return (
      <span className="upgrade-glyph upgrade-glyph-global" aria-hidden="true">
        ✦
      </span>
    );
  }
  const tier = CONFIG[id.trackKey!].tiers[id.tierIdx!];
  return <span className="upgrade-glyph">{tier.icon}</span>;
}

/* ─────────── Component ─────────── */

export function UpgradeCard({ state, id, onBuy }: UpgradeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Look up current level + computed price + affordability
  const level =
    id.scope === 'global'
      ? state.globalUpgrades[id.family]
      : state.upgrades[id.trackKey as TrackKey][id.tierIdx!][id.family];

  const cost =
    id.scope === 'global'
      ? globalUpgradeCost(level)
      : individualUpgradeCost(id.trackKey as TrackKey, id.tierIdx!, level);

  const resourceAmount = state.resources.letters;
  const canAfford = resourceAmount.gte(cost);

  // Inert = individual upgrade whose target generator the player doesn't
  // own yet. We render a totally different "indisponível" card for these.
  const ownedTarget =
    id.scope === 'individual'
      ? state.generators[id.trackKey as TrackKey][id.tierIdx!]
      : null;
  const targetTier =
    id.scope === 'individual' ? CONFIG[id.trackKey as TrackKey].tiers[id.tierIdx!] : null;
  const isInert = id.scope === 'individual' && (ownedTarget?.lte(0) ?? true);

  // Maxed = cost upgrade whose next level would have no further effect
  // (price already at the floor of 1 letter). Production upgrades never
  // reach this state. We compute it AFTER the inert check so we don't
  // claim "máximo" on a card that's actually just unavailable.
  const isMaxed =
    !isInert &&
    id.family === 'cost' &&
    (id.scope === 'global'
      ? isGlobalCostMaxed(state)
      : isIndividualCostMaxed(state, id.trackKey as TrackKey, id.tierIdx!));

  const buyHandlers = usePressAndHold(() => onBuy(id));

  // Pulse animation on level-up. Skip on the inert branch since that
  // branch returns a different DOM tree without `cardRef`.
  useEffect(() => {
    if (isInert || !cardRef.current || level === 0) return;
    const el = cardRef.current;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }, [level, isInert]);

  // Stop the auto-buy loop the instant the player runs out of letters.
  useEffect(() => {
    if (!canAfford) buyHandlers.stop();
  }, [canAfford, buyHandlers]);

  const label = upgradeLabel(id);
  const familyAria = id.family === 'production' ? 'produção' : 'custo';

  /* ── Inert branch: dedicated "indisponível" card, mirrors gen-locked.
        No before/after numbers (no production / no buyable target),
        no buy button. The player needs to acquire the generator first. */
  if (isInert && targetTier) {
    return (
      <div
        className="upgrade-card upgrade-card-unavailable"
        data-upgrade={upgradeIdKey(id)}
        aria-disabled="true"
      >
        <div className="upgrade-unavailable-stamp" aria-hidden="true">
          <span className="upgrade-unavailable-stamp-bullet">·</span>
          <span className="upgrade-unavailable-stamp-text">indisponível</span>
          <span className="upgrade-unavailable-stamp-bullet">·</span>
        </div>
        <div className="upgrade-unavailable-identity">
          <div className="upgrade-unavailable-name">
            <em>{label}</em>
          </div>
          <div className="upgrade-unavailable-family">
            {id.family === 'production' ? 'multiplicador de produção' : 'redutor de custo'}
          </div>
        </div>
        <div className="upgrade-unavailable-hint">
          requer ao menos <strong>1 × {targetTier.name}</strong>
        </div>
      </div>
    );
  }

  /* ── Maxed branch: cost upgrade whose floor (1 letter) has been reached.
        Same skeleton as the inert card so layout stays uniform — only the
        stamp text and the hint copy change. No buy button: further levels
        would cost letters without dropping the price any lower. */
  if (isMaxed) {
    return (
      <div
        className="upgrade-card upgrade-card-unavailable upgrade-card-maxed"
        data-upgrade={upgradeIdKey(id)}
        aria-disabled="true"
      >
        <div
          className="upgrade-unavailable-stamp upgrade-unavailable-stamp-max"
          aria-hidden="true"
        >
          <span className="upgrade-unavailable-stamp-bullet">·</span>
          <span className="upgrade-unavailable-stamp-text">máximo</span>
          <span className="upgrade-unavailable-stamp-bullet">·</span>
        </div>
        <div className="upgrade-unavailable-identity">
          <div className="upgrade-unavailable-name">
            <em>{label}</em>
          </div>
          <div className="upgrade-unavailable-family">
            nível {formatInt(level)} · redutor no piso
          </div>
        </div>
        <div className="upgrade-unavailable-hint">
          {id.scope === 'global'
            ? 'todos os geradores já custam 1 letra'
            : 'este gerador já custa 1 letra'}
        </div>
      </div>
    );
  }

  /* ── Active branch: shows current / next values + buy button. ── */

  // Compute "current" and "next" labels. Globals stay abstract;
  // individuals show absolute letters/s or letters.
  let currentValue: string;
  let nextValue: string;

  if (id.scope === 'global') {
    if (id.family === 'production') {
      currentValue = formatGlobalProductionEffect(level);
      nextValue = formatGlobalProductionEffect(level + 1);
    } else {
      currentValue = formatGlobalCostEffect(level);
      nextValue = formatGlobalCostEffect(level + 1);
    }
  } else {
    const trackKey = id.trackKey as TrackKey;
    const tierIdx = id.tierIdx!;
    const tier = CONFIG[trackKey].tiers[tierIdx];
    const owned = state.generators[trackKey][tierIdx];
    const resourceUnit = CONFIG[trackKey].name.toLowerCase();
    const unitLabel =
      tierIdx === 0 ? resourceUnit : CONFIG[trackKey].tiers[tierIdx - 1].namePlural.toLowerCase();

    if (id.family === 'production') {
      // Current: actual letters/s this generator emits right now.
      const current = productionPerSecond(state, trackKey, tierIdx);
      // Next: what it would emit if we add +1 to this specific upgrade.
      // Mirrors productionPerSecond but swaps the multiplier for the
      // projected one — owned × baseProduction × projectedMult.
      const projectedMult = projectedProductionMultiplier(state, trackKey, tierIdx, 'individual');
      const next = owned.mul(tier.baseProduction).mul(projectedMult);
      currentValue = `${formatNum(current)}/s`;
      nextValue = `${formatNum(next)}/s · ${unitLabel}`;
    } else {
      // Cost: letters needed to buy one more of this generator NOW (with
      // the current cost-reduction applied) vs. after +1 cost upgrade.
      // Flat-price model: cost = baseCost × reduction, no exponent on owned.
      const current = costOf(state, trackKey, tierIdx);
      const projectedMult = projectedCostMultiplier(state, trackKey, tierIdx, 'individual');
      const rawNext = new Decimal(tier.baseCost).mul(projectedMult);
      const next = Decimal.max(1, rawNext.ceil());
      currentValue = formatNum(current);
      nextValue = `${formatNum(next)} · ${resourceUnit}`;
    }
  }

  return (
    <div
      ref={cardRef}
      className={`upgrade-card${id.scope === 'global' ? ' upgrade-card-global' : ''}`}
      data-upgrade={upgradeIdKey(id)}
    >
      <div className="upgrade-top">
        <CardGlyph id={id} />
        <div className="upgrade-identity">
          <div className="upgrade-name">
            <em>{label}</em>
          </div>
          <div className="upgrade-family">
            {id.family === 'production' ? 'multiplicador de produção' : 'redutor de custo'}
          </div>
        </div>
        <div className="upgrade-level">
          <div className="upgrade-level-value">nv {formatInt(level)}</div>
          <div className="upgrade-level-label">nível</div>
        </div>
      </div>

      <div className="upgrade-effects">
        <div className="upgrade-effect">
          <div className="stat-label">atual</div>
          <div className="stat-value">{currentValue}</div>
        </div>
        <div className="upgrade-effect upgrade-effect-next">
          <div className="stat-label">próximo</div>
          <div className="stat-value">{nextValue}</div>
        </div>
      </div>

      <button
        className="buy-btn upgrade-buy-btn"
        disabled={!canAfford}
        onPointerDown={buyHandlers.onPointerDown}
        onPointerUp={buyHandlers.onPointerUp}
        onPointerLeave={buyHandlers.onPointerLeave}
        onPointerCancel={buyHandlers.onPointerCancel}
        onKeyDown={buyHandlers.onKeyDown}
        onKeyUp={buyHandlers.onKeyUp}
        onBlur={buyHandlers.onBlur}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`Comprar próximo nível de ${familyAria} (${label}) por ${formatNum(cost)} letras`}
      >
        <span className="buy-action">aprimorar</span>
        <span className="buy-cost">{formatNum(cost)}</span>
      </button>
    </div>
  );
}
