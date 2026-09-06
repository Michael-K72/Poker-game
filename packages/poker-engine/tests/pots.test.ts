import { describe, expect, it } from "vitest";
import type { SeatPlayer } from "../src/types.js";
import {
  calculatePots,
  splitPotAmount,
  totalPotAmount,
} from "../src/pots.js";

function p(
  id: string,
  contributed: number,
  folded = false,
): SeatPlayer {
  return {
    id,
    name: id,
    seat: Number(id.replace(/\D/g, "")) || 0,
    stack: 0,
    streetBet: 0,
    handContributed: contributed,
    holeCards: null,
    folded,
    allIn: true,
    eliminated: false,
    disconnected: false,
    isBot: false,
  };
}

describe("side pots", () => {
  it("creates main pot for equal stacks", () => {
    const pots = calculatePots([p("a", 100), p("b", 100)]);
    expect(totalPotAmount(pots)).toBe(200);
    expect(pots.pots).toHaveLength(1);
    expect(pots.mainPot.eligiblePlayerIds.sort()).toEqual(["a", "b"]);
  });

  it("creates side pot for unequal all-ins (2 players + cover)", () => {
    // A 1000 all-in, B 3000 all-in, C 5000
    const pots = calculatePots([
      p("a", 1000),
      p("b", 3000),
      p("c", 5000),
    ]);
    expect(totalPotAmount(pots)).toBe(9000);
    // 1000*3 = 3000 main (a,b,c)
    // 2000*2 = 4000 side (b,c)
    // 2000*1 = 2000 side (c) — actually C's extra vs B
    expect(pots.pots[0]!.amount).toBe(3000);
    expect(pots.pots[0]!.eligiblePlayerIds.sort()).toEqual(["a", "b", "c"]);
    expect(pots.pots[1]!.amount).toBe(4000);
    expect(pots.pots[1]!.eligiblePlayerIds.sort()).toEqual(["b", "c"]);
    expect(pots.pots[2]!.amount).toBe(2000);
    expect(pots.pots[2]!.eligiblePlayerIds).toEqual(["c"]);
  });

  it("folded contributor is not eligible", () => {
    const pots = calculatePots([
      p("a", 100, true),
      p("b", 100),
      p("c", 100),
    ]);
    expect(pots.mainPot.amount).toBe(300);
    expect(pots.mainPot.eligiblePlayerIds.sort()).toEqual(["b", "c"]);
  });

  it("4-player nested side pots", () => {
    const pots = calculatePots([
      p("a", 50),
      p("b", 100),
      p("c", 200),
      p("d", 400),
    ]);
    expect(totalPotAmount(pots)).toBe(750);
    expect(pots.pots[0]!.amount).toBe(200); // 50*4
    expect(pots.pots[1]!.amount).toBe(150); // 50*3
    expect(pots.pots[2]!.amount).toBe(200); // 100*2
    expect(pots.pots[3]!.amount).toBe(200); // 200*1
  });
});

describe("split pots", () => {
  it("splits evenly", () => {
    const { awards } = splitPotAmount(100, ["a", "b"], ["a", "b"]);
    expect(awards.get("a")).toBe(50);
    expect(awards.get("b")).toBe(50);
  });

  it("awards odd chip clockwise from dealer order", () => {
    // order is clockwise from dealer: first eligible gets odd chip
    const { awards, oddChipWinnerId } = splitPotAmount(
      101,
      ["a", "b"],
      ["b", "a"],
    );
    expect(oddChipWinnerId).toBe("b");
    expect(awards.get("b")).toBe(51);
    expect(awards.get("a")).toBe(50);
  });
});
