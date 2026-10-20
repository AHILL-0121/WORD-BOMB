"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWordBombGame, type ConnectionStatus } from "@/hooks/usePartySocket";
import { useFuseMood } from "@/hooks/useFuseMood";
import { LobbyView } from "./room/LobbyView";
import { GameView } from "./room/GameView";
import { ResultsView } from "./room/ResultsView";
import { Fuse } from "./ui/Fuse";
import { ToastStack, useToasts } from "./ui/Toasts";

interface GameRoomProps {
  roomId: string;
  playerName: string;
  avatar: string;
  /** Came from "Solo vs bots": fill the room with bots once we are host. */
  solo?: boolean;
}

export function GameRoom({ roomId, playerName, avatar, solo = false }: GameRoomProps) {
  const router = useRouter();
  const game = useWordBombGame(roomId, playerName, avatar);
  const { gameState, myId, status, roomError, dismissRoomError, updateSettings } = game;
  const { toasts, toast } = useToasts();
  const mood = useFuseMood({ gameState, myId, subscribe: game.subscribe, serverNow: game.serverNow });

  useEffect(() => {
    if (!roomError) return;
    toast(roomError, "bad");
    // Clear it immediately so the same message can be surfaced again later.
    dismissRoomError();
  }, [roomError, toast, dismissRoomError]);

  // Solo practice: once the room exists and we own it, seat three bots.
  const soloApplied = useRef(false);
  const me = gameState?.players.find((p) => p.id === myId);
  useEffect(() => {
    if (!solo || soloApplied.current || !me?.isHost || gameState?.phase !== "lobby") return;
    soloApplied.current = true;
    if (!gameState.settings.aiMode) updateSettings({ aiMode: true, aiCount: 3 });
  }, [solo, me?.isHost, gameState, updateSettings]);

  const goHome = () => router.push("/");

  if (!gameState) {
    return <ConnectionScreen status={status} onExit={goHome} onRetry={() => location.reload()} />;
  }

  return (
    <>
      {gameState.phase === "lobby" && (
        <LobbyView
          state={gameState}
          myId={myId}
          roomId={roomId}
          status={status}
          mood={mood}
          onStart={game.startGame}
          onUpdateSettings={updateSettings}
          onLeave={goHome}
          toast={toast}
        />
      )}
      {gameState.phase === "playing" && (
        <GameView
          state={gameState}
          myId={myId}
          roomId={roomId}
          status={status}
          mood={mood}
          serverNow={game.serverNow}
          typing={game.typing}
          subscribe={game.subscribe}
          onSubmit={game.submitWord}
          onTyping={game.sendTyping}
          onShout={game.shout}
          onLeave={goHome}
          toast={toast}
        />
      )}
      {gameState.phase === "game-over" && (
        <ResultsView
          state={gameState}
          myId={myId}
          onRestart={game.restart}
          onVote={game.vote}
          onHome={goHome}
          toast={toast}
        />
      )}
      <ToastStack toasts={toasts} />
    </>
  );
}

function ConnectionScreen({
  status,
  onExit,
  onRetry,
}: {
  status: ConnectionStatus;
  onExit: () => void;
  onRetry: () => void;
}) {
  const failed = status === "error";

  return (
    <main className="center-page">
      <Fuse mood={failed ? "dead" : "thinking"} className="hero-bomb" />
      <h1>{failed ? "No signal." : status === "reconnecting" ? "Reconnecting…" : "Lighting the fuse…"}</h1>
      <p role="status" aria-live="polite">
        {failed ? (
          <>
            Couldn&apos;t reach the game server. It may be offline, or <code>NEXT_PUBLIC_PARTYKIT_HOST</code> may be
            misconfigured.
          </>
        ) : (
          "Connecting to the room."
        )}
      </p>
      {/* Previously this screen showed "CONNECTING..." forever with no way out. */}
      {failed && (
        <div className="actions">
          <button className="btn btn-primary" onClick={onRetry}>Try again</button>
          <button className="btn" onClick={onExit}>Go home</button>
        </div>
      )}
    </main>
  );
}
