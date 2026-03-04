import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        black: "#0a0a08",
        charcoal: "#111110",
        ash: "#1c1c1a",
        ember: "#ff4500",
        flame: "#ff6a1a",
        glow: "#ff8c42",
        gold: "#ffc340",
        acid: "#d4ff00",
        cream: "#f5f0e8",
        smoke: "#5a5a55",
        cinder: "#2a2a27",
      },
      fontFamily: {
        display: ["Bebas Neue", "sans-serif"],
        body: ["Syne", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
