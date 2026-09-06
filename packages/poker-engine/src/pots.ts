import type { PotBreakdown, SeatPlayer, SidePot } from "./types.js";

/**
 * Build main + side pots from hand contributions.
 * Folded players still contribute chips but are not eligible to win.
 */
export function calculatePots(players: SeatPlayer[]): PotBreakdown {
  const contributors = players
    .filter((p) => p.handContributed > 0)
    .map((p) => ({
      id: p.id,
      contributed: p.handContributed,
      eligible: !p.folded && !p.eliminated,
    }));

  if (contributors.length === 0) {
    const empty: SidePot = { amount: 0, eligiblePlayerIds: [] };
    return { mainPot: empty, sidePots: [], pots: [empty] };
  }

  const levels = [
    ...new Set(contributors.map((c) => c.contributed)),
  ].sort((a, b) => a - b);

  const pots: SidePot[] = [];
  let prev = 0;

  for (const level of levels) {
    const layer = level - prev;
    if (layer <= 0) continue;

    const inLayer = contributors.filter((c) => c.contributed >= level);
    const amount = layer * inLayer.length;
    const eligiblePlayerIds = inLayer
      .filter((c) => c.eligible)
      .map((c) => c.id);

    // If everyone who put chips into this layer folded, chips still sit in pot;
    // eligibility may be empty until awarded to last aggressor (handled in showdown/fold win).
    pots.push({ amount, eligiblePlayerIds });
    prev = level;
  }

  // Merge consecutive pots with identical eligibility for cleaner display
  const merged: SidePot[] = [];
  for (const pot of pots) {
    const last = merged[merged.length - 1];
    if (
      last &&
      sameIds(last.eligiblePlayerIds, pot.eligiblePlayerIds)
    ) {
      last.amount += pot.amount;
    } else {
      merged.push({
        amount: pot.amount,
        eligiblePlayerIds: [...pot.eligiblePlayerIds],
      });
    }
  }

  const mainPot = merged[0] ?? { amount: 0, eligiblePlayerIds: [] };
  const sidePots = merged.slice(1);
  return { mainPot, sidePots, pots: merged };
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((id, i) => id === sb[i]);
}

export function totalPotAmount(breakdown: PotBreakdown): number {
  return breakdown.pots.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Split pot among winners.
 * Odd chip rule: award leftover chip(s) to the first winner clockwise from the dealer button.
 */
export function splitPotAmount(
  amount: number,
  winnerIds: string[],
  winnerSeatOrderClockwiseFromDealer: string[],
): { amountPerWinner: number; oddChipWinnerId?: string; awards: Map<string, number> } {
  if (winnerIds.length === 0) {
    return { amountPerWinner: 0, awards: new Map() };
  }
  if (winnerIds.length === 1) {
    const awards = new Map([[winnerIds[0]!, amount]]);
    return { amountPerWinner: amount, awards };
  }

  const base = Math.floor(amount / winnerIds.length);
  let remainder = amount % winnerIds.length;
  const awards = new Map<string, number>();
  for (const id of winnerIds) {
    awards.set(id, base);
  }

  let oddChipWinnerId: string | undefined;
  if (remainder > 0) {
    for (const id of winnerSeatOrderClockwiseFromDealer) {
      if (winnerIds.includes(id) && remainder > 0) {
        awards.set(id, (awards.get(id) ?? 0) + 1);
        if (!oddChipWinnerId) oddChipWinnerId = id;
        remainder -= 1;
      }
    }
  }

  return { amountPerWinner: base, oddChipWinnerId, awards };
}

/** Clockwise seat order starting after dealer. */
export function clockwiseFromDealer(
  players: SeatPlayer[],
  dealerSeat: number,
): string[] {
  const active = [...players].sort((a, b) => a.seat - b.seat);
  if (active.length === 0) return [];
  const start = active.findIndex((p) => p.seat > dealerSeat);
  const idx = start === -1 ? 0 : start;
  const ordered = [...active.slice(idx), ...active.slice(0, idx)];
  return ordered.map((p) => p.id);
}
