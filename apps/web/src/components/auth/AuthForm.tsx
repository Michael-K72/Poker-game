"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { authClient } from "@/lib/auth-client";

type Mode = "signin" | "register";

function passwordScore(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Strong"];
  return { score, label: labels[score] ?? "Weak" };
}

export function AuthForm({ initialMode = "signin" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordScore(password), [password]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        if (!accept) {
          setError("Please acknowledge the play-money terms.");
          return;
        }
        if (password !== confirm) {
          setError("Passwords do not match.");
          return;
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        const { error: signUpError } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: nickname.trim(),
          username: nickname.trim(),
        });
        if (signUpError) {
          setError(signUpError.message ?? "Could not create account.");
          return;
        }
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const { error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("Invalid email or password.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-obsidian)] px-6 py-10">
      <Logo />
      <p className="play-money-badge mt-6">Play money only — no cash value</p>
      <h1
        className="mt-4 text-2xl tracking-[0.2em] text-white"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
      </h1>
      <p className="mt-3 max-w-sm text-center text-sm text-[var(--color-titanium)]">
        Passwords are hashed with Argon2id and never stored in plaintext.
        Email addresses stay private.
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
          className={`rounded-full px-4 py-2 text-[0.65rem] tracking-[0.2em] ${
            mode === "signin"
              ? "bg-[var(--color-champagne)] text-[var(--color-obsidian)]"
              : "border border-white/15 text-[var(--color-titanium)]"
          }`}
        >
          SIGN IN
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`rounded-full px-4 py-2 text-[0.65rem] tracking-[0.2em] ${
            mode === "register"
              ? "bg-[var(--color-champagne)] text-[var(--color-obsidian)]"
              : "border border-white/15 text-[var(--color-titanium)]"
          }`}
        >
          REGISTER
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-8 w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-black/30 p-6 metal-edge"
      >
        {mode === "register" ? (
          <label className="block text-left">
            <span className="text-[0.65rem] tracking-[0.2em] text-[var(--color-titanium)]">
              NICKNAME
            </span>
            <input
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_]+"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-champagne)]/50"
              autoComplete="username"
            />
          </label>
        ) : null}

        <label className="block text-left">
          <span className="text-[0.65rem] tracking-[0.2em] text-[var(--color-titanium)]">
            EMAIL
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-champagne)]/50"
            autoComplete="email"
          />
        </label>

        <label className="block text-left">
          <span className="text-[0.65rem] tracking-[0.2em] text-[var(--color-titanium)]">
            PASSWORD
          </span>
          <div className="relative mt-1">
            <input
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 pr-16 text-sm text-white outline-none focus:border-[var(--color-champagne)]/50"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.6rem] tracking-[0.15em] text-[var(--color-titanium)]"
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>
          {mode === "register" && password ? (
            <p className="mt-1 text-xs text-[var(--color-titanium)]">
              Strength: {strength.label}
            </p>
          ) : null}
        </label>

        {mode === "register" ? (
          <>
            <label className="block text-left">
              <span className="text-[0.65rem] tracking-[0.2em] text-[var(--color-titanium)]">
                CONFIRM PASSWORD
              </span>
              <input
                required
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[var(--color-champagne)]/50"
                autoComplete="new-password"
              />
            </label>
            <label className="flex items-start gap-3 text-left text-xs text-[var(--color-titanium)]">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I understand this is play money only with no cash value, and I
                accept the privacy practices for account data.
              </span>
            </label>
          </>
        ) : null}

        {error ? (
          <p className="text-sm text-[#e07a7a]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--color-champagne)] py-3.5 text-xs font-semibold tracking-[0.28em] text-[var(--color-obsidian)] disabled:opacity-50"
        >
          {loading
            ? "PLEASE WAIT…"
            : mode === "signin"
              ? "SIGN IN"
              : "CREATE ACCOUNT"}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          href="/play"
          className="text-xs tracking-[0.18em] text-[var(--color-titanium)] hover:text-white"
        >
          PLAY AS GUEST
        </Link>
        <Link
          href="/"
          className="text-xs tracking-[0.18em] text-[var(--color-titanium)] hover:text-white"
        >
          BACK
        </Link>
      </div>
    </main>
  );
}
