import { useMemo, useEffect, useState } from "react";
import type { FuseMood } from "@/lib/fuse-moods";
import type { GameState } from "@/types/game";

interface UseFuseMoodOptions {
  gameState: GameState | null;
  myId: string;
  lastMessage: any;
}

export function useFuseMood({ gameState, myId, lastMessage }: UseFuseMoodOptions): FuseMood {
  const [mood, setMood] = useState<FuseMood>("idle");

  // Determine mood based on game state
  const baseMood = useMemo(() => {
    if (!gameState) return "idle";

    // Game over states
    if (gameState.phase === "game-over") {
      const myPlayer = gameState.players.find(p => p.id === myId);
      if (myPlayer?.isEliminated) return "dead";
      if (gameState.winner?.id === myId) return "celebrating";
      return "sad";
    }

    // Lobby
    if (gameState.phase === "lobby") {
      return gameState.players.length >= 2 ? "excited" : "idle";
    }

    // Playing
    if (gameState.phase === "playing") {
      const currentPlayer = gameState.players.find((_, i) => {
        const activePlayers = gameState.players.filter(p => !p.isEliminated);
        return activePlayers[gameState.currentPlayerIndex]?.id === gameState.players[i].id;
      });

      const isMyTurn = currentPlayer?.id === myId;
      const myPlayer = gameState.players.find(p => p.id === myId);
      
      // Dead if eliminated
      if (myPlayer?.isEliminated) return "dead";

      // Nervous if it's my turn and time is running low
      if (isMyTurn) {
        const timeLeft = gameState.timerEndsAt - Date.now();
        if (timeLeft < 5000) return "nervous";
        return "thinking";
      }

      // Watching others - default to idle
      return "idle";
    }

    return "idle";
  }, [gameState, myId]);

  // React to specific game events via lastMessage
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case "word-accepted":
        if (lastMessage.playerId === myId) {
          setMood("happy");
          setTimeout(() => setMood(baseMood), 2500);
        }
        break;

      case "word-rejected":
        if (lastMessage.playerId === myId) {
          setMood("angry");
          setTimeout(() => setMood(baseMood), 2000);
        }
        break;

      case "life-lost":
        if (lastMessage.playerId === myId) {
          setMood("sad");
          setTimeout(() => setMood(baseMood), 3000);
        }
        break;

      case "player-eliminated":
        if (lastMessage.playerId === myId) {
          setMood("dead");
        }
        break;

      case "game-over":
        if (lastMessage.winnerId === myId) {
          setMood("celebrating");
        } else {
          const myPlayer = gameState?.players.find(p => p.id === myId);
          setMood(myPlayer?.isEliminated ? "dead" : "sad");
        }
        break;
    }
  }, [lastMessage, myId, baseMood, gameState]);

  // Update mood when base mood changes (but preserve event-triggered moods)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMood(baseMood);
    }, 100);
    return () => clearTimeout(timer);
  }, [baseMood]);

  return mood;
}
