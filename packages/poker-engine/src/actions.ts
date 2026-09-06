import type {
  LegalAction,
  PlayerActionIntent,
  SeatPlayer,
  TableState,
} from "./types.js";

export function activePlayers(state: TableState): SeatPlayer[] {
  return state.players.filter((p) => !p.eliminated);
}

export function contenders(state: TableState): SeatPlayer[] {
  return activePlayers(state).filter((p) => !p.folded);
}

export function playersWhoCanAct(state: TableState): SeatPlayer[] {
  return contenders(state).filter((p) => !p.allIn && p.stack > 0);
}

export function getPlayerBySeat(
  state: TableState,
  seat: number,
): SeatPlayer | undefined {
  return state.players.find((p) => p.seat === seat);
}

export function getPlayerById(
  state: TableState,
  id: string,
): SeatPlayer | undefined {
  return state.players.find((p) => p.id === id);
}

/**
 * Minimum raise TO amount (absolute street contribution), per NLHE rules.
 * lastRaiseSize is the last full raise increment (usually bigBlind at street start).
 */
export function minRaiseTo(state: TableState): number {
  return state.currentBet + state.lastRaiseSize;
}

export function getLegalActions(state: TableState): LegalAction[] {
  if (state.actingSeat === null) return [];
  const player = getPlayerBySeat(state, state.actingSeat);
  if (!player || player.folded || player.allIn || player.eliminated) return [];

  const toCall = Math.max(0, state.currentBet - player.streetBet);
  const actions: LegalAction[] = [{ type: "fold" }];

  if (toCall === 0) {
    actions.push({ type: "check" });
    if (player.stack > 0) {
      const minBet = Math.min(
        player.stack + player.streetBet,
        Math.max(state.config.bigBlind, state.lastRaiseSize),
      );
      // Opening bet: min is big blind (or lastRaiseSize which starts as BB)
      const minTo = Math.min(player.streetBet + player.stack, Math.max(state.config.bigBlind, state.currentBet + state.lastRaiseSize > 0 ? state.config.bigBlind : state.config.bigBlind));
      const openMin = Math.min(player.streetBet + player.stack, state.config.bigBlind);
      const maxTo = player.streetBet + player.stack;
      if (maxTo > player.streetBet) {
        if (player.stack <= openMin || openMin >= maxTo) {
          actions.push({
            type: "all_in",
            minAmount: maxTo,
            maxAmount: maxTo,
          });
        } else {
          actions.push({
            type: "bet",
            minAmount: openMin,
            maxAmount: maxTo,
          });
          actions.push({
            type: "all_in",
            minAmount: maxTo,
            maxAmount: maxTo,
          });
        }
      }
      void minBet;
      void minTo;
    }
  } else {
    const callChips = Math.min(toCall, player.stack);
    if (callChips >= player.stack) {
      actions.push({
        type: "all_in",
        minAmount: player.streetBet + player.stack,
        maxAmount: player.streetBet + player.stack,
        callAmount: player.stack,
      });
    } else {
      actions.push({
        type: "call",
        callAmount: callChips,
        minAmount: player.streetBet + callChips,
        maxAmount: player.streetBet + callChips,
      });

      const maxTo = player.streetBet + player.stack;
      const raiseToMin = minRaiseTo(state);
      if (maxTo > state.currentBet) {
        if (maxTo < raiseToMin) {
          // Short all-in raise — allowed but does not reopen full raise for prior actors in some rules;
          // we still expose all-in.
          actions.push({
            type: "all_in",
            minAmount: maxTo,
            maxAmount: maxTo,
          });
        } else {
          actions.push({
            type: "raise",
            minAmount: raiseToMin,
            maxAmount: maxTo,
          });
          if (maxTo > raiseToMin) {
            actions.push({
              type: "all_in",
              minAmount: maxTo,
              maxAmount: maxTo,
            });
          } else {
            actions.push({
              type: "all_in",
              minAmount: maxTo,
              maxAmount: maxTo,
            });
          }
        }
      }
    }
  }

  // Deduplicate by type (keep richer raise/bet)
  const byType = new Map<string, LegalAction>();
  for (const a of actions) {
    const existing = byType.get(a.type);
    if (!existing) byType.set(a.type, a);
    else byType.set(a.type, a);
  }
  return [...byType.values()];
}

export function isActionLegal(
  state: TableState,
  intent: PlayerActionIntent,
): { ok: true } | { ok: false; reason: string } {
  const legal = getLegalActions(state);
  const match = legal.find((a) => a.type === intent.type);
  if (!match) {
    return { ok: false, reason: `Action ${intent.type} is not legal` };
  }

  if (
    intent.type === "bet" ||
    intent.type === "raise" ||
    intent.type === "all_in"
  ) {
    const amount = intent.amount;
    if (amount === undefined) {
      return { ok: false, reason: "Amount required" };
    }
    if (match.minAmount !== undefined && amount < match.minAmount) {
      return { ok: false, reason: `Amount below minimum (${match.minAmount})` };
    }
    if (match.maxAmount !== undefined && amount > match.maxAmount) {
      return { ok: false, reason: `Amount above maximum (${match.maxAmount})` };
    }
  }

  if (intent.type === "call" && match.callAmount !== undefined) {
    // call amount is fixed; ignore client amount
  }

  return { ok: true };
}
