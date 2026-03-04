# FUSE Character Integration Guide

## Overview

**FUSE** is the sentient bomb mascot for Word Bomb. Built entirely in SVG with no external dependencies, FUSE reacts emotionally to every game event, providing personality and feedback throughout the game.

## Character Traits

- **Personality**: Sardonic, dramatic, intensely invested in your vocabulary skills
- **Catchphrase**: *"The fuse burns either way."*
- **Design**: Pure SVG (scalable, animatable, no images required)

## Emotional States (8 Moods)

### 1. **Idle** 🟠
- **When**: Lobby with < 2 players, waiting between turns
- **Animation**: Gentle float with slow fuse spark
- **Dialogue**: "...ticking away.", "You gonna type or what?", "Still here. Waiting."

### 2. **Excited** 🟢
- **When**: Lobby with >= 2 players, game start
- **Animation**: Full bounce with wild fuse sparking
- **Glow**: Acid-green
- **Dialogue**: "YES! THAT'S THE ONE!", "OH WE ARE COOKING!", "KEEP GOING!"

### 3. **Nervous** 🟡
- **When**: Your turn with < 5s remaining
- **Animation**: Rapid trembling, darting pupils, sweat drops
- **Features**: Wobbly mouth line, animated sweat droplets
- **Dialogue**: "tick... tick... tick...", "Come on come on come ON—"

### 4. **Happy** 😊
- **When**: Word accepted successfully
- **Animation**: Smooth bob with cheek blush
- **Features**: Big smile, rosy cheeks
- **Dialogue**: "Nice word. I respect it.", "Heh. Not bad.", "That one had FLAVOR."

### 5. **Angry** 😠
- **When**: Invalid word rejected
- **Animation**: Violent shaking, furrowed unibrow, gritted teeth
- **Glow**: Deep red
- **Features**: Angry eyebrows, teeth lines in mouth
- **Dialogue**: "THAT IS NOT A WORD.", "I SWEAR ON MY FUSE—", "WRONG. WRONG. WRONG."

### 6. **Sad** 😢
- **When**: Life lost, timeout
- **Animation**: Droopy droop, fuse dimming
- **Features**: Downturned mouth, sad eyebrows
- **Dialogue**: "...you ran out of time.", "I believed in you.", "That's a life gone."

### 7. **Thinking** 🤔
- **When**: Your turn, analyzing (> 5s remaining)
- **Animation**: Gentle bob, thought bubble with "...?"
- **Features**: Contemplative expression, floating thought bubble
- **Dialogue**: "Hmm. Something with that syllable...", "What about... no. Maybe..."

### 8. **Celebrating** 🎉
- **When**: You win the game
- **Animation**: Bounce + crown + confetti burst + star eyes
- **Features**: Golden crown, spinning star eyes, confetti particles
- **Dialogue**: "CHAMPION! ABSOLUTE LEGEND!", "WE DID IT!", "FLAWLESS. PERFECT."

### 9. **Dead** 💀
- **When**: Player eliminated
- **Animation**: None (static)
- **Features**: Grayscale filter, X eyes, flat line mouth, explosion flash on transition
- **Dialogue**: "...", "...boom.", "worth it."

## Component Structure

```
frontend/
├── components/
│   ├── FuseCharacter.tsx    # Main wrapper with speech & particles
│   ├── FuseSVG.tsx           # Pure SVG rendering
│   └── ...
├── hooks/
│   └── useFuseMood.ts        # Game state → mood mapper
└── lib/
    └── fuse-moods.ts         # Mood configs & dialogue
```

## Usage

### Basic Usage

```tsx
import { FuseCharacter } from "@/components/FuseCharacter";

<FuseCharacter 
  mood="happy" 
  size={180} 
  showSpeech={true} 
/>
```

### Props

```typescript
interface FuseCharacterProps {
  mood: FuseMood;              // Current emotional state
  size?: number;               // Character size in pixels (default: 180)
  showSpeech?: boolean;        // Show speech bubbles (default: true)
  customDialogue?: string;     // Override default dialogue
}
```

### Game Integration

FUSE automatically reacts to game state via `useFuseMood` hook:

```tsx
import { useFuseMood } from "@/hooks/useFuseMood";
import { FuseCharacter } from "@/components/FuseCharacter";

function GameRoom({ gameState, myId, lastMessage }) {
  const fuseMood = useFuseMood({ gameState, myId, lastMessage });
  
  return <FuseCharacter mood={fuseMood} size={160} />;
}
```

## Mood Mapping Logic

### Lobby Phase
- **< 2 players**: `idle`
- **>= 2 players**: `excited`

### Playing Phase
- **Your turn, > 5s left**: `thinking`
- **Your turn, < 5s left**: `nervous`
- **Eliminated**: `dead`
- **Watching others**: `idle`

### Game Events (via lastMessage)
- **word-accepted**: `happy` → returns to base mood after 2.5s
- **word-rejected**: `angry` → returns after 2s
- **life-lost**: `sad` → returns after 3s
- **player-eliminated**: `dead` (permanent)
- **game-over (winner)**: `celebrating`
- **game-over (loser)**: `sad` or `dead`

## Customization

### Adding New Moods

1. **Define mood in `lib/fuse-moods.ts`**:
```typescript
export type FuseMood = 
  | "idle" 
  | "excited" 
  | "yourNewMood";  // Add here

export const MOODS: Record<FuseMood, MoodConfig> = {
  yourNewMood: { 
    label: "NEW!", 
    color: "#00ff00", 
    bodyColor: "#001100", 
    eyeColor: "#00ff00" 
  },
};

export const DIALOGUE: Record<FuseMood, string[]> = {
  yourNewMood: ["Custom line 1", "Custom line 2"],
};
```

2. **Add animation in `app/globals.css`**:
```css
@keyframes your-new-anim {
  0%, 100% { transform: rotate(0); }
  50% { transform: rotate(360deg); }
}
```

3. **Add condition in `FuseSVG.tsx`**:
```tsx
const isYourNew = mood === "yourNewMood";
const bodyAnim = isYourNew ? "your-new-anim 1s ease infinite" : /* ... */;
```

### Adding Dialogue Lines

Edit `lib/fuse-moods.ts`:
```typescript
export const DIALOGUE: Record<FuseMood, string[]> = {
  happy: [
    "Nice word. I respect it.",
    "Your custom line here!",  // Add more
  ],
};
```

## Animation Performance

- **Pure CSS**: All animations use CSS keyframes (GPU-accelerated)
- **SVG Filters**: Drop shadows may impact performance on low-end devices
- **Particle Effects**: Confetti limited to 18 pieces, auto-cleanup after 1.5s

### Optimization Tips

```tsx
// Disable speech bubbles for better performance
<FuseCharacter mood="idle" size={120} showSpeech={false} />

// Smaller size reduces SVG complexity
<FuseCharacter mood="happy" size={100} />
```

## Accessibility

- **Pure Visual**: FUSE is decorative, no critical information conveyed
- **Speech Readable**: All dialogue also logged to console for screen readers
- **Color Contrast**: Glow colors meet WCAG AA standards against black background

## Browser Support

- **Chrome/Edge**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support (iOS 12+)
- **Older Browsers**: SVG fallbacks to static display

## Troubleshooting

### FUSE not appearing
```tsx
// Check imports
import { FuseCharacter } from "@/components/FuseCharacter";

// Verify mood is valid
const validMood: FuseMood = "happy"; // Type-checked
```

### Animations not working
```bash
# Ensure globals.css is imported in layout.tsx
import "./globals.css";
```

### Speech bubbles not showing
```tsx
// Check showSpeech prop
<FuseCharacter mood="happy" showSpeech={true} />

// Custom dialogue overrides random selection
<FuseCharacter mood="happy" customDialogue="Your text here!" />
```

## Examples

### Lobby Welcome
```tsx
<FuseCharacter 
  mood="excited" 
  size={180} 
  customDialogue="Ready to blow some minds?" 
/>
```

### Victory Screen
```tsx
<FuseCharacter 
  mood="celebrating" 
  size={220}
  customDialogue="LEGENDARY VOCABULARY!" 
/>
```

### Death State
```tsx
<FuseCharacter 
  mood="dead" 
  size={140}
  showSpeech={false} 
/>
```

## Future Enhancements

- [ ] Sound effects per mood
- [ ] Particle trail behind FUSE
- [ ] Seasonal costumes (holiday themes)
- [ ] Player-customizable colors
- [ ] FUSE reaction to specific words (easter eggs)

---

**Created with ❤️ for Word Bomb**  
*"The fuse burns either way."*
