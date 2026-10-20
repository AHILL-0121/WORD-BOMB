// Pure, side-effect-free game rules shared by the PartyKit server and the tests.
//
// Everything here is deliberately free of timers, sockets and I/O so the turn
// state machine can be exercised directly. The server owns the effects; this
// module owns the decisions.

import type { AvatarId } from "@/lib/avatars";
import type { MatchSummary, PlayedWord, Player, RoomSettings } from "@/types/game";

export const SETTINGS_BOUNDS = {
  maxPlayers: { min: 2, max: 16 },
  startingLives: { min: 1, max: 5 },
  initialTimer: { min: 8, max: 20 },
  timerDecay: { min: 0, max: 1 },
  minTimer: { min: 3, max: 8 },
  aiCount: { min: 1, max: 3 },
} as const;

export const MAX_NAME_LENGTH = 20;
export const MAX_WORD_LENGTH = 45;

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * Coerces whatever a client sent into a settings object that cannot break the
 * server. Unknown keys are dropped rather than merged, which is what made the
 * previous spread-based merge a denial-of-service vector.
 */
export function validateSettings(
  incoming: unknown,
  current: RoomSettings
): RoomSettings {
  const raw = (incoming ?? {}) as Partial<Record<keyof RoomSettings, unknown>>;
  const b = SETTINGS_BOUNDS;

  const initialTimer = Math.round(
    clamp(Number(raw.initialTimer ?? current.initialTimer), b.initialTimer.min, b.initialTimer.max, current.initialTimer)
  );

  // A minimum longer than the starting timer would make the round timer grow
  // instead of decay, so it is capped against the starting value.
  const minTimer = Math.min(
    initialTimer,
    Math.round(clamp(Number(raw.minTimer ?? current.minTimer), b.minTimer.min, b.minTimer.max, current.minTimer))
  );

  const difficulty = DIFFICULTIES.includes(raw.difficulty as (typeof DIFFICULTIES)[number])
    ? (raw.difficulty as RoomSettings["difficulty"])
    : current.difficulty;

  return {
    maxPlayers: Math.round(
      clamp(Number(raw.maxPlayers ?? current.maxPlayers), b.maxPlayers.min, b.maxPlayers.max, current.maxPlayers)
    ),
    startingLives: Math.round(
      clamp(Number(raw.startingLives ?? current.startingLives), b.startingLives.min, b.startingLives.max, current.startingLives)
    ),
    initialTimer,
    minTimer,
    timerDecay:
      Math.round(
        clamp(Number(raw.timerDecay ?? current.timerDecay), b.timerDecay.min, b.timerDecay.max, current.timerDecay) * 10
      ) / 10,
    difficulty,
    aiMode: typeof raw.aiMode === "boolean" ? raw.aiMode : current.aiMode,
    aiCount: Math.round(clamp(Number(raw.aiCount ?? current.aiCount), b.aiCount.min, b.aiCount.max, current.aiCount)),
    alphabetBonus: typeof raw.alphabetBonus === "boolean" ? raw.alphabetBonus : current.alphabetBonus,
    stickySyllable: typeof raw.stickySyllable === "boolean" ? raw.stickySyllable : current.stickySyllable,
    reactions: typeof raw.reactions === "boolean" ? raw.reactions : current.reactions,
  };
}

/**
 * True for characters that must never reach another player's screen: C0/C1
 * control codes, zero-width and bidi-override marks, and the BOM. These are the
 * standard tools for spoofing a name or breaking the layout of a player list.
 */
function isDisplayable(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  if (code < 0x20) return false;
  if (code >= 0x7f && code <= 0x9f) return false;
  if (code >= 0x200b && code <= 0x200f) return false;
  if (code >= 0x2028 && code <= 0x202e) return false;
  if (code >= 0x2066 && code <= 0x2069) return false;
  if (code === 0xfeff) return false;
  return true;
}

/** Trims, collapses whitespace and caps a display name. Never returns empty. */
export function sanitizePlayerName(raw: unknown): string {
  if (typeof raw !== "string") return "Anonymous";
  const cleaned = Array.from(raw)
    .filter(isDisplayable)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  return cleaned.length > 0 ? cleaned : "Anonymous";
}

/** Normalises a submitted word, or returns null if it could never be valid. */
export function sanitizeWord(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.toLowerCase().trim();
  if (cleaned.length === 0 || cleaned.length > MAX_WORD_LENGTH) return null;
  // Letters only. This also makes the word safe to interpolate into the
  // dictionary API path, though that call encodes it regardless.
  if (!/^[a-z]+$/.test(cleaned)) return null;
  return cleaned;
}

/**
 * The next player to act, in stable seat order, skipping eliminated players.
 *
 * Turn position is tracked by player id rather than by an index into the
 * filtered "still alive" array. Indexing into that array meant every
 * elimination silently shifted the rotation and skipped whoever sat after the
 * player who had just been knocked out.
 */
export function nextPlayerId(players: Player[], currentId: string | null): string | null {
  const alive = players.filter((p) => !p.isEliminated);
  if (alive.length === 0) return null;
  if (alive.length === 1) return alive[0].id;

  const seatIndex = players.findIndex((p) => p.id === currentId);
  if (seatIndex === -1) return alive[0].id;

  for (let step = 1; step <= players.length; step++) {
    const candidate = players[(seatIndex + step) % players.length];
    if (!candidate.isEliminated) return candidate.id;
  }
  return null;
}

/** The first player to act at the start of a game. */
export function firstPlayerId(players: Player[]): string | null {
  return players.find((p) => !p.isEliminated)?.id ?? null;
}

export interface GameEnd {
  ended: boolean;
  /** Null when everyone was eliminated or the room emptied — a draw. */
  winner: { id: string; name: string } | null;
}

export function evaluateGameEnd(players: Player[]): GameEnd {
  const alive = players.filter((p) => !p.isEliminated);
  if (alive.length > 1) return { ended: false, winner: null };
  if (alive.length === 1) {
    return { ended: true, winner: { id: alive[0].id, name: alive[0].name } };
  }
  return { ended: true, winner: null };
}

/**
 * Round length in milliseconds.
 *
 * `round` is a full rotation of the table, not a single turn, so an eight
 * player game no longer burns through the decay budget eight times faster than
 * a two player game.
 */
export function timerDurationMs(settings: RoomSettings, round: number): number {
  const seconds = Math.max(settings.minTimer, settings.initialTimer - round * settings.timerDecay);
  return Math.round(seconds * 1000);
}

/** How many completed rotations a given number of turns represents. */
export function roundFromTurns(turnsTaken: number, activePlayerCount: number): number {
  if (activePlayerCount <= 0) return 0;
  return Math.floor(turnsTaken / activePlayerCount);
}

/**
 * AI deliberation time, never longer than the time actually left on the clock.
 * On hard difficulty the raw think time reaches 8s while the round timer floors
 * at 5s, which used to make the AI forfeit turns it could have answered.
 */
export function clampThinkTime(rawThinkTime: number, timerMs: number): number {
  const safetyMarginMs = 750;
  return Math.max(250, Math.min(rawThinkTime, timerMs - safetyMarginMs));
}

/** How fast the fuse shortens each round, as offered in the lobby. */
export const SPEED_PRESETS = [
  { key: "off", label: "Off", timerDecay: 0 },
  { key: "chill", label: "Chill", timerDecay: 0.5 },
  { key: "spicy", label: "Spicy", timerDecay: 1 },
] as const;

/** The preset closest to a stored decay value. */
export function speedPresetFor(timerDecay: number): (typeof SPEED_PRESETS)[number] {
  return SPEED_PRESETS.reduce((best, p) =>
    Math.abs(p.timerDecay - timerDecay) < Math.abs(best.timerDecay - timerDecay) ? p : best
  );
}

/** Bots, in the order they take seats. Shared so the lobby can preview them. */
export const AI_ROSTER: readonly { name: string; avatar: AvatarId }[] = [
  { name: "Mia", avatar: "sage-disc" },
  { name: "Ravi", avatar: "amber-square" },
  { name: "Kofi", avatar: "steel-disc" },
  { name: "Luna", avatar: "rose-disc" },
  { name: "Zed", avatar: "steel-square" },
  { name: "Ines", avatar: "sage-square" },
];

/** The bots that would take seats, skipping any name a human already uses. */
export function pickBots(count: number, humanNames: string[]) {
  const taken = new Set(humanNames.map((n) => n.trim().toLowerCase()));
  return AI_ROSTER.filter((b) => !taken.has(b.name.toLowerCase())).slice(0, Math.max(0, count));
}

export const ALPHABET_SIZE = 26;

/** Adds a word's letters to a player's alphabet progress. Returns sorted, unique letters. */
export function mergeLetters(existing: string, word: string): string {
  const letters = new Set(existing);
  for (const ch of word.toLowerCase()) if (ch >= "a" && ch <= "z") letters.add(ch);
  return Array.from(letters).sort().join("");
}

/**
 * Builds the end-of-game recap from the words played and the finishing order.
 * `eliminationOrder` is first-out first; the ranking reverses it behind the winner.
 */
export function summarizeMatch(
  words: PlayedWord[],
  players: Pick<Player, "id" | "wordsPlayed">[],
  eliminationOrder: string[],
  winnerId: string | null,
  rounds: number
): MatchSummary {
  const present = new Set(players.map((p) => p.id));
  const ranking: string[] = [];
  if (winnerId) ranking.push(winnerId);
  for (const id of [...eliminationOrder].reverse()) {
    if (present.has(id) && !ranking.includes(id)) ranking.push(id);
  }
  for (const p of players) if (!ranking.includes(p.id)) ranking.push(p.id);

  let longestWord: MatchSummary["awards"]["longestWord"] = null;
  let fastestAnswer: MatchSummary["awards"]["fastestAnswer"] = null;
  let closestCall: MatchSummary["awards"]["closestCall"] = null;
  for (const w of words) {
    if (!longestWord || w.word.length > longestWord.word.length) longestWord = { playerId: w.playerId, word: w.word };
    if (!fastestAnswer || w.ms < fastestAnswer.ms) fastestAnswer = { playerId: w.playerId, ms: w.ms };
    if (!closestCall || w.msLeft < closestCall.msLeft) closestCall = { playerId: w.playerId, msLeft: Math.max(0, w.msLeft) };
  }

  let mostWords: MatchSummary["awards"]["mostWords"] = null;
  for (const p of players) {
    if (p.wordsPlayed > 0 && (!mostWords || p.wordsPlayed > mostWords.count)) {
      mostWords = { playerId: p.id, count: p.wordsPlayed };
    }
  }

  const seen = new Set<string>();
  const candidates = [...words]
    .sort((a, b) => b.word.length - a.word.length)
    .filter((w) => (seen.has(w.word) ? false : (seen.add(w.word), true)))
    .slice(0, 3)
    .map((w) => ({ word: w.word, playerId: w.playerId }));

  return {
    rounds: Math.max(1, rounds),
    wordsPlayed: words.length,
    ranking,
    awards: { longestWord, fastestAnswer, closestCall, mostWords },
    candidates,
    votes: Object.fromEntries(candidates.map((c) => [c.word, 0])),
  };
}
