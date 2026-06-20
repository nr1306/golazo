"use client"

import { useState } from "react"

interface SplashScreenProps {
  onDone: () => void
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [fading, setFading] = useState(false)

  function handleStart() {
    setFading(true)
    setTimeout(onDone, 500)
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "#0a0f1e" }}
    >
      {/* SVG football pitch lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.06]"
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
        stroke="#39FF14"
        strokeWidth="2"
      >
        <rect x="40" y="30" width="720" height="440" />
        <line x1="400" y1="30" x2="400" y2="470" />
        <circle cx="400" cy="250" r="70" />
        <circle cx="400" cy="250" r="4" fill="#39FF14" />
        <rect x="40" y="145" width="120" height="210" />
        <rect x="40" y="195" width="50" height="110" />
        <rect x="640" y="145" width="120" height="210" />
        <rect x="710" y="195" width="50" height="110" />
        <path d="M40 30 Q55 30 55 45" />
        <path d="M760 30 Q760 45 745 45" />
        <path d="M40 470 Q40 455 55 455" />
        <path d="M760 470 Q745 470 745 455" />
      </svg>

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(57,255,20,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-5 text-center px-8">
        <span className="text-5xl animate-bounce select-none">⚽</span>

        <h1
          className="text-7xl font-display font-black tracking-widest uppercase"
          style={{
            color: "#39FF14",
            textShadow:
              "0 0 20px rgba(57,255,20,0.8), 0 0 60px rgba(57,255,20,0.4)",
          }}
        >
          GOLAZO
        </h1>

        <p className="text-white/60 font-sans text-base max-w-xs">
          Your AI companion for the 2026 FIFA World Cup™
        </p>

        <p className="text-[11px] font-mono text-white/25 uppercase tracking-widest">
          104 matches · 48 teams · 16 stadiums
        </p>

        <button
          onClick={handleStart}
          className="mt-3 px-8 py-3 rounded-full font-display font-bold tracking-widest text-sm uppercase transition-transform hover:scale-105 active:scale-95"
          style={{
            background: "#39FF14",
            color: "#0a0f1e",
            boxShadow: "0 0 20px rgba(57,255,20,0.5)",
          }}
        >
          Let&apos;s Play Football →
        </button>
      </div>
    </div>
  )
}
