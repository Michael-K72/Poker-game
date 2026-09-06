import { RANK_LABEL } from "./cards.js";
import type { Card, EvaluatedHand, HandCategory, Rank } from "./types.js";

const CATEGORY_SCORE: Record<HandCategory, number> = {
  high_card: 0,
  one_pair: 1,
  two_pair: 2,
  three_of_a_kind: 3,
  straight: 4,
  flush: 5,
  full_house: 6,
  four_of_a_kind: 7,
  straight_flush: 8,
  royal_flush: 9,
};

const CATEGORY_NAME: Record<HandCategory, string> = {
  high_card: "High Card",
  one_pair: "One Pair",
  two_pair: "Two Pair",
  three_of_a_kind: "Three of a Kind",
  straight: "Straight",
  flush: "Flush",
  full_house: "Full House",
  four_of_a_kind: "Four of a Kind",
  straight_flush: "Straight Flush",
  royal_flush: "Royal Flush",
};

function rankWord(rank: Rank): string {
  const map: Record<number, string> = {
    14: "Ace",
    13: "King",
    12: "Queen",
    11: "Jack",
    10: "Ten",
    9: "Nine",
    8: "Eight",
    7: "Seven",
    6: "Six",
    5: "Five",
    4: "Four",
    3: "Three",
    2: "Two",
  };
  return map[rank] ?? String(rank);
}

function pluralRank(rank: Rank): string {
  if (rank === 6) return "Sixes";
  return `${rankWord(rank)}s`;
}

/**
 * Encode category + up to 5 kickers into a single comparable number.
 * Base 15 encoding keeps ranks (2–14) safely separated.
 */
function encode(category: HandCategory, kickers: number[]): number {
  let value = CATEGORY_SCORE[category];
  for (let i = 0; i < 5; i++) {
    value = value * 15 + (kickers[i] ?? 0);
  }
  return value;
}

function findStraightHigh(ranksDescUnique: number[]): number | null {
  // Wheel: A-5-4-3-2
  const hasAce = ranksDescUnique.includes(14);
  const normalized = hasAce
    ? [...ranksDescUnique, 1]
    : ranksDescUnique.slice();

  let run = 1;
  for (let i = 0; i < normalized.length - 1; i++) {
    if (normalized[i]! - 1 === normalized[i + 1]!) {
      run += 1;
      if (run >= 5) {
        return normalized[i - 3]!; // high card of the straight (5-high wheel → 5)
      }
    } else if (normalized[i] !== normalized[i + 1]) {
      run = 1;
    }
  }
  return null;
}

function pickStraightCards(cards: Card[], high: number): Card[] {
  const needed =
    high === 5
      ? [5, 4, 3, 2, 14]
      : [high, high - 1, high - 2, high - 3, high - 4];
  const result: Card[] = [];
  const used = new Set<string>();
  for (const r of needed) {
    const card = cards.find(
      (c) => c.rank === r && !used.has(`${c.rank}${c.suit}`),
    );
    if (!card) {
      throw new Error("Straight cards missing");
    }
    used.add(`${card.rank}${card.suit}`);
    result.push(card);
  }
  return result;
}

function describe(
  category: HandCategory,
  primary: Rank[],
  kickers: Rank[] = [],
): string {
  switch (category) {
    case "royal_flush":
      return "Royal Flush";
    case "straight_flush":
      return `Straight Flush, ${rankWord(primary[0]!)} High`;
    case "four_of_a_kind":
      return `Four of a Kind, ${pluralRank(primary[0]!)}`;
    case "full_house":
      return `Full House, ${pluralRank(primary[0]!)} full of ${pluralRank(primary[1]!)}`;
    case "flush":
      return `Flush, ${rankWord(primary[0]!)} High`;
    case "straight":
      return `Straight, ${rankWord(primary[0]!)} High`;
    case "three_of_a_kind":
      return `Three of a Kind, ${pluralRank(primary[0]!)}`;
    case "two_pair":
      return `Two Pair, ${pluralRank(primary[0]!)} and ${pluralRank(primary[1]!)}`;
    case "one_pair":
      return `One Pair, ${pluralRank(primary[0]!)}`;
    case "high_card":
      return `High Card, ${rankWord(primary[0]!)}`;
    default:
      return CATEGORY_NAME[category];
  }
}

/** Evaluate exactly five cards. */
export function evaluateFive(cards: Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error("evaluateFive requires exactly 5 cards");
  }

  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);
  const isFlush = sorted.every((c) => c.suit === sorted[0]!.suit);

  const counts = new Map<Rank, number>();
  for (const r of ranks) {
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const uniqueRanks = [...new Set(ranks)];
  const straightHigh = findStraightHigh(uniqueRanks);

  if (isFlush && straightHigh !== null) {
    const category: HandCategory =
      straightHigh === 14 ? "royal_flush" : "straight_flush";
    const handCards = pickStraightCards(sorted, straightHigh);
    return {
      category,
      rankValue: encode(category, [straightHigh]),
      cards: handCards,
      name: describe(category, [straightHigh as Rank]),
    };
  }

  if (groups[0]![1] === 4) {
    const quad = groups[0]![0];
    const kicker = groups[1]![0];
    return {
      category: "four_of_a_kind",
      rankValue: encode("four_of_a_kind", [quad, kicker]),
      cards: sorted,
      name: describe("four_of_a_kind", [quad]),
    };
  }

  if (groups[0]![1] === 3 && groups[1]![1] === 2) {
    const trips = groups[0]![0];
    const pair = groups[1]![0];
    return {
      category: "full_house",
      rankValue: encode("full_house", [trips, pair]),
      cards: sorted,
      name: describe("full_house", [trips, pair]),
    };
  }

  if (isFlush) {
    return {
      category: "flush",
      rankValue: encode("flush", ranks),
      cards: sorted,
      name: describe("flush", [ranks[0]!]),
    };
  }

  if (straightHigh !== null) {
    const handCards = pickStraightCards(sorted, straightHigh);
    return {
      category: "straight",
      rankValue: encode("straight", [straightHigh]),
      cards: handCards,
      name: describe("straight", [straightHigh as Rank]),
    };
  }

  if (groups[0]![1] === 3) {
    const trips = groups[0]![0];
    const kickers = groups.slice(1).map((g) => g[0]);
    return {
      category: "three_of_a_kind",
      rankValue: encode("three_of_a_kind", [trips, ...kickers]),
      cards: sorted,
      name: describe("three_of_a_kind", [trips]),
    };
  }

  if (groups[0]![1] === 2 && groups[1]![1] === 2) {
    const highPair = Math.max(groups[0]![0], groups[1]![0]) as Rank;
    const lowPair = Math.min(groups[0]![0], groups[1]![0]) as Rank;
    const kicker = groups[2]![0];
    return {
      category: "two_pair",
      rankValue: encode("two_pair", [highPair, lowPair, kicker]),
      cards: sorted,
      name: describe("two_pair", [highPair, lowPair]),
    };
  }

  if (groups[0]![1] === 2) {
    const pair = groups[0]![0];
    const kickers = groups.slice(1).map((g) => g[0]);
    return {
      category: "one_pair",
      rankValue: encode("one_pair", [pair, ...kickers]),
      cards: sorted,
      name: describe("one_pair", [pair]),
    };
  }

  return {
    category: "high_card",
    rankValue: encode("high_card", ranks),
    cards: sorted,
    name: describe("high_card", [ranks[0]!]),
  };
}

/** Combinations helper. */
function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const result: T[][] = [];
  const recurse = (start: number, path: T[]) => {
    if (path.length === k) {
      result.push(path.slice());
      return;
    }
    for (let i = start; i < items.length; i++) {
      path.push(items[i]!);
      recurse(i + 1, path);
      path.pop();
    }
  };
  recurse(0, []);
  return result;
}

/**
 * Best 5-card hand from 5–7 cards (Texas Hold'em uses 7).
 */
export function evaluateBestHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error("evaluateBestHand requires 5–7 cards");
  }
  if (cards.length === 5) {
    return evaluateFive(cards);
  }

  let best: EvaluatedHand | null = null;
  for (const five of combinations(cards, 5)) {
    const evaluated = evaluateFive(five);
    if (!best || evaluated.rankValue > best.rankValue) {
      best = evaluated;
    }
  }
  return best!;
}

export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.rankValue - b.rankValue;
}

export function handCategoryLabel(category: HandCategory): string {
  return CATEGORY_NAME[category];
}

export function formatCardShort(card: Card): string {
  return `${RANK_LABEL[card.rank]}${card.suit}`;
}
