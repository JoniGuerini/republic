import type { GameState, TrackKey } from '../../types/game';
import type { UpgradeId } from '../../game/upgrades';
import { CONFIG } from '../../game/config';
import { UpgradeCard } from '../UpgradeCard';

interface UpgradesPageProps {
  state: GameState;
  onBuyUpgrade: (id: UpgradeId) => void;
}

/**
 * Aprimoramentos page.
 * Two sections, both rendered top-to-bottom in a single scroll region:
 *   1. Globais — 2 cards (production + cost) that affect every generator.
 *   2. Por gerador — one row per tier, with two cards side by side
 *      (production | cost).
 *
 * Currently only one track ('letters') exists. The structure is generic
 * enough to handle multiple tracks if/when they're added.
 */
export function UpgradesPage({ state, onBuyUpgrade }: UpgradesPageProps) {
  return (
    <div className="page page-upgrades">
      <div className="upgrades-content">
        <UpgradesGlobalSection onBuyUpgrade={onBuyUpgrade} state={state} />
        <UpgradesIndividualSection onBuyUpgrade={onBuyUpgrade} state={state} />
      </div>
    </div>
  );
}

function UpgradesGlobalSection({ state, onBuyUpgrade }: UpgradesPageProps) {
  const productionId: UpgradeId = { scope: 'global', family: 'production' };
  const costId: UpgradeId = { scope: 'global', family: 'cost' };

  return (
    <section className="upgrades-section">
      <header className="upgrades-section-header">
        <span className="upgrades-section-bullet" aria-hidden="true">·</span>
        <h2 className="upgrades-section-title">Globais</h2>
        <span className="upgrades-section-bullet" aria-hidden="true">·</span>
        <p className="upgrades-section-sub">aprimoramentos sobre toda a república</p>
      </header>
      <div className="upgrades-grid upgrades-grid-global">
        <UpgradeCard id={productionId} state={state} onBuy={onBuyUpgrade} />
        <UpgradeCard id={costId} state={state} onBuy={onBuyUpgrade} />
      </div>
    </section>
  );
}

function UpgradesIndividualSection({ state, onBuyUpgrade }: UpgradesPageProps) {
  const trackKeys = Object.keys(CONFIG) as TrackKey[];
  return (
    <section className="upgrades-section">
      <header className="upgrades-section-header">
        <span className="upgrades-section-bullet" aria-hidden="true">·</span>
        <h2 className="upgrades-section-title">Por gerador</h2>
        <span className="upgrades-section-bullet" aria-hidden="true">·</span>
        <p className="upgrades-section-sub">multiplicador de produção · redutor de custo</p>
      </header>
      <div className="upgrades-grid upgrades-grid-individual">
        {trackKeys.flatMap((trackKey) =>
          CONFIG[trackKey].tiers.map((tier, tierIdx) => (
            <div key={`${trackKey}-${tierIdx}`} className="upgrades-row">
              <div className="upgrades-row-tag" aria-hidden="true">
                <span className="upgrades-row-tag-tier">tier {tierIdx + 1}</span>
                <span className="upgrades-row-tag-name">{tier.name}</span>
              </div>
              <div className="upgrades-row-cards">
                <UpgradeCard
                  id={{ scope: 'individual', family: 'production', trackKey, tierIdx }}
                  state={state}
                  onBuy={onBuyUpgrade}
                />
                <UpgradeCard
                  id={{ scope: 'individual', family: 'cost', trackKey, tierIdx }}
                  state={state}
                  onBuy={onBuyUpgrade}
                />
              </div>
            </div>
          )),
        )}
      </div>
    </section>
  );
}
