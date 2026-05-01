import type { ReactNode } from 'react';
import type { GameState, TrackKey } from '../types/game';
import { CONFIG, TRACK_KEYS } from '../game/config';
import { formatNum, productionPerSecond } from '../game/utils';
import { LettersGlyphIcon } from '../game/icons';
import { Generator } from './Generator';

interface TrackHeaderProps {
  state: GameState;
  trackKey: TrackKey;
}

interface TrackBodyProps {
  state: GameState;
  trackKey: TrackKey;
  pulseKeys: number[];
  onBuy: (trackKey: TrackKey, tierIdx: number) => void;
}

const TRACK_ICONS: Record<TrackKey, ReactNode> = {
  letters: <LettersGlyphIcon />,
};

const TRACK_RATE_NOUN: Record<TrackKey, string> = {
  letters: 'escritas',
};

export function TrackHeader({ state, trackKey }: TrackHeaderProps) {
  const track = CONFIG[trackKey];
  const trackIdx = TRACK_KEYS.indexOf(trackKey);
  const eyebrowNumber = String(trackIdx + 1).padStart(2, '0');
  const total = state.resources[trackKey];
  // Tier 0's production rate is what feeds the resource pool directly;
  // higher tiers feed the previous tier (units of generators), not the resource.
  const rate = productionPerSecond(state, trackKey, 0);

  return (
    <div className={`track-head ${trackKey}`}>
      <div className="track-head-icon">{TRACK_ICONS[trackKey]}</div>
      <div className="track-head-identity">
        <div className="eyebrow">trilha {eyebrowNumber}</div>
        <h2>{track.name}</h2>
        <div className="motto">{track.motto}</div>
      </div>
      <div className="track-head-stats">
        <div className="value">{formatNum(total)}</div>
        <div className="rate">
          <strong>{formatNum(rate)}</strong>/s · {TRACK_RATE_NOUN[trackKey]}
        </div>
      </div>
    </div>
  );
}

export function TrackBody({ state, trackKey, pulseKeys, onBuy }: TrackBodyProps) {
  const track = CONFIG[trackKey];

  return (
    <div className={`track-body ${trackKey}`}>
      {track.tiers.map((_, idx) => (
        <Generator
          key={idx}
          state={state}
          trackKey={trackKey}
          tierIdx={idx}
          pulseKey={pulseKeys[idx]}
          onBuy={onBuy}
        />
      ))}
    </div>
  );
}
