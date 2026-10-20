"use client";

import usePartySocket from "partysocket/react";
import { useState, useCallback, useRef, useEffect } from "react";
import type { GameState, RoomSettings, ServerMessage, Shout } from "@/types/game";

/** Minimum gap between live-typing frames sent to the server. */
const TYPING_SEND_MS = 90;

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "error";

interface UseWordBombGameReturn {
  gameState: GameState | null;
  myId: string;
  status: ConnectionStatus;
  /** Latest non-gameplay error from the server (room full, not host, ...). */
  roomError: string | null;
  dismissRoomError: () => void;
  /**
   * The server's clock, approximated on this device. The countdown is driven by
   * server timestamps, so comparing them against a local `Date.now()` showed a
   * visibly wrong timer on any machine whose clock had drifted.
   */
  serverNow: () => number;
  submitWord: (word: string) => void;
  startGame: () => void;
  restart: () => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  /** Relays what you have typed so far. Throttled; the last value always goes out. */
  sendTyping: (text: string) => void;
  shout: (shout: Shout) => void;
  vote: (word: string) => void;
  /** What the player on the clock has typed so far, as relayed by the server. */
  typing: { playerId: string; text: string } | null;
  /**
   * Registers a listener for every server message; returns the unsubscribe.
   *
   * This replaced a `lastMessage` state value. Messages often arrive in bursts
   * (`word-accepted` immediately followed by `state-update`), React batched the
   * updates, and only the last message of a burst was ever seen, so event
   * reactions were silently dropped.
   */
  subscribe: (listener: (msg: ServerMessage) => void) => () => void;
}

export function useWordBombGame(
  roomId: string,
  playerName: string,
  avatar: string
): UseWordBombGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myId, setMyId] = useState<string>("");
  const listeners = useRef(new Set<(msg: ServerMessage) => void>());
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [roomError, setRoomError] = useState<string | null>(null);
  const [typing, setTyping] = useState<{ playerId: string; text: string } | null>(null);

  /** serverClock - localClock, in ms. */
  const clockOffset = useRef(0);
  const hasConnectedOnce = useRef(false);

  const getSessionId = useCallback(() => {
    const key = `wordbomb_session_${roomId}`;
    try {
      let sessionId = window.localStorage.getItem(key);
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        window.localStorage.setItem(key, sessionId);
      }
      return sessionId;
    } catch {
      // Private browsing or blocked storage: fall back to a per-tab id. The
      // player simply loses the reconnection grace period.
      return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }
  }, [roomId]);

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999",
    party: "word-bomb-server",
    room: roomId,
    onOpen() {
      hasConnectedOnce.current = true;
      setStatus("connected");
      socket.send(
        JSON.stringify({ type: "join", playerName, sessionId: getSessionId(), avatar })
      );
    },
    onClose() {
      // partysocket retries on its own; distinguish a first connection from a
      // dropped one so the UI can say which is happening.
      setStatus(hasConnectedOnce.current ? "reconnecting" : "connecting");
    },
    onError() {
      setStatus(hasConnectedOnce.current ? "reconnecting" : "error");
    },
    onMessage(event) {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      listeners.current.forEach((listener) => listener(msg));

      switch (msg.type) {
        case "player-id":
          setMyId(msg.playerId);
          break;
        case "state-update":
          clockOffset.current = msg.state.serverNow - Date.now();
          setGameState(msg.state);
          // A new turn clears the previous player's half-typed word.
          setTyping((t) => (t && t.playerId === msg.state.currentPlayerId ? t : null));
          break;
        case "typing":
          setTyping({ playerId: msg.playerId, text: msg.text });
          break;
        case "room-error":
          setRoomError(msg.message);
          break;
      }
    },
  });

  // Never leave the user on "connecting" forever with no explanation.
  useEffect(() => {
    if (status !== "connecting") return;
    const timeout = setTimeout(() => {
      setStatus((current) => (current === "connecting" ? "error" : current));
    }, 10_000);
    return () => clearTimeout(timeout);
  }, [status]);

  const serverNow = useCallback(() => Date.now() + clockOffset.current, []);
  const dismissRoomError = useCallback(() => setRoomError(null), []);

  const submitWord = useCallback(
    (word: string) => socket.send(JSON.stringify({ type: "submit-word", word })),
    [socket]
  );
  const startGame = useCallback(
    () => socket.send(JSON.stringify({ type: "start-game" })),
    [socket]
  );
  const restart = useCallback(
    () => socket.send(JSON.stringify({ type: "restart" })),
    [socket]
  );
  const updateSettings = useCallback(
    (settings: Partial<RoomSettings>) =>
      socket.send(JSON.stringify({ type: "update-settings", settings })),
    [socket]
  );

  const lastTypingSent = useRef(0);
  const pendingTyping = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTyping = useCallback(
    (text: string) => {
      if (pendingTyping.current) clearTimeout(pendingTyping.current);
      const flush = () => {
        lastTypingSent.current = Date.now();
        pendingTyping.current = null;
        socket.send(JSON.stringify({ type: "typing", text }));
      };
      const wait = TYPING_SEND_MS - (Date.now() - lastTypingSent.current);
      if (wait <= 0) flush();
      else pendingTyping.current = setTimeout(flush, wait);
    },
    [socket]
  );
  useEffect(() => () => {
    if (pendingTyping.current) clearTimeout(pendingTyping.current);
  }, []);

  const shout = useCallback(
    (value: Shout) => socket.send(JSON.stringify({ type: "shout", shout: value })),
    [socket]
  );
  const vote = useCallback(
    (word: string) => socket.send(JSON.stringify({ type: "vote", word })),
    [socket]
  );

  const subscribe = useCallback((listener: (msg: ServerMessage) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  return {
    gameState,
    myId,
    status,
    roomError,
    dismissRoomError,
    serverNow,
    submitWord,
    startGame,
    restart,
    updateSettings,
    sendTyping,
    shout,
    vote,
    typing,
    subscribe,
  };
}
