// Syllable bank with high-frequency 2-3 letter combinations

export const syllableBank = [
  "an", "ar", "at", "be", "ca", "ch", "de", "di", "ed", "en", "er", "es", "ha", "he", "in", "ing",
  "io", "is", "it", "le", "li", "ma", "me", "ne", "ng", "on", "or", "ou", "ra", "re", "ri", "se",
  "st", "ta", "te", "th", "ti", "to", "un", "ve", "wa",
  "ack", "age", "ain", "air", "all", "and", "ant", "are", "art", "ash", "ave", "ble", "can", "car",
  "cat", "cer", "cha", "che", "ck", "cle", "com", "con", "ded", "der", "dis", "dom", "ear", "eat",
  "ect", "ell", "end", "ent", "era", "ere", "ern", "ers", "est", "eve", "ver", "for", "ful", "ght",
  "gle", "gor", "gre", "han", "har", "hat", "her", "igh", "ill", "ind", "ine", "ing", "int", "ion",
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
  "unt", "ure", "urn", "use", "ust", "ute", "val", "van", "var", "ven", "ver", "ves", "vic", "vid",
  "vin", "vis", "wal", "wan", "war", "was", "wat", "wer", "whe", "whi", "who", "wil", "win", "wis",
  "wit", "wor", "yer", "yon", "you", "zer"
];

export function generateSyllable() {
  const index = Math.floor(Math.random() * syllableBank.length);
  return syllableBank[index];
}

export function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
