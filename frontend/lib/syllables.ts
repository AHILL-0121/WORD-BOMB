// Syllable bank: high-frequency 2-3 letter fragments that appear in many English words.

import { wordList } from "./wordlist";

/**
 * Every syllable the game may draw, before the playability filter below.
 * Duplicates are removed rather than left in place: "ing" and "ver" each
 * appeared twice, which quietly gave them double the draw probability.
 */
const RAW_SYLLABLE_BANK = [
  // 2-letter combinations
  "an", "ar", "at", "be", "ca", "ch", "de", "di", "ed", "en", "er", "es", "ha", "he", "in", "ing",
  "io", "is", "it", "le", "li", "ma", "me", "ne", "ng", "on", "or", "ou", "ra", "re", "ri", "se",
  "st", "ta", "te", "th", "ti", "to", "un", "ve", "wa",

  // 3-letter combinations
  "ack", "age", "ain", "air", "all", "and", "ant", "are", "art", "ash", "ave", "ble", "can", "car",
  "cat", "cer", "cha", "che", "ck", "cle", "com", "con", "ded", "der", "dis", "dom", "ear", "eat",
  "ect", "ell", "end", "ent", "era", "ere", "ern", "ers", "est", "eve", "ver", "for", "ful", "ght",
  "gle", "gor", "gre", "han", "har", "hat", "her", "igh", "ill", "ind", "ine", "int", "ion",
  "ire", "ish", "ist", "ive", "ker", "kin", "lar", "las", "lat", "lea", "led", "len", "les", "let",
  "lic", "lin", "lis", "lit", "log", "low", "man", "mar", "mas", "mat", "men", "mer", "min", "mis",
  "mon", "mor", "nal", "ner", "nes", "net", "ock", "old", "ome", "one", "ong", "ood", "oor", "ope",
  "ord", "ore", "orm", "ort", "ose", "ost", "oth", "oun", "our", "ous", "out", "ove", "own", "par",
  "per", "ple", "por", "pos", "pre", "pro", "que", "ran", "rat", "raw", "rea", "rec", "red", "ree",
  "ren", "res", "ret", "rib", "ric", "rid", "rig", "rin", "ris", "rit", "roa", "rob", "rod", "rol",
  "rom", "ron", "ros", "rot", "rou", "row", "sal", "sam", "san", "sar", "sat", "sea", "sec", "sed",
  "sel", "sen", "ser", "ses", "set", "sha", "she", "sho", "sic", "sid", "sil", "sim", "sin", "sir",
  "sit", "son", "spe", "sta", "ste", "sto", "str", "tal", "tan", "tar", "tat", "tea", "ted", "tel",
  "tem", "ten", "ter", "tes", "tex", "tha", "the", "thi", "tho", "thr", "tic", "tid", "til", "tin",
  "tio", "tir", "tle", "tom", "ton", "tor", "tra", "tre", "tri", "tro", "tru", "tur", "ual", "ube",
  "uck", "ude", "ued", "ues", "ugh", "ule", "umb", "ume", "unc", "und", "une", "ung", "uni", "unk",
  "unt", "ure", "urn", "use", "ust", "ute", "val", "van", "var", "ven", "ves", "vic", "vid",
  "vin", "vis", "wal", "wan", "war", "was", "wat", "wer", "whe", "whi", "who", "wil", "win", "wis",
  "wit", "wor", "yer", "yon", "you", "zer",
];

/**
 * Minimum number of offline answers a syllable must have to stay in the bank.
 *
 * The Dictionary API is the primary validator, but it can be slow or down, and
 * when it is the offline list decides. Without this floor the game could draw a
 * syllable no player or AI could possibly answer -- an audit found three such
 * syllables ("ded", "tid", "zer") with literally zero valid offline answers.
 * Filtering here makes an unwinnable round impossible by construction, however
 * the two lists drift in future.
 */
export const MIN_OFFLINE_ANSWERS = 3;

/** How many words in the offline dictionary contain a given syllable. */
export function countOfflineAnswers(syllable: string): number {
  let count = 0;
  for (const word of wordList) {
    if (word.includes(syllable)) {
      count++;
      if (count >= MIN_OFFLINE_ANSWERS) return count;
    }
  }
  return count;
}

/** Deduplicated, playability-filtered syllables. Computed once at module load. */
export const syllableBank: string[] = Array.from(new Set(RAW_SYLLABLE_BANK)).filter(
  (syllable) => countOfflineAnswers(syllable) >= MIN_OFFLINE_ANSWERS
);

/** Syllables dropped by the filter, exposed so tests and tooling can report them. */
export const excludedSyllables: string[] = Array.from(new Set(RAW_SYLLABLE_BANK)).filter(
  (syllable) => countOfflineAnswers(syllable) < MIN_OFFLINE_ANSWERS
);

export function generateSyllable(): string {
  return syllableBank[Math.floor(Math.random() * syllableBank.length)];
}

/** Characters used in room codes, with visually ambiguous ones removed. */
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET.charAt(Math.floor(Math.random() * ROOM_CODE_ALPHABET.length));
  }
  return code;
}

/**
 * Whether a string could be a room code this game issued.
 *
 * PartyKit creates a room for any id it is handed, so without this check a
 * mistyped code silently dropped the player into a brand new empty room instead
 * of telling them the code was wrong.
 */
export function isValidRoomCode(code: string): boolean {
  if (typeof code !== "string" || code.length !== ROOM_CODE_LENGTH) return false;
  return code
    .toUpperCase()
    .split("")
    .every((ch) => ROOM_CODE_ALPHABET.includes(ch));
}
