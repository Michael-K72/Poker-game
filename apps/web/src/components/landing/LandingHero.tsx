"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@mk/shared";

export function LandingHero() {
  const reduce = useReducedMotion();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[var(--color-obsidian)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 35%, rgba(126,182,214,0.08), transparent 55%), radial-gradient(ellipse 60% 40% at 50% 80%, rgba(198,167,94,0.06), transparent 50%), linear-gradient(180deg, #050608 0%, #0a0e16 45%, #050608 100%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(214,217,226,0.08) 0.6px, transparent 0.6px)",
          backgroundSize: "3px 3px",
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 40%, black, transparent)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Logo />
        <div className="flex items-center gap-3">
          <p className="play-money-badge hidden sm:block">
            {BRAND.playMoneyNotice}
          </p>
          <Link
            href="/sign-in"
            className="rounded-full border border-white/10 px-4 py-2 text-xs tracking-[0.2em] text-[var(--color-platinum)] transition hover:border-[var(--color-champagne)]/40 hover:text-white"
          >
            SIGN IN
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col items-center justify-center px-6 pb-16 pt-4 text-center">
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-[42%] h-[min(52vw,420px)] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[var(--color-champagne)]/20"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(28,58,46,0.55) 0%, rgba(10,14,22,0.2) 55%, transparent 70%)",
            boxShadow:
              "inset 0 0 60px rgba(198,167,94,0.08), 0 0 80px rgba(0,0,0,0.5)",
          }}
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />

        <motion.div
          aria-hidden
          className="absolute left-1/2 top-[36%] flex -translate-x-1/2 gap-3"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <CardGhost rotate={-12} />
          <CardGhost rotate={8} delay={0.1} />
        </motion.div>

        <motion.p
          className="play-money-badge relative mb-6"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {BRAND.playMoneyNotice}
        </motion.p>

        <motion.h1
          className="relative text-balance text-4xl tracking-[0.18em] text-white sm:text-5xl md:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          MK POKER ROYALE
        </motion.h1>

        <motion.p
          className="relative mt-5 max-w-md text-sm tracking-[0.12em] text-[var(--color-titanium)] sm:text-base"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
        >
          {BRAND.heroLine}
        </motion.p>

        <motion.div
          className="relative mt-10 flex flex-col items-center gap-3 sm:flex-row"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.6 }}
        >
          <Link
            href="/play"
            className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-[var(--color-champagne)] px-8 py-3.5 text-xs font-semibold tracking-[0.28em] text-[var(--color-obsidian)] transition hover:bg-[var(--color-champagne-bright)]"
          >
            PLAY NOW
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex min-w-[200px] items-center justify-center rounded-full border border-white/15 px-8 py-3.5 text-xs tracking-[0.28em] text-[var(--color-platinum)] transition hover:border-white/35"
          >
            SIGN IN
          </Link>
        </motion.div>

        <p className="relative mt-10 text-[0.65rem] tracking-[0.35em] text-[var(--color-titanium)]">
          {BRAND.tagline.toUpperCase()}
        </p>
      </section>
    </main>
  );
}

function CardGhost({
  rotate,
  delay = 0,
}: {
  rotate: number;
  delay?: number;
}) {
  return (
    <motion.div
      className="h-28 w-[4.5rem] rounded-xl border border-white/15 bg-gradient-to-br from-[#1a1f2a] to-[#0a0e16] shadow-2xl sm:h-36 sm:w-24"
      style={{ rotate }}
      animate={{ y: [0, -6, 0] }}
      transition={{
        delay,
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 rounded-full border border-[var(--color-champagne)]/40" />
      </div>
    </motion.div>
  );
}
