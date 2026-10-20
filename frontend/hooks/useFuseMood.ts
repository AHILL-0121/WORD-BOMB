"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FuseMood } from "@/lib/fuse-moods";
import type { GameState, ServerMessage } from "@/types/game";

interface UseFuseMoodOptions {
  gameState: GameState | null;
  myId: string;
  subscribe: (listener: (msg: ServerMessage) => void) => () => void;
  /** Server-corrected clock, for the "time is running out" threshold. */
  serverNow: () => number;
}

/** FUSE panics for everyone in the last few seconds of any turn. */
export const NERVOUS_THRESHOLD_MS = 3000;

/** A long word or a last-moment save gets the big reaction. */
export function isBigPlay(word: string, msLeft: number) {
  return word.length >= 9 || msLeft < 1500;
}

export function useFuseMood({ gameState, myId, subscribe, serverNow }: UseFuseMoodOptions): FuseMood {
  /**
   * Ticks while a turn is running so the nervous threshold is actually
   * reached. Reading the clock inside a memo keyed only on game state meant it
   * re-evaluated only when a message arrived.
   */
  const [clockTick, setClockTick] = useState(0);

  /**
   * An event reaction that temporarily overrides the state-derived mood.
   * Reactions hold for their full duration; a state broadcast does not cut
   * them short.
   */
  const [reaction, setReaction] = useState<FuseMood | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const turnRunning = gameState?.phase === "playing" && Boolean(gameState.currentPlayerId);

  useEffect(() => {
    if (!turnRunning) return;
    const id = setInterval(() => setClockTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [turnRunning]);

  const baseMood = useMemo<FuseMood>(() => {
    if (!gameState) return "idle";

    if (gameState.phase === "game-over") {
      return gameState.winner?.id === myId ? "celebrating" : "idle";
    }
    if (gameState.phase === "lobby") {
      return gameState.players.length >= 2 || gameState.settings.aiMode ? "excited" : "idle";
    }
    if (!gameState.currentPlayerId) return "excited"; // pre-game countdown

    if (gameState.timerEndsAt - serverNow() < NERVOUS_THRESHOLD_MS) return "nervous";
    return gameState.currentPlayerId === myId ? "thinking" : "idle";
    // clockTick is an intentional dependency: it re-evaluates the threshold.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, myId, serverNow, clockTick]);

  useEffect(() => {
    const react = (mood: FuseMood, holdFor: number) => {
      setReaction(mood);
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
      reactionTimer.current = setTimeout(() => setReaction(null), holdFor);
    };

    return subscribe((msg) => {
      switch (msg.type) {
        case "word-accepted":
          if (isBigPlay(msg.word, msg.msLeft)) react("excited", 1500);
          else react("happy", 1100);
          break;
        case "word-rejected":
          if (msg.playerId === myId) react("angry", 1200);
          break;
        case "life-lost":
          react("sad", 1500);
          break;
        case "player-eliminated":
          react("dead", 1500);
          break;
        case "game-over":
          setReaction(null);
          break;
      }
    });
  }, [subscribe, myId]);

  useEffect(() => () => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
  }, []);

  // Victory outranks any in-flight reaction.
  if (baseMood === "celebrating") return baseMood;
  return reaction ?? baseMood;
}
