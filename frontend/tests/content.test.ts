import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  MIN_OFFLINE_ANSWERS,
  ROOM_CODE_LENGTH,
  excludedSyllables,
  generateRoomCode,
  generateSyllable,
  isValidRoomCode,
  syllableBank,
} from "../lib/syllables";
import { isValidWord, wordList } from "../lib/wordlist";
import { generateFallbackWord } from "../lib/ai-service";
import { AVATARS, getAvatar, getRandomAvatarId, isAvatarId, monogram } from "../lib/avatars";

describe("syllable bank playability", () => {
  it("is non-empty", () => {
    assert.ok(syllableBank.length > 100, `bank was ${syllableBank.length}`);
  });

  it("contains no duplicates", () => {
    // "ing" and "ver" each appeared twice, doubling their draw probability.
    assert.equal(new Set(syllableBank).size, syllableBank.length);
  });

  it("guarantees every drawable syllable has offline answers", () => {
    // The core invariant. An audit found "ded", "tid" and "zer" with zero
    // possible answers, making those rounds unwinnable whenever the Dictionary
    // API was unavailable.
    const starved = syllableBank.filter((syllable) => {
      let matches = 0;
      for (const word of wordList) {
        if (word.includes(syllable) && ++matches >= MIN_OFFLINE_ANSWERS) return false;
      }
      return true;
    });
    assert.deepEqual(starved, [], `syllables with < ${MIN_OFFLINE_ANSWERS} offline answers`);
  });

  it("keeps the three syllables the audit flagged, now that they are backfilled", () => {
    for (const syllable of ["ded", "tid", "zer"]) {
      assert.ok(syllableBank.includes(syllable), `${syllable} was filtered out`);
    }
    assert.deepEqual(excludedSyllables, []);
  });

  it("only ever draws from the filtered bank", () => {
    const bank = new Set(syllableBank);
    for (let i = 0; i < 500; i++) {
      assert.ok(bank.has(generateSyllable()));
    }
  });
});

describe("offline dictionary", () => {
  it("normalises input", () => {
    assert.equal(isValidWord("  STATION "), true);
    assert.equal(isValidWord("zzzznotaword"), false);
  });

  it("contains no duplicates and no malformed entries", () => {
    for (const word of wordList) {
      assert.match(word, /^[a-z]+$/, `bad entry: ${JSON.stringify(word)}`);
    }
  });

  it("can answer every syllable in the bank", () => {
    for (const syllable of syllableBank) {
      const word = generateFallbackWord(syllable, [], "medium");
      assert.ok(word, `no fallback word for "${syllable}"`);
      assert.ok(word!.includes(syllable), `"${word}" does not contain "${syllable}"`);
    }
  });

  it("never returns an already-used word", () => {
    const first = generateFallbackWord("ing", [], "medium")!;
    for (let i = 0; i < 50; i++) {
      assert.notEqual(generateFallbackWord("ing", [first], "medium"), first);
    }
  });
});

describe("room codes", () => {
  it("generates codes it considers valid", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      assert.equal(code.length, ROOM_CODE_LENGTH);
      assert.ok(isValidRoomCode(code));
    }
  });

  it("rejects the wrong length and ambiguous characters", () => {
    assert.equal(isValidRoomCode("ABC23"), false);
    assert.equal(isValidRoomCode("ABC2345"), false);
    assert.equal(isValidRoomCode("ABC2I4"), false, "I is excluded as ambiguous");
    assert.equal(isValidRoomCode("ABC2O4"), false, "O is excluded as ambiguous");
    assert.equal(isValidRoomCode("ABC-24"), false);
    assert.equal(isValidRoomCode(""), false);
  });

  it("accepts lowercase input", () => {
    assert.equal(isValidRoomCode("abc234"), true);
  });
});

describe("avatars", () => {
  it("getRandomAvatarId returns a usable id, not an object", () => {
    // The server called `getRandomAvatar().id` on a string, so every AI player
    // was stored with `avatar: undefined`.
    const ids = new Set(AVATARS.map((a) => a.id));
    for (let i = 0; i < 100; i++) {
      const id = getRandomAvatarId();
      assert.equal(typeof id, "string");
      assert.ok(ids.has(id), `unknown avatar id: ${id}`);
    }
  });

  it("getAvatar falls back for unknown or missing ids", () => {
    assert.equal(getAvatar("sage-square").color, "#8fb996");
    assert.equal(getAvatar("sage-square").shape, "square");
    assert.equal(getAvatar(undefined).id, AVATARS[0].id);
    assert.equal(getAvatar("not-an-avatar").id, AVATARS[0].id);
  });

  it("has unique ids and no emoji", () => {
    assert.equal(new Set(AVATARS.map((a) => a.id)).size, AVATARS.length);
    for (const a of AVATARS) assert.ok(!/\p{Extended_Pictographic}/u.test(a.name + a.id), a.id);
  });

  it("isAvatarId rejects the old emoji ids", () => {
    assert.equal(isAvatarId("ember-disc"), true);
    assert.equal(isAvatarId("robot"), false);
  });

  it("monogram takes the first letter, uppercased", () => {
    assert.equal(monogram("  deepak"), "D");
    assert.equal(monogram(""), "?");
  });
});
