"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GameState, RejectReason, ServerMessage, Shout } from "@/types/game";
import { SHOUTS } from "@/types/game";
import type { ConnectionStatus } from "@/hooks/usePartySocket";
import { NERVOUS_THRESHOLD_MS, isBigPlay } from "@/hooks/useFuseMood";
import { LINES, pickLine, type FuseMood } from "@/lib/fuse-moods";
import { MAX_WORD_LENGTH } from "@/lib/game-logic";
import { isSoundOn, setSoundOn, sfx, vibrate } from "@/lib/sfx";
import { Fuse } from "../ui/Fuse";
import { BombMark, Icon } from "../ui/Icon";
import { Token } from "../ui/Token";
import type { ToastKind } from "../ui/Toasts";

interface GameViewProps {
  state: GameState;
  myId: string;
  roomId: string;
  status: ConnectionStatus;
  mood: FuseMood;
  serverNow: () => number;
  typing: { playerId: string; text: string } | null;
  subscribe: (listener: (msg: ServerMessage) => void) => () => void;
  onSubmit: (word: string) => void;
  onTyping: (text: string) => void;
  onShout: (shout: Shout) => void;
  onLeave: () => void;
  toast: (text: string, kind?: ToastKind) => void;
}

const REJECTION_TEXT: Record<RejectReason, string> = {
  invalid: "That's not a word we know",
  "already-used": "Already played this game",
  "no-syllable": "It needs the letters on the bomb",
  "not-your-turn": "Hold on, it's not your turn",
  malformed: "Letters only, please",
  "too-fast": "Still checking your last word",
};

const RING_R = 112;
const RING_C = 2 * Math.PI * RING_R;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");
/** A word answered this fast keeps your streak going. */
const STREAK_MS = 4500;
const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").slice(0, MAX_WORD_LENGTH);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function GameView(props: GameViewProps) {
  const { state, myId, roomId, status, mood, serverNow, typing, subscribe, onSubmit, onTyping, onShout, onLeave, toast } = props;
  const { players, settings, currentPlayerId } = state;

  const me = players.find((p) => p.id === myId);
  const current = players.find((p) => p.id === currentPlayerId);
  const isMyTurn = Boolean(currentPlayerId) && currentPlayerId === myId;
  const nameOf = useCallback((id: string) => (id === myId ? "You" : players.find((p) => p.id === id)?.name ?? "Someone"), [players, myId]);

  const [word, setWord] = useState("");
  const [flash, setFlash] = useState<{ text: string; kind: "ok" | "bad" } | null>(null);
  const [speech, setSpeech] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [bannerKey, setBannerKey] = useState(0);
  const [boomKey, setBoomKey] = useState(0);
  const [nudgeKey, setNudgeKey] = useState(0);
  const [hitId, setHitId] = useState<string | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [sound, setSound] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [announcement, setAnnouncement] = useState("");
  const [leaveArmed, setLeaveArmed] = useState(false);

  const gameRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bombRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progRef = useRef<SVGCircleElement>(null);
  const headRef = useRef<SVGCircleElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const srTimerRef = useRef<HTMLDivElement>(null);
  const seatRefs = useRef(new Map<string, HTMLLIElement>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => setSound(isSoundOn()), []);

  // ── FUSE talks ───────────────────────────────────────────────────────────
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((text: string, ms = 2200) => {
    setSpeech(text);
    if (speechTimer.current) clearTimeout(speechTimer.current);
    speechTimer.current = setTimeout(() => setSpeech(null), ms);
  }, []);
  useEffect(() => () => {
    if (speechTimer.current) clearTimeout(speechTimer.current);
  }, []);

  // ── Effects that live outside React (particles, floating shouts, shake) ─
  const burst = useCallback((count: number) => {
    const fx = fxRef.current, stage = stageRef.current, bomb = bombRef.current;
    if (!fx || !stage || !bomb || reducedMotion()) return;
    const s = stage.getBoundingClientRect(), b = bomb.getBoundingClientRect();
    const colors = ["var(--amber)", "var(--text)", "var(--fuse)"];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("i");
      const angle = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 110;
      p.className = "particle";
      p.style.cssText = `left:${b.left - s.left + b.width / 2}px;top:${b.top - s.top + b.height / 2}px;background:${colors[i % 3]};--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;--r:${Math.random() * 540}deg`;
      fx.appendChild(p);
      setTimeout(() => p.remove(), 750);
    }
  }, []);

  const floatShout = useCallback((text: string, playerId: string) => {
    const fx = fxRef.current, stage = stageRef.current;
    if (!fx || !stage) return;
    const s = stage.getBoundingClientRect();
    const seat = seatRefs.current.get(playerId)?.querySelector(".ava")?.getBoundingClientRect();
    const x = seat ? seat.left - s.left + seat.width / 2 : s.width / 2;
    const y = seat ? Math.min(seat.top - s.top + 10, s.height - 50) : s.height - 60;
    const el = document.createElement("span");
    el.className = "shout-float";
    el.textContent = text;
    el.style.cssText = `left:${x}px;top:${y}px;translate:-50% 0;rotate:${(Math.random() - 0.5) * 12}deg;--sway:${(Math.random() - 0.5) * 60}px`;
    fx.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }, []);

  const shakeScreen = useCallback(() => {
    const g = gameRef.current;
    if (!g || reducedMotion()) return;
    g.classList.remove("shake");
    void g.offsetWidth;
    g.classList.add("shake");
  }, []);

  // ── Server events ────────────────────────────────────────────────────────
  useEffect(
    () =>
      subscribe((msg) => {
        switch (msg.type) {
          case "word-accepted": {
            setFlash({ text: msg.word, kind: "ok" });
            later(() => setFlash(null), 650);
            sfx.ok();
            burst(msg.word.length >= 9 ? 26 : 14);
            if (msg.word.length >= 9) say(pickLine(LINES.long(msg.word.length)));
            else if (msg.msLeft < 1500) say(pickLine(LINES.clutch((msg.msLeft / 1000).toFixed(1))));
            else if (msg.playerId === myId || Math.random() < 0.35) say(pickLine(LINES.happy), 1500);
            if (msg.playerId === myId) {
              setWord("");
              setStreak((n) => (msg.ms < STREAK_MS ? n + 1 : 0));
            }
            break;
          }
          case "word-rejected": {
            if (msg.playerId !== myId) break;
            toast(REJECTION_TEXT[msg.reason], "bad");
            sfx.bad();
            vibrate(60);
            setNudgeKey((k) => k + 1);
            if (msg.reason === "already-used") say(pickLine(LINES.used), 1400);
            else if (msg.reason === "no-syllable") say(pickLine(LINES.wrongLetters), 1400);
            else if (msg.reason === "invalid" || msg.reason === "malformed") say(pickLine(LINES.angry), 1400);
            break;
          }
          case "life-lost": {
            const mine = msg.playerId === myId;
            sfx.boom();
            setBoomKey((k) => k + 1);
            shakeScreen();
            setHitId(msg.playerId);
            later(() => setHitId(null), 600);
            setFlash({ text: "", kind: "bad" });
            later(() => setFlash(null), 900);
            if (mine) {
              vibrate([90, 40, 140]);
              setStreak(0);
            }
            if (msg.livesRemaining > 0) {
              say(mine ? pickLine(LINES.youTimedOut) : pickLine(LINES.timeout(nameOf(msg.playerId))));
              setAnnouncement(`${nameOf(msg.playerId)} lost a life.`);
            }
            break;
          }
          case "player-eliminated": {
            const mine = msg.playerId === myId;
            toast(mine ? "You're out. Stick around and heckle." : `${nameOf(msg.playerId)} is out`, "bad");
            say(mine ? pickLine(LINES.youOut) : pickLine(LINES.out(nameOf(msg.playerId))));
            setAnnouncement(mine ? "You are eliminated." : `${nameOf(msg.playerId)} is eliminated.`);
            break;
          }
          case "bonus-life": {
            const mine = msg.playerId === myId;
            toast(mine ? "Alphabet bonus! +1 life" : `${nameOf(msg.playerId)} completed the alphabet`, "good");
            if (mine) {
              say(pickLine(LINES.bonus));
              vibrate([30, 30, 30]);
            }
            break;
          }
          case "shout":
            floatShout(msg.shout, msg.playerId);
            break;
          case "game-over":
            say(msg.winnerId === myId ? pickLine(LINES.youWin) : msg.winnerName ? pickLine(LINES.win(msg.winnerName)) : "…boom.", 3000);
            break;
        }
      }),
    [subscribe, myId, nameOf, later, burst, floatShout, shakeScreen, say, toast]
  );

  // ── Turn changes ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMyTurn) return;
    setWord("");
    setBannerKey((k) => k + 1);
    sfx.turn();
    vibrate(35);
    say(pickLine(LINES.yourTurn));
    inputRef.current?.focus({ preventScroll: true });
    setAnnouncement(`Your turn. Syllable ${state.currentSyllable.split("").join(" ")}.`);
    // Only on the transition into our turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, state.timerEndsAt]);

  // Pre-game countdown, driven by the server's start time.
  useEffect(() => {
    if (!state.startsAt) {
      setCountdown(null);
      return;
    }
    const startsAt = state.startsAt;
    let last = -1;
    const tick = () => {
      const n = Math.ceil((startsAt - serverNow()) / 1000);
      if (n !== last) {
        last = n;
        setCountdown(n > 0 ? n : null);
        if (n > 0) sfx.tick(false);
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [state.startsAt, serverNow]);

  // ── The fuse ring, animated per frame without re-rendering React ────────
  useEffect(() => {
    const prog = progRef.current, head = headRef.current, time = timeRef.current, stage = stageRef.current;
    if (!prog || !head || !time || !stage) return;
    const setRing = (f: number) => {
      prog.style.strokeDashoffset = String(RING_C * (1 - f));
      prog.style.stroke = f > 0.5 ? "var(--text)" : f > 0.25 ? "var(--amber)" : "var(--danger)";
      const a = 2 * Math.PI * f;
      head.setAttribute("cx", String(120 + RING_R * Math.cos(a)));
      head.setAttribute("cy", String(120 + RING_R * Math.sin(a)));
    };

    if (!currentPlayerId) {
      setRing(1);
      time.textContent = state.startsAt ? "…" : "0.0";
      stage.classList.remove("danger");
      return;
    }

    let raf = 0;
    let lastTick: number | null = null;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const rem = state.timerEndsAt - serverNow();
      const f = Math.min(1, Math.max(0, rem / state.timerDuration));
      setRing(f);
      time.textContent = Math.max(0, rem / 1000).toFixed(1);
      const hot = rem < NERVOUS_THRESHOLD_MS && rem > 0;
      stage.classList.toggle("danger", hot);
      const step = hot ? 500 : 1000;
      const k = Math.floor(rem / step);
      if (k !== lastTick && rem > 0) {
        if (lastTick !== null) sfx.tick(hot);
        lastTick = k;
        if (srTimerRef.current) srTimerRef.current.textContent = `${Math.ceil(rem / 1000)} seconds`;
      }
    };
    frame();
    return () => {
      cancelAnimationFrame(raf);
      stage.classList.remove("danger");
    };
  }, [currentPlayerId, state.timerEndsAt, state.timerDuration, state.startsAt, serverNow]);

  // ── FUSE looks at whoever has the bomb ───────────────────────────────────
  useLayoutEffect(() => {
    const aim = () => {
      const seat = currentPlayerId ? seatRefs.current.get(currentPlayerId)?.querySelector(".ava") : null;
      const bomb = bombRef.current;
      if (!seat || !bomb) return setLook({ x: 0, y: 0 });
      const a = seat.getBoundingClientRect(), b = bomb.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2);
      const dy = a.top + a.height / 2 - (b.top + b.height * 0.55);
      const d = Math.hypot(dx, dy) || 1;
      setLook({ x: (dx / d) * 5, y: (dy / d) * 5 });
    };
    aim();
    window.addEventListener("resize", aim);
    return () => window.removeEventListener("resize", aim);
  }, [currentPlayerId, players.length]);

  // Keep the active seat visible in the phone strip.
  useEffect(() => {
    const seat = currentPlayerId ? seatRefs.current.get(currentPlayerId) : null;
    const strip = seat?.parentElement;
    if (!seat || !strip || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({
      left: seat.offsetLeft - strip.clientWidth / 2 + seat.offsetWidth / 2,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  }, [currentPlayerId]);

  // ── Input ────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = word.trim();
    if (!isMyTurn) {
      toast(me?.isEliminated ? "You're out this round" : "Hold on, it's not your turn yet");
      setNudgeKey((k) => k + 1);
      return;
    }
    if (w) onSubmit(w);
  };

  // Leaving mid-game takes two taps, so a stray thumb cannot forfeit a match.
  const leave = () => {
    if (leaveArmed) return onLeave();
    setLeaveArmed(true);
    toast("Tap again to leave the game");
    later(() => setLeaveArmed(false), 2500);
  };

  // ── Derived display values ───────────────────────────────────────────────
  const syllable = state.currentSyllable;
  const liveText = flash ? flash.text : isMyTurn ? clean(word) : typing && typing.playerId === currentPlayerId ? typing.text : "";
  const matchAt = syllable ? liveText.indexOf(syllable) : -1;
  const letters = me?.lettersUsed ?? "";
  const recentWords = state.recentWords ?? [];
  const lastWord = recentWords[0];
  const n = players.length;
  const meIndex = Math.max(0, players.findIndex((p) => p.id === myId));

  const prevLetters = useRef(letters);
  const freshLetters = letters.split("").filter((l) => !prevLetters.current.includes(l));
  useEffect(() => {
    prevLetters.current = letters;
  }, [letters]);

  let liveLabel: React.ReactNode = "Get ready";
  if (current && isMyTurn) liveLabel = <><b>Your</b> turn</>;
  else if (current) liveLabel = <><b>{current.name}</b> {current.isAI ? "is typing" : "has the bomb"}</>;

  return (
    <main ref={gameRef} className="page game">
      <header className="game-top">
        <button className="icon-btn" onClick={leave} aria-label={leaveArmed ? "Tap again to leave" : "Leave game"}>
          <Icon name="close" />
        </button>
        <span className="chip">ROOM <b>{roomId}</b></span>
        {status !== "connected" && <span className="chip status-chip">{status === "reconnecting" ? "RECONNECTING…" : "OFFLINE"}</span>}
        <span className="spacer" />
        <span className={`chip streak-chip ${streak >= 2 ? "show" : ""}`}>STREAK ×{streak}</span>
        <span className="chip">RND <b>{state.round + 1}</b></span>
        <button
          className="icon-btn"
          aria-pressed={sound}
          aria-label="Sound"
          onClick={() => {
            const next = !sound;
            setSoundOn(next);
            setSound(next);
            if (next) sfx.pop();
            toast(next ? "Sound on" : "Sound off");
          }}
        >
          <Icon name={sound ? "soundOn" : "soundOff"} />
        </button>
      </header>

      <div className="game-body">
        <div className="play-col">
          <div className="stage" ref={stageRef}>
            <ul className="seats" aria-label="Players">
              {players.map((p, i) => {
                const rel = (i - meIndex + n) % n;
                const angle = ((90 + (rel * 360) / n) * Math.PI) / 180;
                const pips = Math.max(settings.startingLives, p.lives);
                return (
                  <li
                    key={p.id}
                    ref={(el) => {
                      if (el) seatRefs.current.set(p.id, el);
                      else seatRefs.current.delete(p.id);
                    }}
                    className={[
                      "seat",
                      p.id === myId && "you",
                      p.id === currentPlayerId && "active",
                      p.isEliminated && "out",
                      p.isDisconnected && "disconnected",
                      p.id === hitId && "hit",
                    ].filter(Boolean).join(" ")}
                    style={{ "--x": `${50 + 43 * Math.cos(angle)}%`, "--y": `${50 + 40 * Math.sin(angle)}%` } as React.CSSProperties}
                  >
                    <Token avatar={p.avatar} name={p.name} className="ava">
                      <span className="badge"><BombMark /></span>
                    </Token>
                    <div className="nm">{p.id === myId ? "You" : p.name}</div>
                    <div className="hearts" aria-label={p.isEliminated ? "Out" : `${p.lives} of ${pips} lives`}>
                      {p.isEliminated
                        ? "OUT"
                        : Array.from({ length: pips }, (_, h) => <i key={h} className={h < p.lives ? "" : "gone"} />)}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="bomb-zone">
              <div ref={bombRef}>
                <Fuse mood={mood} className="bomb-wrap" look={look}>
                  <svg className="fuse-ring" viewBox="0 0 240 240" aria-hidden="true">
                    <circle className="track" cx="120" cy="120" r={RING_R} />
                    <circle ref={progRef} className="prog" cx="120" cy="120" r={RING_R} style={{ strokeDasharray: RING_C }} />
                    <circle ref={headRef} className="head" cx="232" cy="120" r="7" />
                  </svg>
                  <div className="ring-time" ref={timeRef} aria-hidden="true" />
                  {syllable && (
                    <div key={syllable} className="sticker pop" aria-label={`Syllable ${syllable}`}>
                      {syllable.toUpperCase()}
                    </div>
                  )}
                  <div className={`speech ${speech ? "show" : ""}`} aria-hidden="true">{speech}</div>
                </Fuse>
              </div>
              <div className="live">
                <div className="live-label">{liveLabel}</div>
                <div className={`live-word ${flash?.kind ?? ""}`} aria-hidden="true">
                  {liveText ? (
                    matchAt < 0 ? (
                      liveText
                    ) : (
                      <>
                        {liveText.slice(0, matchAt)}
                        <span className="m">{liveText.slice(matchAt, matchAt + syllable.length)}</span>
                        {liveText.slice(matchAt + syllable.length)}
                      </>
                    )
                  ) : (
                    <span className="ph">…</span>
                  )}
                  {!flash && <span className="caret" />}
                </div>
                <div className="last">
                  {lastWord && (
                    <>
                      {nameOf(lastWord.playerId)} · <b>{lastWord.word.toUpperCase()}</b> · {(lastWord.ms / 1000).toFixed(1)}s
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="fx" ref={fxRef} />
            {bannerKey > 0 && (
              <div key={bannerKey} className="overlay banner show" aria-hidden="true"><span>YOUR TURN!</span></div>
            )}
            <div className="sr-only" role="timer" aria-live="off" ref={srTimerRef} />
          </div>

          <form className={`dock ${isMyTurn ? "my-turn" : ""}`} onSubmit={handleSubmit} autoComplete="off">
            {settings.alphabetBonus && (
              <div className="alpha-block">
                <div className="alpha-head">
                  <span>ALPHABET BONUS</span>
                  <span><b>{letters.length}</b>/26</span>
                </div>
                <div className="alpha" aria-hidden="true">
                  {ALPHABET.map((l) => (
                    <span key={l} className={`${letters.includes(l) ? "on" : ""} ${freshLetters.includes(l) ? "new" : ""}`}>
                      {l.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="type-row">
              <button
                type="button"
                className="icon-btn react-btn"
                aria-label="Send a shout-out"
                aria-expanded={trayOpen}
                onClick={() => (settings.reactions ? setTrayOpen((o) => !o) : toast("Shout-outs are off in this room"))}
              >
                <Icon name="chat" />
              </button>
              <label className="sr-only" htmlFor="word-input">Your word</label>
              <input
                id="word-input"
                key={nudgeKey}
                ref={inputRef}
                className={`field ${nudgeKey ? "shake" : ""}`}
                value={word}
                maxLength={MAX_WORD_LENGTH}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                placeholder={
                  me?.isEliminated
                    ? "You're out. Heckle away"
                    : isMyTurn
                      ? `Type a word with “${syllable.toUpperCase()}”`
                      : current
                        ? `${current.name} has the bomb…`
                        : "Get ready…"
                }
                onChange={(e) => {
                  setWord(e.target.value);
                  if (isMyTurn) onTyping(clean(e.target.value));
                }}
                autoFocus={isMyTurn}
              />
              <button className="btn btn-primary send" type="submit" aria-label="Submit word">
                <Icon name="send" />
              </button>
            </div>
            <div className={`tray ${trayOpen ? "open" : ""}`} role="menu" aria-label="Shout-outs">
              {SHOUTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onShout(s);
                    sfx.pop();
                    setTrayOpen(false);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </form>
        </div>

        <aside className="side" aria-label="Match info">
          {settings.alphabetBonus && (
            <div className="card">
              <h4><span>Alphabet bonus</span><span><b style={{ color: "var(--amber)" }}>{letters.length}</b>/26</span></h4>
              <div className="big-alpha" aria-hidden="true">
                {ALPHABET.map((l) => <span key={l} className={letters.includes(l) ? "on" : ""}>{l.toUpperCase()}</span>)}
              </div>
            </div>
          )}
          <div className="card feed-card">
            <h4><span>Words played</span><span>{state.wordCount}</span></h4>
            <ul className="feed">
              {recentWords.length === 0 && <li className="empty">Nothing yet. Somebody say something smart.</li>}
              {recentWords.map((w, i) => {
                const who = players.find((p) => p.id === w.playerId);
                const at = w.word.indexOf(w.syllable);
                const W = w.word.toUpperCase();
                const end = at + w.syllable.length;
                return (
                  <li key={`${w.word}-${i}`}>
                    <Token avatar={who?.avatar ?? ""} name={who?.name ?? "?"} className="mini" />
                    <span className="kw">{at < 0 ? W : <>{W.slice(0, at)}<mark>{W.slice(at, end)}</mark>{W.slice(end)}</>}</span>
                    <small>{(w.ms / 1000).toFixed(1)}s</small>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>

      {countdown !== null && (
        <div className="overlay countdown show" aria-live="assertive">
          <span key={countdown}>{countdown}</span>
        </div>
      )}
      {boomKey > 0 && (
        <div key={boomKey} className="overlay boom show" aria-hidden="true"><b>BOOM!</b></div>
      )}
      <div className="sr-only" aria-live="assertive">{announcement}</div>
    </main>
  );
}
