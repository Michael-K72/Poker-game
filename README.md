# MK Poker Royale

Premium play-money **No-Limit Texas Hold'em** platform.

**PRIVATE. PRECISE. ROYAL.**  
Play money only — no cash value.

## Architecture

```
apps/web            Next.js frontend (Vercel-ready)
apps/game-server    Persistent realtime authoritative game server
packages/poker-engine   Pure NLHE rules engine (no UI)
packages/shared     Shared types & constants
```

- **Server-authoritative** online play (clients send intents only)
- **Cryptographic shuffle** for online decks
- **Bot / practice** bankroll separate from private-room stacks
- **No public tables / matchmaking** — private friends only

## Requirements

- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
cp .env.example apps/web/.env.local
# set BETTER_AUTH_SECRET to a long random string
pnpm test:engine
pnpm dev:web
```

Open http://localhost:3000

### Auth security

- Email + password registration / sign-in
- Passwords hashed with **Argon2id** (never stored as plaintext)
- Sessions via HttpOnly cookies (Better Auth)
- Local SQLite DB at `apps/web/data/mk-poker.db` (gitignored)
- Email addresses are not exposed to other players

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm test:engine` | Poker engine unit tests |
| `pnpm build` | Build all packages |
| `pnpm dev:web` | Frontend only |
| `pnpm dev:game` | Realtime game server |

## Environment

Copy `.env.example` when present. Never commit secrets.

## License

Private / proprietary — MK Poker Royale.
