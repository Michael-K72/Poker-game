import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Logo } from "@/components/brand/Logo";
import { auth } from "@/lib/auth";
import { db, ensureAuthSchema } from "@/lib/db";
import { profile } from "@/lib/db/schema";
import { ECONOMY } from "@mk/shared";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await ensureAuthSchema();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/sign-in");
  }

  const rows = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, session.user.id))
    .limit(1);
  const p = rows[0];

  const nickname =
    // username plugin field if present
    (session.user as { username?: string | null }).username ??
    session.user.name;

  return (
    <main className="min-h-dvh bg-[var(--color-obsidian)] px-6 py-8 md:px-10">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="play-money-badge hidden sm:inline">
            {ECONOMY.chipLabel} · no cash value
          </span>
          <SignOutButton />
        </div>
      </header>

      <section className="mx-auto mt-12 max-w-5xl">
        <p className="text-sm text-[var(--color-titanium)]">Welcome back,</p>
        <h1
          className="mt-2 text-3xl tracking-[0.14em] text-white md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {nickname}
        </h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat
            label="BANKROLL"
            value={(p?.bankroll ?? ECONOMY.defaultBankroll).toLocaleString()}
          />
          <Stat label="LEVEL" value={String(p?.level ?? 1)} />
          <Stat label="XP" value={(p?.xp ?? 0).toLocaleString()} />
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/play"
            className="rounded-full bg-[var(--color-champagne)] px-8 py-3.5 text-center text-xs font-semibold tracking-[0.28em] text-[var(--color-obsidian)]"
          >
            PLAY VS BOTS
          </Link>
          <Link
            href="/play"
            className="rounded-full border border-white/15 px-8 py-3.5 text-center text-xs tracking-[0.28em] text-[var(--color-platinum)]"
          >
            PRIVATE ONLINE GAME
          </Link>
        </div>
        <p className="mt-4 text-xs text-[var(--color-titanium)]">
          Private online rooms arrive in the next build phase. Your account and
          bankroll are already saved securely.
        </p>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5 metal-edge">
      <p className="text-[0.65rem] tracking-[0.25em] text-[var(--color-champagne)]">
        {label}
      </p>
      <p
        className="mt-2 text-2xl text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}
