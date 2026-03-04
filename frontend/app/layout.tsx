import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Word Bomb - Real-Time Multiplayer Word Game",
  description: "A fast-paced multiplayer word game. Find words containing the syllable before time runs out!",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Word Bomb - Real-Time Multiplayer Word Game',
    description: 'A fast-paced multiplayer word game. Find words containing the syllable before time runs out!',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word Bomb',
    description: 'Real-time multiplayer word game',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
