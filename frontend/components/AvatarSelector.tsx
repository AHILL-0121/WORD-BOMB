"use client";

import { AVATARS, type AvatarId } from "@/lib/avatars";

interface AvatarSelectorProps {
  selected: AvatarId;
  onSelect: (avatarId: AvatarId) => void;
}

export function AvatarSelector({ selected, onSelect }: AvatarSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="font-mono text-xs text-smoke tracking-widest uppercase">
        Choose Avatar
      </label>
      <div className="grid grid-cols-8 gap-2">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => onSelect(avatar.id)}
            className={`
              relative aspect-square rounded-lg transition-all
              flex items-center justify-center text-4xl
              hover:scale-110 active:scale-95
              ${
                selected === avatar.id
                  ? 'bg-acid/20 border-2 border-acid ring-2 ring-acid/50'
                  : 'bg-ash border-2 border-smoke/30 hover:border-gold/50'
              }
            `}
            title={avatar.name}
          >
            {avatar.emoji}
            {selected === avatar.id && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-acid rounded-full border-2 border-black" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
