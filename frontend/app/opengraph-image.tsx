import { ImageResponse } from "next/og";

// Generated at request time instead of committed as a binary. The previous
// metadata pointed at /og-image.png, which did not exist in public/, so every
// social card 404'd.
export const runtime = "edge";
export const alt = "Word Bomb — real-time multiplayer word game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#131110",
          color: "#f3ead7",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: 999,
              background: "#0b0a09",
              border: "10px solid #ff4d1c",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 104, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>
              WORD <span style={{ color: "#ff4d1c" }}>BOMB</span>
            </div>
            <div style={{ fontSize: 34, color: "#f5b700", marginTop: 12 }}>
              Find the word before the fuse burns out
            </div>
          </div>
        </div>
        <div style={{ fontSize: 26, color: "#a9a193", marginTop: 54, letterSpacing: 6 }}>
          REAL-TIME MULTIPLAYER WORD GAME
        </div>
      </div>
    ),
    size
  );
}
