// AI Player Service using Groq API
// This service generates word suggestions for AI players

import { wordList } from './wordlist';

interface AIWordRequest {
  syllable: string;
  usedWords: string[];
  difficulty: 'easy'  | 'medium' | 'hard';
  playerName: string;
}

export async function generateAIWord({ syllable, usedWords, difficulty, playerName }: AIWordRequest): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.warn('Groq API key not configured, using fallback logic');
    return generateFallbackWord(syllable, usedWords);
  }

  try {
    const difficultyPrompts = {
      easy: 'Use common, simple English words',
      medium: 'Use moderately complex words',
      hard: 'Use advanced vocabulary and longer words'
    };

    const prompt = `You are an AI player named "${playerName}" in a word game. 

RULES:
- Find ONE valid English word that contains the syllable "${syllable}"
- The syllable can be anywhere in the word (start, middle, or end)
- Do NOT use these already-used words: ${usedWords.join(', ') || 'none yet'}
- ${difficultyPrompts[difficulty]}
- Respond with ONLY the word, nothing else

Your word:`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.7 : 1,
        max_completion_tokens: 20,
        top_p: 1,
        stream: false,
        stop: null
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Groq API error (${response.status}): ${errorText}`);
      return generateFallbackWord(syllable, usedWords);
    }

    const data = await response.json();
    const word = data.choices[0]?.message?.content?.trim().toLowerCase() || '';
    
    // Validate the word
    if (word && word.includes(syllable.toLowerCase()) && !usedWords.includes(word)) {
      return word;
    }

    // Fallback if AI response is invalid
    return generateFallbackWord(syllable, usedWords);

  } catch (error) {
    console.error('Error calling Groq API:', error);
    return generateFallbackWord(syllable, usedWords);
  }
}

// Fallback word generation using the full wordlist
function generateFallbackWord(syllable: string, usedWords: string[]): string | null {
  const syllableLower = syllable.toLowerCase();
  
  // Convert wordlist Set to array and filter for matching words
  const matchingWords = Array.from(wordList).filter(word => {
    const wordLower = word.toLowerCase();
    return wordLower.includes(syllableLower) && !usedWords.includes(wordLower);
  });

  if (matchingWords.length === 0) {
    console.warn(`No words found containing syllable: ${syllable}`);
    return null;
  }

  // Return a random matching word
  return matchingWords[Math.floor(Math.random() * matchingWords.length)];
}

// Simulate AI "thinking" delay based on difficulty
export function getAIThinkTime(difficulty: 'easy' | 'medium' | 'hard'): number {
  const base = {
    easy: 2000,    // 2-4 seconds
    medium: 3000,  // 3-6 seconds  
    hard: 4000,    // 4-8 seconds
  }[difficulty];

  const variance = base;
  return base + Math.random() * variance;
}
