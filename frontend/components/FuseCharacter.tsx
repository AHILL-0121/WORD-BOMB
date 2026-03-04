"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FuseSVG } from "./FuseSVG";
import { MOODS, getRandomDialogue, type FuseMood } from "@/lib/fuse-moods";

interface FuseCharacterProps {
  mood: FuseMood;
  size?: number;
  showSpeech?: boolean;
  customDialogue?: string;
}

export function FuseCharacter({ mood, size = 180, showSpeech = true, customDialogue }: FuseCharacterProps) {
  const [speech, setSpeech] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const speechTimer = useRef<NodeJS.Timeout | null>(null);
  const prevMood = useRef<FuseMood>(mood);

  const showSpeechBubble = useCallback((text: string, duration = 3000) => {
    if (!showSpeech) return;
    setExiting(false);
    setSpeech(text);
    if (speechTimer.current) clearTimeout(speechTimer.current);
    speechTimer.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => setSpeech(null), 250);
    }, duration);
  }, [showSpeech]);

  // React to mood changes
  useEffect(() => {
    if (mood !== prevMood.current) {
      const dialogue = customDialogue || getRandomDialogue(mood);
      const duration = mood === "angry" ? 2000 : mood === "celebrating" ? 4000 : 3000;
      showSpeechBubble(dialogue, duration);
      
      if (mood === "celebrating") {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 1500);
      }
      
      prevMood.current = mood;
    }
  }, [mood, customDialogue, showSpeechBubble]);

  const m = MOODS[mood];

  return (
    <div className="fuse-character-wrapper" style={{ position: "relative", display: "inline-block" }}>
      {/* Speech Bubble */}
      {speech && showSpeech && (
        <SpeechBubble text={speech} mood={mood} exiting={exiting} />
      )}
      
      {/* Confetti */}
      {confetti && <Confetti />}
      
      {/* Character */}
      <FuseSVG mood={mood} size={size} />

      <style jsx>{`
        .fuse-character-wrapper {
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}

function SpeechBubble({ text, mood, exiting }: { text: string; mood: FuseMood; exiting: boolean }) {
  const isAngry = mood === "angry";
  const borderColor = MOODS[mood]?.color || "#ff8c42";
  
  return (
    <div 
      className={`speech-bubble ${exiting ? "exiting" : ""}`}
      style={{
        position: "absolute",
        bottom: "105%",
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--ash)",
        border: `1.5px solid ${borderColor}`,
        padding: "12px 18px",
        minWidth: 180,
        maxWidth: 260,
        textAlign: "center",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        color: "var(--cream)",
        letterSpacing: 1,
        lineHeight: 1.5,
        zIndex: 10,
        whiteSpace: "nowrap",
        boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 20px ${borderColor}30`,
        animation: exiting ? "speech-exit 0.25s ease forwards" : "speech-appear 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
      }}
    >
      {/* Tail */}
      <div style={{
        position: "absolute",
        bottom: -9,
        left: "50%",
        transform: "translateX(-50%)",
        width: 0,
        height: 0,
        borderLeft: "8px solid transparent",
        borderRight: "8px solid transparent",
        borderTop: `8px solid ${borderColor}`,
      }} />
      <div style={{
        position: "absolute",
        bottom: -6,
        left: "50%",
        transform: "translateX(-50%)",
        width: 0,
        height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderTop: "6px solid var(--ash)",
      }} />
      {isAngry ? text.toUpperCase() : text}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: 40 + Math.random() * 220,
    delay: Math.random() * 0.5,
    sx: (Math.random() - 0.5) * 60,
    rot: Math.random() * 720 - 360,
    color: ["#ff4500", "#ffc340", "#d4ff00", "#ff8c42", "#f5f0e8"][i % 5],
    size: 5 + Math.random() * 7,
  }));

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: p.x,
            top: -10,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.size < 8 ? "50%" : "2px",
            animation: `confetti-fall 1.2s ease-in forwards`,
            animationDelay: `${p.delay}s`,
            "--cx": `${p.x}px`,
            "--csx": `${p.sx}px`,
            "--cr": `${p.rot}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
