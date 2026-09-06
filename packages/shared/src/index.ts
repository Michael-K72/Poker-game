/** Product constants — play money only, no cash value. */

export const BRAND = {
  name: "MK Poker Royale",
  shortName: "MK Poker",
  monogram: "MK",
  tagline: "Private. Precise. Royal.",
  heroLine: "Read the table. Own the moment.",
  playMoneyNotice: "Play money only — no cash value",
} as const;

export const ECONOMY = {
  /** Persistent bot/practice starting bankroll (registered). */
  defaultBankroll: 50_000,
  /** Guest session starting chips. */
  guestBankroll: 50_000,
  /** Always-available practice bankroll reset target. */
  bankrollResetAmount: 50_000,
  chipLabel: "MK Chips",
} as const;

export const TABLE_THEMES = {
  easy: {
    id: "easy",
    difficulty: "EASY",
    name: "The Lounge",
    description: "Warm amber light. Learn the rhythm.",
  },
  medium: {
    id: "medium",
    difficulty: "MEDIUM",
    name: "Obsidian Club",
    description: "Graphite felt. Measured aggression.",
  },
  hard: {
    id: "hard",
    difficulty: "HARD",
    name: "Eclipse",
    description: "Cold steel. No free cards.",
  },
  expert: {
    id: "expert",
    difficulty: "EXPERT",
    name: "The Royale Vault",
    description: "Midnight pressure. Precision only.",
  },
} as const;

export const ROOM_PRESETS = {
  startingStacks: [5_000, 10_000, 25_000, 50_000, 100_000] as const,
  blinds: [
    { sb: 25, bb: 50 },
    { sb: 50, bb: 100 },
    { sb: 100, bb: 200 },
    { sb: 250, bb: 500 },
  ] as const,
  actionTimers: [15, 30, 45, 60] as const,
  seats: [2, 3, 4, 5, 6, 7, 8] as const,
} as const;

export type Difficulty = keyof typeof TABLE_THEMES;
