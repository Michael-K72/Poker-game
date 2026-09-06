"use client";

import { useCallback, useMemo, useState } from "react";
import type { Difficulty } from "@mk/shared";
import { ECONOMY, TABLE_THEMES } from "@mk/shared";
import type { HandRuntime, TableState } from "@mk/poker-engine";
import {
  applyAction,
  chipTotal,
  getLegalActions,
  getPlayerBySeat,
  mathRandomSource,
} from "@mk/poker-engine";
import {
  advanceBotsUntilHumanOrEnd,
  createBotTable,
  startBotHand,
  type BotProfile,
} from "@/lib/bots";
import { PokerTable } from "@/components/table/PokerTable";
import { ActionBar } from "@/components/table/ActionBar";
import { HandGuide } from "@/components/help/HandGuide";

type Props = {
  difficulty: Difficulty;
  playerCount: number;
  buyIn: number;
  onExit: () => void;
};

export function BotTableSession({
  difficulty,
  playerCount,
  buyIn,
  onExit,
}: Props) {
  const theme = TABLE_THEMES[difficulty];
  const rng = useMemo(() => mathRandomSource(), []);

  const initial = useMemo(
    () =>
      createBotTable({
        playerCount,
        difficulty,
        buyIn,
      }),
    [playerCount, difficulty, buyIn],
  );

  const [bots] = useState<BotProfile[]>(initial.bots);
  const [humanId] = useState(initial.humanId);
  const [runtime, setRuntime] = useState<HandRuntime | null>(null);
  const [state, setState] = useState<TableState>(initial.state);
  const [sessionChips] = useState(() => chipTotal(initial.state));
  const [status, setStatus] = useState("Press DEAL to begin");
  const [guidePinned, setGuidePinned] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const deal = useCallback(() => {
    const started = startBotHand(state, bots, humanId, rng);
    setRuntime(started.runtime);
    setState(started.state);
    setStatus(
      started.state.actingSeat !== null &&
        getPlayerBySeat(started.state, started.state.actingSeat)?.id === humanId
        ? "Your move"
        : started.state.phase === "hand_complete"
          ? "Hand complete"
          : "Bots acting…",
    );
  }, [state, bots, humanId, rng]);

  const act = useCallback(
    (intent: Parameters<typeof applyAction>[2]) => {
      if (!runtime) return;
      let next = applyAction(state, humanId, intent, runtime);
      next = advanceBotsUntilHumanOrEnd(next, runtime, bots, humanId, rng);
      setState(next);
      if (next.phase === "hand_complete" || next.phase === "game_complete") {
        setStatus("Hand complete");
      } else if (
        next.actingSeat !== null &&
        getPlayerBySeat(next, next.actingSeat)?.id === humanId
      ) {
        setStatus("Your move");
      } else {
        setStatus("…");
      }
    },
    [runtime, state, humanId, bots, rng],
  );

  const nextHand = useCallback(() => {
    // Clear street, keep stacks
    const cleared: TableState = {
      ...state,
      phase: "waiting",
      pot: 0,
      communityCards: [],
      showdown: undefined,
      actingSeat: null,
      pendingActSeats: [],
      currentBet: 0,
      players: state.players.map((p) => ({
        ...p,
        streetBet: 0,
        handContributed: 0,
        holeCards: null,
        folded: p.eliminated,
        allIn: false,
      })),
    };
    const started = startBotHand(cleared, bots, humanId, rng);
    setRuntime(started.runtime);
    setState(started.state);
    setStatus(
      getPlayerBySeat(started.state, started.state.actingSeat ?? -1)?.id ===
        humanId
        ? "Your move"
        : "Bots acting…",
    );
  }, [state, bots, humanId, rng]);

  const legal =
    state.actingSeat !== null &&
    getPlayerBySeat(state, state.actingSeat)?.id === humanId
      ? getLegalActions(state)
      : [];

  const human = state.players.find((p) => p.id === humanId);

  return (
    <div
      className="relative flex min-h-dvh flex-col"
      style={{
        background:
          difficulty === "easy"
            ? "radial-gradient(ellipse at center, #14261e 0%, #050608 70%)"
            : difficulty === "medium"
              ? "radial-gradient(ellipse at center, #12161c 0%, #050608 70%)"
              : difficulty === "hard"
                ? "radial-gradient(ellipse at center, #0d1520 0%, #050608 72%)"
                : "radial-gradient(ellipse at center, #0a1018 0%, #050608 72%)",
      }}
    >
      <header className="flex items-center justify-between px-4 py-3 md:px-8">
        <div>
          <p className="text-[0.65rem] tracking-[0.28em] text-[var(--color-champagne)]">
            {theme.difficulty}
          </p>
          <h1
            className="text-sm tracking-[0.18em] text-white md:text-base"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {theme.name}
          </h1>
        </div>
        <div className="text-right">
          <p className="play-money-badge">Play money only</p>
          <p className="mt-1 text-xs text-[var(--color-titanium)]">
            Stack {human?.stack.toLocaleString() ?? 0} · Table{" "}
            {chipTotal(state).toLocaleString()}/{sessionChips.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="rounded-full border border-white/15 px-3 py-2 text-[0.6rem] tracking-[0.15em] text-[var(--color-titanium)] hover:text-white"
          >
            RESET BANKROLL
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-full border border-white/15 px-4 py-2 text-[0.65rem] tracking-[0.2em] text-[var(--color-titanium)] hover:text-white"
          >
            LEAVE
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-3 pb-4">
        <div className="absolute right-2 top-2 z-30 md:right-6">
          <HandGuide pinned={guidePinned} onPinChange={setGuidePinned} />
        </div>
        <PokerTable state={state} humanId={humanId} />
        <p className="mt-4 text-xs tracking-[0.2em] text-[var(--color-titanium)]">
          {status}
          {state.showdown
            ? ` · ${state.showdown.players
                .filter((p) => p.won > 0)
                .map((p) => {
                  const name =
                    state.players.find((x) => x.id === p.playerId)?.name ??
                    p.playerId;
                  return `${name} +${p.won.toLocaleString()}`;
                })
                .join(", ")}`
            : ""}
        </p>
      </div>

      {resetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[var(--color-midnight)] p-6 metal-edge">
            <h2
              id="reset-title"
              className="text-sm tracking-[0.25em] text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              RESET BANKROLL?
            </h2>
            <p className="mt-3 text-sm text-[var(--color-titanium)]">
              Your practice chips will be restored to{" "}
              {ECONOMY.bankrollResetAmount.toLocaleString()} {ECONOMY.chipLabel}.
              Hand history is unchanged in guest mode (session only).
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="flex-1 rounded-full border border-white/20 py-3 text-xs tracking-[0.2em] text-[var(--color-platinum)]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  const amount = ECONOMY.bankrollResetAmount;
                  setState((prev) => ({
                    ...prev,
                    phase: "waiting",
                    pot: 0,
                    communityCards: [],
                    showdown: undefined,
                    actingSeat: null,
                    pendingActSeats: [],
                    currentBet: 0,
                    players: prev.players.map((p) => ({
                      ...p,
                      stack: amount,
                      streetBet: 0,
                      handContributed: 0,
                      holeCards: null,
                      folded: false,
                      allIn: false,
                      eliminated: false,
                    })),
                  }));
                  setRuntime(null);
                  setStatus("BANKROLL RESET · 50,000 MK CHIPS RESTORED");
                  setResetOpen(false);
                }}
                className="flex-1 rounded-full bg-[var(--color-champagne)] py-3 text-xs font-semibold tracking-[0.2em] text-[var(--color-obsidian)]"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t border-white/10 bg-black/40 px-3 py-4 backdrop-blur-md md:px-8">
        {state.phase === "waiting" || !runtime ? (
          <div className="mx-auto flex max-w-3xl justify-center">
            <button
              type="button"
              onClick={deal}
              className="rounded-full bg-[var(--color-champagne)] px-10 py-3 text-xs font-semibold tracking-[0.28em] text-[var(--color-obsidian)]"
            >
              DEAL
            </button>
          </div>
        ) : state.phase === "hand_complete" ||
          state.phase === "game_complete" ? (
          <div className="mx-auto flex max-w-3xl justify-center gap-3">
            <button
              type="button"
              onClick={nextHand}
              disabled={state.phase === "game_complete"}
              className="rounded-full bg-[var(--color-champagne)] px-8 py-3 text-xs font-semibold tracking-[0.28em] text-[var(--color-obsidian)] disabled:opacity-40"
            >
              NEXT HAND
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-full border border-white/20 px-8 py-3 text-xs tracking-[0.28em] text-[var(--color-platinum)]"
            >
              EXIT
            </button>
          </div>
        ) : (
          <ActionBar
            legal={legal}
            currentBet={state.currentBet}
            pot={state.pot}
            streetBet={human?.streetBet ?? 0}
            stack={human?.stack ?? 0}
            onAct={act}
            disabled={legal.length === 0}
          />
        )}
      </div>
    </div>
  );
}
