// AI player service.
//
// Talks to Groq over plain fetch — the `groq-sdk` package was a declared
// dependency that nothing imported, and has been removed.
//
// IMPORTANT: this module runs inside the PartyKit worker, not on Vercel.
// GROQ_API_KEY must therefore be set on the PartyKit deployment
// (`npx partykit env add GROQ_API_KEY`), not in the Vercel dashboard. When it
// is missing, every AI move silently falls back to the offline word list.

import { wordList } from "./wordlist";

export type Difficulty = "easy" | "medium" | "hard";

interface AIWordRequest {
  syllable: string;
  usedWords: string[];
  difficulty: Difficulty;
  playerName: string;
}

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TIMEOUT_MS = 6_000;

/** How each difficulty ranks candidate words in the offline fallback. */
const FALLBACK_LENGTH_PREFERENCE: Record<Difficulty, (word: string) => number> = {
  easy: (w) => -w.length, // prefer short, common words
  medium: () => 0, // no preference
  hard: (w) => w.length, // prefer longer, showier words
};

export async function generateAIWord({
  syllable,
  usedWords,
  difficulty,
  playerName,
}: AIWordRequest): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === "your_groq_api_key_here") {
    console.warn(
      "GROQ_API_KEY is not set on the PartyKit worker - using the offline fallback. " +
        "Set it with: npx partykit env add GROQ_API_KEY"
    );
    return generateFallbackWord(syllable, usedWords, difficulty);
  }

  try {
    const difficultyPrompts: Record<Difficulty, string> = {
      easy: "Use common, simple English words",
      medium: "Use moderately complex words",
      hard: "Use advanced vocabulary and longer words",
    };

    // Only the tail of the used list is worth sending; a long game's history
    // runs to hundreds of words and just burns prompt tokens.
    const recentlyUsed = usedWords.slice(-40);

    const prompt = `You are an AI player named "${playerName}" in a word game.

RULES:
- Find ONE valid English word that contains the syllable "${syllable}"
- The syllable can be anywhere in the word (start, middle, or end)
- Do NOT use these already-used words: ${recentlyUsed.join(", ") || "none yet"}
- ${difficultyPrompts[difficulty]}
- Respond with ONLY the word, nothing else

Your word:`;

    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "openai/gpt-oss-120b",
        temperature: difficulty === "easy" ? 0.3 : difficulty === "medium" ? 0.7 : 1,
        // gpt-oss is a reasoning model: reasoning tokens count against this
        // budget, so it needs far more headroom than the single word we want
        // back. The previous value of 20 was consumed entirely by reasoning and
        // returned empty content on every call.
        max_completion_tokens: 512,
        reasoning_effort: "low",
        top_p: 1,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(`Groq API error (${response.status}): ${errorText.slice(0, 300)}`);
      return generateFallbackWord(syllable, usedWords, difficulty);
    }

    const data = await response.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    // Models sometimes wrap the answer in quotes or add a trailing period.
    const word = raw.trim().toLowerCase().replace(/[^a-z]/g, "");

    if (word && word.includes(syllable.toLowerCase()) && !usedWords.includes(word)) {
      return word;
    }

    return generateFallbackWord(syllable, usedWords, difficulty);
  } catch (error) {
    console.error("Error calling Groq API:", error);
    return generateFallbackWord(syllable, usedWords, difficulty);
  }
}

/**
 * Offline fallback, indexed by syllable on first use.
 *
 * The previous implementation rebuilt an array from the entire word Set and
 * re-scanned it on every single AI turn.
 */
const syllableIndex = new Map<string, string[]>();

function candidatesFor(syllable: string): string[] {
  const key = syllable.toLowerCase();
  const cached = syllableIndex.get(key);
  if (cached) return cached;

  const matches: string[] = [];
  for (const word of wordList) {
    if (word.includes(key)) matches.push(word);
  }
  syllableIndex.set(key, matches);
  return matches;
}

export function generateFallbackWord(
  syllable: string,
  usedWords: string[],
  difficulty: Difficulty = "medium"
): string | null {
  const used = new Set(usedWords.map((w) => w.toLowerCase()));
  const available = candidatesFor(syllable).filter((w) => !used.has(w));

  if (available.length === 0) {
    console.warn(`No offline words available for syllable: ${syllable}`);
    return null;
  }

  if (difficulty === "medium") {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Draw from the slice of the pool matching this difficulty's taste in word
  // length, rather than uniformly at random regardless of difficulty.
  const score = FALLBACK_LENGTH_PREFERENCE[difficulty];
  const ranked = [...available].sort((a, b) => score(b) - score(a));
  const pool = ranked.slice(0, Math.max(1, Math.ceil(ranked.length * 0.4)));
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Simulated deliberation time. The caller clamps this against the time actually
 * left on the clock - see `clampThinkTime` in lib/game-logic.ts.
 */
export function getAIThinkTime(difficulty: Difficulty): number {
  const base = { easy: 2000, medium: 3000, hard: 4000 }[difficulty];
  return base + Math.random() * base;
}
