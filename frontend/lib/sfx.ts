// Game sounds, synthesised with the Web Audio API — no audio files to ship.
//
// Sound is opt-in (browsers also refuse to start audio before a user gesture),
// and the choice is remembered per device.

const STORAGE_KEY = "wordbomb_sound";

let ctx: AudioContext | null = null;
let enabled = false;

try {
  enabled = typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "on";
} catch {
  // Storage blocked: sound simply starts off.
}

export function isSoundOn() {
  return enabled;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Not remembered; still applies for this visit.
  }
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.04, slideTo?: number) {
  const c = audio();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t = c.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  tick: (hot: boolean) => tone(hot ? 1500 : 1100, 0.035, "square", hot ? 0.035 : 0.018),
  ok: () => {
    tone(660, 0.09, "triangle", 0.07);
    setTimeout(() => tone(990, 0.13, "triangle", 0.07), 70);
  },
  bad: () => tone(170, 0.24, "sawtooth", 0.05, 90),
  turn: () => {
    tone(520, 0.08, "triangle", 0.06);
    setTimeout(() => tone(780, 0.1, "triangle", 0.06), 90);
  },
  pop: () => tone(500, 0.07, "sine", 0.06, 900),
  boom: () => {
    const c = audio();
    if (!c) return;
    const len = c.sampleRate * 0.7;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    const src = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const gain = c.createGain();
    src.buffer = buf;
    filter.type = "lowpass";
    filter.frequency.value = 800;
    gain.gain.value = 0.55;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
    tone(110, 0.5, "sine", 0.35, 38);
  },
};

/** Haptics on phones that support them; silently ignored elsewhere. */
export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported.
  }
}
