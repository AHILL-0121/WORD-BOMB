# Word Bomb 💣

A real-time multiplayer word game built with Next.js 14 and PartyKit. Players race against the
clock to find valid English words containing a random syllable. Last player standing wins.

## 🎮 Features

- **Real-time multiplayer** — 2–16 players per room (8 by default)
- **Server-authoritative gameplay** — every rule is enforced on the PartyKit edge server
- **AI opponents** — play solo against 1–3 AI players (Groq, with an offline fallback)
- **Configurable rooms** — difficulty, lives, timers, player cap
- **Progressive difficulty** — the timer shortens each full round
- **Word validation** — Free Dictionary API with an offline fallback list
- **Reconnection** — a 30-second grace period preserves your seat and host status
- **FUSE** — an SVG mascot that reacts to every game event

## 🚀 Quick Start

### Prerequisites

- Node.js 18.17+ and npm
- A [PartyKit](https://partykit.io) account (free) to deploy the realtime server
- Optional: a [Groq API key](https://console.groq.com/keys) for AI opponents

### Installation

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
GROQ_API_KEY=your_groq_api_key_here   # optional, for AI mode
```

### Running locally

Both servers must be running.

```bash
# Terminal 1 — Next.js frontend  → http://localhost:3000
cd frontend && npm run dev

# Terminal 2 — PartyKit realtime server → http://127.0.0.1:1999
cd frontend && npm run party:dev
```

`partykit dev` reads `frontend/.env.local` automatically, so `GROQ_API_KEY` is picked up in
development without any extra configuration.

## 🎯 How to Play

1. **Landing page** — enter a name, pick one of 16 avatars
2. **Create or join** — create a room, or join with its **6-character** code
3. **Lobby** — the host can open ⚙️ ROOM SETTINGS to configure the game, then START GAME
4. **Play** — a syllable appears; type any valid English word containing it and press Enter
5. **Survive** — miss the timer or fail validation and you lose a life; lose them all and you're out
6. **Win** — the last player standing takes it

## 📖 Game Rules

| Rule | Default | Range |
|---|---|---|
| Players per room | 8 | 2–16 |
| Starting lives | 3 | 1–5 |
| Initial timer | 12s | 8–20s |
| Timer decay | 0.5s per round | 0–1s |
| Minimum timer | 5s | 3–8s (never above the initial timer) |

- A **round** is one full rotation of the table, so the timer decays at the same rate regardless
  of how many people are playing.
- Words must contain the current syllable, be valid English, and be unused this game.
- Words are letters only, up to 45 characters.

## 🏗️ Architecture

```
wordbomb/
├── frontend/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout, next/font, metadata
│   │   ├── globals.css         # Tailwind layers
│   │   ├── design.css          # Design system: tokens, components, motion, reduced-motion
│   │   ├── page.tsx            # Landing page
│   │   ├── icon.svg            # Favicon
│   │   ├── apple-icon.tsx      # Generated apple touch icon
│   │   ├── opengraph-image.tsx # Generated social card
│   │   └── room/[roomId]/      # Game room route
│   ├── components/
│   │   ├── LandingPage.tsx     # Home: profile, create/join, solo vs bots
│   │   ├── GameRoom.tsx        # Connection + phase switch
│   │   ├── room/               # LobbyView, SettingsPanel, GameView, ResultsView
│   │   └── ui/                 # Fuse (mascot), Token, Icon, Toasts
│   ├── hooks/
│   │   ├── usePartySocket.ts   # WebSocket client, clock sync, connection status
│   │   └── useFuseMood.ts      # Game state → FUSE mood
│   ├── lib/
│   │   ├── game-logic.ts       # Pure game rules (shared with the server, tested)
│   │   ├── syllables.ts        # Syllable bank + playability filter
│   │   ├── wordlist.ts         # Offline fallback dictionary
│   │   ├── ai-service.ts       # Groq client + offline fallback
│   │   ├── avatars.ts
│   │   └── fuse-moods.ts
│   ├── party/index.ts          # PartyKit server (authoritative game loop)
│   ├── tests/                  # node:test suites
│   ├── types/game.ts           # Wire contract, shared by client and server
│   └── scripts/                # Build checks
├── .github/workflows/ci.yml    # Typecheck, lint, test, build
├── DEPLOY.md
└── README.md
```

### Frontend (Next.js 14)

App Router, Tailwind CSS, `partysocket` for the WebSocket client. Fonts are self-hosted via
`next/font`; images go through `next/image`.

### Backend (PartyKit)

A stateful WebSocket server on the Cloudflare edge. It owns the turn order, the timers, word
validation and every settings bound — clients only send intents. `party/index.ts` and the browser
share `types/game.ts`, so the wire contract is compile-checked on both sides.

## 🚢 Deployment

See **[DEPLOY.md](DEPLOY.md)** for the full walkthrough. In short:

1. Deploy the realtime server: `cd frontend && npx partykit deploy` → note the
   `wordbomb.<username>.partykit.dev` host
2. Set the AI key **on PartyKit**, not Vercel: `npx partykit env add GROQ_API_KEY`
3. Deploy the frontend to Vercel with root directory `frontend` and
   `NEXT_PUBLIC_PARTYKIT_HOST=wordbomb.<username>.partykit.dev`

PartyKit is deployed separately because Vercel's serverless functions do not support long-lived
WebSocket connections.

## 🛠️ Development

```bash
npm run dev           # Next.js dev server
npm run party:dev     # PartyKit dev server
npm run build         # Production build
npm run typecheck     # tsc --noEmit (covers the server too)
npm run lint          # ESLint
npm test              # node:test suites via tsx
npm run party:check   # Bundle the PartyKit entrypoint like a deploy would
npm run check         # typecheck + lint + test + party:check
```

### Environment variables

| Variable | Where it belongs | Purpose |
|---|---|---|
| `NEXT_PUBLIC_PARTYKIT_HOST` | Vercel / `.env.local` | Hostname only — no `wss://` or `https://` |
| `NEXT_PUBLIC_SITE_URL` | Vercel (optional) | Absolute base for social card URLs |
| `GROQ_API_KEY` | **PartyKit** (`partykit env add`) / `.env.local` for dev | AI opponents |

`GROQ_API_KEY` is read by `lib/ai-service.ts`, which runs **inside the PartyKit worker**. Setting
it only in the Vercel dashboard has no effect — the AI will silently fall back to the offline word
list.

## 🎨 Design System

**Colors** — warm ink `#131110` with paper cream `#f3ead7`, one hot accent (vermilion `#ff4d1c`)
and one signal colour (amber `#f5b700`). Sage, steel and rose appear only as player-token inks.
Defined once as CSS custom properties in `app/design.css` and mirrored in `tailwind.config.ts`.
No emoji anywhere in the UI: players are monogram tokens, icons are inline SVG.

**Typography** — Archivo (variable; headlines use its 125% wide cut) and JetBrains Mono, both
self-hosted via `next/font`.

**Layout** — mobile first. On phones the game is a single screen with the input at the bottom;
from 1024px players sit in a ring around the bomb, and from 1200px a sidebar shows the word feed.

**Motion** — all animations collapse under `prefers-reduced-motion: reduce`.

## 🤝 Contributing

Run `npm run check` before opening a PR; CI runs the same gates. Ideas worth picking up: extra game
modes, global leaderboards, chat, spectator mode.

## 📄 License

MIT.

## 🙏 Credits

Built with [Next.js](https://nextjs.org/), [PartyKit](https://partykit.io/),
[Tailwind CSS](https://tailwindcss.com/), [Groq](https://groq.com/) and the
[Free Dictionary API](https://dictionaryapi.dev/).
