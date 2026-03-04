# Word Bomb

A real-time multiplayer word game built with Next.js 14 and PartyKit. Players race against the clock to find valid English words containing a random syllable. Last player standing wins!

## 🎮 Features

- **Real-time multiplayer**: Up to 16 players per room
- **Server-authoritative gameplay**: All game logic runs on PartyKit edge servers
- **Progressive difficulty**: Timer speeds up each round
- **Word validation**: Uses Free Dictionary API with offline fallback
- **Beautiful UI**: Custom animations and responsive design
- **Fully serverless**: Deployed on PartyKit and Vercel edge network

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A PartyKit account (free at [partykit.io](https://partykit.io))

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development servers

# Terminal 1 - Next.js Frontend
npm run dev

# Terminal 2 - PartyKit Server (Unix/Mac/WSL)
npm run party:dev
```

**Windows Users**: PartyKit dev server has a known issue on Windows. See [WINDOWS-WORKAROUND.md](WINDOWS-WORKAROUND.md) for solutions. Next.js runs fine at `http://localhost:3000`

The game will be available at `http://localhost:3000` (or 3001 if 3000 is in use)

### Project Structure

```
wordbomb/
├── frontend/              # Next.js application
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout with fonts
│   │   ├── globals.css   # Global styles and animations
│   │   ├── page.tsx      # Home page (lobby)
│   │   └── room/[roomId]/ # Dynamic game room route
│   ├── components/       # React components
│   │   ├── Lobby.tsx     # Room creation/joining
│   │   ├── GameRoom.tsx  # Main game orchestrator
│   │   ├── BombTimer.tsx # Animated countdown timer
│   │   ├── PlayerList.tsx # Live player list
│   │   └── ResultsScreen.tsx # End game screen
│   ├── party/
│   │   └── index.ts      # PartyKit server (game logic)
│   ├── hooks/
│   │   └── usePartySocket.ts # WebSocket hook
│   ├── lib/
│   │   ├── syllables.ts  # Syllable bank & generator
│   │   └── wordlist.ts   # Fallback dictionary
│   ├── types/
│   │   └── game.ts       # TypeScript types
│   ├── package.json      # Dependencies
│   ├── next.config.mjs   # Next.js config
│   ├── partykit.json     # PartyKit configuration
│   ├── tailwind.config.ts # Tailwind config
│   └── tsconfig.json     # TypeScript config
├── DEPLOY.md             # Deployment guide
├── README.md             # This file
└── WINDOWS-WORKAROUND.md # Windows troubleshooting
```

## 🎯 How to Play

1. **Create or Join a Room**: Enter your name and create a room code or join an existing one
2. **Wait for Players**: Need at least 2 players to start
3. **Start the Game**: Host clicks "Start Game"
4. **Find Words**: When it's your turn, type a valid English word containing the syllable
5. **Beat the Clock**: Submit before the timer runs out or lose a life
6. **Last One Standing**: The last player with lives remaining wins!

## 🏗️ Architecture

### Frontend (Next.js 14)

- **App Router**: Server and Client Components
- **Tailwind CSS**: Utility-first styling
- **PartySocket**: WebSocket client for real-time updates

### Backend (PartyKit)

- **Stateful WebSocket server**: Deployed to Cloudflare edge
- **Server-authoritative**: All game logic runs server-side
- **Word validation**: Free Dictionary API + offline fallback

## 🚢 Deployment

**See [DEPLOY.md](DEPLOY.md) for complete deployment instructions.**

### Quick Overview

1. **Deploy PartyKit (via WSL on Windows)**:
   ```bash
   cd /mnt/c/Users/Asus/Desktop/wordbomb/frontend
   npx partykit deploy
   ```
   Get your URL: `wordbomb.<username>.partykit.dev`

2. **Deploy to Vercel**:
   - Push to GitHub
   - Import in [Vercel Dashboard](https://vercel.com)
   - Add environment variable: `NEXT_PUBLIC_PARTYKIT_HOST=wordbomb.<username>.partykit.dev`
   - Deploy! 🚀

**Note**: PartyKit must be deployed separately as it requires WebSocket support (not available on Vercel serverless functions).

## 🎨 Design System

### Colors

- **Ember** (`#ff4500`): Primary accent, danger states
- **Acid** (`#d4ff00`): Success, active player
- **Gold** (`#ffc340`): Warning, mid-timer
- **Cream** (`#f5f0e8`): Primary text
- **Smoke** (`#5a5a55`): Secondary text
- **Ash** (`#1c1c1a`): Cards, surfaces
- **Black** (`#0a0a08`): Background

### Typography

- **Display**: Bebas Neue (headings, titles)
- **Body**: Syne (paragraphs, UI text)
- **Mono**: JetBrains Mono (code, labels)

## 📖 Game Rules

- **Starting Lives**: 3 per player
- **Initial Timer**: 12 seconds
- **Timer Decay**: -0.5s per round (minimum 4s)
- **Word Requirements**:
  - Must contain the current syllable
  - Must be a valid English word
  - Cannot have been used in the current game
- **Elimination**: Reaching 0 lives eliminates a player
- **Victory**: Last player with lives remaining wins

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

npm run party:dev    # Start PartyKit dev server
npm run party:deploy # Deploy PartyKit server to production
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999  # Dev: localhost | Prod: your-app.partykit.dev
```

## 🤝 Contributing

This is an MVP implementation. Contributions are welcome! Some ideas:

- Additional game modes (speed mode, team mode)
- Player avatars and profiles
- Global leaderboards
- Chat system
- Mobile app (React Native)

## 📄 License

MIT License - feel free to use this project for learning or as a foundation for your own multiplayer games!

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/)
- [PartyKit](https://partykit.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Free Dictionary API](https://dictionaryapi.dev/)

---

**Made by the Word Bomb team**
