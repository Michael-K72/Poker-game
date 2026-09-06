"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ECONOMY, TABLE_THEMES, type Difficulty } from "@mk/shared";
import { Logo } from "@/components/brand/Logo";
import { BotTableSession } from "@/components/table/BotTableSession";

const PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8] as const;

export default function PlayPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [players, setPlayers] = useState<number>(4);
  const [started, setStarted] = useState(false);
  const theme = TABLE_THEMES[difficulty];

  const buyIn = useMemo(() => {
    if (difficulty === "easy") return 5_000;
    if (difficulty === "medium") return 10_000;
    if (difficulty === "hard") return 25_000;
    return 50_000;
  }, [difficulty]);

  if (started) {
    return (
      <BotTableSession
        difficulty={difficulty}
        playerCount={players}
        buyIn={buyIn}
        onExit={() => setStarted(false)}
      />
    );
  }

  return (
    <main className="min-h-dvh bg-[var(--color-obsidian)] px-5 py-6 md:px-10">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <span className="play-money-badge">Play as guest · temporary</span>
          <Link
            href="/"
            className="text-xs tracking-[0.2em] text-[var(--color-titanium)] hover:text-white"
          >
            BACK
          </Link>
        </div>
      </header>

      <section className="mx-auto mt-10 max-w-5xl">
        <p className="play-money-badge">Play vs bots</p>
        <h1
          className="mt-3 text-3xl tracking-[0.16em] text-white md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          TAKE YOUR SEAT
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--color-titanium)]">
          Guest progress lasts for this browser session only. Create an account
          later to keep your bankroll.
        </p>

        <div className="mt-10">
          <h2 className="text-xs tracking-[0.28em] text-[var(--color-champagne)]">
            SELECT TABLE
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(TABLE_THEMES) as Difficulty[]).map((key) => {
              const t = TABLE_THEMES[key];
              const active = key === difficulty;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDifficulty(key)}
                  className={`rounded-2xl border p-4 text-left transition metal-edge ${
                    active
                      ? "border-[var(--color-champagne)]/50 bg-white/5"
                      : "border-white/10 bg-black/20 hover:border-white/25"
                  }`}
                >
                  <div className="text-[0.65rem] tracking-[0.25em] text-[var(--color-champagne)]">
                    {t.difficulty}
                  </div>
                  <div
                    className="mt-2 text-lg tracking-[0.08em] text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t.name}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--color-titanium)]">
                    {t.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-xs tracking-[0.28em] text-[var(--color-champagne)]">
            PLAYERS
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {PLAYER_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPlayers(n)}
                className={`h-11 w-11 rounded-full border text-sm transition ${
                  players === n
                    ? "border-[var(--color-champagne)] bg-[var(--color-champagne)] text-[var(--color-obsidian)]"
                    : "border-white/15 text-[var(--color-platinum)] hover:border-white/35"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--color-titanium)]">
            You + {players - 1} bot{players - 1 === 1 ? "" : "s"} · Buy-in{" "}
            {buyIn.toLocaleString()} {ECONOMY.chipLabel}
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="rounded-full bg-[var(--color-champagne)] px-8 py-3.5 text-xs font-semibold tracking-[0.28em] text-[var(--color-obsidian)] transition hover:bg-[var(--color-champagne-bright)]"
          >
            ENTER {theme.name.toUpperCase()}
          </button>
          <Link
            href="/sign-in"
            className="text-center text-xs tracking-[0.18em] text-[var(--color-titanium)] hover:text-white"
          >
            Create an account to keep progress
          </Link>
        </div>
      </section>
    </main>
  );
}
