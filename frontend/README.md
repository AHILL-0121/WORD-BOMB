# Word Bomb 💣

A fast-paced multiplayer word game where players race against time to find words containing a given syllable. Built with Next.js and PartyKit for real-time multiplayer action.

## 🎮 Features

- **Real-time Multiplayer:** Up to 8 players per room
- **Character Avatars:** Choose from 16 preset characters
- **AI Opponents:** Play solo against 1-3 AI players (powered by Groq)
- **Customizable Settings:** Adjust difficulty, lives, timers, and more
- **Reconnection System:** 30-second grace period for temporary disconnects
- **Word Validation:** Dictionary API + offline fallback wordlist

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Optional: Groq API key for AI mode (free at https://console.groq.com/keys)

### Installation

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### Configuration

Create `.env.local` in the `frontend` directory:

```env
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
GROQ_API_KEY=your_groq_api_key_here  # Optional - for AI mode
```

### Running Locally

**Terminal 1 - Next.js Frontend:**
```powershell
cd frontend
npm run dev
```
Open http://localhost:3000

**Terminal 2 - PartyKit WebSocket Server:**
```powershell
cd frontend
npm run party:dev
```

### Deployment

**Frontend (Vercel):**
```powershell
cd frontend
vercel
```

**PartyKit Server:**
```powershell
cd frontend
npx partykit@latest deploy
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_PARTYKIT_HOST` - Your PartyKit deployment URL
- `GROQ_API_KEY` - Your Groq API key (for AI mode)

## 🎯 How to Play

1. **Landing Page:**
   - Enter your name
   - Choose an avatar from 16 options
   - Create a room or join with a 4-letter code

2. **Lobby (Host Only):**
   - Click "⚙️ ROOM SETTINGS" to customize:
     - Game mode (multiplayer or AI)
     - Difficulty (easy, medium, hard)
     - Lives (1-5)
     - Timer settings
     - AI player count (if AI mode)
   - Click "START GAME" when ready

3. **Gameplay:**
   - A syllable appears (e.g., "tion")
   - Type a word containing that syllable ("action", "station", etc.)
   - Press ENTER to submit
   - Timer decreases each round
   - Fail or timeout = lose a life
   - Lose all lives = eliminated
   - Last player standing wins!

## 🏗️ Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** PartyKit (Cloudflare Workers)
- **AI:** Groq API (llama-3.3-70b-versatile)
- **Validation:** Free Dictionary API + offline wordlist

## 📁 Project Structure

```
frontend/
├── app/                  # Next.js App Router
├── components/           # React components
├── hooks/                # WebSocket client hook
├── lib/                  # Utilities (syllables, wordlist, AI service)
├── party/                # PartyKit server
└── types/                # TypeScript interfaces
```

## 🔧 Development Notes

### Windows Compatibility
Use PartyKit v0.0.115 via npx (v0.0.111 has path bugs):
```json
"party:dev": "npx partykit@latest dev"
```

### TypeScript Errors
Groq SDK may show type errors in IDE but works at runtime. This is safe to ignore.

### Session Persistence
Players are assigned a `sessionId` stored in localStorage. Refreshing the page within 30 seconds maintains host status and reconnects seamlessly.

## 🎨 Customization

### Adding Avatars
Edit `lib/avatars.ts`:
```typescript
export const AVATARS: Avatar[] = [
  { id: 'your-id', emoji: '🎭', name: 'Your Avatar' },
  // ...
];
```

### Adjusting Default Settings
Edit `types/game.ts`:
```typescript
export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  gameMode: 'multiplayer',
  difficulty: 'medium',
  maxPlayers: 8,
  lives: 3,
  // ...
};
```

## 📄 License

MIT

## 👨‍💻 Developer

Built with ❤️ by Asus

---

For detailed feature documentation, see [FEATURES.md](./FEATURES.md)
