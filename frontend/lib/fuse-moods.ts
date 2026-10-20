// FUSE mood system: mood names and the things FUSE says.
//
// How each mood looks lives in the stylesheet (`.fuse-wrap[data-mood=...]` in
// app/globals.css); the SVG itself is in components/ui/Fuse.tsx.

export type FuseMood =
  | "idle"
  | "excited"
  | "nervous"
  | "happy"
  | "angry"
  | "sad"
  | "thinking"
  | "celebrating"
  | "dead";

export const MOOD_LABELS: Record<FuseMood, string> = {
  idle: "Idle",
  excited: "Excited",
  nervous: "Nervous",
  happy: "Happy",
  angry: "Angry",
  sad: "Sad",
  thinking: "Thinking",
  celebrating: "Celebrating",
  dead: "Out",
};

/** Contextual lines. Functions take the details that make the line land. */
export const LINES = {
  yourTurn: ["Your move. No pressure. (Lots of pressure.)", "Go go go!", "I'm counting on you. Literally.", "Tick tock, wordsmith."],
  happy: ["Nice. I respect it.", "Heh. Not bad.", "That one had flavour.", "Smooth."],
  long: (letters: number) => [`${letters} letters?! Show-off.`, "Okay, dictionary.", "Big brain energy."],
  clutch: (secondsLeft: string) => [`With ${secondsLeft}s left?! My heart.`, "Cutting it close.", "I almost went off!"],
  angry: ["That is not a word.", "I swear on my fuse—", "Try again. Properly."],
  used: ["Already used. Nice try.", "Déjà vu much?"],
  wrongLetters: ["Read the bomb!", "Wrong letters, friend."],
  timeout: (name: string) => [`${name}… I believed in you.`, "…boom.", `Oof. Sorry ${name}.`],
  youTimedOut: ["…you ran out of time.", "Boom. That one's on you."],
  out: (name: string) => [`${name} is out!`, `Farewell, ${name}.`],
  youOut: ["You're out. …boom."],
  bonus: ["All 26?! Take a heart, genius."],
  lobby: ["The fuse is patient. I am not.", "Invite more victims. I mean friends.", "Ready when you are.", "I've been practising my ticking."],
  win: (name: string) => [`${name} survives!`],
  youWin: ["Champion! I knew it!"],
};

export function pickLine(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}
