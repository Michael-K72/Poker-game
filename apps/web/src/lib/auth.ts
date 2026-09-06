import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { argon2id } from "hash-wasm";
import { randomBytes } from "node:crypto";
import { db, ensureAuthSchema } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { ECONOMY } from "@mk/shared";

/**
 * Argon2id hashing (OWASP-recommended).
 * Format: argon2id$m=19456,t=2,p=1$<salt_b64>$<hash_b64>
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: "binary",
  });
  return `argon2id$m=19456,t=2,p=1$${salt.toString("base64")}$${Buffer.from(hash).toString("base64")}`;
}

async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    const parts = hash.split("$");
    if (parts.length !== 4 || parts[0] !== "argon2id") return false;
    const params = parts[1]!;
    const salt = Buffer.from(parts[2]!, "base64");
    const expected = Buffer.from(parts[3]!, "base64");
    const m = Number(/m=(\d+)/.exec(params)?.[1] ?? 19456);
    const t = Number(/t=(\d+)/.exec(params)?.[1] ?? 2);
    const p = Number(/p=(\d+)/.exec(params)?.[1] ?? 1);
    const actual = await argon2id({
      password,
      salt,
      parallelism: p,
      iterations: t,
      memorySize: m,
      hashLength: expected.length,
      outputType: "binary",
    });
    const actualBuf = Buffer.from(actual);
    if (actualBuf.length !== expected.length) return false;
    // timing-safe compare
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected[i]! ^ actualBuf[i]!;
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: false,
    password: {
      hash: hashPassword,
      verify: async ({ hash, password }) => verifyPassword(hash, password),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 24,
      usernameValidator: (value) =>
        /^[a-zA-Z0-9_]+$/.test(value) &&
        !["admin", "root", "system", "dealer", "mk"].includes(
          value.toLowerCase(),
        ),
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (created) => {
          await ensureAuthSchema();
          const now = new Date();
          await db.insert(schema.profile).values({
            userId: created.id,
            bankroll: ECONOMY.defaultBankroll,
            level: 1,
            xp: 0,
            handsPlayed: 0,
            handsWon: 0,
            createdAt: now,
            updatedAt: now,
          });
        },
      },
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ],
});

export type Session = typeof auth.$Infer.Session;
