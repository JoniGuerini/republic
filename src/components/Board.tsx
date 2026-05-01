import type { GameState, TrackKey } from '../types/game';
import { TRACK_KEYS } from '../game/config';
import { TrackBody, TrackHeader } from './Track';

interface BoardProps {
  state: GameState;
  pulseKeys: Record<TrackKey, number[]>;
  onBuy: (trackKey: TrackKey, tierIdx: number) => void;
}

export function BoardHeads({ state }: { state: GameState }) {
  return (
    <div className="board-heads">
      {TRACK_KEYS.map((trackKey) => (
        <TrackHeader key={trackKey} state={state} trackKey={trackKey} />
      ))}
    </div>
  );
}

export function Board({ state, pulseKeys, onBuy }: BoardProps) {
  return (
    <div className="board">
      {TRACK_KEYS.map((trackKey) => (
        <TrackBody
          key={trackKey}
          state={state}
          trackKey={trackKey}
          pulseKeys={pulseKeys[trackKey]}
          onBuy={onBuy}
        />
      ))}
    </div>
  );
}
