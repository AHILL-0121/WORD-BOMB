"use client";

interface ResultsScreenProps {
  winnerName: string;
  isHost: boolean;
  onRestart: () => void;
}

export function ResultsScreen({ winnerName, isHost, onRestart }: ResultsScreenProps) {
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 animate-[slideUpFade_0.6s_ease]">
      <div className="text-center space-y-8 p-8">
        {/* Trophy */}
        <div className="text-9xl animate-[scaleIn_0.8s_cubic-bezier(0.34,1.56,0.64,1)]">
          🏆
        </div>

        {/* Winner announcement */}
        <div className="space-y-4">
          <h2 className="font-display text-7xl text-acid animate-[glowPulse_2s_ease-in-out_infinite]">
            VICTORY!
          </h2>
          <p className="font-display text-4xl text-cream">
            {winnerName} <span className="text-ember">WINS</span>
          </p>
        </div>

        {/* Host controls */}
        {isHost && (
          <div className="pt-8">
            <button
              onClick={onRestart}
              className="bg-ember text-black font-display text-2xl py-4 px-12 
                       hover:bg-flame transition-all hover:scale-105 clip-corner"
            >
              PLAY AGAIN
            </button>
          </div>
        )}

        {!isHost && (
          <p className="font-mono text-smoke text-sm">
            Waiting for host to start a new game...
          </p>
        )}
      </div>

      <style jsx>{`
        .clip-corner {
          clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
        }
        
        @keyframes glowPulse {
          0%, 100% {
            text-shadow: 0 0 10px #d4ff00, 0 0 40px #d4ff00;
          }
          50% {
            text-shadow: 0 0 20px #ffc340, 0 0 80px #ffc340, 0 0 120px #ff6a1a;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.5) rotate(-10deg);
          }
          to {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(60px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
