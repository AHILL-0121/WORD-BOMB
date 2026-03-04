"use client";

import type { Player } from "@/types/game";
import { getAvatar } from "@/lib/avatars";

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  myId: string;
}

export function PlayerList({ players, currentPlayerId, myId }: PlayerListProps) {
  return (
    <div className="space-y-3">
      <h2 className="font-mono text-xs tracking-widest text-smoke uppercase mb-4">
        Players ({players.length})
      </h2>
      
      {players.map((player) => {
        const isActive = player.id === currentPlayerId;
        const isMe = player.id === myId;
        const isEliminated = player.isEliminated;

        return (
          <div
            key={player.id}
            className={`
              flex items-center gap-4 p-4 border transition-all
              ${isActive ? 'border-acid bg-acid/5 animate-[countdownPulse_1.5s_ease_infinite]' : 'border-cinder'}
              ${isEliminated ? 'opacity-30 grayscale' : ''}
            `}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="w-1 h-full bg-acid absolute left-0 top-0 bottom-0" />
            )}

            {/* Player info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {/* Avatar */}
                <span className="text-2xl">
                  {getAvatar(player.avatar || 'robot').emoji}
                </span>
                
                <span className="font-display text-xl text-cream">
                  {player.name}
                </span>
                {player.isHost && (
                  <span className="font-mono text-xs text-gold border border-gold px-2 py-0.5">
                    HOST
                  </span>
                )}
                {player.isAI && (
                  <span className="font-mono text-xs text-acid border border-acid px-2 py-0.5">
                    AI
                  </span>
                )}
                {isMe && (
                  <span className="font-mono text-xs text-acid border border-acid px-2 py-0.5">
                    YOU
                  </span>
                )}
              </div>
            </div>

            {/* Lives */}
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-xl transition-all ${
                    i < player.lives ? 'text-ember scale-100' : 'text-cinder scale-75'
                  }`}
                >
                  ❤️
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
