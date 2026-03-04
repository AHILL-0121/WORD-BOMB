"use client";

import { useState } from "react";
import { Lobby } from "./Lobby";
import { FuseCharacter } from "./FuseCharacter";

export function LandingPage() {
  const [showLobby, setShowLobby] = useState(false);

  if (showLobby) {
    return <Lobby />;
  }

  return (
    <div className="min-h-screen bg-black text-cream flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 animate-slideUpFade">
        {/* Header */}
        <div className="text-center space-y-6">
          {/* FUSE Mascot */}
          <div className="flex justify-center mb-6">
            <FuseCharacter mood="excited" size={180} showSpeech={false} />
          </div>
          
          {/* Wordmark Logo */}
          <div className="flex justify-center mb-4">
            <img 
              src="/wordmark.png" 
              alt="Word Bomb" 
              className="h-24 md:h-32 w-auto"
              onError={(e) => {
                // Fallback to text if image doesn't exist
                e.currentTarget.style.display = 'none';
                document.getElementById('text-fallback')?.classList.remove('hidden');
              }}
            />
            <h1 id="text-fallback" className="hidden font-display text-8xl md:text-9xl text-ember tracking-wider animate-glowPulse">
              WORD BOMB
            </h1>
          </div>
          
          <p className="font-body text-2xl md:text-3xl text-gold">
            The Ultimate Multiplayer Word Game
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-ash rounded-2xl p-8 md:p-12 space-y-8 border-2 border-smoke/30">
          {/* How to Play */}
          <section className="space-y-4">
            <h2 className="font-display text-4xl text-acid tracking-wide">
              HOW TO PLAY
            </h2>
            <div className="space-y-3 font-body text-lg text-cream/90">
              <p>
                <span className="text-gold font-bold">1.</span> Create or join a room with friends (2-16 players)
              </p>
              <p>
                <span className="text-gold font-bold">2.</span> When it's your turn, you'll see a random syllable
              </p>
              <p>
                <span className="text-gold font-bold">3.</span> Type a valid English word containing that syllable
              </p>
              <p>
                <span className="text-gold font-bold">4.</span> Submit before the timer runs out!
              </p>
              <p>
                <span className="text-gold font-bold">5.</span> The last player standing wins
              </p>
            </div>
          </section>

          {/* Game Rules */}
          <section className="space-y-4 border-t border-smoke/30 pt-8">
            <h2 className="font-display text-4xl text-acid tracking-wide">
              RULES
            </h2>
            <div className="grid md:grid-cols-2 gap-4 font-body text-base text-cream/90">
              <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <span className="text-ember text-xl">❤️</span>
                  <span>
                    <span className="font-bold text-ember">3 Lives:</span> Each player starts with 3 lives
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-gold text-xl">⏱️</span>
                  <span>
                    <span className="font-bold text-gold">Timer:</span> Starts at 12 seconds, decreases each round
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-acid text-xl">✓</span>
                  <span>
                    <span className="font-bold text-acid">Valid Words:</span> Must be real English words
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                <p className="flex items-start gap-2">
                  <span className="text-smoke text-xl">🚫</span>
                  <span>
                    <span className="font-bold text-smoke">No Repeats:</span> Each word can only be used once per game
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-ember text-xl">💥</span>
                  <span>
                    <span className="font-bold text-ember">Elimination:</span> Run out of lives and you're out
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-gold text-xl">🏆</span>
                  <span>
                    <span className="font-bold text-gold">Victory:</span> Last player with lives remaining wins
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* CTA Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setShowLobby(true)}
              className="group relative px-12 py-5 bg-ember text-cream font-display text-3xl tracking-wider rounded-xl hover:bg-ember/90 transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-ember/50"
            >
              <span className="relative z-10">PLAY NOW</span>
              <div className="absolute inset-0 bg-gradient-to-r from-ember to-gold opacity-0 group-hover:opacity-20 rounded-xl transition-opacity" />
            </button>
          </div>
        </div>

        {/* Developer Note */}
        <div className="text-center space-y-2 pb-8">
          <p className="font-mono text-xs text-smoke/70">
            Crafted by developers who love word games and real-time multiplayer experiences
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <a 
              href="https://github.com/AHILL-0121" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-smoke hover:text-cream transition-colors"
              title="View on GitHub"
            >
              <svg 
                className="w-6 h-6" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
