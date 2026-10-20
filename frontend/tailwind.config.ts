import type { Config } from "tailwindcss";

// Mirrors the tokens in app/design.css so utilities, where used, stay on palette.
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#080706",
        bg: "#131110",
        card: "#201c18",
        line: "#3b342c",
        paper: "#f3ead7",
        muted: "#a9a193",
        fuse: "#ff4d1c",
        amber: "#f5b700",
        sage: "#8fb996",
        steel: "#7aa6c2",
        rose: "#e98a7a",
        danger: "#e8322b",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Archivo", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
