import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "stadium-navy": "#020617",
        "pitch-green": "#30D158",
        "pitch-bright": "#55ee71",
        "electric-blue": "#0A84FF",
        "trophy-gold": "#FFD700",
        "energy-red": "#F43056",
        "on-surface": "#dce1fb",
        surface: {
          DEFAULT: "#0c1324",
          dim: "#070d1f",
          low: "#151b2d",
          container: "#191f31",
          high: "#23293c",
          highest: "#2e3447",
          bright: "#33394c",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Montserrat", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "glow-green": "0 0 18px rgba(48, 209, 88, 0.45), 0 0 36px rgba(48, 209, 88, 0.15)",
        "glow-blue":  "0 0 18px rgba(10, 132, 255, 0.40)",
        "glow-gold":  "0 0 18px rgba(255, 215, 0, 0.40)",
        "glass":      "0 8px 32px rgba(0, 0, 0, 0.50)",
      },
    },
  },
  plugins: [],
}

export default config
