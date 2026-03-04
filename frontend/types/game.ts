// Type definitions for Word Bomb game state

import type { AvatarId } from "@/lib/avatars";

export interface Player {
  id: string;              // PartyKit connection ID
  sessionId?: string;      // Persistent session ID for reconnection
  name: string;
  avatar: AvatarId;        // Character avatar
  lives: number;           // starts at 3
  isEliminated: boolean;
  isHost: boolean;
  isAI?: boolean;          // AI player flag
}

export interface RoomSettings {
  maxPlayers: number;      // 2-16
  startingLives: number;   // 1-5
  initialTimer: number;    // 8-20 seconds
  timerDecay: number;      // 0-1 second per round
  minTimer: number;        // 3-8 seconds
  difficulty: 'easy' | 'medium' | 'hard';
  aiMode: boolean;         // Single player vs AI
  aiCount: number;         // 1-3 AI opponents
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  maxPlayers: 16,
  startingLives: 3,
  initialTimer: 12,
  timerDecay: 0.5,
  minTimer: 4,
  difficulty: 'medium',
  aiMode: false,
  aiCount: 1,
};

export interface GameState {
  phase: 'lobby' | 'playing' | 'game-over';
  players: Player[];
  settings: RoomSettings;
  currentPlayerIndex: number;
  currentSyllable: string;
  usedWords: string[];
  round: number;
  timerDuration: number;   // ms — decreases per round
  timerEndsAt: number;     // Unix timestamp (ms)
  winner?: { id: string; name: string };
}

// Client → Server Messages
export type ClientMessage =
  | { type: "join"; playerName: string; sessionId?: string; avatar: AvatarId }
  | { type: "start-game" }
  | { type: "submit-word"; word: string }
  | { type: "restart" }
  | { type: "update-settings"; settings: Partial<RoomSettings> };

// Server → Client Messages
export type ServerMessage =
  | { type: "state-update"; state: GameState }
  | { type: "player-id"; playerId: string }
  | { type: "word-accepted"; word: string; playerId: string }
  | { type: "word-rejected"; reason: "invalid" | "already-used" | "no-syllable" | "not-your-turn" }
  | { type: "life-lost"; playerId: string; livesRemaining: number }
  | { type: "player-eliminated"; playerId: string }
  | { type: "game-over"; winnerId: string; winnerName: string };
