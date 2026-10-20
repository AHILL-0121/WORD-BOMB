// Word Bomb PartyServer server — authoritative game loop.
//
// The server owns every rule. Clients only render state and send intents; any
// message that would break an invariant is rejected here rather than trusted.

import { Server, routePartykitRequest } from "partyserver";
import type { Connection } from "partyserver";

import { generateSyllable } from "../lib/syllables";
import { isValidWord } from "../lib/wordlist";
import { generateAIWord, generateFallbackWord, getAIThinkTime } from "../lib/ai-service";
import { getAvatar } from "../lib/avatars";
import {
  ALPHABET_SIZE,
  MAX_WORD_LENGTH,
  clampThinkTime,
  evaluateGameEnd,
  firstPlayerId,
  mergeLetters,
  nextPlayerId,
  pickBots,
  roundFromTurns,
  sanitizePlayerName,
  sanitizeWord,
  summarizeMatch,
  timerDurationMs,
  validateSettings,
} from "../lib/game-logic";
import { DEFAULT_ROOM_SETTINGS, SHOUTS } from "../types/game";
import type {
  GameState,
  MatchSummary,
  PlayedWord,
  Player,
  RejectReason,
  RoomErrorCode,
  RoomSettings,
  ServerMessage,
  Shout,
} from "../types/game";

/** Server-side player record. `sessionId` never leaves this process. */
interface ServerPlayer extends Player {
  sessionId: string;
  disconnectedAt: number | null;
}

const GRACE_PERIOD_MS = 30_000;
/** Accepted words shown to clients. The authoritative list is `playedWords`. */
const RECENT_WORDS = 40;
const DICTIONARY_TIMEOUT_MS = 3_500;
const DICTIONARY_CACHE_LIMIT = 2_000;
/** Per-connection message budget: 20 messages per rolling 5 seconds. */
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 5_000;
/**
 * Typing updates are relayed on their own budget: they are frequent by design
 * and would otherwise exhaust the main rate limit mid-turn.
 */
const TYPING_MIN_INTERVAL_MS = 50;
/** Pre-game countdown, so nobody's first turn starts before they can see it. */
const COUNTDOWN_MS = 3_200;
/** Per-letter typing speed for bots, in ms. */
const AI_KEYSTROKE_MS = { easy: 170, medium: 120, hard: 85 } as const;

export class WordBombServer extends Server {
  private players: ServerPlayer[] = [];
  private settings: RoomSettings = { ...DEFAULT_ROOM_SETTINGS };
  private phase: GameState["phase"] = "lobby";
  private currentPlayerId: string | null = null;
  private currentSyllable = "";
  private playedWords: PlayedWord[] = [];
  private usedWordSet = new Set<string>();
  private round = 0;
  private turnsTaken = 0;
  private timerDuration = DEFAULT_ROOM_SETTINGS.initialTimer * 1000;
  private timerEndsAt = 0;
  private startsAt: number | null = null;
  private winner: { id: string; name: string } | null = null;
  private eliminationOrder: string[] = [];
  private summary: MatchSummary | null = null;
  /** Word-of-the-game ballots, one per player id. */
  private ballots = new Map<string, string>();

  private timer: ReturnType<typeof setTimeout> | null = null;
  private graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /**
   * Bumped on every turn transition. Async work (word validation, AI moves,
   * the round timer) captures the value and aborts on resume if it has moved
   * on. This is what stops a slow dictionary lookup from resolving into a turn
   * that has already ended.
   */
  private turnToken = 0;
  /** True while a word for the current turn is being validated. */
  private resolving = false;

  private dictionaryCache = new Map<string, boolean>();
  private rateLimits = new Map<string, { count: number; windowStart: number }>();
  private lastTyping = new Map<string, number>();

  // ── Connection lifecycle ────────────────────────────────────────────────

  onConnect(conn: Connection) {
    this.send(conn, { type: "state-update", state: this.publicState() });
  }

  async onMessage(conn: Connection, message: string | ArrayBuffer | ArrayBufferView) {
    if (typeof message !== "string" || message.length > 2_000) return;

    let msg: { type?: unknown;[key: string]: unknown };
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== "string") return;

    // Typing has its own throttle (see TYPING_MIN_INTERVAL_MS) and is simply
    // dropped when too frequent, never answered with an error.
    if (msg.type === "typing") return this.handleTyping(msg.text, conn);

    if (this.isRateLimited(conn.id)) {
      this.send(conn, {
        type: "room-error",
        code: "rate-limited",
        message: "Slow down — too many actions.",
      });
      return;
    }

    try {
      switch (msg.type) {
        case "join":
          return this.handleJoin(msg, conn);
        case "update-settings":
          return this.handleUpdateSettings(msg, conn);
        case "start-game":
          return this.handleStart(conn);
        case "submit-word":
          return await this.handleWord(msg.word, conn.id, conn);
        case "shout":
          return this.handleShout(msg.shout, conn);
        case "vote":
          return this.handleVote(msg.word, conn);
        case "restart":
          return this.handleRestart(conn);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  onClose(conn: Connection) {
    this.lastTyping.delete(conn.id);
    const player = this.players.find((p) => p.id === conn.id);
    if (!player) return;

    player.disconnectedAt = Date.now();
    player.isDisconnected = true;
    console.log(`Player disconnected: ${player.name} (${GRACE_PERIOD_MS / 1000}s grace period)`);

    // Replace any timer from an earlier disconnect so reconnect churn cannot
    // stack up several pending removals for the same seat.
    this.clearGraceTimer(player.sessionId);
    this.graceTimers.set(
      player.sessionId,
      setTimeout(() => this.dropPlayer(player.sessionId), GRACE_PERIOD_MS)
    );

    // If the disconnected player was mid-turn, hand the turn on rather than
    // letting the room sit until the clock runs out.
    if (this.phase === "playing" && this.currentPlayerId === player.id) {
      this.turnToken++;
      this.endTurn();
    } else {
      this.broadcastState();
    }
  }

  private dropPlayer(sessionId: string) {
    this.graceTimers.delete(sessionId);
    const player = this.players.find((p) => p.sessionId === sessionId);
    if (!player || !player.disconnectedAt) return;

    const wasHost = player.isHost;
    const wasTheirTurn = this.currentPlayerId === player.id;
    const successorId = wasTheirTurn ? nextPlayerId(this.players, player.id) : null;

    this.players = this.players.filter((p) => p.sessionId !== sessionId);
    console.log(`Player removed after grace period: ${player.name}`);

    if (wasHost) this.promoteNewHost();

    if (this.phase === "playing") {
      if (wasTheirTurn) this.currentPlayerId = successorId;
      if (this.finishIfOver()) return;
      // The turn pointer may now name a player who has left the table.
      if (
        this.startsAt === null &&
        !this.players.some((p) => p.id === this.currentPlayerId && !p.isEliminated)
      ) {
        this.currentPlayerId = firstPlayerId(this.players);
      }
    }

    this.broadcastState();
  }

  private promoteNewHost() {
    if (this.players.some((p) => p.isHost)) return;
    const successor = this.players.find((p) => !p.isAI);
    if (successor) {
      successor.isHost = true;
      console.log(`Host transferred to: ${successor.name}`);
    }
  }

  private clearGraceTimer(sessionId: string) {
    const existing = this.graceTimers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
      this.graceTimers.delete(sessionId);
    }
  }

  // ── Rate limiting ───────────────────────────────────────────────────────

  private isRateLimited(connectionId: string): boolean {
    const now = Date.now();
    const entry = this.rateLimits.get(connectionId);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      this.rateLimits.set(connectionId, { count: 1, windowStart: now });
      return false;
    }
    entry.count += 1;
    return entry.count > RATE_LIMIT_MAX;
  }

  // ── Joining ─────────────────────────────────────────────────────────────

  private handleJoin(msg: Record<string, unknown>, sender: Connection) {
    const sessionId = typeof msg.sessionId === "string" ? msg.sessionId.slice(0, 64) : null;

    // Reconnection: the session credential is matched server-side and is never
    // present in any broadcast, so it cannot be lifted from another client.
    const returning = sessionId ? this.players.find((p) => p.sessionId === sessionId) : null;
    if (returning) {
      const previousId = returning.id;
      returning.id = sender.id;
      returning.disconnectedAt = null;
      returning.isDisconnected = false;
      this.clearGraceTimer(returning.sessionId);

      if (this.currentPlayerId === previousId) this.currentPlayerId = sender.id;
      this.eliminationOrder = this.eliminationOrder.map((id) => (id === previousId ? sender.id : id));
      if (this.winner?.id === previousId) this.winner = { ...this.winner, id: sender.id };

      console.log(`Player reconnected: ${returning.name} (host: ${returning.isHost})`);
      this.send(sender, { type: "player-id", playerId: sender.id });
      this.broadcastState();
      return;
    }

    if (this.phase !== "lobby") {
      this.sendRoomError(sender, "game-in-progress", "That game has already started.");
      return;
    }

    const humanCount = this.players.filter((p) => !p.isAI).length;
    if (humanCount >= this.settings.maxPlayers) {
      this.sendRoomError(sender, "room-full", `This room is full (${this.settings.maxPlayers} players).`);
      return;
    }

    const player: ServerPlayer = {
      id: sender.id,
      sessionId: sessionId ?? sender.id,
      name: sanitizePlayerName(msg.playerName),
      // Unknown ids fall back to a real token instead of rendering nothing.
      avatar: getAvatar(typeof msg.avatar === "string" ? msg.avatar : undefined).id,
      lives: this.settings.startingLives,
      isEliminated: false,
      isHost: this.players.length === 0,
      isAI: false,
      isDisconnected: false,
      wordsPlayed: 0,
      lettersUsed: "",
      eliminatedInRound: null,
      disconnectedAt: null,
    };

    this.players.push(player);
    console.log(`New player joined: ${player.name} (host: ${player.isHost})`);

    this.send(sender, { type: "player-id", playerId: sender.id });
    this.broadcastState();
  }

  // ── Settings ────────────────────────────────────────────────────────────

  private handleUpdateSettings(msg: Record<string, unknown>, sender: Connection) {
    if (!this.requireHost(sender)) return;
    if (this.phase !== "lobby") {
      this.sendRoomError(sender, "game-in-progress", "Settings are locked once the game starts.");
      return;
    }

    // Every field is clamped to its documented range and unknown keys are
    // dropped, so a hand-crafted message cannot spawn 100k AI players or set a
    // negative timer.
    this.settings = validateSettings(msg.settings, this.settings);
    this.broadcastState();
  }

  // ── Starting and restarting ─────────────────────────────────────────────

  private handleStart(sender: Connection) {
    if (!this.requireHost(sender)) return;
    if (this.phase === "playing") return;

    const humanPlayers = this.players.filter((p) => !p.isAI);
    const minHumans = this.settings.aiMode ? 1 : 2;
    if (humanPlayers.length < minHumans) {
      this.sendRoomError(
        sender,
        "not-enough-players",
        this.settings.aiMode ? "You need at least one player." : "You need at least 2 players to start."
      );
      return;
    }

    this.players = humanPlayers;
    if (this.settings.aiMode) this.spawnAIPlayers();

    this.resetMatch();
    this.phase = "playing";
    for (const p of this.players) this.resetPlayer(p);

    // The first turn waits for a short countdown so every client sees it
    // coming. The turn pointer stays null until then, which also means no
    // word or typing frame can be accepted early.
    const token = ++this.turnToken;
    this.startsAt = Date.now() + COUNTDOWN_MS;
    this.broadcastState();
    this.clearTimer();
    this.timer = setTimeout(() => {
      if (this.turnToken !== token || this.phase !== "playing") return;
      this.startsAt = null;
      this.currentPlayerId = firstPlayerId(this.players);
      this.startTurn();
    }, COUNTDOWN_MS);
  }

  private spawnAIPlayers() {
    const budget = Math.max(0, this.settings.maxPlayers - this.players.length);
    const bots = pickBots(Math.min(this.settings.aiCount, budget), this.players.map((p) => p.name));

    for (let i = 0; i < bots.length; i++) {
      this.players.push({
        id: `ai-${Date.now()}-${i}`,
        sessionId: `ai-session-${Date.now()}-${i}`,
        name: bots[i].name,
        avatar: bots[i].avatar,
        lives: this.settings.startingLives,
        isEliminated: false,
        isHost: false,
        isAI: true,
        isDisconnected: false,
        wordsPlayed: 0,
        lettersUsed: "",
        eliminatedInRound: null,
        disconnectedAt: null,
      });
    }
  }

  private resetPlayer(p: ServerPlayer) {
    p.lives = this.settings.startingLives;
    p.isEliminated = false;
    p.wordsPlayed = 0;
    p.lettersUsed = "";
    p.eliminatedInRound = null;
  }

  private resetMatch() {
    this.round = 0;
    this.turnsTaken = 0;
    this.currentPlayerId = null;
    this.currentSyllable = "";
    this.playedWords = [];
    this.usedWordSet.clear();
    this.winner = null;
    this.eliminationOrder = [];
    this.summary = null;
    this.ballots.clear();
    this.timerEndsAt = 0;
    this.startsAt = null;
  }

  private handleRestart(sender: Connection) {
    if (!this.requireHost(sender)) return;

    this.clearTimer();
    this.turnToken++;
    this.resolving = false;

    this.players = this.players.filter((p) => !p.isAI);
    for (const p of this.players) this.resetPlayer(p);
    this.promoteNewHost();

    this.phase = "lobby";
    this.resetMatch();
    this.broadcastState();
  }

  // ── Turn loop ───────────────────────────────────────────────────────────

  private startTurn(keepSyllable = false) {
    this.clearTimer();
    this.resolving = false;
    const token = ++this.turnToken;

    const activeCount = this.players.filter((p) => !p.isEliminated).length;
    // A "round" is a full rotation of the table, so the timer decays at the
    // same rate regardless of how many people are playing.
    this.round = roundFromTurns(this.turnsTaken, activeCount);

    if (!keepSyllable || !this.currentSyllable) this.currentSyllable = generateSyllable();
    this.timerDuration = timerDurationMs(this.settings, this.round);
    this.timerEndsAt = Date.now() + this.timerDuration;

    this.broadcastState();

    this.timer = setTimeout(() => {
      if (this.turnToken !== token) return;
      this.onTimerExpired(token);
    }, this.timerDuration);

    const active = this.activePlayer();
    if (active?.isAI) void this.scheduleAIMove(active, token);
  }

  /** Advances past the current player and starts the next turn, or ends the game. */
  private endTurn(keepSyllable = false) {
    this.turnsTaken++;
    const successor = nextPlayerId(this.players, this.currentPlayerId);
    this.currentPlayerId = successor;
    if (this.finishIfOver()) return;
    this.startTurn(keepSyllable);
  }

  private onTimerExpired(token: number) {
    if (this.turnToken !== token || this.phase !== "playing") return;
    // A word is mid-validation for this turn; let it decide the outcome.
    if (this.resolving) return;

    const active = this.activePlayer();
    if (!active) return;

    this.turnToken++; // invalidate anything still in flight for this turn
    this.loseLife(active);
    // Sticky syllable: nobody answered it, so the next player inherits it.
    this.endTurn(this.settings.stickySyllable);
  }

  private loseLife(player: ServerPlayer) {
    player.lives -= 1;
    this.roomBroadcast({
      type: "life-lost",
      playerId: player.id,
      livesRemaining: Math.max(0, player.lives),
    });

    if (player.lives <= 0) {
      player.isEliminated = true;
      player.eliminatedInRound = this.round + 1;
      this.eliminationOrder.push(player.id);
      this.roomBroadcast({ type: "player-eliminated", playerId: player.id });
    }
  }

  private finishIfOver(): boolean {
    const { ended, winner } = evaluateGameEnd(this.players);
    if (!ended) return false;

    this.clearTimer();
    this.turnToken++;
    this.resolving = false;
    this.phase = "game-over";
    this.winner = winner;
    this.currentPlayerId = null;
    this.startsAt = null;
    this.summary = summarizeMatch(
      this.playedWords,
      this.players,
      this.eliminationOrder,
      winner?.id ?? null,
      this.round + 1
    );

    this.roomBroadcast({
      type: "game-over",
      winnerId: winner?.id ?? null,
      winnerName: winner?.name ?? null,
    });
    this.broadcastState();
    return true;
  }

  // ── Word submission ─────────────────────────────────────────────────────

  private async handleWord(rawWord: unknown, senderId: string, sender?: Connection) {
    if (this.phase !== "playing") return;
    const receivedAt = Date.now();

    const active = this.activePlayer();
    if (!active || active.id !== senderId) {
      this.reject(sender, senderId, "not-your-turn");
      return;
    }

    // One word may be in flight per turn. Without this, two frames sent a few
    // milliseconds apart both cleared the turn check while the first was still
    // awaiting the dictionary, and each one advanced the turn — letting a
    // double-tap consume two turns and skip the next player entirely.
    if (this.resolving) {
      this.reject(sender, senderId, "too-fast");
      return;
    }

    const word = sanitizeWord(rawWord);
    if (!word) {
      this.reject(sender, senderId, "malformed");
      return;
    }
    if (!word.includes(this.currentSyllable.toLowerCase())) {
      this.reject(sender, senderId, "no-syllable");
      return;
    }
    if (this.usedWordSet.has(word)) {
      this.reject(sender, senderId, "already-used");
      return;
    }

    const token = this.turnToken;
    this.resolving = true;
    let isValid: boolean;
    try {
      isValid = await this.validateWord(word);
    } finally {
      if (this.turnToken === token) this.resolving = false;
    }

    // The turn ended while we waited (timeout, disconnect, restart). Drop the
    // result rather than applying it to whatever turn is running now.
    if (this.turnToken !== token || this.phase !== "playing") return;

    if (!isValid) {
      this.reject(sender, senderId, "invalid");
      // The round timer may have fired while the dictionary was being asked,
      // and it stood aside for this word. Nothing re-arms it, so a rejected
      // word submitted near the buzzer has to end the turn itself.
      if (Date.now() >= this.timerEndsAt) this.onTimerExpired(token);
      return;
    }

    const played: PlayedWord = {
      word,
      syllable: this.currentSyllable.toLowerCase(),
      playerId: senderId,
      ms: Math.max(0, receivedAt - (this.timerEndsAt - this.timerDuration)),
      msLeft: Math.max(0, this.timerEndsAt - receivedAt),
    };
    this.playedWords.push(played);
    this.usedWordSet.add(word);
    active.wordsPlayed += 1;

    this.roomBroadcast({ type: "word-accepted", ...played });
    this.applyAlphabet(active, word);
    this.endTurn();
  }

  /** Alphabet bonus: every letter used at least once wins a life back. */
  private applyAlphabet(player: ServerPlayer, word: string) {
    if (!this.settings.alphabetBonus) return;
    player.lettersUsed = mergeLetters(player.lettersUsed, word);
    if (player.lettersUsed.length < ALPHABET_SIZE) return;
    player.lettersUsed = "";
    player.lives += 1;
    this.roomBroadcast({ type: "bonus-life", playerId: player.id });
  }

  private reject(sender: Connection | undefined, playerId: string, reason: RejectReason) {
    // `playerId` is included so clients can tell whether a rejection was theirs.
    // Its absence is why the FUSE mascot's "angry" reaction never fired.
    if (sender) this.send(sender, { type: "word-rejected", playerId, reason });
  }

  private async validateWord(word: string): Promise<boolean> {
    // The offline list only holds real words, so a hit there needs no network
    // round trip. Only unknown words go to the dictionary API.
    if (isValidWord(word)) return true;
    const cached = this.dictionaryCache.get(word);
    if (cached !== undefined) return cached;

    try {
      const res = await fetch(
        // Encoded so a crafted word cannot alter the request path.
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
        { signal: AbortSignal.timeout(DICTIONARY_TIMEOUT_MS) }
      );
      if (res.ok) {
        this.cacheDictionaryResult(word, true);
        return true;
      }
      if (res.status === 404) {
        // A definitive "no such word" — but the offline list may still know it.
        const offline = isValidWord(word);
        this.cacheDictionaryResult(word, offline);
        return offline;
      }
    } catch {
      // Timeout or network failure: fall through to the offline list without
      // caching, so a transient outage does not poison the cache.
      return isValidWord(word);
    }

    return isValidWord(word);
  }

  private cacheDictionaryResult(word: string, result: boolean) {
    if (this.dictionaryCache.size >= DICTIONARY_CACHE_LIMIT) {
      const oldest = this.dictionaryCache.keys().next().value;
      if (oldest !== undefined) this.dictionaryCache.delete(oldest);
    }
    this.dictionaryCache.set(word, result);
  }

  // ── Live typing, shout-outs and votes ───────────────────────────────────

  private handleTyping(raw: unknown, sender: Connection) {
    if (this.phase !== "playing" || this.currentPlayerId !== sender.id || this.resolving) return;
    const now = Date.now();
    if (now - (this.lastTyping.get(sender.id) ?? 0) < TYPING_MIN_INTERVAL_MS) return;
    this.lastTyping.set(sender.id, now);

    // Letters only, capped: this is relayed verbatim to every other player.
    const text = typeof raw === "string" ? raw.toLowerCase().replace(/[^a-z]/g, "").slice(0, MAX_WORD_LENGTH) : "";
    this.broadcast(JSON.stringify({ type: "typing", playerId: sender.id, text } satisfies ServerMessage), [
      sender.id,
    ]);
  }

  private handleShout(raw: unknown, sender: Connection) {
    if (!this.settings.reactions || this.phase === "lobby") return;
    if (!SHOUTS.includes(raw as Shout)) return;
    if (!this.players.some((p) => p.id === sender.id)) return;
    this.roomBroadcast({ type: "shout", playerId: sender.id, shout: raw as Shout });
  }

  private handleVote(raw: unknown, sender: Connection) {
    if (this.phase !== "game-over" || !this.summary) return;
    if (!this.players.some((p) => p.id === sender.id)) return;
    const word = typeof raw === "string" ? raw.toLowerCase() : "";
    if (!this.summary.candidates.some((c) => c.word === word)) return;

    this.ballots.set(sender.id, word);
    const votes: Record<string, number> = Object.fromEntries(this.summary.candidates.map((c) => [c.word, 0]));
    for (const choice of this.ballots.values()) votes[choice] = (votes[choice] ?? 0) + 1;
    this.summary = { ...this.summary, votes };
    this.broadcastState();
  }

  // ── AI ──────────────────────────────────────────────────────────────────

  private async scheduleAIMove(aiPlayer: ServerPlayer, token: number) {
    // Never deliberate for longer than the clock allows, otherwise the AI
    // forfeits turns it could have answered (8s think time vs a 5s floor).
    const thinkTime = clampThinkTime(getAIThinkTime(this.settings.difficulty), this.timerDuration);
    await sleep(thinkTime);
    if (this.turnToken !== token || this.phase !== "playing") return;

    try {
      const word = await generateAIWord({
        syllable: this.currentSyllable,
        usedWords: this.playedWords.map((w) => w.word),
        difficulty: this.settings.difficulty,
        playerName: aiPlayer.name,
      });
      if (this.turnToken !== token) return;

      if (!word) {
        // No word available: forfeit the turn immediately instead of letting
        // the room sit in silence until the clock expires.
        console.log(`AI ${aiPlayer.name} could not find a word for "${this.currentSyllable}"`);
        this.turnToken++;
        this.clearTimer();
        this.loseLife(aiPlayer);
        this.endTurn(this.settings.stickySyllable);
        return;
      }

      if (!(await this.typeAndSubmit(aiPlayer, word, token))) return;

      // Still this turn, so the word was rejected — typically the model chose
      // a real word the dictionary could not confirm (the API is down or slow).
      // Retry with an offline word, which is always accepted, if time allows.
      if (this.turnToken !== token || this.timerEndsAt - Date.now() < 800) return;
      const fallback = generateFallbackWord(
        this.currentSyllable,
        this.playedWords.map((w) => w.word),
        this.settings.difficulty
      );
      if (fallback && fallback !== word) await this.typeAndSubmit(aiPlayer, fallback, token);
    } catch (error) {
      console.error(`Error in AI move for ${aiPlayer.name}:`, error);
    }
  }

  /**
   * Types a bot's word out letter by letter so everyone can watch, then
   * submits it, always finishing with a little time to spare. Returns false if
   * the turn moved on first.
   */
  private async typeAndSubmit(bot: ServerPlayer, word: string, token: number): Promise<boolean> {
    const budget = this.timerEndsAt - Date.now() - 400;
    const step = Math.max(20, Math.min(AI_KEYSTROKE_MS[this.settings.difficulty], budget / (word.length + 1)));
    for (let i = 1; i <= word.length; i++) {
      await sleep(step);
      if (this.turnToken !== token) return false;
      this.roomBroadcast({ type: "typing", playerId: bot.id, text: word.slice(0, i) });
    }
    await sleep(step);
    if (this.turnToken !== token) return false;
    await this.handleWord(word, bot.id);
    return true;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private activePlayer(): ServerPlayer | undefined {
    if (!this.currentPlayerId) return undefined;
    return this.players.find((p) => p.id === this.currentPlayerId && !p.isEliminated);
  }

  private requireHost(sender: Connection): boolean {
    const host = this.players.find((p) => p.isHost);
    if (!host || host.id !== sender.id) {
      this.sendRoomError(sender, "not-host", "Only the host can do that.");
      return false;
    }
    return true;
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private sendRoomError(conn: Connection, code: RoomErrorCode, message: string) {
    this.send(conn, { type: "room-error", code, message });
  }

  private send(conn: Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  private roomBroadcast(msg: ServerMessage) {
    this.broadcast(JSON.stringify(msg));
  }

  /** State as clients see it — `sessionId` is stripped here. */
  private publicState(): GameState {
    return {
      phase: this.phase,
      players: this.players.map(({ sessionId: _sessionId, disconnectedAt: _disconnectedAt, ...pub }) => pub),
      settings: this.settings,
      currentPlayerId: this.currentPlayerId,
      currentSyllable: this.currentSyllable,
      recentWords: this.playedWords.slice(-RECENT_WORDS).reverse(),
      wordCount: this.playedWords.length,
      round: this.round,
      timerDuration: this.timerDuration,
      timerEndsAt: this.timerEndsAt,
      startsAt: this.startsAt,
      serverNow: Date.now(),
      winner: this.winner,
      summary: this.summary,
    };
  }

  private broadcastState() {
    this.roomBroadcast({ type: "state-update", state: this.publicState() });
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ── Cloudflare Worker entry point ───────────────────────────────────────────
// routePartykitRequest maps incoming fetch requests to WordBombServer rooms
// (one Durable Object instance per room ID), exactly like PartyKit did.

export interface Env {
  "word-bomb-server": unknown; // Durable Object binding — name matches URL path segment
  GROQ_API_KEY?: string;
  [key: string]: unknown;  // satisfies routePartykitRequest's Record<string, unknown> constraint
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 })
    );
  },
};
