"use client";

import { useEffect, useRef } from "react";

interface BombTimerProps {
  timerEndsAt: number;
  timerDuration: number;
}

export function BombTimer({ timerEndsAt, timerDuration }: BombTimerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = 70;

    const animate = () => {
      const now = Date.now();
      const remaining = Math.max(0, timerEndsAt - now);
      const pct = remaining / timerDuration;

      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Draw background circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#2a2a27';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Draw progress arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * pct));
      
      // Color based on time remaining
      if (pct > 0.5) {
        ctx.strokeStyle = '#d4ff00'; // acid
      } else if (pct > 0.25) {
        ctx.strokeStyle = '#ffc340'; // gold
      } else {
        ctx.strokeStyle = '#ff4500'; // ember
      }
      
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Draw timer text
      const seconds = Math.ceil(remaining / 1000);
      ctx.fillStyle = '#f5f0e8';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seconds.toString(), centerX, centerY);

      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [timerEndsAt, timerDuration]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas ref={canvasRef} width={200} height={200} className="animate-[float_3s_ease-in-out_infinite]" />
      
      {/* Bomb emoji overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-6xl animate-[float_3s_ease-in-out_infinite] opacity-20">💣</div>
      </div>
    </div>
  );
}
