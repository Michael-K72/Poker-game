import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-obsidian)] px-6">
      <Logo />
      <h1
        className="mt-8 text-2xl tracking-[0.2em] text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        SIGN IN
      </h1>
      <p className="mt-3 max-w-sm text-center text-sm text-[var(--color-titanium)]">
        Account auth, Google OAuth, and persistent bankroll are next. Guest bot
        play is available now.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/play"
          className="rounded-full bg-[var(--color-champagne)] px-8 py-3 text-center text-xs font-semibold tracking-[0.28em] text-[var(--color-obsidian)]"
        >
          PLAY AS GUEST
        </Link>
        <Link
          href="/"
          className="text-center text-xs tracking-[0.2em] text-[var(--color-titanium)]"
        >
          BACK
        </Link>
      </div>
    </main>
  );
}
