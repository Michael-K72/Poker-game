import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-obsidian)] px-6 text-center">
      <Logo variant="mark" />
      <h1
        className="mt-8 text-2xl tracking-[0.25em] text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        TABLE NOT FOUND
      </h1>
      <p className="mt-3 text-sm text-[var(--color-titanium)]">
        This seat doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-white/20 px-6 py-3 text-xs tracking-[0.25em] text-[var(--color-platinum)]"
      >
        RETURN TO LOBBY
      </Link>
    </main>
  );
}
