"use client";

import usePartySocket from "partysocket/react";
import { useState, useCallback, useEffect } from "react";
import type { GameState, ServerMessage } from "@/types/game";

interface UseWordBombGameReturn {
  gameState: GameState | null;
  myId: string;
  submitWord: (word: string) => void;
  startGame: () => void;
  restart: () => void;
  updateSettings: (settings: any) => void;
  lastMessage: ServerMessage | null;
}

export function useWordBombGame(roomId: string, playerName: string, avatar: string): UseWordBombGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);

  // Generate or retrieve persistent session ID
  const getSessionId = useCallback(() => {
    const key = `wordbomb_session_${roomId}`;
    let sessionId = localStorage.getItem(key);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(key, sessionId);
    }
    return sessionId;
  }, [roomId]);

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
    room: roomId,
    onOpen(event) {
      // Send join message with session ID and avatar for reconnection
      const sessionId = getSessionId();
      socket.send(JSON.stringify({ 
        type: 'join', 
        playerName,
        sessionId,
        avatar
      }));
    },
    onMessage(event) {
      const msg: ServerMessage = JSON.parse(event.data);
      setLastMessage(msg);
      
      // Handle player ID assignment
      if (msg.type === 'player-id') {
        setMyId(msg.playerId);
      }
      
      if (msg.type === 'state-update') {
        setGameState(msg.state);
      }
    },
  });

  const submitWord = useCallback((word: string) => {
    socket.send(JSON.stringify({ type: 'submit-word', word }));
  }, [socket]);

  const startGame = useCallback(() => {
    socket.send(JSON.stringify({ type: 'start-game' }));
  }, [socket]);

  const restart = useCallback(() => {
    socket.send(JSON.stringify({ type: 'restart' }));
  }, [socket]);

  const updateSettings = useCallback((settings: any) => {
    socket.send(JSON.stringify({ type: 'update-settings', settings }));
  }, [socket]);

  return { gameState, myId, submitWord, startGame, restart, updateSettings, lastMessage };
}
