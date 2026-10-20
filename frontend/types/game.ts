// Type definitions for Word Bomb game state.
//
// These types describe the *wire* contract. The PartyKit server imports them
// too, so a change here is a compile error on both sides rather than a silent
// runtime mismatch.

import type { AvatarId } from "@/lib/avatars";

/**
 * A player as broadcast to every client.
 *
 * Deliberately has no `sessionId`. That field is the reconnection credential —
 * broadcasting it let any player replay someone else's identity, host included.
 * It now lives only in the server's private roster.
 */
export interface Player {
  id: string; // PartyKit connection ID
  name: string;
  avatar: AvatarId;
  lives: number;
  isEliminated: boolean;
  isHost: boolean;
  isAI: boolean;
  /** True while the player is inside the reconnection grace period. */
  isDisconnected: boolean;
  /** Words this player has had accepted this game. */
  wordsPlayed: number;
  /** Distinct letters used toward the alphabet bonus, in alphabetical order. */
  lettersUsed: string;
  /** 1-based round the player was knocked out in, or null while still alive. */
  eliminatedInRound: number | null;
}

export interface RoomSettings {
  maxPlayers: number; // 2-16
  startingLives: number; // 1-5
  initialTimer: number; // 8-20 seconds
  timerDecay: number; // 0-1 second per round
  minTimer: number; // 3-8 seconds
  difficulty: "easy" | "medium" | "hard";
  aiMode: boolean; // Bots fill empty seats
  aiCount: number; // 1-3 AI opponents
  /** Using all 26 letters wins a life back. */
  alphabetBonus: boolean;
  /** After a timeout the next player inherits the same syllable. */
  stickySyllable: boolean;
  /** Players may send shout-outs during a game. */
  reactions: boolean;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  startingLives: 3,
  initialTimer: 12,
  timerDecay: 0.5,
  minTimer: 5,
  difficulty: "medium",
  aiMode: false,
  aiCount: 1,
  alphabetBonus: true,
  stickySyllable: true,
  reactions: true,
};

/** Shout-outs are a fixed list so nothing free-form is ever relayed. */
export const SHOUTS = ["NICE", "OOF", "CLOSE!", "HOW?!", "GG", "RIP"] as const;
export type Shout = (typeof SHOUTS)[number];

/** An accepted word, as shown in the feed and used for the match recap. */
export interface PlayedWord {
  word: string;
  /** The syllable it answered. */
  syllable: string;
  playerId: string;
  /** How long the player took, in ms. */
  ms: number;
  /** Time left on the fuse when it was submitted, in ms. */
  msLeft: number;
}

export interface MatchSummary {
  /** Full rotations played, 1-based. */
  rounds: number;
  wordsPlayed: number;
  /** Player ids: the winner first, then the reverse order of elimination. */
  ranking: string[];
  awards: {
    longestWord: { playerId: string; word: string } | null;
    fastestAnswer: { playerId: string; ms: number } | null;
    closestCall: { playerId: string; msLeft: number } | null;
    mostWords: { playerId: string; count: number } | null;
  };
  /** Up to three of the longest distinct words, for "word of the game". */
  candidates: { word: string; playerId: string }[];
  /** Vote count per candidate word. */
  votes: Record<string, number>;
}

export interface GameState {
  phase: "lobby" | "playing" | "game-over";
  players: Player[];
  settings: RoomSettings;
  /**
   * Whose turn it is, by id. Previously this was an index into the filtered
   * list of surviving players, which shifted on every elimination and silently
   * skipped a player each time.
   */
  currentPlayerId: string | null;
  currentSyllable: string;
  /** Most recent accepted words, newest first. The full list stays on the server. */
  recentWords: PlayedWord[];
  /** Total words accepted this game. */
  wordCount: number;
  /** 0-based count of completed rotations. */
  round: number;
  timerDuration: number; // ms
  timerEndsAt: number; // server clock, ms since epoch
  /** Server time the first turn begins; the pre-game countdown runs until then. */
  startsAt: number | null;
  /** Server clock at broadcast time, so clients can correct for drift. */
  serverNow: number;
  /** Set when the game ends with a survivor; null after a mutual elimination. */
  winner: { id: string; name: string } | null;
  /** Filled in when the game ends. */
  summary: MatchSummary | null;
}

export type RejectReason =
  | "invalid"
  | "already-used"
  | "no-syllable"
  | "not-your-turn"
  | "malformed"
  | "too-fast";

/** Non-gameplay problems (room full, cannot start yet, and so on). */
export type RoomErrorCode =
  | "room-full"
  | "not-enough-players"
  | "not-host"
  | "game-in-progress"
  | "rate-limited";

// Client -> Server
export type ClientMessage =
  | { type: "join"; playerName: string; sessionId?: string; avatar: AvatarId }
  | { type: "start-game" }
  | { type: "submit-word"; word: string }
  /** What the active player has typed so far, relayed so others can watch. */
  | { type: "typing"; text: string }
  | { type: "shout"; shout: Shout }
  | { type: "vote"; word: string }
  | { type: "restart" }
  | { type: "update-settings"; settings: Partial<RoomSettings> };

// Server -> Client
export type ServerMessage =
  | { type: "state-update"; state: GameState }
  | { type: "player-id"; playerId: string }
  | ({ type: "word-accepted" } & PlayedWord)
  /** `playerId` identifies who was rejected so the client can react selectively. */
  | { type: "word-rejected"; playerId: string; reason: RejectReason }
  | { type: "typing"; playerId: string; text: string }
  | { type: "shout"; playerId: string; shout: Shout }
  | { type: "bonus-life"; playerId: string }
  | { type: "life-lost"; playerId: string; livesRemaining: number }
  | { type: "player-eliminated"; playerId: string }
  | { type: "game-over"; winnerId: string | null; winnerName: string | null }
  | { type: "room-error"; code: RoomErrorCode; message: string };
