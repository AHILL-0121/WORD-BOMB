// FUSE Mood System — Type definitions, colors, and dialogue lines

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

export interface MoodConfig {
  label: string;
  color: string;
  bodyColor: string;
  eyeColor: string;
}

export const MOODS: Record<FuseMood, MoodConfig> = {
  idle:        { label: "IDLE",       color: "#ff8c42", bodyColor: "#1c1c1a", eyeColor: "#ff8c42" },
  excited:     { label: "EXCITED",    color: "#d4ff00", bodyColor: "#1c2a00", eyeColor: "#d4ff00" },
  nervous:     { label: "NERVOUS",    color: "#ffc340", bodyColor: "#2a1a00", eyeColor: "#ffc340" },
  happy:       { label: "HAPPY",      color: "#ff8c42", bodyColor: "#1c1c1a", eyeColor: "#ffc340" },
  angry:       { label: "ANGRY",      color: "#ff2200", bodyColor: "#2a0500", eyeColor: "#ff2200" },
  sad:         { label: "SAD",        color: "#5a5a55", bodyColor: "#151515", eyeColor: "#5a7a8a" },
  thinking:    { label: "THINKING",   color: "#ffc340", bodyColor: "#1c1a00", eyeColor: "#ffc340" },
  celebrating: { label: "WIN!",       color: "#d4ff00", bodyColor: "#1a2a00", eyeColor: "#d4ff00" },
  dead:        { label: "DEAD",       color: "#333",    bodyColor: "#0a0a08", eyeColor: "#333" },
};

export const DIALOGUE: Record<FuseMood, string[]> = {
  idle:        ["...ticking away.", "You gonna type or what?", "Still here. Waiting.", "The fuse burns either way."],
  excited:     ["YES! THAT'S THE ONE!", "OH WE ARE COOKING!", "KEEP GOING!", "I FELT THAT IN MY FUSE!"],
  nervous:     ["tick... tick... tick...", "Come on come on come ON—", "That's not a lot of time...", "...I'm sweating. Can bombs sweat?"],
  happy:       ["Nice word. I respect it.", "Heh. Not bad.", "That one had FLAVOR.", "See? Easy. You got this."],
  angry:       ["THAT IS NOT A WORD.", "I SWEAR ON MY FUSE—", "WRONG. WRONG. WRONG.", "ARE YOU EVEN TRYING?!"],
  sad:         ["...you ran out of time.", "I believed in you.", "That's a life gone.", "It's fine. It's fine. (it's not fine)"],
  thinking:    ["Hmm. Something with that syllable...", "What about... no. Maybe...", "Calculating vocabulary...", "I know you know this one."],
  celebrating: ["CHAMPION! ABSOLUTE LEGEND!", "THAT'S WHAT I'M TALKING ABOUT!", "WE DID IT!", "FLAWLESS. PERFECT. BEAUTIFUL."],
  dead:        ["...", "...boom.", "worth it.", "see you next round."],
};

export function getRandomDialogue(mood: FuseMood): string {
  const lines = DIALOGUE[mood] || DIALOGUE.idle;
  return lines[Math.floor(Math.random() * lines.length)];
}
