// Word Bomb PartyKit Server (JavaScript version for Windows compatibility)

import { generateSyllable } from "../lib/syllables.js";
import { isValidWord } from "../lib/wordlist.js";
import { generateAIWord, getAIThinkTime } from "../lib/ai-service.js";
import { getRandomAvatar } from "../lib/avatars.js";

const DEFAULT_ROOM_SETTINGS = {
  difficulty: 'medium',
  maxPlayers: 8,
  startingLives: 3,
  initialTimer: 12,
  timerDecay: 0.5,
  minTimer: 5,
  aiMode: false,
  aiCount: 2,
};

export default class WordBombServer {
  constructor(room) {
    this.room = room;
    this.state = this.initialState();
    this.timer = null;
  }

  initialState() {
    return {
      phase: 'lobby',
      players: [],
      currentPlayerIndex: 0,
      currentSyllable: '',
      usedWords: [],
      round: 0,
      timerDuration: 12000,
      timerEndsAt: 0,
      settings: { ...DEFAULT_ROOM_SETTINGS },
    };
  }

  onConnect(conn) {
    conn.send(JSON.stringify({ type: 'state-update', state: this.state }));
  }

  async onMessage(message, sender) {
    try {
      const msg = JSON.parse(message);
      
      switch (msg.type) {
        case 'join':
          return this.handleJoin(msg, sender);
        case 'update-settings':
          return this.handleUpdateSettings(msg, sender);
        case 'start-game':
          return this.handleStart(sender);
        case 'submit-word':
          return await this.handleWord(msg, sender);
        case 'restart':
          return this.handleRestart(sender);
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  onClose(conn) {
    const player = this.state.players.find(p => p.id === conn.id);
    
    if (!player) return;

    // Mark player as disconnected but keep them for 30 seconds (grace period for reconnection)
    player.disconnectedAt = Date.now();
    const wasHost = player.isHost;
    
    console.log(`🔌 Player disconnected: ${player.name} (keeping for 30s grace period)`);

    // Remove player after 30 seconds if they don't reconnect
    setTimeout(() => {
      const stillDisconnected = this.state.players.find(p => p.id === conn.id && p.disconnectedAt);
      if (stillDisconnected) {
        this.state.players = this.state.players.filter(p => p.id !== conn.id);
        
        // Transfer host if needed
        if (wasHost && this.state.players.length > 0) {
          this.state.players[0].isHost = true;
          console.log(`👑 Host transferred to: ${this.state.players[0].name}`);
        }
        
        if (this.state.phase === 'playing') {
          this.checkWinCondition();
        }
        
        console.log(`❌ Player removed after timeout: ${stillDisconnected.name}`);
        this.broadcast();
      }
    }, 30000); // 30 second grace period
    
    this.broadcast();
  }

  handleJoin(msg, sender) {
    // Check if this is a reconnection (sessionId exists)
    const existingPlayerBySession = msg.sessionId 
      ? this.state.players.find(p => p.sessionId === msg.sessionId)
      : null;

    if (existingPlayerBySession) {
      // Reconnecting player - update their connection ID and clear disconnection flag
      existingPlayerBySession.id = sender.id;
      delete existingPlayerBySession.disconnectedAt;
      console.log(`♻️ Player reconnected: ${existingPlayerBySession.name} (host: ${existingPlayerBySession.isHost})`);
      
      // Send back player ID confirmation
      sender.send(JSON.stringify({
        type: 'player-id',
        playerId: sender.id
      }));
      this.broadcast();
      return;
    }

    // Check if connection ID already exists (shouldn't happen often)
    const existingPlayerById = this.state.players.find(p => p.id === sender.id);
    if (existingPlayerById) {
      delete existingPlayerById.disconnectedAt;
      sender.send(JSON.stringify({
        type: 'player-id',
        playerId: sender.id
      }));
      this.broadcast();
      return;
    }

    // New player joining
    const newPlayer = {
      id: sender.id,
      sessionId: msg.sessionId || sender.id, // Use sessionId or fallback to connection ID
      name: msg.playerName,
      avatar: msg.avatar || 'robot',
      lives: this.state.settings.startingLives,
      isEliminated: false,
      isHost: this.state.players.length === 0,
      isAI: false,
    };

    this.state.players.push(newPlayer);
    console.log(`✨ New player joined: ${newPlayer.name} (host: ${newPlayer.isHost}, avatar: ${newPlayer.avatar})`);
    
    // Send back player ID to the newly joined player
    sender.send(JSON.stringify({
      type: 'player-id',
      playerId: sender.id
    }));
    
    this.broadcast();
  }

  handleUpdateSettings(msg, sender) {
    const host = this.state.players.find(p => p.isHost);
    if (!host || host.id !== sender.id) {
      return; // Only host can update settings
    }

    if (this.state.phase !== 'lobby') {
      return; // Can only update settings in lobby
    }

    this.state.settings = { ...this.state.settings, ...msg.settings };
    console.log(`⚙️ Settings updated by host:`, this.state.settings);
    this.broadcast();
  }

  spawnAIPlayers() {
    const aiCount = this.state.settings.aiCount;
    const aiNames = ['ByteBot', 'CyberSage', 'NanoNinja', 'PixelPro', 'CodeWizard', 'DataDroid'];
    
    for (let i = 0; i < aiCount; i++) {
      const aiPlayer = {
        id: `ai-${Date.now()}-${i}`,
        sessionId: `ai-session-${Date.now()}-${i}`,
        name: aiNames[i] || `AI Player ${i + 1}`,
        avatar: getRandomAvatar().id,
        lives: this.state.settings.startingLives,
        isEliminated: false,
        isHost: false,
        isAI: true,
      };
      this.state.players.push(aiPlayer);
      console.log(`🤖 AI player spawned: ${aiPlayer.name}`);
    }
  }

  handleStart(sender) {
    const host = this.state.players.find(p => p.isHost);
    if (!host || host.id !== sender.id) {
      return;
    }

    const minPlayers = this.state.settings.aiMode ? 1 : 2;
    const humanPlayers = this.state.players.filter(p => !p.isAI);
    
    if (humanPlayers.length < minPlayers) {
      sender.send(JSON.stringify({
        type: 'word-rejected',
        reason: 'invalid'
      }));
      return;
    }

    // Spawn AI players if in AI mode
    if (this.state.settings.aiMode) {
      this.spawnAIPlayers();
    }

    this.state.phase = 'playing';
    this.state.round = 0;
    this.state.usedWords = [];
    this.state.currentPlayerIndex = 0;
    
    this.state.players.forEach(p => {
      p.lives = this.state.settings.startingLives;
      p.isEliminated = false;
    });

    this.startRound();
  }

  startRound() {
    const syllable = generateSyllable();
    
    // Calculate timer based on settings and round number
    const { initialTimer, timerDecay, minTimer } = this.state.settings;
    const timerSeconds = Math.max(
      minTimer,
      initialTimer - (this.state.round * timerDecay)
    );
    const timerDuration = timerSeconds * 1000;
    const timerEndsAt = Date.now() + timerDuration;

    this.state = {
      ...this.state,
      currentSyllable: syllable,
      timerDuration,
      timerEndsAt,
      round: this.state.round + 1,
    };

    this.broadcast();

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.onTimerExpired(), timerDuration);

    // If current player is AI, schedule their move
    const activePlayer = this.getActivePlayer();
    if (activePlayer?.isAI) {
      this.scheduleAIMove(activePlayer);
    }
  }

  async scheduleAIMove(aiPlayer) {
    const thinkTime = getAIThinkTime(this.state.settings.difficulty);
    
    setTimeout(async () => {
      // Check if it's still this AI's turn
      const currentPlayer = this.getActivePlayer();
      if (currentPlayer?.id !== aiPlayer.id) return;

      try {
        const word = await generateAIWord({
          syllable: this.state.currentSyllable,
          usedWords: this.state.usedWords,
          difficulty: this.state.settings.difficulty,
          playerName: aiPlayer.name
        });

        if (word) {
          // Simulate the AI submitting a word
          await this.handleWord({ word }, { id: aiPlayer.id });
        } else {
          // AI failed to find a word - timeout
          console.log(`🤖 AI ${aiPlayer.name} couldn't find a word`);
        }
      } catch (error) {
        console.error(`Error in AI move for ${aiPlayer.name}:`, error);
      }
    }, thinkTime);
  }

  onTimerExpired() {
    const activePlayer = this.getActivePlayer();
    if (!activePlayer) return;

    activePlayer.lives -= 1;
    this.room.broadcast(JSON.stringify({
      type: 'life-lost',
      playerId: activePlayer.id,
      livesRemaining: activePlayer.lives
    }));

    if (activePlayer.lives <= 0) {
      activePlayer.isEliminated = true;
      this.room.broadcast(JSON.stringify({
        type: 'player-eliminated',
        playerId: activePlayer.id
      }));
    }

    if (!this.checkWinCondition()) {
      this.advanceTurn();
      this.startRound();
    }
  }

  async handleWord(msg, sender) {
    if (this.state.phase !== 'playing') return;

    const activePlayer = this.getActivePlayer();
    if (!activePlayer || activePlayer.id !== sender.id) {
      // Check if sender has send method (not an AI player)
      if (sender.send) {
        sender.send(JSON.stringify({
          type: 'word-rejected',
          reason: 'not-your-turn'
        }));
      }
      return;
    }

    const word = msg.word.toLowerCase().trim();
    const syllable = this.state.currentSyllable.toLowerCase();

    if (!word.includes(syllable)) {
      if (sender.send) {
        sender.send(JSON.stringify({
          type: 'word-rejected',
          reason: 'no-syllable'
        }));
      }
      return;
    }

    if (this.state.usedWords.includes(word)) {
      if (sender.send) {
        sender.send(JSON.stringify({
          type: 'word-rejected',
          reason: 'already-used'
        }));
      }
      return;
    }

    const isValid = await this.validateWord(word);
    if (!isValid) {
      if (sender.send) {
        sender.send(JSON.stringify({
          type: 'word-rejected',
          reason: 'invalid'
        }));
      }
      return;
    }

    this.state.usedWords.push(word);
    this.room.broadcast(JSON.stringify({
      type: 'word-accepted',
      word,
      playerId: sender.id
    }));

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.advanceTurn();
    this.startRound();
  }

  async validateWord(word) {
    const clean = word.toLowerCase().trim();

    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`, {
        signal: AbortSignal.timeout(1000)
      });
      if (res.ok) return true;
    } catch (_) {
      // Fall through
    }

    return isValidWord(clean);
  }

  getActivePlayer() {
    const activePlayers = this.state.players.filter(p => !p.isEliminated);
    if (activePlayers.length === 0) return undefined;
    return activePlayers[this.state.currentPlayerIndex % activePlayers.length];
  }

  advanceTurn() {
    const activePlayers = this.state.players.filter(p => !p.isEliminated);
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % activePlayers.length;
  }

  checkWinCondition() {
    const activePlayers = this.state.players.filter(p => !p.isEliminated);
    
    if (activePlayers.length <= 1) {
      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        this.state.winner = { id: winner.id, name: winner.name };
        this.room.broadcast(JSON.stringify({
          type: 'game-over',
          winnerId: winner.id,
          winnerName: winner.name
        }));
      }
      
      this.state.phase = 'game-over';
      
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      
      this.broadcast();
      return true;
    }
    
    return false;
  }

  handleRestart(sender) {
    const host = this.state.players.find(p => p.isHost);
    if (!host || host.id !== sender.id) {
      return;
    }

    // Remove AI players on restart
    const humanPlayers = this.state.players.filter(p => !p.isAI);
    
    // Preserve settings across restart
    const preservedSettings = this.state.settings;

    this.state = {
      ...this.initialState(),
      settings: preservedSettings,
      players: humanPlayers.map(p => ({
        ...p,
        lives: preservedSettings.startingLives,
        isEliminated: false
      }))
    };

    this.broadcast();
  }

  broadcast() {
    this.room.broadcast(JSON.stringify({
      type: 'state-update',
      state: this.state
    }));
  }
}
