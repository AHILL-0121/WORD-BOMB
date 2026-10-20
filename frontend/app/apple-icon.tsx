import { ImageResponse } from "next/og";

// Replaces the metadata reference to /apple-touch-icon.png, which was never
// present in public/ and returned a 404 on every iOS bookmark.
export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#131110",
        }}
      >
        <div
          style={{
            width: 118,
            height: 118,
            borderRadius: 999,
            background: "#0b0a09",
            border: "12px solid #ff4d1c",
            display: "flex",
          }}
        />
      </div>
    ),
    size
  );
}
