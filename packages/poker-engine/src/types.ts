/** Shared poker domain types for No-Limit Texas Hold'em. */

export type Suit = "c" | "d" | "h" | "s";

/** Rank: 2–14 where 14 = Ace */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type HandCategory =
  | "high_card"
  | "one_pair"
  | "two_pair"
  | "three_of_a_kind"
  | "straight"
  | "flush"
  | "full_house"
  | "four_of_a_kind"
  | "straight_flush"
  | "royal_flush";

export interface EvaluatedHand {
  category: HandCategory;
  /** Higher is better. Encodes category + kickers for lexicographic compare. */
  rankValue: number;
  /** Best five cards contributing to the hand (display order). */
  cards: Card[];
  name: string;
}

export type GamePhase =
  | "waiting"
  | "starting_hand"
  | "posting_blinds"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "hand_complete"
  | "game_complete";

export type PlayerActionType =
  | "fold"
  | "check"
  | "call"
  | "bet"
  | "raise"
  | "all_in";

export interface PlayerActionIntent {
  type: PlayerActionType;
  /** Absolute chip amount for bet/raise (total contribution this street), or all-in amount. */
  amount?: number;
  /** Client-generated idempotency key. */
  actionId?: string;
}

export interface LegalAction {
  type: PlayerActionType;
  /** For call: chips needed to match. For bet/raise: min absolute street total. */
  minAmount?: number;
  maxAmount?: number;
  /** Chips required to call (convenience). */
  callAmount?: number;
}

export interface SidePot {
  amount: number;
  /** Player ids eligible to win this pot. */
  eligiblePlayerIds: string[];
}

export interface PotBreakdown {
  mainPot: SidePot;
  sidePots: SidePot[];
  /** Flattened pots from main → outer side pots. */
  pots: SidePot[];
}

export interface SeatPlayer {
  id: string;
  name: string;
  seat: number;
  stack: number;
  /** Contribution on the current betting street. */
  streetBet: number;
  /** Total contribution this hand (all streets). */
  handContributed: number;
  holeCards: Card[] | null;
  folded: boolean;
  allIn: boolean;
  eliminated: boolean;
  /** Seat reserved for reconnect grace. */
  disconnected: boolean;
  isBot: boolean;
}

export interface HandPlayerResult {
  playerId: string;
  hand?: EvaluatedHand;
  won: number;
  shown: boolean;
  mucked: boolean;
}

export interface ShowdownResult {
  pots: Array<{
    amount: number;
    winnerIds: string[];
    amountPerWinner: number;
    oddChipWinnerId?: string;
  }>;
  players: HandPlayerResult[];
}

export interface TableConfig {
  smallBlind: number;
  bigBlind: number;
  /** Max seats 2–8 */
  maxSeats: number;
}

export interface TableState {
  phase: GamePhase;
  handNumber: number;
  dealerSeat: number;
  smallBlindSeat: number | null;
  bigBlindSeat: number | null;
  communityCards: Card[];
  pot: number;
  /** Current highest street bet (absolute chips committed this street). */
  currentBet: number;
  /** Size of the last full raise increment this street (for min-raise). */
  lastRaiseSize: number;
  /** Seat index whose turn it is, or null. */
  actingSeat: number | null;
  /** Players who still need to act this street (seat indices). */
  pendingActSeats: number[];
  players: SeatPlayer[];
  /** Blind / street action log for history/replayer. */
  actionLog: HandActionRecord[];
  showdown?: ShowdownResult;
  stateVersion: number;
  config: TableConfig;
}

export interface HandActionRecord {
  handNumber: number;
  street: "blinds" | "preflop" | "flop" | "turn" | "river" | "showdown";
  playerId: string | null;
  type: string;
  amount?: number;
  timestamp: number;
}

/** Secure RNG interface — online must use crypto; bots/tests may inject. */
export interface RandomSource {
  /** Uniform integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}
