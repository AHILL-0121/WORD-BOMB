"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fuse } from "./ui/Fuse";
import { Icon, PassIllustration } from "./ui/Icon";
import { ToastStack, useToasts } from "./ui/Toasts";
import { AVATARS, monogram, type AvatarId } from "@/lib/avatars";
import { MAX_NAME_LENGTH } from "@/lib/game-logic";
import { loadProfile, roomHref, saveProfile } from "@/lib/profile";
import { generateRoomCode, isValidRoomCode, ROOM_CODE_LENGTH } from "@/lib/syllables";
import { sfx } from "@/lib/sfx";

const HERO_SYLLABLES = ["ING", "STR", "OU", "GHT", "QU", "ENT", "ACK"];
const BAND_WORDS = ["MOONLIGHT", "STRANGE", "KINGDOM", "ASTRONAUT", "QUILT", "THOUGHT", "UMBRELLA", "KITCHEN", "PUMPKIN", "VAMPIRE", "OCEAN", "JACKET"];

export function LandingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { toasts, toast } = useToasts();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>(AVATARS[0].id);
  const [code, setCode] = useState("");
  const [codeShake, setCodeShake] = useState(0);
  const [syllable, setSyllable] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const nameRef = useRef<HTMLInputElement>(null);
  const bombRef = useRef<HTMLDivElement>(null);

  // Restore the saved profile, and pick up a code from an invite link.
  useEffect(() => {
    const saved = loadProfile();
    if (saved) {
      setName(saved.name);
      setAvatar(saved.avatar);
    }
    const join = params.get("join")?.toUpperCase();
    if (join && isValidRoomCode(join)) {
      setCode(join);
      if (!saved?.name) nameRef.current?.focus();
    }
  }, [params]);

  useEffect(() => {
    const id = setInterval(() => setSyllable((i) => (i + 1) % HERO_SYLLABLES.length), 2200);
    return () => clearInterval(id);
  }, []);

  // FUSE's eyes follow the pointer.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = bombRef.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width * 0.48;
      const cy = r.top + r.height * 0.55;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const reach = Math.min(1, Math.hypot(e.clientX - cx, e.clientY - cy) / 260);
      setLook({ x: Math.cos(angle) * 5 * reach, y: Math.sin(angle) * 5 * reach });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const profile = () => {
    const clean = name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
    if (!clean) {
      toast("Pick a nickname first", "bad");
      nameRef.current?.focus();
      return null;
    }
    const p = { name: clean, avatar };
    saveProfile(p);
    return p;
  };

  const create = (extra: Record<string, string> = {}) => {
    const p = profile();
    if (p) router.push(roomHref(generateRoomCode(), p, extra));
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidRoomCode(code)) {
      setCodeShake((n) => n + 1);
      toast(`Room codes are ${ROOM_CODE_LENGTH} characters`, "bad");
      return;
    }
    const p = profile();
    if (p) router.push(roomHref(code, p));
  };

  const initial = monogram(name || "?");
  const selected = AVATARS.find((a) => a.id === avatar) ?? AVATARS[0];

  return (
    <main className="page home">
      <div className="home-inner">
        <div className="brand">
          <div className="logo">
            <span className="dot" aria-hidden="true" />
            WORD<b>BOMB</b>
          </div>
        </div>

        <div className="hero">
          <div ref={bombRef}>
            <Fuse mood="idle" className="hero-bomb" look={look}>
              <div className="orbit" aria-hidden="true" />
              <span className="floaty" style={{ left: "-8%", top: "18%", background: "var(--amber)" }} aria-hidden="true">ER</span>
              <span className="floaty" style={{ right: "-10%", top: "52%", background: "var(--text)", animationDelay: "-1.4s" }} aria-hidden="true">OU</span>
              <span className="floaty" style={{ left: "4%", bottom: "10%", background: "var(--fuse)", animationDelay: "-2.6s" }} aria-hidden="true">STR</span>
              <span key={syllable} className="sticker pop" aria-hidden="true">{HERO_SYLLABLES[syllable]}</span>
            </Fuse>
          </div>
          <div className="copy">
            <h1>
              Say a word
              <br />
              before it <span className="hl">blows.</span>
            </h1>
            <p>A party word game for 2–16 friends. Type a word that contains the letters on the bomb, then pass it on. Quickly.</p>
          </div>
        </div>

        <div className="panel card">
          <div>
            <label className="label" htmlFor="name">Who&apos;s playing?</label>
            <div className="name-row">
              <span className="me-ava" style={{ "--c": selected.color } as CSSProperties} data-s={selected.shape === "square" ? "s" : "c"} aria-hidden="true">
                {initial}
              </span>
              <input
                id="name"
                ref={nameRef}
                className="field"
                maxLength={MAX_NAME_LENGTH}
                placeholder="Your nickname"
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <span className="label" id="token-label">Pick your token</span>
            <div className="avatars" role="radiogroup" aria-labelledby="token-label">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={a.id === avatar}
                  aria-label={a.name}
                  className="av-opt"
                  style={{ "--c": a.color } as CSSProperties}
                  data-s={a.shape === "square" ? "s" : "c"}
                  onClick={() => {
                    setAvatar(a.id);
                    sfx.pop();
                  }}
                >
                  <span aria-hidden="true">{initial}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-lg btn-block" onClick={() => create()}>
            <Icon name="plus" />
            Create a room
          </button>

          <div className="divider">or join friends</div>

          <form className="join-row" onSubmit={join}>
            <label className="sr-only" htmlFor="code">Room code</label>
            <input
              id="code"
              key={codeShake}
              className={`field code-field ${codeShake ? "shake" : ""}`}
              maxLength={ROOM_CODE_LENGTH}
              placeholder="CODE"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            />
            <button className="btn btn-accent" type="submit">Join</button>
          </form>

          <div className="modes single">
            <button className="mode" onClick={() => create({ solo: "1" })}>
              <Icon name="person" className="e" />
              <b>Solo vs bots</b>
              <small>Warm up against three bots, no friends required</small>
            </button>
          </div>
        </div>

        <div className="steps" aria-label="How to play">
          <div className="step">
            <div className="n">01</div>
            <div className="vis"><span className="sticker">ING</span></div>
            <p>Spot the letters</p>
          </div>
          <div className="step">
            <div className="n">02</div>
            <div className="vis"><span className="kw">K<mark>ING</mark></span></div>
            <p>Type a word with them</p>
          </div>
          <div className="step">
            <div className="n">03</div>
            <div className="vis"><PassIllustration /></div>
            <p>Pass it before it blows</p>
          </div>
        </div>
      </div>

      <div className="band" aria-hidden="true">
        <div className="track">
          {[0, 1].map((copy) =>
            BAND_WORDS.map((w) => (
              <Fragment key={`${copy}-${w}`}>
                <span>{w}</span>
                <span>/</span>
              </Fragment>
            ))
          )}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </main>
  );
}
