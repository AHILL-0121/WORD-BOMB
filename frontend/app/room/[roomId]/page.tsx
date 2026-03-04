"use client";

import { useParams, useSearchParams } from "next/navigation";
import { GameRoom } from "@/components/GameRoom";
import { Suspense } from "react";
import type { AvatarId } from "@/lib/avatars";

function RoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const playerName = searchParams.get("name") || "Anonymous";
  const avatar = (searchParams.get("avatar") || "robot") as AvatarId;

  return <GameRoom roomId={roomId} playerName={playerName} avatar={avatar} />;
}

export default function RoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-spin">💣</div>
          <p className="font-mono text-smoke text-sm tracking-widest">LOADING...</p>
        </div>
      </div>
    }>
      <RoomContent />
    </Suspense>
  );
}
