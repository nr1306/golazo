"use client"

import { useState } from "react"

export default function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [fading, setFading] = useState(false)

  function handleClick() {
    setFading(true)
    setTimeout(onEnter, 600)
  }

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-stadium-navy overflow-hidden transition-opacity duration-600 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Pitch lines SVG background */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.045]"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect x="40" y="40" width="720" height="520" fill="none" stroke="white" strokeWidth="3" />
        <line x1="400" y1="40" x2="400" y2="560" stroke="white" strokeWidth="2" />
        <circle cx="400" cy="300" r="80" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="400" cy="300" r="3" fill="white" />
        <rect x="40" y="180" width="120" height="240" fill="none" stroke="white" strokeWidth="2" />
        <rect x="640" y="180" width="120" height="240" fill="none" stroke="white" strokeWidth="2" />
        <rect x="40" y="252" width="45" height="96" fill="none" stroke="white" strokeWidth="2" />
        <rect x="715" y="252" width="45" height="96" fill="none" stroke="white" strokeWidth="2" />
        <path d="M160 180 Q220 300 160 420" fill="none" stroke="white" strokeWidth="1.5" />
        <path d="M640 180 Q580 300 640 420" fill="none" stroke="white" strokeWidth="1.5" />
      </svg>

      {/* Green glow behind ball */}
      <div className="absolute w-56 h-56 rounded-full bg-pitch-green/10 blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-5 text-center px-8">
        {/* Bouncing ball */}
        <div
          className="text-7xl md:text-8xl select-none"
          style={{ animation: "bounce 0.75s infinite" }}
        >
          ⚽
        </div>

        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-5xl md:text-7xl font-display font-black text-pitch-green uppercase tracking-widest"
            style={{ textShadow: "0 0 30px rgba(48,209,88,0.6), 0 0 60px rgba(48,209,88,0.25)" }}>
            Golazo
          </h1>
          <p className="text-on-surface/30 font-mono text-[11px] uppercase tracking-[0.3em]">
            WC2026 · USA · Canada · Mexico
          </p>
        </div>

        {/* Tagline */}
        <p className="text-on-surface/45 font-sans text-sm max-w-xs leading-relaxed">
          Your AI-powered companion for the 2026 FIFA World Cup
        </p>

        {/* CTA */}
        <button
          onClick={handleClick}
          className="group mt-2 flex items-center gap-3 border border-pitch-green/50 hover:bg-pitch-green hover:border-pitch-green text-pitch-green hover:text-stadium-navy font-display font-black uppercase tracking-widest px-8 py-4 rounded-full text-sm transition-all duration-200 hover:shadow-glow-green active:scale-95"
        >
          <span>⚽</span>
          Let&rsquo;s Play Football
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </button>

        {/* Stats */}
        <p className="text-on-surface/18 font-mono text-[10px] uppercase tracking-widest mt-1">
          104 matches · 48 teams · 16 stadiums
        </p>
      </div>
    </div>
  )
}
