"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      className="rounded-full border border-white/15 px-4 py-2 text-[0.65rem] tracking-[0.2em] text-[var(--color-titanium)] hover:text-white"
    >
      SIGN OUT
    </button>
  );
}
