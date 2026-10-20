"use client";

import { useId, type ReactNode } from "react";
import type { FuseMood } from "@/lib/fuse-moods";

interface FuseProps {
  mood: FuseMood;
  /** Wrapper class: `hero-bomb`, `bomb-wrap`, `mini-bomb`, ... */
  className?: string;
  /** Pupil offset in SVG units, so FUSE can look at something. */
  look?: { x: number; y: number };
  /** Rendered inside the wrapper, on top of the bomb (ring, sticker, bubble). */
  children?: ReactNode;
}

/**
 * FUSE, the bomb. Every mood is pure CSS keyed off `data-mood` on the wrapper
 * (see `.fuse-wrap[data-mood=...]` in app/design.css), so a mood change never
 * re-mounts the SVG and its animations stay continuous.
 */
export function Fuse({ mood, className = "", look, children }: FuseProps) {
  // Gradient ids must be unique per instance: a url(#id) that resolves to a
  // gradient inside a hidden element renders as black in Chrome.
  const uid = useId().replace(/:/g, "");
  const body = `fuse-body-${uid}`;
  const glow = `fuse-glow-${uid}`;

  return (
    <div className={`fuse-wrap ${className}`} data-mood={mood}>
      <div className="bomb-slot">
        <svg className="fuse" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id={body} cx="34%" cy="28%" r="78%">
              <stop offset="0" stopColor="#4f4943" />
              <stop offset=".5" stopColor="#1f1c19" />
              <stop offset="1" stopColor="#0b0a09" />
            </radialGradient>
            <radialGradient id={glow}>
              <stop offset="0" stopColor="#fff3d6" />
              <stop offset=".35" stopColor="#f5b700" />
              <stop offset="1" stopColor="#ff4d1c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M147 50 C 160 32, 178 44, 173 23" fill="none" stroke="#080706" strokeWidth="10" strokeLinecap="round" />
          <path d="M147 50 C 160 32, 178 44, 173 23" fill="none" stroke="#e9d7ae" strokeWidth="5" strokeLinecap="round" />
          <g className="spark" transform="translate(173 21)">
            <g className="spark-in">
              <circle r="17" fill={`url(#${glow})`} />
              <path d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3Z" fill="#fff3d6" />
            </g>
          </g>
          <rect x="124" y="42" width="34" height="26" rx="7" transform="rotate(40 141 55)" fill="#3a352f" stroke="#080706" strokeWidth="5" />
          <circle cx="96" cy="116" r="72" fill={`url(#${body})`} stroke="#080706" strokeWidth="6" />
          <circle className="f-tint" cx="96" cy="116" r="69" fill="#ff3b52" />
          <ellipse cx="64" cy="80" rx="18" ry="9" transform="rotate(-38 64 80)" fill="#fff" opacity=".17" />
          <g className="brows">
            <path className="b-angry" d="M62 86 L88 97 M130 86 L104 97" />
            <path className="b-worry" d="M64 95 L86 86 M128 95 L106 86" />
          </g>
          <g className="eyes">
            <ellipse cx="76" cy="108" rx="13" ry="15.5" fill="#f3ead7" />
            <ellipse cx="116" cy="108" rx="13" ry="15.5" fill="#f3ead7" />
            <g className="pupils" style={look ? { transform: `translate(${look.x}px, ${look.y}px)` } : undefined}>
              <circle cx="76" cy="110" r="6.8" fill="#080706" />
              <circle cx="116" cy="110" r="6.8" fill="#080706" />
              <circle cx="78.6" cy="107" r="2.2" fill="#fff" />
              <circle cx="118.6" cy="107" r="2.2" fill="#fff" />
            </g>
          </g>
          <g className="xeyes" stroke="#f3ead7" strokeWidth="5" strokeLinecap="round">
            <path d="M68 100 L84 116 M84 100 L68 116 M108 100 L124 116 M124 100 L108 116" />
          </g>
          <g className="cheeks" fill="#e98a7a" opacity=".5">
            <ellipse cx="58" cy="133" rx="9" ry="5" />
            <ellipse cx="134" cy="133" rx="9" ry="5" />
          </g>
          <g stroke="#f3ead7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path data-m="idle" d="M86 137 Q96 146 106 137" />
            <path data-m="happy excited" d="M80 133 Q96 162 112 133 Z" fill="#080706" />
            <path data-m="angry" d="M83 147 Q96 136 109 147" />
            <path data-m="sad" d="M86 147 Q96 139 106 147" />
            <path data-m="nervous" d="M81 142 q3.7 -5 7.5 0 t7.5 0 t7.5 0 t7.5 0" />
            <path data-m="thinking" d="M88 142 L106 139" />
            <circle data-m="dead" cx="96" cy="142" r="6" fill="#080706" />
          </g>
          <path className="sweat" d="M150 82 q-8 11 0 14 q8 -3 0 -14z" fill="#7aa6c2" stroke="#080706" strokeWidth="2" />
          <g className="thought" fill="#f3ead7" stroke="#080706" strokeWidth="2.5">
            <circle cx="30" cy="60" r="5" />
            <circle cx="18" cy="44" r="8" />
          </g>
        </svg>
      </div>
      {/* After the bomb so stickers and speech sit on top of it. */}
      {children}
    </div>
  );
}
