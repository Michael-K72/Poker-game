import { describe, expect, it } from "vitest";
import {
  createStandardDeck,
  parseCards,
  uniqueCards,
} from "../src/cards.js";
import { createShuffledDeck, seededRandomSource } from "../src/deck.js";
import {
  compareHands,
  evaluateBestHand,
  evaluateFive,
} from "../src/hand-evaluator.js";

describe("deck", () => {
  it("has 52 unique cards", () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(52);
    expect(uniqueCards(deck)).toBe(true);
  });

  it("shuffle preserves 52 unique cards", () => {
    const shuffled = createShuffledDeck(seededRandomSource(42));
    expect(shuffled).toHaveLength(52);
    expect(uniqueCards(shuffled)).toBe(true);
  });
});

describe("hand evaluation", () => {
  it("detects royal flush", () => {
    const hand = evaluateFive(
      parseCards(["Ah", "Kh", "Qh", "Jh", "Th"]),
    );
    expect(hand.category).toBe("royal_flush");
  });

  it("detects straight flush", () => {
    const hand = evaluateFive(
      parseCards(["9s", "8s", "7s", "6s", "5s"]),
    );
    expect(hand.category).toBe("straight_flush");
  });

  it("detects four of a kind", () => {
    const hand = evaluateFive(
      parseCards(["Ac", "Ad", "Ah", "As", "Kd"]),
    );
    expect(hand.category).toBe("four_of_a_kind");
  });

  it("detects full house", () => {
    const hand = evaluateFive(
      parseCards(["Kc", "Kd", "Kh", "2s", "2d"]),
    );
    expect(hand.category).toBe("full_house");
  });

  it("detects flush", () => {
    const hand = evaluateFive(
      parseCards(["Ah", "9h", "7h", "4h", "2h"]),
    );
    expect(hand.category).toBe("flush");
  });

  it("detects broadway straight", () => {
    const hand = evaluateFive(
      parseCards(["Ah", "Kd", "Qc", "Js", "Th"]),
    );
    expect(hand.category).toBe("straight");
  });

  it("detects wheel straight A-2-3-4-5", () => {
    const hand = evaluateFive(
      parseCards(["Ah", "2d", "3c", "4s", "5h"]),
    );
    expect(hand.category).toBe("straight");
    expect(hand.rankValue).toBe(
      evaluateFive(parseCards(["5h", "4d", "3c", "2s", "Ah"])).rankValue,
    );
  });

  it("wheel loses to six-high straight", () => {
    const wheel = evaluateFive(parseCards(["Ah", "2d", "3c", "4s", "5h"]));
    const sixHigh = evaluateFive(parseCards(["6h", "5d", "4c", "3s", "2h"]));
    expect(compareHands(sixHigh, wheel)).toBeGreaterThan(0);
  });

  it("detects three of a kind", () => {
    expect(
      evaluateFive(parseCards(["Qc", "Qd", "Qh", "9s", "2d"])).category,
    ).toBe("three_of_a_kind");
  });

  it("detects two pair", () => {
    expect(
      evaluateFive(parseCards(["Jc", "Jd", "8h", "8s", "2d"])).category,
    ).toBe("two_pair");
  });

  it("detects one pair", () => {
    expect(
      evaluateFive(parseCards(["Tc", "Td", "Ah", "8s", "2d"])).category,
    ).toBe("one_pair");
  });

  it("detects high card", () => {
    expect(
      evaluateFive(parseCards(["Ah", "Kd", "9c", "5s", "2d"])).category,
    ).toBe("high_card");
  });

  it("uses kickers for pair comparison", () => {
    const a = evaluateFive(parseCards(["Ac", "Ad", "Kh", "9s", "2d"]));
    const b = evaluateFive(parseCards(["Ac", "Ad", "Qh", "9s", "2d"]));
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  it("picks best five from seven cards", () => {
    const hand = evaluateBestHand(
      parseCards(["Ah", "Kh", "Qh", "Jh", "2c", "5d", "Th"]),
    );
    expect(hand.category).toBe("royal_flush");
  });

  it("board-only straight is valid", () => {
    // Hole cards unused; board makes T–A straight without a flush
    const hand = evaluateBestHand(
      parseCards(["2c", "7d", "Th", "Jd", "Qs", "Kc", "Ah"]),
    );
    expect(hand.category).toBe("straight");
  });
});
