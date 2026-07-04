/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        karat: "#c9a35a",
        "karat-bright": "#e8c874",
        ink: "#0a0a0d",
        surface: "#141318",
        "surface-raised": "#1b1a20",
        line: "#2a2833",
        parchment: "#ece7db",
        "parchment-dim": "#9c968a",
        verified: "#4a8567",
        danger: "#9a4a4a",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "spin-slow-reverse": {
          "0%": { transform: "rotate(360deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
        pulse-node: {
          "0%, 100%": { opacity: 0.5, transform: "scale(1)" },
          "50%": { opacity: 1, transform: "scale(1.4)" },
        },
        "ticker-scroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 90s linear infinite",
        "spin-slower": "spin-slow 160s linear infinite",
        "spin-slow-reverse": "spin-slow-reverse 120s linear infinite",
        "pulse-node": "pulse-node 3s ease-in-out infinite",
        "ticker-scroll": "ticker-scroll 40s linear infinite",
        "fade-up": "fade-up 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};
