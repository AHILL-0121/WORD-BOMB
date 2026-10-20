import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./design.css";

// Self-hosted at build time by next/font instead of a blocking <link> to
// fonts.googleapis.com: one less render-blocking round trip, no layout shift,
// and no third-party request from the client.
//
// Archivo is variable in weight and width; headlines use its wide (125%) cut.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

// Required for Next to resolve the OpenGraph/Twitter image to an absolute URL.
// Without it the build warns and social cards point at http://localhost:3000.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Word Bomb",
  description:
    "A fast-paced multiplayer word game. Find words containing the syllable before time runs out!",
  // Icons and social images come from app/icon.svg, app/apple-icon.tsx and
  // app/opengraph-image.tsx. The previous manual entries pointed at
  // /og-image.png and /apple-touch-icon.png, neither of which existed.
  openGraph: {
    title: "Word Bomb - Real-Time Multiplayer Word Game",
    description:
      "A fast-paced multiplayer word game. Find words containing the syllable before time runs out!",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Word Bomb",
    description: "Real-time multiplayer word game",
  },
};

export const viewport: Viewport = {
  themeColor: "#131110",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
