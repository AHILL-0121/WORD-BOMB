"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameState, RoomSettings } from "@/types/game";
import type { ConnectionStatus } from "@/hooks/usePartySocket";
import { SETTINGS_BOUNDS, pickBots, speedPresetFor } from "@/lib/game-logic";
import { LINES, pickLine, type FuseMood } from "@/lib/fuse-moods";
import { sfx } from "@/lib/sfx";
import { Fuse } from "../ui/Fuse";
import { Icon } from "../ui/Icon";
import { Token } from "../ui/Token";
import type { ToastKind } from "../ui/Toasts";
import { SettingsPanel } from "./SettingsPanel";

interface LobbyViewProps {
  state: GameState;
  myId: string;
  roomId: string;
  status: ConnectionStatus;
  mood: FuseMood;
  onStart: () => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onLeave: () => void;
  toast: (text: string, kind?: ToastKind) => void;
}

/** Seats drawn in the grid; bigger rooms just show the count. */
const VISIBLE_SEATS = 8;

export function LobbyView({ state, myId, roomId, status, mood, onStart, onUpdateSettings, onLeave, toast }: LobbyViewProps) {
  const { settings, players } = state;
  const me = players.find((p) => p.id === myId);
  const isHost = me?.isHost ?? false;
  const host = players.find((p) => p.isHost);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quip, setQuip] = useState(LINES.lobby[0]);

  useEffect(() => {
    const id = setInterval(() => setQuip(pickLine(LINES.lobby)), 5000);
    return () => clearInterval(id);
  }, []);

  // Bots are seated when the game starts; until then they are previews.
  const botBudget = Math.max(0, settings.maxPlayers - players.length);
  const bots = settings.aiMode ? pickBots(Math.min(settings.aiCount, botBudget), players.map((p) => p.name)) : [];
  const seatsTaken = players.length + bots.length;
  const canAddBot = isHost && bots.length < SETTINGS_BOUNDS.aiCount.max && seatsTaken < settings.maxPlayers;
  const canStart = players.length >= 2 || (settings.aiMode && bots.length > 0);

  const setBots = (count: number) => {
    sfx.pop();
    onUpdateSettings(count > 0 ? { aiMode: true, aiCount: count } : { aiMode: false });
  };

  const inviteUrl = typeof window === "undefined" ? `/room/${roomId}` : `${window.location.origin}/room/${roomId}`;

  const copy = useCallback(
    async (text: string, done: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast(done, "good");
      } catch {
        toast(text);
      }
    },
    [toast]
  );

  const invite = async () => {
    const text = `Come play Word Bomb with me! Room ${roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Word Bomb", text, url: inviteUrl });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    copy(inviteUrl, "Invite link copied");
  };

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const visibleSeats = Math.min(settings.maxPlayers, VISIBLE_SEATS);
  const emptySeats = Math.max(0, visibleSeats - seatsTaken);
  const speed = speedPresetFor(settings.timerDecay);

  return (
    <main className="page lobby">
      <header className="topbar">
        <button className="icon-btn" onClick={onLeave} aria-label="Leave lobby"><Icon name="back" /></button>
        <h2>Lobby</h2>
        {status !== "connected" && <span className="chip status-chip">{status === "reconnecting" ? "RECONNECTING…" : "OFFLINE"}</span>}
        <button className="icon-btn open-settings" onClick={() => setSheetOpen(true)} aria-label="House rules"><Icon name="sliders" /></button>
      </header>

      <div className="lobby-body">
        <div className="lobby-main">
          <div className="code-card card">
            <Fuse mood={mood === "excited" ? "thinking" : mood} className="mini-bomb">
              <div className="bubble" aria-hidden="true">{quip}</div>
            </Fuse>
            <span className="label">Room code</span>
            <div className="tiles" aria-label={`Room code ${roomId.split("").join(" ")}`}>
              {roomId.split("").map((c, i) => <span key={i} aria-hidden="true">{c}</span>)}
            </div>
            <div className="code-actions">
              <button className="btn" onClick={() => copy(roomId, "Room code copied")}><Icon name="copy" />Copy</button>
              <button className="btn btn-accent" onClick={invite}><Icon name="share" />Invite</button>
            </div>
            <div className="url">{inviteUrl.replace(/^https?:\/\//, "")}</div>
          </div>

          <div className="sec-head">
            <h3>Players <span className="chip">{seatsTaken}/{settings.maxPlayers}</span></h3>
            {isHost && (
              <button className="btn" onClick={() => setBots(bots.length + 1)} disabled={!canAddBot}>+ Add bot</button>
            )}
          </div>

          <ul className="pgrid">
            {players.map((p) => (
              <li key={p.id} className={`pcard ${p.id === myId ? "you" : ""}`}>
                {!p.isDisconnected && <span className="ready" title="Connected" />}
                <Token avatar={p.avatar} name={p.name} className="ava" />
                <div className="pname">{p.name}</div>
                <div className="tags">
                  {p.isHost && <span className="tag host">Host</span>}
                  {p.id === myId && <span className="tag">You</span>}
                  {p.isDisconnected && <span className="tag">Reconnecting</span>}
                </div>
              </li>
            ))}
            {bots.map((bot, i) => (
              <li key={bot.name} className="pcard bot-preview">
                <span className="ready" title="Ready" />
                <Token avatar={bot.avatar} name={bot.name} className="ava" />
                <div className="pname">{bot.name}</div>
                <div className="tags"><span className="tag bot">Bot · {settings.difficulty}</span></div>
                {isHost && i === bots.length - 1 && (
                  <button className="kick" onClick={() => setBots(bots.length - 1)} aria-label={`Remove ${bot.name}`}>×</button>
                )}
              </li>
            ))}
            {Array.from({ length: emptySeats }, (_, i) =>
              i === 0 ? (
                <li key="invite" className="pcard empty">
                  <button onClick={invite}><span className="plus" aria-hidden="true">+</span>Invite a friend</button>
                </li>
              ) : (
                <li key={`open-${i}`} className="pcard empty">Open seat</li>
              )
            )}
          </ul>

          <div className="rules">
            <span className="chip">{settings.startingLives} lives</span>
            <span className="chip">{settings.initialTimer}s fuse</span>
            <span className="chip">{speed.key === "off" ? "No speed-up" : `${speed.label} speed-up`}</span>
            {settings.alphabetBonus && <span className="chip">A–Z bonus</span>}
            {settings.stickySyllable && <span className="chip">Sticky syllable</span>}
            <button className="edit" onClick={() => setSheetOpen(true)}>{isHost ? "Edit rules" : "See rules"}</button>
          </div>

          <div className="lobby-cta">
            <div className="inner">
              {isHost ? (
                <>
                  <button className="btn btn-primary btn-lg btn-block" onClick={onStart} disabled={!canStart}>
                    {canStart ? `Start game · ${seatsTaken} players` : "Need 2+ players"}
                  </button>
                  <small>{canStart ? "You're the host · everyone's ready" : "Invite a friend or add a bot"}</small>
                </>
              ) : (
                <>
                  <button className="btn btn-primary btn-lg btn-block" disabled>Waiting for host…</button>
                  <small>{host ? `${host.name} will start the game` : "The host will start the game"}</small>
                </>
              )}
            </div>
          </div>
        </div>

        <SettingsPanel
          settings={settings}
          isHost={isHost}
          open={sheetOpen}
          onClose={closeSheet}
          onChange={onUpdateSettings}
          seatsTaken={seatsTaken}
        />
      </div>
      <div className={`backdrop ${sheetOpen ? "open" : ""}`} onClick={closeSheet} aria-hidden="true" />
    </main>
  );
}
