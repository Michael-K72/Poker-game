"use client";

import type { Card } from "@mk/poker-engine";
import { RANK_LABEL } from "@mk/poker-engine";

const SUIT_GLYPH: Record<Card["suit"], string> = {
  c: "♣",
  d: "♦",
  h: "♥",
  s: "♠",
};

type Props = {
  card?: Card;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
};

export function PlayingCard({ card, faceDown = false, size = "md" }: Props) {
  const dims =
    size === "sm"
      ? "h-10 w-7 text-[0.65rem]"
      : size === "lg"
        ? "h-24 w-16 text-base"
        : "h-14 w-10 text-xs";

  if (faceDown || !card) {
    return (
      <div
        className={`${dims} rounded-md border border-[var(--color-champagne)]/30 bg-gradient-to-br from-[#1a2230] to-[#0b1018] shadow-lg`}
        aria-label="Face-down card"
      >
        <div className="flex h-full items-center justify-center">
          <div className="h-3 w-3 rounded-full border border-[var(--color-champagne)]/50" />
        </div>
      </div>
    );
  }

  const red = card.suit === "h" || card.suit === "d";
  return (
    <div
      className={`${dims} relative rounded-md border border-white/20 bg-[#f4f1ea] shadow-lg`}
      aria-label={`${RANK_LABEL[card.rank]}${SUIT_GLYPH[card.suit]}`}
    >
      <div
        className={`absolute left-1 top-0.5 font-semibold leading-none ${
          red ? "text-[#8b1e2d]" : "text-[#12161c]"
        }`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        <div>{RANK_LABEL[card.rank]}</div>
        <div className="text-[0.85em]">{SUIT_GLYPH[card.suit]}</div>
      </div>
    </div>
  );
}
