import type { Difficulty } from "@mk/shared";
import type {
  LegalAction,
  PlayerActionIntent,
  RandomSource,
  TableState,
} from "@mk/poker-engine";
import {
  applyAction,
  createTable,
  getLegalActions,
  getPlayerBySeat,
  mathRandomSource,
  startHand,
} from "@mk/poker-engine";

export type BotPersonality =
  | "tight"
  | "loose"
  | "aggressive"
  | "passive"
  | "tricky"
  | "balanced";

export interface BotProfile {
  id: string;
  name: string;
  personality: BotPersonality;
  difficulty: Difficulty;
}

const BOT_NAMES = [
  "Vesper",
  "Ashcroft",
  "Noir",
  "Celeste",
  "Quill",
  "Mercer",
  "Solenne",
  "Drake",
  "Ivory",
  "Rhys",
] as const;

const PERSONALITIES: BotPersonality[] = [
  "tight",
  "loose",
  "aggressive",
  "passive",
  "tricky",
  "balanced",
];

export function createBotProfiles(
  count: number,
  difficulty: Difficulty,
): BotProfile[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `bot-${i + 1}`,
    name: BOT_NAMES[i % BOT_NAMES.length]!,
    personality: PERSONALITIES[i % PERSONALITIES.length]!,
    difficulty,
  }));
}

function personalityBias(p: BotPersonality): {
  fold: number;
  call: number;
  raise: number;
} {
  switch (p) {
    case "tight":
      return { fold: 0.35, call: 0.45, raise: 0.2 };
    case "loose":
      return { fold: 0.15, call: 0.5, raise: 0.35 };
    case "aggressive":
      return { fold: 0.2, call: 0.25, raise: 0.55 };
    case "passive":
      return { fold: 0.25, call: 0.6, raise: 0.15 };
    case "tricky":
      return { fold: 0.22, call: 0.33, raise: 0.45 };
    default:
      return { fold: 0.25, call: 0.4, raise: 0.35 };
  }
}

function difficultyNoise(d: Difficulty): number {
  switch (d) {
    case "easy":
      return 0.35;
    case "medium":
      return 0.2;
    case "hard":
      return 0.1;
    case "expert":
      return 0.05;
  }
}

function pickWeighted(
  rng: RandomSource,
  weights: Array<{ action: LegalAction; w: number }>,
): LegalAction {
  const total = weights.reduce((s, x) => s + x.w, 0);
  let r = (rng.nextInt(1000) / 1000) * total;
  for (const item of weights) {
    r -= item.w;
    if (r <= 0) return item.action;
  }
  return weights[weights.length - 1]!.action;
}

/**
 * Fair bot decision — only uses public state + own hole cards via legal actions.
 * Never receives opponent hole cards or undealt deck.
 */
export function chooseBotAction(
  state: TableState,
  bot: BotProfile,
  rng: RandomSource = mathRandomSource(),
): PlayerActionIntent {
  const legal = getLegalActions(state);
  if (legal.length === 0) {
    return { type: "fold" };
  }

  const bias = personalityBias(bot.personality);
  const noise = difficultyNoise(bot.difficulty);

  const check = legal.find((a) => a.type === "check");
  const call = legal.find((a) => a.type === "call");
  const fold = legal.find((a) => a.type === "fold");
  const bet = legal.find((a) => a.type === "bet");
  const raise = legal.find((a) => a.type === "raise");
  const allIn = legal.find((a) => a.type === "all_in");

  if (check && rng.nextInt(100) < 55 + (bot.difficulty === "easy" ? 15 : 0)) {
    return { type: "check" };
  }

  const weights: Array<{ action: LegalAction; w: number }> = [];
  if (fold) weights.push({ action: fold, w: bias.fold + noise });
  if (check) weights.push({ action: check, w: bias.call });
  if (call) weights.push({ action: call, w: bias.call + 0.1 });
  if (bet) weights.push({ action: bet, w: bias.raise });
  if (raise) weights.push({ action: raise, w: bias.raise });
  if (allIn && bot.difficulty !== "easy") {
    weights.push({ action: allIn, w: bias.raise * 0.15 });
  }

  if (weights.length === 0) {
    return { type: legal[0]!.type, amount: legal[0]!.minAmount };
  }

  const chosen = pickWeighted(rng, weights);

  if (chosen.type === "bet" || chosen.type === "raise") {
    const min = chosen.minAmount ?? state.config.bigBlind;
    const max = chosen.maxAmount ?? min;
    const span = Math.max(0, max - min);
    const factor =
      bot.difficulty === "expert"
        ? 0.45 + rng.nextInt(40) / 100
        : bot.difficulty === "hard"
          ? 0.35 + rng.nextInt(40) / 100
          : 0.2 + rng.nextInt(30) / 100;
    const amount = Math.min(
      max,
      Math.max(min, Math.floor(min + span * factor)),
    );
    return { type: chosen.type, amount };
  }

  if (chosen.type === "all_in") {
    return { type: "all_in", amount: chosen.maxAmount };
  }

  return { type: chosen.type };
}

/** Random human-like think time (ms), capped under the action timer. */
export function botThinkDelayMs(
  bot: BotProfile,
  actionTimerSec: number,
  rng: RandomSource = mathRandomSource(),
): number {
  const personalityPad: Record<BotPersonality, [number, number]> = {
    aggressive: [600, 2200],
    passive: [1200, 4000],
    tight: [1400, 4500],
    loose: [700, 2800],
    tricky: [1500, 5200],
    balanced: [900, 3500],
  };
  const difficultyPad: Record<Difficulty, number> = {
    easy: 0,
    medium: 400,
    hard: 800,
    expert: 1200,
  };
  const [lo, hi] = personalityPad[bot.personality];
  const span = Math.max(200, hi - lo);
  const base = lo + rng.nextInt(span) + difficultyPad[bot.difficulty];
  // Leave headroom so bots usually act before the hard timer
  const maxMs = Math.max(800, (actionTimerSec - 2) * 1000);
  return Math.min(base, maxMs);
}

export function createBotTable(options: {
  humanName?: string;
  playerCount: number;
  difficulty: Difficulty;
  buyIn: number;
  smallBlind?: number;
  bigBlind?: number;
}): { state: TableState; bots: BotProfile[]; humanId: string } {
  const { playerCount, difficulty, buyIn } = options;
  if (playerCount < 2 || playerCount > 8) {
    throw new Error("playerCount must be 2–8");
  }

  const bots = createBotProfiles(playerCount - 1, difficulty);
  const humanId = "human";
  const blinds =
    difficulty === "easy"
      ? { sb: 25, bb: 50 }
      : difficulty === "medium"
        ? { sb: 50, bb: 100 }
        : difficulty === "hard"
          ? { sb: 100, bb: 200 }
          : { sb: 250, bb: 500 };

  const players = [
    {
      id: humanId,
      name: options.humanName ?? "You",
      seat: 0,
      stack: buyIn,
      isBot: false,
    },
    ...bots.map((b, i) => ({
      id: b.id,
      name: b.name,
      seat: i + 1,
      stack: buyIn,
      isBot: true,
    })),
  ];

  const state = createTable({
    config: {
      smallBlind: options.smallBlind ?? blinds.sb,
      bigBlind: options.bigBlind ?? blinds.bb,
      maxSeats: playerCount,
    },
    players,
    dealerSeat: 0,
  });

  return { state, bots, humanId };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BotAdvanceOptions = {
  actionTimerSec?: number;
  /** Abort when generation changes (user acted / left). */
  shouldCancel?: () => boolean;
  onState?: (state: TableState) => void;
  maxSteps?: number;
};

/**
 * Advance bot seats one-by-one with human-like pauses.
 */
export async function advanceBotsUntilHumanOrEnd(
  state: TableState,
  runtime: { deck: import("@mk/poker-engine").Deck },
  bots: BotProfile[],
  humanId: string,
  rng: RandomSource = mathRandomSource(),
  options: BotAdvanceOptions = {},
): Promise<TableState> {
  const actionTimerSec = options.actionTimerSec ?? 20;
  const maxSteps = options.maxSteps ?? 64;
  let s = state;
  let steps = 0;

  while (
    steps < maxSteps &&
    s.phase !== "hand_complete" &&
    s.phase !== "game_complete" &&
    s.actingSeat !== null
  ) {
    if (options.shouldCancel?.()) break;

    const actor = getPlayerBySeat(s, s.actingSeat);
    if (!actor) break;
    if (actor.id === humanId) break;

    const bot = bots.find((b) => b.id === actor.id);
    if (!bot) break;

    options.onState?.(s);
    const delay = botThinkDelayMs(bot, actionTimerSec, rng);
    await sleep(delay);
    if (options.shouldCancel?.()) break;

    const intent = chooseBotAction(s, bot, rng);
    s = applyAction(s, actor.id, intent, runtime);
    options.onState?.(s);
    steps += 1;
  }

  return s;
}

export async function startBotHand(
  state: TableState,
  bots: BotProfile[],
  humanId: string,
  rng: RandomSource = mathRandomSource(),
  options: BotAdvanceOptions = {},
) {
  const started = startHand(state, rng);
  const advanced = await advanceBotsUntilHumanOrEnd(
    started.state,
    started.runtime,
    bots,
    humanId,
    rng,
    options,
  );
  return { state: advanced, runtime: started.runtime };
}

/** Timeout policy: check if legal, otherwise fold. */
export function timeoutAction(state: TableState): PlayerActionIntent {
  const legal = getLegalActions(state);
  if (legal.some((a) => a.type === "check")) {
    return { type: "check" };
  }
  return { type: "fold" };
}
