import { describe, expect, it } from "vitest";
import {
  applyAction,
  chipTotal,
  createTable,
  startHand,
} from "../src/game.js";
import { getLegalActions, getPlayerBySeat } from "../src/actions.js";
import { seededRandomSource } from "../src/deck.js";

/**
 * Bot-vs-bot stress: random legal actions, chip conservation, no deadlocks.
 */
describe("bot-vs-bot simulation", () => {
  it("plays many hands without chip leaks or stalls", () => {
    const rng = seededRandomSource(12345);
    let state = createTable({
      config: { smallBlind: 50, bigBlind: 100, maxSeats: 6 },
      players: Array.from({ length: 6 }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
        seat: i,
        stack: 5000,
      })),
    });

    const sessionTotal = chipTotal(state);
    let hands = 0;

    while (state.phase !== "game_complete" && hands < 80) {
      const started = startHand(state, rng);
      state = started.state;
      const runtime = started.runtime;
      expect(chipTotal(state)).toBe(sessionTotal);

      let steps = 0;
      while (
        state.phase !== "hand_complete" &&
        state.phase !== "game_complete" &&
        steps < 200
      ) {
        steps += 1;
        if (state.actingSeat === null) {
          // Should auto-advance via engine; break if stuck
          break;
        }
        const actor = getPlayerBySeat(state, state.actingSeat)!;
        const legal = getLegalActions(state);
        expect(legal.length).toBeGreaterThan(0);
        const pick = legal[rng.nextInt(legal.length)]!;
        const intent =
          pick.type === "bet" || pick.type === "raise" || pick.type === "all_in"
            ? {
                type: pick.type,
                amount: pick.minAmount ?? pick.maxAmount,
              }
            : { type: pick.type };
        state = applyAction(state, actor.id, intent, runtime);
        expect(chipTotal(state)).toBe(sessionTotal);
      }

      expect(steps).toBeLessThan(200);
      expect(
        state.phase === "hand_complete" || state.phase === "game_complete",
      ).toBe(true);
      hands += 1;

      // Prepare next hand shell
      if (state.phase === "hand_complete") {
        state = {
          ...state,
          phase: "waiting",
          pot: 0,
          communityCards: [],
          showdown: undefined,
          actingSeat: null,
          pendingActSeats: [],
          players: state.players.map((p) => ({
            ...p,
            streetBet: 0,
            handContributed: 0,
            holeCards: null,
            folded: p.stack <= 0,
            allIn: false,
            eliminated: p.stack <= 0,
          })),
        };
      }
    }

    expect(hands).toBeGreaterThan(5);
    expect(chipTotal(state)).toBe(sessionTotal);
  });
});
