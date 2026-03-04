"use client";

import { MOODS, type FuseMood } from "@/lib/fuse-moods";

interface FuseSVGProps {
  mood: FuseMood;
  size?: number;
}

export function FuseSVG({ mood, size = 200 }: FuseSVGProps) {
  const m = MOODS[mood];
  const isAngry       = mood === "angry";
  const isHappy       = mood === "happy";
  const isSad         = mood === "sad";
  const isNervous     = mood === "nervous";
  const isExcited     = mood === "excited";
  const isCelebrating = mood === "celebrating";
  const isDead        = mood === "dead";
  const isThinking    = mood === "thinking";

  const bodyAnim = 
    isAngry       ? "shake-angry 0.4s ease infinite"       :
    isExcited     ? "excited-bounce 0.7s ease infinite"    :
    isSad         ? "sad-droop 2s ease-in-out infinite"    :
    isNervous     ? "nervous-tremble 0.25s ease infinite"  :
    isCelebrating ? "celebrate 0.6s ease infinite"         :
    isDead        ? "none"                                 :
    isThinking    ? "thinking-bob 2s ease-in-out infinite" :
    "idle-bob 2.8s ease-in-out infinite";

  const glowColor = m.color;
  const s = size;
  const cx = s / 2, cy = s / 2 + 10;
  const r = s * 0.34;

  const leftEyeX  = cx - r * 0.38;
  const rightEyeX = cx + r * 0.38;
  const eyeY      = cy - r * 0.1;
  const eyeR      = r * 0.16;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{
      filter: isDead ? "grayscale(1) brightness(0.4)" : `drop-shadow(0 0 ${r*0.3}px ${glowColor}80) drop-shadow(0 ${r*0.1}px ${r*0.4}px rgba(0,0,0,0.6))`,
      overflow: "visible",
    }} className={isDead ? "" : "fuse-glow-pulse"}>

      {/* Shadow */}
      <ellipse cx={cx} cy={s*0.88} rx={r*0.7} ry={r*0.12} fill="rgba(0,0,0,0.4)" />

      {/* Body Group */}
      <g style={{ animation: bodyAnim, transformOrigin: `${cx}px ${cy}px` }}>
        {/* Body glow halo */}
        <circle cx={cx} cy={cy} r={r*1.15} fill={`${glowColor}10`} />

        {/* Main body */}
        <circle cx={cx} cy={cy} r={r} fill={m.bodyColor} stroke={glowColor} strokeWidth={s*0.018} />

        {/* Body highlight */}
        <ellipse cx={cx - r*0.28} cy={cy - r*0.32} rx={r*0.22} ry={r*0.14} fill="rgba(255,255,255,0.07)" 
          transform={`rotate(-20, ${cx - r*0.28}, ${cy - r*0.32})`} />

        {/* Fuse */}
        <FuseLine cx={cx} cy={cy} r={r} mood={mood} color={glowColor} s={s} isDead={isDead} isAngry={isAngry} isNervous={isNervous} />

        {/* Eyes */}
        <EyePair lx={leftEyeX} rx={rightEyeX} ey={eyeY} er={eyeR} mood={mood} glowColor={glowColor} s={s} />

        {/* Mouth */}
        <Mouth cx={cx} cy={cy} r={r} mood={mood} glowColor={glowColor} />

        {/* Extras */}
        {isNervous && <SweatDrops cx={cx} cy={cy} r={r} />}
        {isCelebrating && <StarEyes lx={leftEyeX} rx={rightEyeX} ey={eyeY} er={eyeR} color={glowColor} />}
        {isDead && <XEyes lx={leftEyeX} rx={rightEyeX} ey={eyeY} er={eyeR} />}
        {isThinking && <ThoughtBubble cx={cx} cy={cy} r={r} s={s} />}
      </g>

      {/* Crown for celebrating */}
      {isCelebrating && <Crown cx={cx} cy={cy} r={r} s={s} />}
    </svg>
  );
}

function FuseLine({ cx, cy, r, mood, color, s, isDead, isAngry, isNervous }: any) {
  const fuseLen = r * 0.55;
  const fuseX   = cx + r * 0.62;
  const fuseY   = cy - r * 0.68;
  const sparkSpeed = isAngry ? "0.3s" : isNervous ? "0.5s" : "0.9s";
  const sparkSize  = isAngry ? r*0.22 : r*0.15;

  return (
    <g>
      <path d={`M ${fuseX} ${fuseY} Q ${fuseX + r*0.25} ${fuseY - r*0.35} ${fuseX + r*0.1} ${fuseY - fuseLen}`}
        fill="none" stroke="#5a4a30" strokeWidth={s*0.022} strokeLinecap="round" />
      <path d={`M ${fuseX} ${fuseY} Q ${fuseX + r*0.25} ${fuseY - r*0.35} ${fuseX + r*0.1} ${fuseY - fuseLen}`}
        fill="none" stroke={color} strokeWidth={s*0.008} strokeLinecap="round" opacity={0.5} />
      {!isDead && (
        <g className="fuse-spark" style={{ transformOrigin: `${fuseX + r*0.1}px ${fuseY - fuseLen}px`, animation: `fuse-spark ${sparkSpeed} ease-in-out infinite` }}>
          <circle cx={fuseX + r*0.1} cy={fuseY - fuseLen} r={sparkSize} fill={color} opacity={0.9} />
          <circle cx={fuseX + r*0.1} cy={fuseY - fuseLen} r={sparkSize*0.5} fill="#fff" opacity={0.9} />
          {[[-8,-10],[8,-8],[-10,-4],[6,-14]].map(([dx,dy], i) => (
            <circle key={i} cx={fuseX + r*0.1 + dx} cy={fuseY - fuseLen + dy} r={s*0.012} 
              fill={i%2===0?"#ffc340":"#ff8c42"} opacity={0.7} 
              style={{ animation: `fuse-spark ${sparkSpeed} ease-in-out infinite`, animationDelay:`${i*0.15}s` }} />
          ))}
        </g>
      )}
    </g>
  );
}

function EyePair({ lx, rx, ey, er, mood, glowColor, s }: any) {
  const isAngry   = mood === "angry";
  const isSad     = mood === "sad";
  const isNervous = mood === "nervous";
  const isDead    = mood === "dead";
  const isCelebrating = mood === "celebrating";

  if (isDead || isCelebrating) return null;

  const browOffset = isAngry ? -er*0.9 : isSad ? er*0.3 : -er*1.1;
  const browAngleL = isAngry ? 8 : isSad ? -8 : 0;
  const browAngleR = isAngry ? -8 : isSad ? 8 : 0;

  return (
    <g>
      {/* Brows */}
      <line x1={lx-er*0.8} y1={ey+browOffset} x2={lx+er*0.8} y2={ey+browOffset - Math.sin(browAngleL*Math.PI/180)*er*1.5}
        stroke={glowColor} strokeWidth={s*0.016} strokeLinecap="round"
        transform={`rotate(${browAngleL}, ${lx}, ${ey+browOffset})`} />
      <line x1={rx-er*0.8} y1={ey+browOffset} x2={rx+er*0.8} y2={ey+browOffset - Math.sin(browAngleR*Math.PI/180)*er*1.5}
        stroke={glowColor} strokeWidth={s*0.016} strokeLinecap="round"
        transform={`rotate(${browAngleR}, ${rx}, ${ey+browOffset})`} />

      {/* Eye whites */}
      <ellipse cx={lx} cy={ey} rx={er} ry={isAngry ? er*0.65 : er} fill={glowColor} opacity={0.15} />
      <ellipse cx={rx} cy={ey} rx={er} ry={isAngry ? er*0.65 : er} fill={glowColor} opacity={0.15} />

      {/* Pupils */}
      <g className={isNervous ? "pupil-dart" : ""}>
        <circle cx={lx} cy={ey + er*0.1} r={er*0.62} fill={glowColor} className="eye-blink" />
        <circle cx={rx} cy={ey + er*0.1} r={er*0.62} fill={glowColor} className="eye-blink" style={{ animationDelay: "0.08s" }} />
        <circle cx={lx - er*0.22} cy={ey - er*0.15} r={er*0.18} fill="rgba(255,255,255,0.8)" />
        <circle cx={rx - er*0.22} cy={ey - er*0.15} r={er*0.18} fill="rgba(255,255,255,0.8)" />
      </g>
    </g>
  );
}

function Mouth({ cx, cy, r, mood, glowColor }: any) {
  const my = cy + r * 0.35;
  const mw = r * 0.52;

  if (mood === "happy" || mood === "excited" || mood === "celebrating") {
    return (
      <g>
        <path d={`M ${cx-mw} ${my} Q ${cx} ${my + r*0.32} ${cx+mw} ${my}`}
          fill="none" stroke={glowColor} strokeWidth={6} strokeLinecap="round" />
        <ellipse cx={cx-r*0.55} cy={my-r*0.05} rx={r*0.16} ry={r*0.09} fill={glowColor} opacity={0.18} />
        <ellipse cx={cx+r*0.55} cy={my-r*0.05} rx={r*0.16} ry={r*0.09} fill={glowColor} opacity={0.18} />
      </g>
    );
  }
  if (mood === "sad") {
    return <path d={`M ${cx-mw} ${my + r*0.12} Q ${cx} ${my - r*0.18} ${cx+mw} ${my + r*0.12}`}
      fill="none" stroke={glowColor} strokeWidth={5} strokeLinecap="round" />;
  }
  if (mood === "angry") {
    return (
      <g>
        <path d={`M ${cx-mw} ${my} Q ${cx} ${my + r*0.14} ${cx+mw} ${my}`}
          fill="none" stroke={glowColor} strokeWidth={6} strokeLinecap="round" />
        {[-mw*0.5,-mw*0.16,mw*0.18].map((x,i)=>(
          <line key={i} x1={cx+x} y1={my-2} x2={cx+x} y2={my+8} stroke={glowColor} strokeWidth={3} opacity={0.5} />
        ))}
      </g>
    );
  }
  if (mood === "nervous") {
    return <path d={`M ${cx-mw*0.7} ${my} Q ${cx-mw*0.2} ${my+r*0.12} ${cx} ${my} Q ${cx+mw*0.2} ${my-r*0.1} ${cx+mw*0.7} ${my+r*0.06}`}
      fill="none" stroke={glowColor} strokeWidth={5} strokeLinecap="round" />;
  }
  if (mood === "thinking") {
    return <path d={`M ${cx-mw*0.4} ${my} Q ${cx} ${my+r*0.05} ${cx+mw*0.6} ${my - r*0.06}`}
      fill="none" stroke={glowColor} strokeWidth={5} strokeLinecap="round" />;
  }
  if (mood === "dead") {
    return <path d={`M ${cx-mw*0.6} ${my} L ${cx-mw*0.2} ${my+r*0.1} L ${cx+mw*0.1} ${my-r*0.04} L ${cx+mw*0.5} ${my+r*0.08}`}
      fill="none" stroke="#444" strokeWidth={4} strokeLinecap="round" />;
  }
  return <path d={`M ${cx-mw*0.6} ${my} Q ${cx} ${my + r*0.12} ${cx+mw*0.6} ${my}`}
    fill="none" stroke={glowColor} strokeWidth={5} strokeLinecap="round" />;
}

function SweatDrops({ cx, cy, r }: any) {
  return (
    <g>
      {[[-r*0.7,-r*0.3,0.2],[r*0.65,-r*0.15,0.5],[-r*0.5,r*0.1,0.8]].map(([dx,dy,delay],i) => (
        <ellipse key={i} cx={cx+dx} cy={cy+dy} rx={3} ry={5} fill="#4af" opacity={0.6}
          style={{ animation: `sweat-drip 1.2s ease-in infinite`, animationDelay:`${delay}s` }} />
      ))}
    </g>
  );
}

function StarEyes({ lx, rx, ey, er, color }: any) {
  const Star = ({ x, y }: {x: number, y: number}) => {
    const pts = Array.from({length:5},(_,i) => {
      const a = (i*144-90)*Math.PI/180;
      const ia = (i*144-90+72)*Math.PI/180;
      const or = er*0.85, ir = er*0.4;
      return `${x+Math.cos(a)*or},${y+Math.sin(a)*or} ${x+Math.cos(ia)*ir},${y+Math.sin(ia)*ir}`;
    }).join(' ');
    return <polygon points={pts} fill={color} className="star-spin" />;
  };
  return <g><Star x={lx} y={ey} /><Star x={rx} y={ey} /></g>;
}

function XEyes({ lx, rx, ey, er }: any) {
  const X = ({ x }: {x: number}) => (
    <g stroke="#444" strokeWidth={5} strokeLinecap="round">
      <line x1={x-er*0.7} y1={ey-er*0.7} x2={x+er*0.7} y2={ey+er*0.7} />
      <line x1={x+er*0.7} y1={ey-er*0.7} x2={x-er*0.7} y2={ey+er*0.7} />
    </g>
  );
  return <g><X x={lx} /><X x={rx} /></g>;
}

function ThoughtBubble({ cx, cy, r, s }: any) {
  return (
    <g opacity={0.85} className="idle-bob-sm">
      {[{x:cx-r*1.1,y:cy-r*1.0,r:5},{x:cx-r*1.3,y:cy-r*1.3,r:7},{x:cx-r*1.5,y:cy-r*1.6,r:9}].map((b,i)=>(
        <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="var(--cinder)" stroke="#ffc340" strokeWidth={1.5} />
      ))}
      <rect x={cx-r*2.2} y={cy-r*2.4} width={r*2.2} height={r*1.1} rx={r*0.2}
        fill="var(--cinder)" stroke="#ffc340" strokeWidth={1.5} />
      <text x={cx-r*1.1} y={cy-r*1.75} textAnchor="middle" fill="#ffc340"
        style={{ fontFamily:"JetBrains Mono, monospace", fontSize: s*0.07 }}>...?</text>
    </g>
  );
}

function Crown({ cx, cy, r, s }: any) {
  const ty = cy - r * 1.22;
  return (
    <g className="crown-bounce" style={{ transformOrigin:`${cx}px ${ty}px` }}>
      <polygon points={`${cx-r*0.55},${ty+r*0.22} ${cx-r*0.55},${ty-r*0.12} ${cx-r*0.28},${ty+r*0.04} ${cx},${ty-r*0.22} ${cx+r*0.28},${ty+r*0.04} ${cx+r*0.55},${ty-r*0.12} ${cx+r*0.55},${ty+r*0.22}`}
        fill="#ffc340" stroke="#ff8c42" strokeWidth={2} />
      {[cx-r*0.3, cx, cx+r*0.3].map((x,i)=>(
        <circle key={i} cx={x} cy={ty-r*0.05+[r*0.06,r*0.16,r*0.06][i]} r={s*0.022}
          fill={["#ff4500","#d4ff00","#ff4500"][i]} />
      ))}
    </g>
  );
}
