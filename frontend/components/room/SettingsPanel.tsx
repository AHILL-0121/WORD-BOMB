"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { RoomSettings } from "@/types/game";
import { SETTINGS_BOUNDS, SPEED_PRESETS, speedPresetFor } from "@/lib/game-logic";
import { sfx } from "@/lib/sfx";

interface SettingsPanelProps {
  settings: RoomSettings;
  isHost: boolean;
  /** Mobile only: the panel is a bottom sheet there, inline on desktop. */
  open: boolean;
  onClose: () => void;
  onChange: (settings: Partial<RoomSettings>) => void;
  /** Seats already taken; max players cannot drop below it. */
  seatsTaken: number;
}

const DIFFICULTIES: { key: RoomSettings["difficulty"]; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

const b = SETTINGS_BOUNDS;

export function SettingsPanel({ settings, isHost, open, onClose, onChange, seatsTaken }: SettingsPanelProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLElement>(null);
  const disabled = !isHost;

  // The slider is local while dragging and sent once it settles, so the host
  // does not flood the room with an update per pixel.
  const [timer, setTimer] = useState(settings.initialTimer);
  const timerSend = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setTimer(settings.initialTimer), [settings.initialTimer]);
  useEffect(() => () => {
    if (timerSend.current) clearTimeout(timerSend.current);
  }, []);

  // As a mobile sheet: move focus in, close on Escape.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    sheetRef.current?.querySelector<HTMLElement>("button:not([disabled]), input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  const change = (patch: Partial<RoomSettings>) => {
    if (disabled) return;
    sfx.pop();
    onChange(patch);
  };

  const speed = speedPresetFor(settings.timerDecay).key;
  const timerPct = ((timer - b.initialTimer.min) / (b.initialTimer.max - b.initialTimer.min)) * 100;

  return (
    <aside
      ref={sheetRef}
      className={`sheet ${open ? "open" : ""}`}
      role={open ? "dialog" : undefined}
      aria-modal={open ? true : undefined}
      aria-labelledby={titleId}
    >
      <div className="grab" aria-hidden="true" />
      <h3 id={titleId}>House rules</h3>
      <p className="sub">{isHost ? "You're the host. Changes apply instantly." : "Only the host can change these."}</p>

      <Row label="Lives" sub="Hearts per player">
        <Stepper
          label="lives"
          value={settings.startingLives}
          min={b.startingLives.min}
          max={b.startingLives.max}
          disabled={disabled}
          onChange={(v) => change({ startingLives: v })}
        />
      </Row>

      <Row label="Fuse length" sub="Seconds per turn at the start" column>
        <div className="range-wrap">
          <input
            type="range"
            min={b.initialTimer.min}
            max={b.initialTimer.max}
            value={timer}
            disabled={disabled}
            aria-label="Seconds per turn"
            style={{ "--p": `${timerPct}%` } as CSSProperties}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTimer(v);
              if (timerSend.current) clearTimeout(timerSend.current);
              timerSend.current = setTimeout(() => onChange({ initialTimer: v }), 200);
            }}
          />
          <output>{timer}s</output>
        </div>
      </Row>

      <Row label="Speed-up" sub="How fast the fuse shortens each round" column>
        <Segmented
          label="Speed-up"
          value={speed}
          options={SPEED_PRESETS.map((p) => ({ key: p.key, label: p.label }))}
          disabled={disabled}
          onChange={(key) => change({ timerDecay: SPEED_PRESETS.find((p) => p.key === key)!.timerDecay })}
        />
      </Row>

      <Row label="Bot brains" sub="How sharp the bots are" column>
        <Segmented
          label="Bot difficulty"
          value={settings.difficulty}
          options={DIFFICULTIES}
          disabled={disabled}
          onChange={(key) => change({ difficulty: key as RoomSettings["difficulty"] })}
        />
      </Row>

      <Row label="Max players" sub="Up to 16 in one room">
        <Stepper
          label="seats"
          value={settings.maxPlayers}
          min={Math.max(b.maxPlayers.min, seatsTaken)}
          max={b.maxPlayers.max}
          disabled={disabled}
          onChange={(v) => change({ maxPlayers: v })}
        />
      </Row>

      <Row label="Alphabet bonus" sub="Use all 26 letters, win a heart back">
        <Switch label="Alphabet bonus" on={settings.alphabetBonus} disabled={disabled} onChange={(v) => change({ alphabetBonus: v })} />
      </Row>
      <Row label="Sticky syllable" sub="A missed syllable passes to the next player">
        <Switch label="Sticky syllable" on={settings.stickySyllable} disabled={disabled} onChange={(v) => change({ stickySyllable: v })} />
      </Row>
      <Row label="Shout-outs" sub="Let players heckle each other">
        <Switch label="Shout-outs" on={settings.reactions} disabled={disabled} onChange={(v) => change({ reactions: v })} />
      </Row>

      <button className="btn btn-accent btn-block done" onClick={onClose}>Done</button>
    </aside>
  );
}

function Row({ label, sub, column, children }: { label: string; sub: string; column?: boolean; children: React.ReactNode }) {
  return (
    <div className={`set-row ${column ? "col" : ""}`}>
      <div>
        <div className="set-lbl">{label}</div>
        <div className="set-sub">{sub}</div>
      </div>
      {children}
    </div>
  );
}

function Stepper(props: { label: string; value: number; min: number; max: number; disabled: boolean; onChange: (v: number) => void }) {
  const { label, value, min, max, disabled, onChange } = props;
  return (
    <div className="stepper">
      <button aria-label={`Fewer ${label}`} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>−</button>
      <output aria-live="polite">{value}</output>
      <button aria-label={`More ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function Segmented(props: {
  label: string;
  value: string;
  options: readonly { key: string; label: string }[];
  disabled: boolean;
  onChange: (key: string) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={o.key === props.value}
          disabled={props.disabled}
          onClick={() => o.key !== props.value && props.onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ label, on, disabled, onChange }: { label: string; on: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="switch" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} />
  );
}
