"use client";

import { useState, useEffect } from "react";
import type { RoomSettings } from "@/types/game";

interface RoomSettingsModalProps {
  isOpen: boolean;
  settings: RoomSettings;
  onSave: (settings: Partial<RoomSettings>) => void;
  onClose: () => void;
}

export function RoomSettingsModal({ isOpen, settings, onSave, onClose }: RoomSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<RoomSettings>(settings);

  // Reset local settings when modal opens or settings change
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-ash border-2 border-smoke/30 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-4xl text-cream">ROOM SETTINGS</h2>
          <button
            onClick={onClose}
            className="text-smoke hover:text-cream transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Game Mode */}
          <div className="space-y-3">
            <label className="font-mono text-xs text-smoke tracking-widest uppercase">
              Game Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLocalSettings({ ...localSettings, aiMode: false })}
                className={`
                  p-4 rounded-lg font-body text-lg transition-all
                  ${
                    !localSettings.aiMode
                      ? 'bg-acid/20 border-2 border-acid text-cream'
                      : 'bg-cinder border-2 border-smoke/30 text-smoke hover:border-gold/50'
                  }
                `}
              >
                🌐 Multiplayer
              </button>
              <button
                onClick={() => setLocalSettings({ ...localSettings, aiMode: true })}
                className={`
                  p-4 rounded-lg font-body text-lg transition-all
                  ${
                    localSettings.aiMode
                      ? 'bg-acid/20 border-2 border-acid text-cream'
                      : 'bg-cinder border-2 border-smoke/30 text-smoke hover:border-gold/50'
                  }
                `}
              >
                🤖 vs AI
              </button>
            </div>
          </div>

          {/* AI Settings (only if AI mode) */}
          {localSettings.aiMode && (
            <div className="space-y-3">
              <label className="font-mono text-xs text-smoke tracking-widest uppercase">
                AI Opponents: {localSettings.aiCount}
              </label>
              <input
                type="range"
                min="1"
                max="3"
                value={localSettings.aiCount}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, aiCount: parseInt(e.target.value) })
                }
                className="w-full accent-acid"
              />
              <div className="flex justify-between font-mono text-xs text-smoke">
                <span>1</span>
                <span>2</span>
                <span>3</span>
              </div>
            </div>
          )}

          {/* Difficulty */}
          <div className="space-y-3">
            <label className="font-mono text-xs text-smoke tracking-widest uppercase">
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setLocalSettings({ ...localSettings, difficulty: diff })}
                  className={`
                    p-3 rounded-lg font-body capitalize transition-all
                    ${
                      localSettings.difficulty === diff
                        ? 'bg-gold/20 border-2 border-gold text-cream'
                        : 'bg-cinder border-2 border-smoke/30 text-smoke hover:border-gold/50'
                    }
                  `}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          {/* Max Players (only multiplayer) */}
          {!localSettings.aiMode && (
            <div className="space-y-3">
              <label className="font-mono text-xs text-smoke tracking-widest uppercase">
                Max Players: {localSettings.maxPlayers}
              </label>
              <input
                type="range"
                min="2"
                max="16"
                value={localSettings.maxPlayers}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, maxPlayers: parseInt(e.target.value) })
                }
                className="w-full accent-acid"
              />
              <div className="flex justify-between font-mono text-xs text-smoke">
                <span>2</span>
                <span>8</span>
                <span>16</span>
              </div>
            </div>
          )}

          {/* Starting Lives */}
          <div className="space-y-3">
            <label className="font-mono text-xs text-smoke tracking-widest uppercase">
              Starting Lives: {localSettings.startingLives}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={localSettings.startingLives}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, startingLives: parseInt(e.target.value) })
              }
              className="w-full accent-ember"
            />
            <div className="flex justify-between font-mono text-xs text-smoke">
                <span>1</span>
                <span>3</span>
                <span>5</span>
              </div>
          </div>

          {/* Timer Settings */}
          <div className="space-y-3">
            <label className="font-mono text-xs text-smoke tracking-widest uppercase">
              Initial Timer: {localSettings.initialTimer}s
            </label>
            <input
              type="range"
              min="8"
              max="20"
              value={localSettings.initialTimer}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, initialTimer: parseInt(e.target.value) })
              }
              className="w-full accent-gold"
            />
          </div>

          <div className="space-y-3">
            <label className="font-mono text-xs text-smoke tracking-widest uppercase">
              Timer Decay: {localSettings.timerDecay}s per round
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localSettings.timerDecay}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, timerDecay: parseFloat(e.target.value) })
              }
              className="w-full accent-gold"
            />
          </div>

          <div className="space-y-3">
            <label className="font-mono text-xs text-smoke tracking-widest uppercase">
              Minimum Timer: {localSettings.minTimer}s
            </label>
            <input
              type="range"
              min="3"
              max="8"
              value={localSettings.minTimer}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, minTimer: parseInt(e.target.value) })
              }
              className="w-full accent-gold"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSave}
            className="flex-1 bg-acid text-black font-display text-2xl py-4 rounded-xl
                     hover:bg-acid/80 transition-all hover:scale-105 active:scale-95"
          >
            SAVE SETTINGS
          </button>
          <button
            onClick={onClose}
            className="px-8 bg-cinder text-smoke font-display text-2xl py-4 rounded-xl
                     border-2 border-smoke/30 hover:border-smoke transition-all"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
