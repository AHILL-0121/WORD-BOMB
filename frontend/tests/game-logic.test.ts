import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  SETTINGS_BOUNDS,
  clampThinkTime,
  evaluateGameEnd,
  firstPlayerId,
  mergeLetters,
  nextPlayerId,
  pickBots,
  speedPresetFor,
  summarizeMatch,
  roundFromTurns,
  sanitizePlayerName,
  sanitizeWord,
  timerDurationMs,
  validateSettings,
} from "../lib/game-logic";
import { DEFAULT_ROOM_SETTINGS } from "../types/game";
import type { Player } from "../types/game";

function player(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: id.toUpperCase(),
    avatar: "ember-disc",
    wordsPlayed: 0,
    lettersUsed: "",
    eliminatedInRound: null,
    lives: 3,
    isEliminated: false,
    isHost: false,
    isAI: false,
    isDisconnected: false,
    ...overrides,
  };
}

describe("nextPlayerId — turn rotation", () => {
  it("cycles through players in seat order", () => {
    const players = [player("a"), player("b"), player("c")];
    assert.equal(nextPlayerId(players, "a"), "b");
    assert.equal(nextPlayerId(players, "b"), "c");
    assert.equal(nextPlayerId(players, "c"), "a");
  });

  it("does not skip the player sitting after an eliminated one", () => {
    // Regression test. The old implementation indexed into the filtered list of
    // survivors, so eliminating C handed the turn back to A and skipped D
    // entirely for a full rotation.
    const players = [player("a"), player("b"), player("c", { isEliminated: true }), player("d")];
    assert.equal(nextPlayerId(players, "c"), "d");
  });

  it("skips over runs of eliminated players", () => {
    const players = [
      player("a"),
      player("b", { isEliminated: true }),
      player("c", { isEliminated: true }),
      player("d"),
    ];
    assert.equal(nextPlayerId(players, "a"), "d");
    assert.equal(nextPlayerId(players, "d"), "a");
  });

  it("returns the sole survivor regardless of who acted last", () => {
    const players = [player("a", { isEliminated: true }), player("b")];
    assert.equal(nextPlayerId(players, "a"), "b");
  });

  it("returns null when nobody is left", () => {
    const players = [player("a", { isEliminated: true }), player("b", { isEliminated: true })];
    assert.equal(nextPlayerId(players, "a"), null);
  });

  it("recovers when the current player has left the room entirely", () => {
    const players = [player("b"), player("c")];
    assert.equal(nextPlayerId(players, "gone"), "b");
  });

  it("firstPlayerId picks the first survivor", () => {
    assert.equal(firstPlayerId([player("a", { isEliminated: true }), player("b")]), "b");
    assert.equal(firstPlayerId([]), null);
  });
});

describe("evaluateGameEnd", () => {
  it("keeps playing while two or more survive", () => {
    const result = evaluateGameEnd([player("a"), player("b")]);
    assert.equal(result.ended, false);
    assert.equal(result.winner, null);
  });

  it("declares the last survivor the winner", () => {
    const result = evaluateGameEnd([player("a", { isEliminated: true }), player("b")]);
    assert.equal(result.ended, true);
    assert.deepEqual(result.winner, { id: "b", name: "B" });
  });

  it("ends with no winner when everyone is eliminated", () => {
    // This is the mutual-elimination case that previously left the client on a
    // blank screen: the game was over but no results screen was rendered.
    const result = evaluateGameEnd([
      player("a", { isEliminated: true }),
      player("b", { isEliminated: true }),
    ]);
    assert.equal(result.ended, true);
    assert.equal(result.winner, null);
  });

  it("ends with no winner when the room empties", () => {
    assert.deepEqual(evaluateGameEnd([]), { ended: true, winner: null });
  });
});

describe("validateSettings", () => {
  const base = DEFAULT_ROOM_SETTINGS;

  it("clamps a hostile aiCount instead of spawning it", () => {
    // Regression test: the server used to spread client settings straight into
    // state, so `aiCount: 100000` became a 100k-iteration spawn loop.
    assert.equal(validateSettings({ aiCount: 100_000 }, base).aiCount, SETTINGS_BOUNDS.aiCount.max);
    assert.equal(validateSettings({ aiCount: -5 }, base).aiCount, SETTINGS_BOUNDS.aiCount.min);
  });

  it("keeps the current value for non-numeric and non-finite input", () => {
    // Garbage is rejected outright rather than coerced towards a bound, so a
    // malformed message cannot nudge a setting at all.
    assert.equal(validateSettings({ startingLives: "many" }, base).startingLives, base.startingLives);
    assert.equal(validateSettings({ initialTimer: NaN }, base).initialTimer, base.initialTimer);
    assert.equal(validateSettings({ maxPlayers: Infinity }, base).maxPlayers, base.maxPlayers);
    assert.equal(validateSettings({ maxPlayers: -Infinity }, base).maxPlayers, base.maxPlayers);
  });

  it("still clamps large finite values to the bound", () => {
    assert.equal(validateSettings({ maxPlayers: 9999 }, base).maxPlayers, SETTINGS_BOUNDS.maxPlayers.max);
  });

  it("drops unknown keys rather than merging them into state", () => {
    const result = validateSettings({ isAdmin: true, __proto__: { polluted: true } }, base);
    assert.equal("isAdmin" in result, false);
    assert.deepEqual(Object.keys(result).sort(), Object.keys(base).sort());
  });

  it("never lets the minimum timer exceed the initial timer", () => {
    const result = validateSettings({ initialTimer: 8, minTimer: 8 }, base);
    assert.ok(result.minTimer <= result.initialTimer);

    const clamped = validateSettings({ initialTimer: 8, minTimer: 99 }, base);
    assert.equal(clamped.minTimer, 8);
  });

  it("only accepts known difficulties", () => {
    assert.equal(validateSettings({ difficulty: "impossible" }, base).difficulty, base.difficulty);
    assert.equal(validateSettings({ difficulty: "hard" }, base).difficulty, "hard");
  });

  it("keeps aiMode boolean", () => {
    assert.equal(validateSettings({ aiMode: "yes" }, base).aiMode, base.aiMode);
    assert.equal(validateSettings({ aiMode: true }, base).aiMode, true);
  });

  it("passes a valid payload through unchanged", () => {
    const wanted = { ...base, startingLives: 5, difficulty: "hard" as const, maxPlayers: 12 };
    assert.deepEqual(validateSettings(wanted, base), wanted);
  });
});

describe("sanitizePlayerName", () => {
  it("trims, collapses whitespace and caps length", () => {
    assert.equal(sanitizePlayerName("   Ada   Lovelace  "), "Ada Lovelace");
    assert.equal(sanitizePlayerName("x".repeat(500)).length, 20);
  });

  it("falls back to Anonymous for empty or non-string input", () => {
    assert.equal(sanitizePlayerName(""), "Anonymous");
    assert.equal(sanitizePlayerName("   "), "Anonymous");
    assert.equal(sanitizePlayerName(undefined), "Anonymous");
    assert.equal(sanitizePlayerName(42), "Anonymous");
  });

  it("strips control, zero-width and bidi-override characters", () => {
    const zeroWidth = String.fromCharCode(0x200b);
    const rtlOverride = String.fromCharCode(0x202e);
    const nul = String.fromCharCode(0x00);
    assert.equal(sanitizePlayerName(`Ada${zeroWidth}${rtlOverride}${nul}Lovelace`), "AdaLovelace");
  });
});

describe("sanitizeWord", () => {
  it("lowercases and trims valid words", () => {
    assert.equal(sanitizeWord("  STAtion "), "station");
  });

  it("rejects anything that is not plain letters", () => {
    // A word reaching the dictionary URL unencoded was the path-traversal risk.
    assert.equal(sanitizeWord("../../etc/passwd"), null);
    assert.equal(sanitizeWord("word?query=1"), null);
    assert.equal(sanitizeWord("hy-phen"), null);
    assert.equal(sanitizeWord(""), null);
    assert.equal(sanitizeWord("   "), null);
  });

  it("rejects non-strings and oversized input", () => {
    assert.equal(sanitizeWord(123), null);
    assert.equal(sanitizeWord({}), null);
    assert.equal(sanitizeWord("a".repeat(46)), null);
    assert.equal(sanitizeWord("a".repeat(45)), "a".repeat(45));
  });
});

describe("timer pacing", () => {
  it("decays per round and honours the floor", () => {
    const settings = { ...DEFAULT_ROOM_SETTINGS, initialTimer: 12, timerDecay: 0.5, minTimer: 5 };
    assert.equal(timerDurationMs(settings, 0), 12_000);
    assert.equal(timerDurationMs(settings, 4), 10_000);
    assert.equal(timerDurationMs(settings, 100), 5_000);
  });

  it("counts a round as a full rotation, not a single turn", () => {
    // With 8 players, 8 turns is one round. Previously `round` incremented on
    // every turn, so a big table burned the decay budget 8x too fast.
    assert.equal(roundFromTurns(0, 8), 0);
    assert.equal(roundFromTurns(7, 8), 0);
    assert.equal(roundFromTurns(8, 8), 1);
    assert.equal(roundFromTurns(16, 8), 2);
    assert.equal(roundFromTurns(5, 0), 0);
  });
});

describe("clampThinkTime", () => {
  it("never lets the AI deliberate past the clock", () => {
    // 8s of "thinking" against a 5s round used to make the AI forfeit turns it
    // could have answered.
    assert.ok(clampThinkTime(8000, 5000) < 5000);
    assert.equal(clampThinkTime(8000, 5000), 4250);
  });

  it("leaves comfortable think times alone", () => {
    assert.equal(clampThinkTime(3000, 12_000), 3000);
  });

  it("always returns a positive delay", () => {
    assert.ok(clampThinkTime(9000, 500) > 0);
  });
});

describe("new house rules", () => {
  it("validateSettings keeps the boolean switches and ignores junk", () => {
    const s = validateSettings({ alphabetBonus: false, stickySyllable: "yes", reactions: 0 }, DEFAULT_ROOM_SETTINGS);
    assert.equal(s.alphabetBonus, false);
    assert.equal(s.stickySyllable, DEFAULT_ROOM_SETTINGS.stickySyllable);
    assert.equal(s.reactions, DEFAULT_ROOM_SETTINGS.reactions);
  });

  it("speedPresetFor maps stored decay to the nearest preset", () => {
    assert.equal(speedPresetFor(0).key, "off");
    assert.equal(speedPresetFor(0.5).key, "chill");
    assert.equal(speedPresetFor(0.9).key, "spicy");
  });

  it("pickBots skips names humans are using", () => {
    assert.deepEqual(pickBots(2, ["mia"]).map((b) => b.name), ["Ravi", "Kofi"]);
    assert.equal(pickBots(0, []).length, 0);
  });

  it("mergeLetters accumulates distinct letters in order", () => {
    assert.equal(mergeLetters("", "banana"), "abn");
    assert.equal(mergeLetters("abn", "cab"), "abcn");
    assert.equal(mergeLetters("", "abcdefghijklmnopqrstuvwxyz").length, 26);
  });
});

describe("summarizeMatch", () => {
  const words = [
    { word: "kingdom", syllable: "ing", playerId: "a", ms: 2000, msLeft: 6000 },
    { word: "astronaut", syllable: "str", playerId: "b", ms: 1200, msLeft: 300 },
    { word: "sing", syllable: "ing", playerId: "a", ms: 900, msLeft: 7000 },
  ];
  const players = [
    { id: "a", wordsPlayed: 2 },
    { id: "b", wordsPlayed: 1 },
    { id: "c", wordsPlayed: 0 },
  ];

  it("ranks the winner first, then the reverse order of elimination", () => {
    const s = summarizeMatch(words, players, ["c", "b"], "a", 3);
    assert.deepEqual(s.ranking, ["a", "b", "c"]);
  });

  it("handles a game with no winner", () => {
    const s = summarizeMatch(words, players, ["c", "a", "b"], null, 3);
    assert.deepEqual(s.ranking, ["b", "a", "c"]);
  });

  it("picks each award", () => {
    const s = summarizeMatch(words, players, ["c", "b"], "a", 3);
    assert.deepEqual(s.awards.longestWord, { playerId: "b", word: "astronaut" });
    assert.deepEqual(s.awards.fastestAnswer, { playerId: "a", ms: 900 });
    assert.deepEqual(s.awards.closestCall, { playerId: "b", msLeft: 300 });
    assert.deepEqual(s.awards.mostWords, { playerId: "a", count: 2 });
  });

  it("offers the longest distinct words as candidates, votes at zero", () => {
    const s = summarizeMatch([...words, { ...words[0] }], players, [], "a", 1);
    assert.deepEqual(s.candidates.map((c) => c.word), ["astronaut", "kingdom", "sing"]);
    assert.deepEqual(s.votes, { astronaut: 0, kingdom: 0, sing: 0 });
  });

  it("has empty awards when nothing was played", () => {
    const idle = players.map((p) => ({ ...p, wordsPlayed: 0 }));
    const s = summarizeMatch([], idle, ["b", "c"], "a", 1);
    assert.equal(s.awards.longestWord, null);
    assert.equal(s.awards.mostWords, null);
    assert.deepEqual(s.candidates, []);
  });
});
