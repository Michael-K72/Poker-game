import type { Card, Rank, Suit } from "./types.js";

export const SUITS: readonly Suit[] = ["c", "d", "h", "s"] as const;
export const RANKS: readonly Rank[] = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
] as const;

export const RANK_LABEL: Record<Rank, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "T",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

export const SUIT_LABEL: Record<Suit, string> = {
  c: "♣",
  d: "♦",
  h: "♥",
  s: "♠",
};

export function cardId(card: Card): string {
  return `${RANK_LABEL[card.rank]}${card.suit}`;
}

export function parseCard(id: string): Card {
  const trimmed = id.trim();
  if (trimmed.length < 2) {
    throw new Error(`Invalid card: ${id}`);
  }
  const suit = trimmed.slice(-1).toLowerCase() as Suit;
  const rankPart = trimmed.slice(0, -1).toUpperCase();
  if (!SUITS.includes(suit)) {
    throw new Error(`Invalid suit in card: ${id}`);
  }
  const rankMap: Record<string, Rank> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    T: 10,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  };
  const rank = rankMap[rankPart];
  if (!rank) {
    throw new Error(`Invalid rank in card: ${id}`);
  }
  return { rank, suit };
}

export function parseCards(ids: string[]): Card[] {
  return ids.map(parseCard);
}

export function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export function uniqueCards(cards: Card[]): boolean {
  const seen = new Set<string>();
  for (const c of cards) {
    const id = cardId(c);
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}
