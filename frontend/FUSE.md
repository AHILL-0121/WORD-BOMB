# FUSE — the bomb

FUSE is Word Bomb's mascot: a black bomb with a lit fuse and a face, drawn as inline SVG in
`components/ui/Fuse.tsx`. It sits at the centre of every screen and reacts to the game.

## How it works

The SVG never changes shape between moods. Every expression is CSS keyed off `data-mood` on the
wrapper (`.fuse-wrap[data-mood=...]` in `app/design.css`): which mouth is shown, brows, sweat,
thought bubble, X-eyes, the red tint, and the body animation. A mood change is one attribute
update, so animations stay continuous.

```tsx
import { Fuse } from "@/components/ui/Fuse";

<Fuse mood="nervous" className="bomb-wrap" look={{ x: 3, y: -2 }}>
  {/* children render on top of the bomb: the fuse ring, the syllable sticker, speech */}
</Fuse>
```

- `className` picks the size and context: `hero-bomb` (home, connection and 404 screens),
  `bomb-wrap` (in game) or `mini-bomb` (lobby).
- `look` moves the pupils. In game FUSE looks at whoever holds the bomb; on the home screen its
  eyes follow the pointer.
- Gradient ids are generated per instance, because a `url(#id)` that resolves inside a hidden
  element renders black in Chrome.

## Moods

| Mood | When | Look |
|---|---|---|
| `idle` | Someone else's turn | Smile, gentle float |
| `thinking` | Your turn, time to spare | Flat mouth, eyes up, thought bubble |
| `nervous` | Any turn with under 3s left | Wavy mouth, worried brows, sweat, trembling |
| `happy` | A word is accepted | Open grin, squinted eyes, bounce |
| `excited` | Long word (9+ letters) or a save with under 1.5s left; lobby with players | Grin, fast bounce |
| `angry` | Your word is rejected | Angry brows, red tint, shake |
| `sad` | Someone loses a life | Frown, worried brows, droop |
| `dead` | Someone is eliminated; also the offline and 404 screens | X-eyes, fuse out, grey |
| `celebrating` | You win | As excited, bouncing |

`hooks/useFuseMood.ts` derives the mood from game state and holds event reactions (happy, angry,
sad, dead) for their full duration. It listens through the socket hook's `subscribe`, so a burst
of messages never drops a reaction.

## What FUSE says

Lines live in `lib/fuse-moods.ts` (`LINES`), grouped by situation: your turn, long words, close
calls, rejections, timeouts, eliminations, the alphabet bonus, lobby quips and the win. Several
take arguments so they can name the player or quote the time left. `GameView` shows them in the
speech bubble; they are decorative (`aria-hidden`), and the same events are announced to screen
readers through a separate live region.

## Accessibility

- The SVG is decorative: `aria-hidden`, `focusable="false"`.
- Nothing is conveyed by FUSE alone. Turn changes, lost lives and eliminations are also shown as
  text and announced.
- All motion collapses under `prefers-reduced-motion: reduce`.
