"use client";

import type { TableState } from "@mk/poker-engine";
import { PlayingCard } from "@/components/table/PlayingCard";

type Props = {
  state: TableState;
  humanId: string;
};

/** Ellipse seat positions: index 0 = human (bottom). */
function seatPosition(index: number, total: number): { x: number; y: number } {
  // Place human at bottom (90° in screen coords), others clockwise
  const angle = Math.PI / 2 + (index / total) * Math.PI * 2;
  const rx = 42;
  const ry = 34;
  return {
    x: 50 + rx * Math.cos(angle),
    y: 50 + ry * Math.sin(angle),
  };
}

export function PokerTable({ state, humanId }: Props) {
  const ordered = [...state.players].sort((a, b) => {
    // Rotate so human is index 0 visually
    const humanSeat = state.players.find((p) => p.id === humanId)?.seat ?? 0;
    const aRel = (a.seat - humanSeat + 100) % 100;
    const bRel = (b.seat - humanSeat + 100) % 100;
    return aRel - bRel;
  });

  return (
    <div className="relative mx-auto aspect-[16/11] w-full max-w-4xl">
      {/* Table felt */}
      <div
        className="absolute inset-[8%] rounded-[50%] border border-[var(--color-champagne)]/25 metal-edge"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 45%), radial-gradient(ellipse at center, #163528 0%, #0b1511 55%, #07100c 100%)",
        }}
      />
      <div className="absolute inset-[11%] rounded-[50%] border border-white/5" />

      {/* Pot + board */}
      <div className="absolute left-1/2 top-[42%] z-10 w-[70%] -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-[0.65rem] tracking-[0.28em] text-[var(--color-champagne)]">
          POT
        </p>
        <p
          className="mt-1 text-xl text-white md:text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {state.pot.toLocaleString()}
        </p>
        <div className="mt-4 flex items-center justify-center gap-1.5 sm:gap-2">
          {state.communityCards.length === 0 ? (
            <span className="text-[0.65rem] tracking-[0.2em] text-[var(--color-titanium)]">
              {state.phase === "waiting" ? "WAITING" : "PREFLOP"}
            </span>
          ) : (
            state.communityCards.map((c, i) => (
              <PlayingCard key={`${c.rank}${c.suit}-${i}`} card={c} size="md" />
            ))
          )}
        </div>
      </div>

      {/* Seats */}
      {ordered.map((player, index) => {
        const pos = seatPosition(index, ordered.length);
        const isActor = state.actingSeat === player.seat;
        const isDealer = state.dealerSeat === player.seat;
        const isHero = player.id === humanId;
        return (
          <div
            key={player.id}
            className="absolute z-20 w-28 -translate-x-1/2 -translate-y-1/2 sm:w-36"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div
              className={`rounded-2xl border px-2 py-2 text-center backdrop-blur-sm ${
                player.folded
                  ? "border-white/5 bg-black/30 opacity-50"
                  : isActor
                    ? "border-[var(--color-champagne)]/60 bg-black/55"
                    : "border-white/10 bg-black/45"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-[var(--color-graphite)] text-[0.65rem] tracking-wider text-[var(--color-platinum)]">
                  {player.name.slice(0, 2).toUpperCase()}
                </div>
                {isDealer ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-champagne)] text-[0.55rem] font-bold text-[var(--color-obsidian)]">
                    D
                  </span>
                ) : null}
                {state.smallBlindSeat === player.seat ? (
                  <span className="text-[0.55rem] text-[var(--color-titanium)]">
                    SB
                  </span>
                ) : null}
                {state.bigBlindSeat === player.seat ? (
                  <span className="text-[0.55rem] text-[var(--color-titanium)]">
                    BB
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-[0.7rem] text-white">
                {isHero ? "You" : player.name}
              </p>
              <p className="text-[0.65rem] tabular-nums text-[var(--color-titanium)]">
                {player.eliminated ? "OUT" : player.stack.toLocaleString()}
              </p>
              {player.streetBet > 0 ? (
                <p className="mt-0.5 text-[0.6rem] text-[var(--color-ice)]">
                  Bet {player.streetBet.toLocaleString()}
                </p>
              ) : null}
              <div className="mt-1.5 flex justify-center gap-1">
                {isHero && player.holeCards ? (
                  player.holeCards.map((c, i) => (
                    <PlayingCard
                      key={i}
                      card={c}
                      size="sm"
                    />
                  ))
                ) : player.holeCards && !player.folded ? (
                  <>
                    <PlayingCard faceDown size="sm" />
                    <PlayingCard faceDown size="sm" />
                  </>
                ) : player.folded ? (
                  <span className="text-[0.55rem] tracking-[0.15em] text-[var(--color-titanium)]">
                    FOLD
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
