"use client";

import { useEffect, useState } from "react";
import type { GameState, Player } from "@/types/game";
import { sfx } from "@/lib/sfx";
import { Crown, Icon } from "../ui/Icon";
import { Token } from "../ui/Token";
import type { ToastKind } from "../ui/Toasts";

interface ResultsViewProps {
  state: GameState;
  myId: string;
  onRestart: () => void;
  onVote: (word: string) => void;
  onHome: () => void;
  toast: (text: string, kind?: ToastKind) => void;
}

export function ResultsView({ state, myId, onRestart, onVote, onHome, toast }: ResultsViewProps) {
  const { players, summary } = state;
  const me = players.find((p) => p.id === myId);
  const isHost = me?.isHost ?? false;
  const [myVote, setMyVote] = useState<string | null>(null);

  const byId = (id: string) => players.find((p) => p.id === id);
  const label = (p: Player | undefined) => (!p ? "Someone" : p.id === myId ? "You" : p.name);
  const winner = state.winner ? byId(state.winner.id) : undefined;

  useEffect(() => {
    if (state.winner) return confetti();
  }, [state.winner]);

  const share = async () => {
    const mine = summary?.awards.longestWord?.playerId === myId ? summary.awards.longestWord.word : null;
    const text =
      `Word Bomb: ${state.winner ? (state.winner.id === myId ? "I won" : `${state.winner.name} won`) : "nobody survived"} ` +
      `in ${summary?.rounds ?? state.round + 1} rounds.` +
      (mine ? ` Longest word of the match: ${mine.toUpperCase()}.` : "");
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast("Result copied. Go brag", "good");
    } catch {
      toast(text);
    }
  };

  const awards = summary
    ? [
        { k: "Longest word", v: summary.awards.longestWord?.word ?? "—", who: summary.awards.longestWord?.playerId, accent: "var(--amber)" },
        {
          k: "Fastest answer",
          v: summary.awards.fastestAnswer ? `${(summary.awards.fastestAnswer.ms / 1000).toFixed(1)}s` : "—",
          who: summary.awards.fastestAnswer?.playerId,
          accent: "var(--text)",
        },
        {
          k: "Closest call",
          v: summary.awards.closestCall ? `${(summary.awards.closestCall.msLeft / 1000).toFixed(1)}s left` : "—",
          who: summary.awards.closestCall?.playerId,
          accent: "var(--fuse)",
        },
        { k: "Most words", v: summary.awards.mostWords ? String(summary.awards.mostWords.count) : "—", who: summary.awards.mostWords?.playerId, accent: "var(--sage)" },
      ]
    : [];

  const totalVotes = summary ? Object.values(summary.votes).reduce((a, b) => a + b, 0) : 0;

  return (
    <main className="page results">
      <header className="topbar">
        <button className="icon-btn" onClick={onHome} aria-label="Home"><Icon name="home" /></button>
        <h2>Match recap</h2>
        <button className="icon-btn" onClick={share} aria-label="Share result"><Icon name="share" /></button>
      </header>

      <div className="res-body">
        <div className="res-col">
          <div className="winner card">
            {state.winner ? (
              <>
                <div className="kicker">Last one standing</div>
                <Token avatar={winner?.avatar ?? ""} name={state.winner.name} className="big-ava">
                  <span className="crown"><Crown /></span>
                </Token>
                <h2>{state.winner.id === myId ? "You win!" : `${state.winner.name} wins!`}</h2>
                <p>
                  Survived {summary?.rounds ?? state.round + 1} rounds · {summary?.wordsPlayed ?? state.wordCount} words played
                </p>
              </>
            ) : (
              <>
                <div className="kicker">Mutual destruction</div>
                <span className="big-ava" style={{ "--c": "var(--danger)" } as React.CSSProperties} aria-hidden="true">0</span>
                <h2>No survivors</h2>
                <p>The bomb got everyone.</p>
              </>
            )}
          </div>

          <div className="card">
            <ol className="ranks">
              {(summary?.ranking ?? players.map((p) => p.id)).map((id, i) => {
                const p = byId(id);
                if (!p) return null;
                const isWinner = state.winner?.id === id;
                return (
                  <li key={id}>
                    <span className="pos">{i + 1}</span>
                    <Token avatar={p.avatar} name={p.name} className="a" />
                    <span className="n">
                      {label(p)}
                      <small>
                        {isWinner
                          ? `${p.lives} ${p.lives === 1 ? "life" : "lives"} left`
                          : p.eliminatedInRound
                            ? `Out in round ${p.eliminatedInRound}`
                            : "Left the room"}
                      </small>
                    </span>
                    <span className="w">{p.wordsPlayed} {p.wordsPlayed === 1 ? "word" : "words"}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="res-col">
          <h3 className="sec-title">Awards</h3>
          <div className="awards">
            {awards.map((a, i) => (
              <div key={a.k} className="award" style={{ "--accent": a.accent, animationDelay: `${i * 90}ms` } as React.CSSProperties}>
                <div className="k">{a.k}</div>
                <div className="v">{a.v}</div>
                <div className="who">{a.who ? label(byId(a.who)) : "—"}</div>
              </div>
            ))}
          </div>

          <div className="vote card">
            <h3 className="sec-title" style={{ margin: 0 }}>Word of the game</h3>
            {summary && summary.candidates.length > 0 ? (
              <>
                <p>Tap your favourite. Everyone votes.</p>
                {summary.candidates.map((c) => {
                  const count = summary.votes[c.word] ?? 0;
                  const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <button
                      key={c.word}
                      className={`vote-opt ${myVote === c.word ? "mine" : ""}`}
                      aria-pressed={myVote === c.word}
                      onClick={() => {
                        setMyVote(c.word);
                        onVote(c.word);
                        sfx.pop();
                      }}
                    >
                      <span className="fill" style={{ width: `${pct}%` }} />
                      <span className="kw">{c.word.toUpperCase()}</span>
                      <small>{totalVotes ? `${pct}%` : label(byId(c.playerId))}</small>
                    </button>
                  );
                })}
              </>
            ) : (
              <p>No words were played. Impressive, honestly.</p>
            )}
          </div>

          <div className="res-cta">
            <div className="inner">
              {isHost ? (
                <button className="btn btn-primary btn-lg" onClick={onRestart}>Play again</button>
              ) : (
                <button className="btn btn-primary btn-lg" disabled>Waiting for host…</button>
              )}
              <button className="btn btn-lg" onClick={onHome} aria-label="Back home"><Icon name="home" /></button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Paper confetti in the palette colours. Returns a cleanup that removes it. */
function confetti(): (() => void) | undefined {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#f5b700", "#ff4d1c", "#f3ead7"];
  const pieces: HTMLElement[] = [];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement("i");
    c.className = "confetti";
    c.style.cssText = `left:${Math.random() * 100}vw;background:${colors[i % 3]};animation-duration:${2 + Math.random() * 2.2}s;animation-delay:${Math.random() * 0.6}s;border-radius:${Math.random() < 0.4 ? "50%" : "2px"}`;
    document.body.appendChild(c);
    pieces.push(c);
  }
  const t = setTimeout(() => pieces.forEach((p) => p.remove()), 5000);
  return () => {
    clearTimeout(t);
    pieces.forEach((p) => p.remove());
  };
}
