import {
  getLegalActions,
  getPlayerById,
  getPlayerBySeat,
  isActionLegal,
  minRaiseTo,
  playersWhoCanAct,
  contenders,
  activePlayers,
} from "./actions.js";
import { createShuffledDeck, Deck } from "./deck.js";
import { evaluateBestHand, compareHands } from "./hand-evaluator.js";
import {
  calculatePots,
  clockwiseFromDealer,
  splitPotAmount,
  totalPotAmount,
} from "./pots.js";
import type {
  Card,
  HandActionRecord,
  PlayerActionIntent,
  RandomSource,
  SeatPlayer,
  ShowdownResult,
  TableConfig,
  TableState,
} from "./types.js";

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface CreateTableOptions {
  config: TableConfig;
  players: Array<{
    id: string;
    name: string;
    seat: number;
    stack: number;
    isBot?: boolean;
  }>;
  /** Dealer seat for first hand; default lowest seat. */
  dealerSeat?: number;
}

function bump(state: TableState): TableState {
  return { ...state, stateVersion: state.stateVersion + 1 };
}

function log(
  state: TableState,
  street: HandActionRecord["street"],
  playerId: string | null,
  type: string,
  amount?: number,
): void {
  state.actionLog.push({
    handNumber: state.handNumber,
    street,
    playerId,
    type,
    amount,
    timestamp: Date.now(),
  });
}

function seatsSorted(players: SeatPlayer[]): number[] {
  return [...players].map((p) => p.seat).sort((a, b) => a - b);
}

/** Next occupied seat clockwise from `fromSeat` among `candidates`. */
function nextSeatClockwise(
  fromSeat: number,
  candidateSeats: number[],
): number | null {
  if (candidateSeats.length === 0) return null;
  const sorted = [...candidateSeats].sort((a, b) => a - b);
  for (const s of sorted) {
    if (s > fromSeat) return s;
  }
  return sorted[0]!;
}

/**
 * Heads-up: button posts SB, other posts BB.
 * Multiway: SB is left of button, BB left of SB.
 */
export function resolveBlindSeats(
  dealerSeat: number,
  activeSeats: number[],
): { sb: number; bb: number } {
  if (activeSeats.length < 2) {
    throw new Error("Need at least 2 players for blinds");
  }
  if (activeSeats.length === 2) {
    const sb = dealerSeat;
    const bb = nextSeatClockwise(dealerSeat, activeSeats)!;
    return { sb, bb };
  }
  const sb = nextSeatClockwise(dealerSeat, activeSeats)!;
  const bb = nextSeatClockwise(sb, activeSeats)!;
  return { sb, bb };
}

export function createTable(options: CreateTableOptions): TableState {
  const { config, players } = options;
  if (config.maxSeats < 2 || config.maxSeats > 8) {
    throw new Error("maxSeats must be 2–8");
  }
  if (players.length < 2 || players.length > config.maxSeats) {
    throw new Error("Invalid player count");
  }
  const seats = new Set(players.map((p) => p.seat));
  if (seats.size !== players.length) {
    throw new Error("Duplicate seats");
  }

  const seatPlayers: SeatPlayer[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    seat: p.seat,
    stack: p.stack,
    streetBet: 0,
    handContributed: 0,
    holeCards: null,
    folded: false,
    allIn: false,
    eliminated: p.stack <= 0,
    disconnected: false,
    isBot: p.isBot ?? false,
  }));

  const dealerSeat =
    options.dealerSeat ??
    Math.min(...seatPlayers.filter((p) => !p.eliminated).map((p) => p.seat));

  return {
    phase: "waiting",
    handNumber: 0,
    dealerSeat,
    smallBlindSeat: null,
    bigBlindSeat: null,
    communityCards: [],
    pot: 0,
    currentBet: 0,
    lastRaiseSize: config.bigBlind,
    actingSeat: null,
    pendingActSeats: [],
    players: seatPlayers,
    actionLog: [],
    stateVersion: 1,
    config,
  };
}

function commitChips(player: SeatPlayer, chips: number): number {
  const paid = Math.min(chips, player.stack);
  player.stack -= paid;
  player.streetBet += paid;
  player.handContributed += paid;
  if (player.stack === 0) {
    player.allIn = true;
  }
  return paid;
}

function refreshPot(state: TableState): void {
  state.pot = state.players.reduce((s, p) => s + p.handContributed, 0);
}

function resetStreetBets(state: TableState): void {
  for (const p of state.players) {
    p.streetBet = 0;
  }
  state.currentBet = 0;
  state.lastRaiseSize = state.config.bigBlind;
}

function livingSeats(state: TableState): number[] {
  return seatsSorted(activePlayers(state).filter((p) => p.stack > 0 || !p.eliminated));
}

function seatsWithChips(state: TableState): number[] {
  return seatsSorted(activePlayers(state).filter((p) => p.stack > 0));
}

export interface HandRuntime {
  deck: Deck;
}

/**
 * Start a new hand. Returns updated state + runtime deck (server-only).
 */
export function startHand(
  state: TableState,
  rng: RandomSource,
): { state: TableState; runtime: HandRuntime } {
  let s = cloneState(state);

  // Mark eliminated
  for (const p of s.players) {
    if (p.stack <= 0) {
      p.eliminated = true;
      p.folded = true;
      p.allIn = false;
      p.holeCards = null;
    }
  }

  const withChips = s.players.filter((p) => !p.eliminated && p.stack > 0);
  if (withChips.length < 2) {
    s.phase = "game_complete";
    return { state: bump(s), runtime: { deck: new Deck([]) } };
  }

  // Advance dealer among players with chips
  const chipSeats = seatsWithChips(s);
  if (s.handNumber > 0) {
    s.dealerSeat = nextSeatClockwise(s.dealerSeat, chipSeats)!;
  } else if (!chipSeats.includes(s.dealerSeat)) {
    s.dealerSeat = chipSeats[0]!;
  }

  s.handNumber += 1;
  s.phase = "starting_hand";
  s.communityCards = [];
  s.showdown = undefined;
  s.actingSeat = null;
  s.pendingActSeats = [];
  resetStreetBets(s);
  s.pot = 0;

  for (const p of s.players) {
    if (p.eliminated) continue;
    p.folded = false;
    p.allIn = false;
    p.holeCards = null;
    p.streetBet = 0;
    p.handContributed = 0;
  }

  const deck = new Deck(createShuffledDeck(rng));
  const { sb, bb } = resolveBlindSeats(
    s.dealerSeat,
    seatsSorted(withChips),
  );
  s.smallBlindSeat = sb;
  s.bigBlindSeat = bb;
  s.phase = "posting_blinds";

  const sbPlayer = getPlayerBySeat(s, sb)!;
  const bbPlayer = getPlayerBySeat(s, bb)!;
  const sbPaid = commitChips(sbPlayer, s.config.smallBlind);
  log(s, "blinds", sbPlayer.id, "small_blind", sbPaid);
  const bbPaid = commitChips(bbPlayer, s.config.bigBlind);
  log(s, "blinds", bbPlayer.id, "big_blind", bbPaid);

  s.currentBet = Math.max(sbPlayer.streetBet, bbPlayer.streetBet);
  s.lastRaiseSize = s.config.bigBlind;
  refreshPot(s);

  // Deal hole cards starting left of dealer
  let dealSeat = nextSeatClockwise(s.dealerSeat, seatsSorted(withChips))!;
  for (let round = 0; round < 2; round++) {
    let seat = dealSeat;
    for (let i = 0; i < withChips.length; i++) {
      const player = getPlayerBySeat(s, seat)!;
      const card = deck.draw();
      player.holeCards = player.holeCards ? [...player.holeCards, card] : [card];
      seat = nextSeatClockwise(seat, seatsSorted(withChips))!;
    }
  }

  s.phase = "preflop";
  beginBettingRound(s, "preflop");

  return { state: bump(s), runtime: { deck } };
}

/**
 * Preflop: first to act is left of BB (UTG), or in HU the button/SB.
 * Postflop: first to act is left of dealer (SB in multiway; BB in HU).
 */
function beginBettingRound(
  state: TableState,
  street: "preflop" | "flop" | "turn" | "river",
): void {
  const canAct = playersWhoCanAct(state);
  if (canAct.length === 0) {
    state.actingSeat = null;
    state.pendingActSeats = [];
    return;
  }

  // If only one contender can act and others all-in/folded appropriately, still may need to run out
  const live = contenders(state);
  if (live.length <= 1) {
    state.actingSeat = null;
    state.pendingActSeats = [];
    return;
  }

  if (playersWhoCanAct(state).length <= 1 && state.currentBet === 0) {
    // Everyone else all-in, no betting needed if checks would complete
    const actors = playersWhoCanAct(state);
    if (actors.length <= 1 && live.every((p) => p.allIn || p.streetBet === state.currentBet || !actors.includes(p))) {
      // Fall through to set pending properly
    }
  }

  const actSeats = seatsSorted(canAct);
  let first: number;

  if (street === "preflop") {
    if (actSeats.length === 2 || contenders(state).length === 2) {
      // Heads-up: SB/button acts first preflop
      first = state.smallBlindSeat!;
    } else {
      first = nextSeatClockwise(state.bigBlindSeat!, actSeats)!;
    }
  } else {
    // Postflop: first active contender left of dealer
    const contenderSeats = seatsSorted(contenders(state).filter((p) => !p.allIn));
    const fallback = seatsSorted(contenders(state));
    const pool = contenderSeats.length > 0 ? contenderSeats : fallback;
    first = nextSeatClockwise(state.dealerSeat, pool)!;
  }

  // Players who need to act: all who can act, BB option preflop included
  state.pendingActSeats = [...actSeats];
  // Ensure first is in pending
  if (!state.pendingActSeats.includes(first)) {
    // first may be all-in already
    first = nextSeatClockwise(first - 0.1, actSeats) ?? actSeats[0]!;
    // simplify: pick next from dealer/blinds among actSeats
    first = actSeats.includes(first)
      ? first
      : nextSeatClockwise(
          street === "preflop" ? state.bigBlindSeat! : state.dealerSeat,
          actSeats,
        )!;
  }

  state.actingSeat = first;
  // Order pending starting from first
  const idx = state.pendingActSeats.indexOf(first);
  if (idx > 0) {
    state.pendingActSeats = [
      ...state.pendingActSeats.slice(idx),
      ...state.pendingActSeats.slice(0, idx),
    ];
  }
}

function removePending(state: TableState, seat: number): void {
  state.pendingActSeats = state.pendingActSeats.filter((s) => s !== seat);
}

function reopenAction(
  state: TableState,
  actorSeat: number,
  fullRaise: boolean,
): void {
  if (!fullRaise) {
    // Short all-in: players who have not yet acted may still respond;
    // those who already acted face no re-open. Simplified NLHE: only reopen on full raise.
    return;
  }
  const need = playersWhoCanAct(state)
    .filter((p) => p.seat !== actorSeat)
    .map((p) => p.seat);
  state.pendingActSeats = need;
  // Order clockwise from actor
  const ordered: number[] = [];
  let seat = nextSeatClockwise(actorSeat, need);
  while (seat !== null && ordered.length < need.length) {
    ordered.push(seat);
    seat = nextSeatClockwise(seat, need);
    if (seat === ordered[0]) break;
  }
  state.pendingActSeats = ordered.length ? ordered : need;
}

function advanceActor(state: TableState): void {
  removePending(state, state.actingSeat!);
  if (state.pendingActSeats.length === 0) {
    state.actingSeat = null;
    return;
  }
  state.actingSeat = state.pendingActSeats[0]!;
}

function bettingRoundComplete(state: TableState): boolean {
  if (contenders(state).length <= 1) return true;
  if (state.actingSeat === null && state.pendingActSeats.length === 0) {
    return true;
  }
  return false;
}

function dealCommunity(
  state: TableState,
  runtime: HandRuntime,
  count: number,
): void {
  runtime.deck.burn();
  for (let i = 0; i < count; i++) {
    state.communityCards.push(runtime.deck.draw());
  }
}

export function continueAfterBetting(
  state: TableState,
  runtime: HandRuntime,
): TableState {
  let s = cloneState(state);

  // Fold win
  const live = contenders(s);
  if (live.length === 1) {
    return awardFoldWin(s, live[0]!);
  }

  // All remaining players all-in (or only one can act with matched bets) → run out
  const canStillBet = playersWhoCanAct(s);
  const unmatched = live.some(
    (p) => !p.allIn && p.streetBet !== s.currentBet && p.stack > 0,
  );

  if (canStillBet.length <= 1 && !unmatched) {
    return runOutBoard(s, runtime);
  }

  if (!bettingRoundComplete(s)) {
    return bump(s);
  }

  // Advance street
  resetStreetBets(s);

  if (s.phase === "preflop") {
    s.phase = "flop";
    dealCommunity(s, runtime, 3);
    log(s, "flop", null, "deal_flop");
    beginBettingRound(s, "flop");
    if (bettingRoundComplete(s) || playersWhoCanAct(s).length <= 1) {
      return continueAfterBetting(s, runtime);
    }
    return bump(s);
  }

  if (s.phase === "flop") {
    s.phase = "turn";
    dealCommunity(s, runtime, 1);
    log(s, "turn", null, "deal_turn");
    beginBettingRound(s, "turn");
    if (bettingRoundComplete(s) || playersWhoCanAct(s).length <= 1) {
      return continueAfterBetting(s, runtime);
    }
    return bump(s);
  }

  if (s.phase === "turn") {
    s.phase = "river";
    dealCommunity(s, runtime, 1);
    log(s, "river", null, "deal_river");
    beginBettingRound(s, "river");
    if (bettingRoundComplete(s) || playersWhoCanAct(s).length <= 1) {
      return continueAfterBetting(s, runtime);
    }
    return bump(s);
  }

  if (s.phase === "river") {
    return finishShowdown(s);
  }

  return bump(s);
}

function runOutBoard(state: TableState, runtime: HandRuntime): TableState {
  let s = state;
  while (s.communityCards.length < 5) {
    resetStreetBets(s);
    if (s.communityCards.length === 0) {
      s.phase = "flop";
      dealCommunity(s, runtime, 3);
      log(s, "flop", null, "deal_flop");
    } else if (s.communityCards.length === 3) {
      s.phase = "turn";
      dealCommunity(s, runtime, 1);
      log(s, "turn", null, "deal_turn");
    } else if (s.communityCards.length === 4) {
      s.phase = "river";
      dealCommunity(s, runtime, 1);
      log(s, "river", null, "deal_river");
    }
  }
  return finishShowdown(s);
}

function awardFoldWin(state: TableState, winner: SeatPlayer): TableState {
  const s = state;
  refreshPot(s);
  const amount = s.pot;
  winner.stack += amount;
  for (const p of s.players) {
    p.handContributed = 0;
    p.streetBet = 0;
  }
  s.pot = 0;
  s.phase = "hand_complete";
  s.actingSeat = null;
  s.pendingActSeats = [];
  s.showdown = {
    pots: [
      {
        amount,
        winnerIds: [winner.id],
        amountPerWinner: amount,
      },
    ],
    players: s.players
      .filter((p) => p.holeCards)
      .map((p) => ({
        playerId: p.id,
        won: p.id === winner.id ? amount : 0,
        shown: false,
        mucked: p.id !== winner.id,
      })),
  };
  log(s, "showdown", winner.id, "win_fold", amount);
  markEliminations(s);
  return bump(s);
}

function finishShowdown(state: TableState): TableState {
  const s = state;
  s.phase = "showdown";
  refreshPot(s);

  const breakdown = calculatePots(s.players);
  const live = contenders(s);
  const evaluations = new Map(
    live.map((p) => {
      const cards = [...(p.holeCards ?? []), ...s.communityCards];
      return [p.id, evaluateBestHand(cards)] as const;
    }),
  );

  const order = clockwiseFromDealer(s.players, s.dealerSeat);
  const potResults: ShowdownResult["pots"] = [];
  const winnings = new Map<string, number>();

  for (const pot of breakdown.pots) {
    if (pot.amount <= 0) continue;
    let eligible = pot.eligiblePlayerIds.filter((id) =>
      live.some((p) => p.id === id),
    );
    // If eligibility empty (all folded in layer), award to last remaining contender
    if (eligible.length === 0) {
      eligible = live.map((p) => p.id);
    }

    let bestValue = -1;
    for (const id of eligible) {
      const ev = evaluations.get(id);
      if (ev && ev.rankValue > bestValue) bestValue = ev.rankValue;
    }
    const winners = eligible.filter(
      (id) => evaluations.get(id)!.rankValue === bestValue,
    );
    const split = splitPotAmount(pot.amount, winners, order);
    potResults.push({
      amount: pot.amount,
      winnerIds: winners,
      amountPerWinner: split.amountPerWinner,
      oddChipWinnerId: split.oddChipWinnerId,
    });
    for (const [id, amt] of split.awards) {
      winnings.set(id, (winnings.get(id) ?? 0) + amt);
    }
  }

  for (const [id, amt] of winnings) {
    const player = getPlayerById(s, id)!;
    player.stack += amt;
  }

  for (const p of s.players) {
    p.handContributed = 0;
    p.streetBet = 0;
  }
  s.pot = 0;
  s.phase = "hand_complete";
  s.actingSeat = null;
  s.pendingActSeats = [];
  s.showdown = {
    pots: potResults,
    players: live.map((p) => ({
      playerId: p.id,
      hand: evaluations.get(p.id),
      won: winnings.get(p.id) ?? 0,
      shown: true,
      mucked: false,
    })),
  };
  log(s, "showdown", null, "showdown");
  markEliminations(s);
  return bump(s);
}

function markEliminations(state: TableState): void {
  for (const p of state.players) {
    if (p.stack <= 0) {
      p.eliminated = true;
    }
  }
  const remaining = state.players.filter((p) => !p.eliminated && p.stack > 0);
  if (remaining.length <= 1) {
    state.phase = "game_complete";
  }
}

/**
 * Apply a validated player action. Caller must then call continueAfterBetting when street ends.
 */
export function applyAction(
  state: TableState,
  playerId: string,
  intent: PlayerActionIntent,
  runtime: HandRuntime,
): TableState {
  let s = cloneState(state);

  if (s.actingSeat === null) {
    throw new Error("No player to act");
  }
  const actor = getPlayerBySeat(s, s.actingSeat);
  if (!actor || actor.id !== playerId) {
    throw new Error("Not this player's turn");
  }

  const check = isActionLegal(s, intent);
  if (!check.ok) {
    throw new Error(check.reason);
  }

  const street =
    s.phase === "preflop" ||
    s.phase === "flop" ||
    s.phase === "turn" ||
    s.phase === "river"
      ? s.phase
      : "preflop";

  switch (intent.type) {
    case "fold": {
      actor.folded = true;
      log(s, street, actor.id, "fold");
      advanceActor(s);
      break;
    }
    case "check": {
      log(s, street, actor.id, "check");
      advanceActor(s);
      break;
    }
    case "call": {
      const toCall = Math.max(0, s.currentBet - actor.streetBet);
      const paid = commitChips(actor, toCall);
      refreshPot(s);
      log(s, street, actor.id, actor.allIn ? "all_in" : "call", paid);
      advanceActor(s);
      break;
    }
    case "bet":
    case "raise":
    case "all_in": {
      const target = intent.amount!;
      const add = target - actor.streetBet;
      if (add < 0) throw new Error("Invalid amount");
      const prevBet = s.currentBet;
      const paid = commitChips(actor, add);
      const newStreetBet = actor.streetBet;
      const raiseSize = newStreetBet - prevBet;
      const fullRaise =
        intent.type === "bet"
          ? newStreetBet >= s.config.bigBlind
          : newStreetBet >= minRaiseTo({ ...s, currentBet: prevBet });

      if (newStreetBet > s.currentBet) {
        if (fullRaise && raiseSize >= s.lastRaiseSize) {
          s.lastRaiseSize = Math.max(s.lastRaiseSize, raiseSize);
        }
        s.currentBet = newStreetBet;
        reopenAction(s, actor.seat, fullRaise && raiseSize >= (intent.type === "bet" ? s.config.bigBlind : s.lastRaiseSize));
        // After reopen, remove actor from pending (they've acted)
        removePending(s, actor.seat);
        if (s.pendingActSeats.length === 0) {
          s.actingSeat = null;
        } else {
          s.actingSeat = s.pendingActSeats[0]!;
        }
      } else {
        advanceActor(s);
      }
      refreshPot(s);
      log(
        s,
        street,
        actor.id,
        actor.allIn ? "all_in" : intent.type,
        paid,
      );
      break;
    }
  }

  // Early fold win
  if (contenders(s).length <= 1) {
    return awardFoldWin(s, contenders(s)[0]!);
  }

  if (bettingRoundComplete(s)) {
    return continueAfterBetting(s, runtime);
  }

  return bump(s);
}

export function getPublicState(
  state: TableState,
  viewerId: string | null,
): TableState {
  const clone = cloneState(state);
  for (const p of clone.players) {
    if (!p.holeCards) continue;
    const shownAtShowdown =
      (clone.phase === "hand_complete" ||
        clone.phase === "showdown" ||
        clone.phase === "game_complete") &&
      clone.showdown?.players.some((r) => r.playerId === p.id && r.shown);
    const reveal = p.id === viewerId || Boolean(shownAtShowdown);
    if (!reveal) {
      p.holeCards = null;
    }
  }
  return clone;
}

/**
 * Chip conservation invariant: stacks + pot (mid-hand pot chips are already
 * deducted from stacks; after hand_complete pot is zero and stacks include awards).
 */
export function chipTotal(state: TableState): number {
  const stacks = state.players.reduce((s, p) => s + p.stack, 0);
  return stacks + state.pot;
}

export function totalChipsOnTable(state: TableState): number {
  return chipTotal(state);
}

export { getLegalActions, isActionLegal, calculatePots, totalPotAmount };
export type { Card };
