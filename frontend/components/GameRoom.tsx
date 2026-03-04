"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWordBombGame } from "@/hooks/usePartySocket";
import { useFuseMood } from "@/hooks/useFuseMood";
import { BombTimer } from "./BombTimer";
import { PlayerList } from "./PlayerList";
import { ResultsScreen } from "./ResultsScreen";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { FuseCharacter } from "./FuseCharacter";
import type { RoomSettings } from "@/types/game";

interface GameRoomProps {
  roomId: string;
  playerName: string;
  avatar: string;
}

export function GameRoom({ roomId, playerName, avatar }: GameRoomProps) {
  const router = useRouter();
  const { gameState, myId, submitWord, startGame, restart, updateSettings, lastMessage } = useWordBombGame(roomId, playerName, avatar);
  const [wordInput, setWordInput] = useState("");
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // FUSE mood tracking
  const fuseMood = useFuseMood({ gameState, myId, lastMessage });

  const myPlayer = gameState?.players.find(p => p.id === myId);
  const isHost = myPlayer?.isHost || false;
  const activePlayers = gameState?.players.filter(p => !p.isEliminated) || [];
  const currentPlayer = activePlayers[gameState?.currentPlayerIndex || 0];
  const isMyTurn = currentPlayer?.id === myId;

  // Handle notifications
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'word-accepted':
        showNotification('success', `✓ ${lastMessage.word.toUpperCase()} accepted!`);
        break;
      case 'word-rejected':
        const reasons = {
          'invalid': '✗ Not a valid English word',
          'already-used': '✗ Word already used',
          'no-syllable': '✗ Word must contain the syllable',
          'not-your-turn': '✗ Not your turn',
        };
        showNotification('error', reasons[lastMessage.reason] || '✗ Invalid word');
        break;
      case 'life-lost':
        if (lastMessage.playerId === myId) {
          showNotification('error', `💔 Lost a life! ${lastMessage.livesRemaining} remaining`);
        }
        break;
      case 'player-eliminated':
        const eliminatedPlayer = gameState?.players.find(p => p.id === lastMessage.playerId);
        if (eliminatedPlayer) {
          showNotification('error', `${eliminatedPlayer.name} has been eliminated!`);
        }
        break;
    }
  }, [lastMessage, myId, gameState?.players]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordInput.trim() || !isMyTurn) return;

    submitWord(wordInput.trim());
    setWordInput("");
  };

  // Auto-focus input on turn change
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn]);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <img 
            src="/bomb-pixel.png" 
            alt="Loading" 
            className="w-16 h-16 mx-auto animate-spin"
            onError={(e) => {
              // Fallback to emoji if image doesn't exist
              e.currentTarget.outerHTML = '<div class="text-6xl animate-spin">💣</div>';
            }}
          />
          <p className="font-mono text-smoke text-sm tracking-widest">CONNECTING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-cream p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/logo.png" 
              alt="Word Bomb" 
              className="h-12 w-auto"
              onError={(e) => {
                // Fallback to text if image doesn't exist
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <h1 className="font-display text-4xl text-cream">
                WORD <span className="text-ember">BOMB</span>
              </h1>
              <p className="font-mono text-xs text-smoke tracking-widest mt-1">
                ROOM: {roomId}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {gameState.phase === 'playing' && (
              <div className="font-mono text-sm text-smoke">
                ROUND {gameState.round}
              </div>
            )}
            
            <button
              onClick={() => router.push('/')}
              className="bg-cinder border-2 border-smoke/30 text-smoke font-mono text-sm py-2 px-6 rounded-lg
                       hover:bg-smoke/20 hover:border-smoke hover:text-cream transition-all hover:scale-105 active:scale-95"
              title="Leave room and return to home"
            >
              ← EXIT
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Player List */}
        <div className="lg:col-span-1">
          <PlayerList
            players={gameState.players}
            currentPlayerId={currentPlayer?.id}
            myId={myId}
          />
        </div>

        {/* Center: Game Area */}
        <div className="lg:col-span-2">
          {gameState.phase === 'lobby' && (
            <div className="bg-ash border-2 border-smoke/30 rounded-xl p-12 text-center space-y-6">
              <h2 className="font-display text-5xl text-cream mb-8">
                WAITING FOR PLAYERS...
              </h2>

              {/* FUSE Character */}
              <div className="flex justify-center my-8">
                <FuseCharacter mood={fuseMood} size={160} />
              </div>
              
              <p className="font-body text-lg text-smoke">
                {gameState.players.length} player{gameState.players.length !== 1 ? 's' : ''} in lobby
              </p>

              {isHost && (
                <div className="pt-4 space-y-4">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="bg-ash border-2 border-smoke/50 text-cream font-mono text-sm py-3 px-8 rounded-lg
                             hover:bg-smoke/20 transition-all hover:scale-105 active:scale-95"
                  >
                    ⚙️ ROOM SETTINGS
                  </button>
                </div>
              )}

              {/* Start Game Button - check for AI mode or multiplayer requirements */}
              {isHost && (gameState.settings.aiMode ? gameState.players.length >= 1 : gameState.players.length >= 2) && (
                <div className="pt-4">
                  <button
                    onClick={startGame}
                    className="bg-ember text-cream font-display text-4xl py-6 px-16 rounded-xl
                             hover:bg-ember/80 transition-all hover:scale-105 active:scale-95
                             shadow-lg hover:shadow-ember/50 border-2 border-ember/50"
                  >
                    START GAME
                  </button>
                </div>
              )}

              {/* Message when can't start */}
              {isHost && (gameState.settings.aiMode ? gameState.players.length < 1 : gameState.players.length < 2) && (
                <p className="font-mono text-sm text-smoke mt-4">
                  {gameState.settings.aiMode 
                    ? "You're ready to fight the AI!"
                    : "Need at least 2 players to start"}
                </p>
              )}

              {!isHost && (
                <p className="font-mono text-sm text-smoke mt-4">
                  Waiting for host to start the game...
                </p>
              )}
            </div>
          )}

          {gameState.phase === 'playing' && (
            <div className="space-y-8">
              {/* Timer and Syllable */}
              <div className="bg-ash border border-cinder p-12 text-center space-y-8">
                <BombTimer
                  timerEndsAt={gameState.timerEndsAt}
                  timerDuration={gameState.timerDuration}
                />

                {/* FUSE Character */}
                <div className="flex justify-center">
                  <FuseCharacter mood={fuseMood} size={140} />
                </div>

                <div className="space-y-4">
                  <div className="font-mono text-xs text-smoke tracking-widest">
                    FIND A WORD CONTAINING:
                  </div>
                  <div className="font-display text-8xl text-acid tracking-wider animate-[glowPulse_3s_ease-in-out_infinite]">
                    {gameState.currentSyllable.toUpperCase()}
                  </div>
                </div>

                {/* Current Turn Indicator */}
                <div className="pt-4">
                  {isMyTurn ? (
                    <p className="font-display text-2xl text-acid animate-pulse">
                      YOUR TURN!
                    </p>
                  ) : (
                    <p className="font-display text-xl text-smoke">
                      {currentPlayer?.name}'s turn...
                    </p>
                  )}
                </div>
              </div>

              {/* Word Input */}
              <div className="bg-ash border border-cinder p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={wordInput}
                    onChange={(e) => setWordInput(e.target.value)}
                    placeholder={isMyTurn ? "TYPE YOUR WORD..." : "WAIT FOR YOUR TURN..."}
                    disabled={!isMyTurn}
                    className="w-full bg-transparent border-b-2 border-smoke text-cream font-display 
                             text-4xl px-0 py-4 uppercase tracking-wider focus:outline-none 
                             focus:border-acid transition-colors placeholder:text-smoke/50
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    maxLength={50}
                  />
                  
                  <button
                    type="submit"
                    disabled={!isMyTurn || !wordInput.trim()}
                    className="w-full bg-ember text-black font-display text-2xl py-4 px-8 
                             hover:bg-flame transition-all hover:scale-[1.02] disabled:opacity-50 
                             disabled:hover:scale-100 disabled:cursor-not-allowed clip-corner"
                  >
                    SUBMIT WORD
                  </button>
                </form>

                {/* Used Words */}
                {gameState.usedWords.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-cinder">
                    <p className="font-mono text-xs text-smoke tracking-widest mb-3">
                      USED WORDS ({gameState.usedWords.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {gameState.usedWords.map((word, i) => (
                        <span
                          key={i}
                          className="font-mono text-xs text-smoke border border-cinder px-3 py-1"
                        >
                          {word.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-8 right-8 z-50 animate-[slideInRight_0.4s_ease]">
          <div
            className={`
              px-6 py-4 font-display text-xl border-l-4 
              ${notification.type === 'success' ? 'bg-ash border-acid text-acid' : 'bg-ash border-ember text-ember'}
            `}
          >
            {notification.text}
          </div>
        </div>
      )}

      {/* Results Screen */}
      {gameState.phase === 'game-over' && gameState.winner && (
        <ResultsScreen
          winnerName={gameState.winner.name}
          isHost={isHost}
          onRestart={restart}
        />
      )}

      <style jsx>{`
        .clip-corner {
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
        }
        
        @keyframes glowPulse {
          0%, 100% {
            text-shadow: 0 0 10px #d4ff00, 0 0 40px #d4ff00;
          }
          50% {
            text-shadow: 0 0 20px #ffc340, 0 0 80px #ffc340;
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(80px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>

      {/* Room Settings Modal */}
      {isHost && showSettings && (
        <RoomSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={gameState.settings}
          onSave={updateSettings}
        />
      )}
    </div>
  );
}
