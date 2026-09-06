"use client";

import { useState } from "react";
import { PlayingCard } from "@/components/table/PlayingCard";
import { parseCards } from "@mk/poker-engine";

const RANKS = [
  {
    name: "Royal Flush",
    cards: parseCards(["Ah", "Kh", "Qh", "Jh", "Th"]),
  },
  {
    name: "Straight Flush",
    cards: parseCards(["9s", "8s", "7s", "6s", "5s"]),
  },
  {
    name: "Four of a Kind",
    cards: parseCards(["Ac", "Ad", "Ah", "As", "Kd"]),
  },
  {
    name: "Full House",
    cards: parseCards(["Kc", "Kd", "Kh", "2s", "2d"]),
  },
  {
    name: "Flush",
    cards: parseCards(["Ah", "Jh", "8h", "5h", "2h"]),
  },
  {
    name: "Straight",
    cards: parseCards(["Ah", "Kd", "Qc", "Js", "Th"]),
  },
  {
    name: "Three of a Kind",
    cards: parseCards(["Qc", "Qd", "Qh", "9s", "2d"]),
  },
  {
    name: "Two Pair",
    cards: parseCards(["Jc", "Jd", "8h", "8s", "2d"]),
  },
  {
    name: "One Pair",
    cards: parseCards(["Tc", "Td", "Ah", "8s", "2d"]),
  },
  {
    name: "High Card",
    cards: parseCards(["Ah", "Kd", "9c", "5s", "2d"]),
  },
] as const;

type Props = {
  pinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
};

export function HandGuide({ pinned = false, onPinChange }: Props) {
  const [open, setOpen] = useState(pinned);

  if (!open && !pinned) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-white/15 px-3 py-2 text-[0.6rem] tracking-[0.2em] text-[var(--color-titanium)] hover:text-white"
        aria-label="Open hand ranking guide"
      >
        HAND GUIDE
      </button>
    );
  }

  return (
    <aside
      className="max-h-[70vh] w-[min(100%,22rem)] overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-md"
      aria-label="Poker hand rankings"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[0.65rem] tracking-[0.28em] text-[var(--color-champagne)]">
          HAND RANKINGS
        </h2>
        <div className="flex gap-2">
          {onPinChange ? (
            <button
              type="button"
              onClick={() => onPinChange(!pinned)}
              className="text-[0.55rem] tracking-[0.15em] text-[var(--color-titanium)]"
            >
              {pinned ? "UNPIN" : "PIN"}
            </button>
          ) : null}
          {!pinned ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[0.55rem] tracking-[0.15em] text-[var(--color-titanium)]"
            >
              CLOSE
            </button>
          ) : null}
        </div>
      </div>
      <ol className="space-y-3">
        {RANKS.map((row, i) => (
          <li key={row.name} className="flex items-center gap-2">
            <span className="w-4 text-[0.65rem] text-[var(--color-titanium)]">
              {i + 1}
            </span>
            <div className="flex gap-0.5">
              {row.cards.map((c, idx) => (
                <PlayingCard key={idx} card={c} size="sm" />
              ))}
            </div>
            <span className="text-[0.7rem] text-[var(--color-platinum)]">
              {row.name}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
