"use client";

import { useMemo, useState } from "react";
import type { LegalAction, PlayerActionIntent } from "@mk/poker-engine";

type Props = {
  legal: LegalAction[];
  currentBet: number;
  pot: number;
  streetBet: number;
  stack: number;
  onAct: (intent: PlayerActionIntent) => void;
  disabled?: boolean;
};

export function ActionBar({
  legal,
  pot,
  streetBet,
  stack,
  onAct,
  disabled,
}: Props) {
  const raiseOrBet =
    legal.find((a) => a.type === "raise") ??
    legal.find((a) => a.type === "bet");
  const call = legal.find((a) => a.type === "call");
  const check = legal.find((a) => a.type === "check");
  const fold = legal.find((a) => a.type === "fold");
  const allIn = legal.find((a) => a.type === "all_in");

  const min = raiseOrBet?.minAmount ?? 0;
  const max = raiseOrBet?.maxAmount ?? min;
  const [amount, setAmount] = useState(min);

  const sliderValue = useMemo(() => {
    if (!raiseOrBet) return min;
    return Math.min(max, Math.max(min, amount || min));
  }, [amount, min, max, raiseOrBet]);

  if (disabled || legal.length === 0) {
    return (
      <div className="mx-auto max-w-3xl text-center text-xs tracking-[0.2em] text-[var(--color-titanium)]">
        Waiting for action…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      {raiseOrBet ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="range"
            min={min}
            max={max}
            value={sliderValue}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full accent-[var(--color-champagne)]"
            aria-label="Bet amount"
          />
          <div className="flex flex-wrap gap-2">
            {[
              { label: "MIN", value: min },
              {
                label: "½ POT",
                value: Math.min(max, Math.max(min, streetBet + Math.floor(pot / 2))),
              },
              {
                label: "POT",
                value: Math.min(max, Math.max(min, streetBet + pot)),
              },
              { label: "MAX", value: max },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setAmount(q.value)}
                className="rounded-full border border-white/15 px-3 py-1 text-[0.6rem] tracking-[0.15em] text-[var(--color-titanium)] hover:border-white/35"
              >
                {q.label}
              </button>
            ))}
            <input
              type="number"
              value={sliderValue}
              min={min}
              max={max}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-24 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-sm tabular-nums text-white"
              aria-label="Bet amount input"
            />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {fold ? (
          <button
            type="button"
            onClick={() => onAct({ type: "fold" })}
            className="rounded-xl border border-white/15 py-3 text-xs tracking-[0.2em] text-[var(--color-platinum)] hover:border-red-400/40"
          >
            FOLD
          </button>
        ) : null}
        {check ? (
          <button
            type="button"
            onClick={() => onAct({ type: "check" })}
            className="rounded-xl border border-white/15 py-3 text-xs tracking-[0.2em] text-[var(--color-platinum)] hover:border-white/35"
          >
            CHECK
          </button>
        ) : null}
        {call ? (
          <button
            type="button"
            onClick={() => onAct({ type: "call" })}
            className="rounded-xl border border-[var(--color-ice)]/30 py-3 text-xs tracking-[0.2em] text-[var(--color-ice)]"
          >
            CALL {(call.callAmount ?? 0).toLocaleString()}
          </button>
        ) : null}
        {raiseOrBet ? (
          <button
            type="button"
            onClick={() =>
              onAct({ type: raiseOrBet.type, amount: sliderValue })
            }
            className="rounded-xl bg-[var(--color-champagne)] py-3 text-xs font-semibold tracking-[0.2em] text-[var(--color-obsidian)]"
          >
            {raiseOrBet.type === "bet" ? "BET" : "RAISE"}{" "}
            {sliderValue.toLocaleString()}
          </button>
        ) : null}
        {allIn && !raiseOrBet ? (
          <button
            type="button"
            onClick={() =>
              onAct({ type: "all_in", amount: allIn.maxAmount })
            }
            className="rounded-xl border border-[var(--color-champagne)]/50 py-3 text-xs tracking-[0.2em] text-[var(--color-champagne)]"
          >
            ALL-IN
          </button>
        ) : null}
      </div>
      <p className="text-center text-[0.6rem] tracking-[0.15em] text-[var(--color-titanium)]">
        Stack {stack.toLocaleString()}
      </p>
    </div>
  );
}
