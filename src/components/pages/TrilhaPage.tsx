import type { GameState, TrackKey } from '../../types/game';
import { useEdgeFade } from '../../hooks/useEdgeFade';
import { Board, BoardHeads } from '../Board';

interface TrilhaPageProps {
  state: GameState;
  pulseKeys: Record<TrackKey, number[]>;
  onBuy: (trackKey: TrackKey, tierIdx: number) => void;
}

/**
 * Main gameplay page: shows the (fixed) track headers on top and the
 * scrollable list of generators below. The scroll container reports its
 * own edge state so we can fade the top/bottom only when there's actually
 * content hidden in that direction.
 */
export function TrilhaPage({ state, pulseKeys, onBuy }: TrilhaPageProps) {
  const { ref: scrollRef, edges } = useEdgeFade<HTMLDivElement>();

  return (
    <div className="page page-trilha">
      <BoardHeads state={state} />
      <div
        ref={scrollRef}
        className={`board-scroll${edges.top ? ' fade-top' : ''}${
          edges.bottom ? ' fade-bottom' : ''
        }`}
      >
        <Board state={state} pulseKeys={pulseKeys} onBuy={onBuy} />
      </div>
    </div>
  );
}
