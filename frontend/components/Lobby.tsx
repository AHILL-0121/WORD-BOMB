"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomCode } from "@/lib/syllables";
import { AvatarSelector } from "./AvatarSelector";
import { FuseCharacter } from "./FuseCharacter";
import { getRandomAvatar, type AvatarId } from "@/lib/avatars";

export function Lobby() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>(getRandomAvatar());
  const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
  const router = useRouter();

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    const code = generateRoomCode();
    router.push(`/room/${code}?name=${encodeURIComponent(playerName)}&avatar=${avatar}`);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    router.push(`/room/${roomCode.toUpperCase()}?name=${encodeURIComponent(playerName)}&avatar=${avatar}`);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Hero Title */}
        <div className="text-center mb-16 space-y-6">
          {/* FUSE Mascot */}
          <div className="flex justify-center">
            <FuseCharacter mood={mode === "menu" ? "idle" : "thinking"} size={140} showSpeech={false} />
          </div>
          
          <h1 className="font-display text-8xl md:text-9xl text-cream leading-none mb-4">
            WORD <span className="text-ember">BOMB</span> 💣
          </h1>
          <p className="font-mono text-smoke text-sm tracking-widest uppercase">
            Real-Time Multiplayer Word Game
          </p>
        </div>

        {/* Menu */}
        {mode === "menu" && (
          <div className="space-y-6 animate-[slideUpFade_0.6s_ease]">
            <input
              type="text"
              placeholder="ENTER YOUR NAME"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-ash border border-cinder text-cream font-display text-2xl px-6 py-4 
                       focus:outline-none focus:border-acid transition-colors placeholder:text-smoke"
              maxLength={20}
            />
            
            <AvatarSelector selected={avatar} onSelect={setAvatar} />
            
            <button
              onClick={() => setMode("create")}
              disabled={!playerName.trim()}
              className="w-full bg-ember text-black font-display text-3xl py-6 px-8 
                       hover:bg-flame transition-all hover:scale-[1.02] disabled:opacity-50 
                       disabled:hover:scale-100 disabled:cursor-not-allowed clip-corner"
            >
              CREATE ROOM
            </button>
            
            <button
              onClick={() => setMode("join")}
              disabled={!playerName.trim()}
              className="w-full bg-transparent border border-smoke text-cream font-display text-3xl py-6 px-8 
                       hover:border-acid hover:text-acid transition-all disabled:opacity-50 
                       disabled:hover:border-smoke disabled:hover:text-cream disabled:cursor-not-allowed"
            >
              JOIN ROOM
            </button>
          </div>
        )}

        {/* Create Room */}
        {mode === "create" && (
          <div className="space-y-4 animate-[slideUpFade_0.6s_ease]">
            <p className="text-cream font-body text-lg mb-6">
              Create a new game room and share the code with your friends!
            </p>
            
            <button
              onClick={handleCreateRoom}
              className="w-full bg-ember text-black font-display text-3xl py-6 px-8 
                       hover:bg-flame transition-all hover:scale-[1.02] clip-corner"
            >
              GENERATE ROOM CODE
            </button>
            
            <button
              onClick={() => setMode("menu")}
              className="w-full bg-transparent border border-smoke text-smoke font-display text-xl py-4 px-8 
                       hover:border-cream hover:text-cream transition-all"
            >
              BACK
            </button>
          </div>
        )}

        {/* Join Room */}
        {mode === "join" && (
          <div className="space-y-4 animate-[slideUpFade_0.6s_ease]">
            <input
              type="text"
              placeholder="ENTER ROOM CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full bg-ash border border-cinder text-cream font-display text-3xl px-6 py-4 
                       text-center tracking-widest focus:outline-none focus:border-acid transition-colors 
                       placeholder:text-smoke"
              maxLength={6}
            />
            
            <button
              onClick={handleJoinRoom}
              disabled={!roomCode.trim() || roomCode.length !== 6}
              className="w-full bg-ember text-black font-display text-3xl py-6 px-8 
                       hover:bg-flame transition-all hover:scale-[1.02] disabled:opacity-50 
                       disabled:hover:scale-100 disabled:cursor-not-allowed clip-corner"
            >
              JOIN GAME
            </button>
            
            <button
              onClick={() => setMode("menu")}
              className="w-full bg-transparent border border-smoke text-smoke font-display text-xl py-4 px-8 
                       hover:border-cream hover:text-cream transition-all"
            >
              BACK
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .clip-corner {
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
        }
      `}</style>
    </div>
  );
}
