import { createStandardDeck } from "./cards.js";
import type { Card, RandomSource } from "./types.js";

/**
 * Fisher–Yates shuffle using the provided RandomSource.
 * Online play MUST inject a cryptographically secure source.
 */
export function shuffleDeck(deck: Card[], rng: RandomSource): Card[] {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export function createShuffledDeck(rng: RandomSource): Card[] {
  return shuffleDeck(createStandardDeck(), rng);
}

export class Deck {
  private cards: Card[];

  constructor(cards: Card[]) {
    this.cards = cards.slice();
  }

  get remaining(): number {
    return this.cards.length;
  }

  draw(): Card {
    const card = this.cards.pop();
    if (!card) {
      throw new Error("Deck is empty");
    }
    return card;
  }

  drawMany(n: number): Card[] {
    const result: Card[] = [];
    for (let i = 0; i < n; i++) {
      result.push(this.draw());
    }
    return result;
  }

  /** Burn one card (standard dealing procedure). */
  burn(): void {
    this.draw();
  }

  peekRemaining(): readonly Card[] {
    return this.cards;
  }
}

/** Math.random-based RNG — ONLY for offline bots / tests. Never for online authority. */
export function mathRandomSource(): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive <= 0) throw new Error("maxExclusive must be > 0");
      return Math.floor(Math.random() * maxExclusive);
    },
  };
}

/** Deterministic RNG for tests. */
export function seededRandomSource(seed: number): RandomSource {
  let state = seed >>> 0;
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive <= 0) throw new Error("maxExclusive must be > 0");
      // LCG (Numerical Recipes)
      state = (1664525 * state + 1013904223) >>> 0;
      return state % maxExclusive;
    },
  };
}

/**
 * Cryptographically secure RNG for Node / modern browsers.
 * Prefer this for online authoritative shuffling.
 */
export function cryptoRandomSource(
  getRandomValues: (arr: Uint32Array) => Uint32Array = (arr) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (globalThis as any).crypto;
    if (!c?.getRandomValues) {
      throw new Error("crypto.getRandomValues is not available");
    }
    return c.getRandomValues(arr);
  },
): RandomSource {
  return {
    nextInt(maxExclusive: number): number {
      if (maxExclusive <= 0) throw new Error("maxExclusive must be > 0");
      // Rejection sampling to avoid modulo bias
      const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
      const buf = new Uint32Array(1);
      let x = 0;
      do {
        getRandomValues(buf);
        x = buf[0]!;
      } while (x >= limit);
      return x % maxExclusive;
    },
  };
}
