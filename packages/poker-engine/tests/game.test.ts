import { describe, expect, it } from "vitest";
import {
  applyAction,
  chipTotal,
  createTable,
  getLegalActions,
  resolveBlindSeats,
  startHand,
} from "../src/game.js";
import { seededRandomSource } from "../src/deck.js";

describe("heads-up blinds", () => {
  it("button posts small blind in heads-up", () => {
    const { sb, bb } = resolveBlindSeats(0, [0, 1]);
    expect(sb).toBe(0);
    expect(bb).toBe(1);
  });

  it("multiway SB is left of button", () => {
    const { sb, bb } = resolveBlindSeats(0, [0, 1, 2, 3]);
    expect(sb).toBe(1);
    expect(bb).toBe(2);
  });
});

describe("hand flow", () => {
  it("starts hand, deals cards, conserves chips", () => {
    const table = createTable({
      config: { smallBlind: 50, bigBlind: 100, maxSeats: 6 },
      players: [
        { id: "p1", name: "P1", seat: 0, stack: 5000 },
        { id: "p2", name: "P2", seat: 1, stack: 5000 },
        { id: "p3", name: "P3", seat: 2, stack: 5000 },
      ],
      dealerSeat: 0,
    });

    const before = chipTotal(table);
    const { state, runtime } = startHand(table, seededRandomSource(7));
    expect(chipTotal(state)).toBe(before);
    expect(state.phase).toBe("preflop");
    expect(state.players.every((p) => p.holeCards?.length === 2)).toBe(true);
    expect(state.pot).toBe(150);
    expect(runtime.deck.remaining).toBe(52 - 6);
  });

  it("fold win awards pot", () => {
    const table = createTable({
      config: { smallBlind: 50, bigBlind: 100, maxSeats: 2 },
      players: [
        { id: "btn", name: "BTN", seat: 0, stack: 1000 },
        { id: "bb", name: "BB", seat: 1, stack: 1000 },
      ],
      dealerSeat: 0,
    });

    const { state: s0, runtime } = startHand(table, seededRandomSource(1));
    // HU: SB/BTN acts first
    expect(s0.actingSeat).toBe(0);
    const legal = getLegalActions(s0);
    expect(legal.some((a) => a.type === "fold")).toBe(true);

    const s1 = applyAction(s0, "btn", { type: "fold" }, runtime);
    expect(s1.phase === "hand_complete" || s1.phase === "game_complete").toBe(
      true,
    );
    const bb = s1.players.find((p) => p.id === "bb")!;
    expect(bb.stack).toBe(1050);
    expect(chipTotal(s1)).toBe(2000);
  });

  it("check-down to showdown conserves chips", () => {
    const table = createTable({
      config: { smallBlind: 25, bigBlind: 50, maxSeats: 2 },
      players: [
        { id: "a", name: "A", seat: 0, stack: 1000 },
        { id: "b", name: "B", seat: 1, stack: 1000 },
      ],
      dealerSeat: 0,
    });

    let { state, runtime } = startHand(table, seededRandomSource(99));
    const total = chipTotal(state);

    // Preflop: SB completes, BB checks
    // SB acts first — call
    state = applyAction(state, "a", { type: "call" }, runtime);
    if (state.phase === "preflop") {
      state = applyAction(state, "b", { type: "check" }, runtime);
    }

    // Check through streets
    let guard = 0;
    while (
      state.phase !== "hand_complete" &&
      state.phase !== "game_complete" &&
      guard < 40
    ) {
      guard += 1;
      if (state.actingSeat === null) break;
      const actor = state.players.find((p) => p.seat === state.actingSeat)!;
      const legal = getLegalActions(state);
      if (legal.some((a) => a.type === "check")) {
        state = applyAction(state, actor.id, { type: "check" }, runtime);
      } else if (legal.some((a) => a.type === "call")) {
        state = applyAction(state, actor.id, { type: "call" }, runtime);
      } else {
        state = applyAction(state, actor.id, { type: "fold" }, runtime);
      }
      expect(chipTotal(state)).toBe(total);
    }

    expect(
      state.phase === "hand_complete" || state.phase === "game_complete",
    ).toBe(true);
    expect(chipTotal(state)).toBe(total);
  });
});
