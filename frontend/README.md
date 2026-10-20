# Word Bomb — frontend

Next.js 14 app plus the PartyKit realtime server. See the [root README](../README.md) for gameplay,
architecture and deployment; this file covers the details specific to working in this directory.

## Setup

```powershell
cd frontend
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
GROQ_API_KEY=your_groq_api_key_here   # optional — AI mode
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server on :3000 |
| `npm run party:dev` | PartyKit dev server on :1999 |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit`, including `party/index.ts` and the tests |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm test` | `node:test` suites, run through `tsx` |
| `npm run party:check` | Bundles the PartyKit entrypoint the way a deploy does |
| `npm run check` | All of the above gates in one command |

Both servers must be running to play locally. `partykit dev` loads `.env.local` itself, so the Groq
key works in development with no extra setup.

## Layout

```
app/          Next.js App Router — pages, metadata, generated icons and social card
components/   LandingPage, GameRoom, room/ (lobby, settings, game, results), ui/ (Fuse, Token, Icon)
hooks/        usePartySocket (transport, clock sync, connection status), useFuseMood
lib/          game-logic (pure rules, shared with the server), syllables, wordlist,
              ai-service, avatars, fuse-moods
party/        PartyKit server — the authoritative game loop
tests/        node:test suites
types/game.ts The wire contract, imported by both the client and the server
scripts/      Build checks
```

## Notes

### The server is authoritative

`party/index.ts` owns turn order, timers, validation and settings bounds. It imports the same
`types/game.ts` the browser does, so a change to a message shape is a compile error on both sides.

Turn position is tracked by **player id**, not by an index into the list of surviving players.
Indexing into that filtered list shifted the rotation on every elimination and skipped a player.

Only one word may be in flight per turn (`resolving`), and every async operation captures a
`turnToken` it re-checks on resume, so a slow dictionary lookup can never resolve into a turn that
has already ended.

### `sessionId` is server-only

It is the reconnection credential. Broadcasting it would let any player replay another player's
identity, so it is stripped in `publicState()` and never leaves the worker.

### Word validation

The Free Dictionary API is primary, with a 3.5s timeout and a per-room result cache. On timeout or
network failure it falls back to `lib/wordlist.ts`.

`lib/syllables.ts` filters the syllable bank at module load to those with at least
`MIN_OFFLINE_ANSWERS` words in that fallback list, which makes an unanswerable round impossible by
construction. `tests/content.test.ts` asserts the invariant.

### AI opponents

`lib/ai-service.ts` calls Groq (`openai/gpt-oss-120b`) over plain `fetch`. It is a reasoning model,
so `max_completion_tokens` must be generous — reasoning tokens count against the budget, and a small
value returns empty content.

**`GROQ_API_KEY` belongs to the PartyKit deployment, not Vercel:**

```powershell
npx partykit env add GROQ_API_KEY
```

The AI service runs inside the worker. A key set only in the Vercel dashboard is never read, and
every AI move falls back to the offline list.

### Windows

`npm run party:dev` uses the pinned `partykit` dependency rather than `npx partykit@latest`, so dev,
CI and deploy all run the same version.

## Customising

**Player tokens** — `lib/avatars.ts`. A token is an ink colour and a shape (disc or square); the
letter on it is the player's initial. Add an entry to `INKS` to offer another colour.

**Default settings** — `types/game.ts` (`DEFAULT_ROOM_SETTINGS`). The permitted ranges live in
`SETTINGS_BOUNDS` in `lib/game-logic.ts` and are enforced server-side.

**FUSE the mascot** — see [FUSE.md](./FUSE.md).

## License

MIT.
