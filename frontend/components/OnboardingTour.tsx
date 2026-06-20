"use client"

import { useState, useEffect } from "react"

const HEADER_H = 90
const SIDEBAR_W = 200
const RIGHT_PANEL_W = 288
const MOBILE_NAV_H = 64
const PAD = 8
const MOBILE_TOOLTIP_STRIP = 100 // dark gap reserved below spotlight on mobile step 0

const STEPS = [
  {
    emoji: "📋",
    title: "Match Schedule",
    description:
      "All 104 WC2026 fixtures in one place. Tap any match to explore hotels, a city guide, and the predicted lineup.",
  },
  {
    emoji: "🧭",
    title: "Navigation",
    description:
      "Dashboard shows all matches · Hotels & Guide plans your trip · Lineup shows predicted XIs for each game.",
  },
  {
    emoji: "🤖",
    title: "AI Agent",
    description:
      "Tap the green button to chat with Golazo Agent — ask about players, plan travel, or get crowd insights for any city.",
  },
]

export default function OnboardingTour({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [tooltipVisible, setTooltipVisible] = useState(true)

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  if (dims.w === 0) return null

  const isMobile = dims.w < 768

  function getSpotlight(s: number) {
    if (s === 0) {
      return isMobile
        // Leave MOBILE_TOOLTIP_STRIP px of dark at the bottom for the tooltip
        ? { top: HEADER_H, left: 0, right: 0, bottom: MOBILE_NAV_H + MOBILE_TOOLTIP_STRIP }
        // Desktop: right panel area stays dark — tooltip lives there
        : { top: HEADER_H, left: SIDEBAR_W, right: RIGHT_PANEL_W, bottom: 0 }
    }
    if (s === 1) {
      return isMobile
        ? { top: dims.h - MOBILE_NAV_H, left: 0, right: 0, bottom: 0 }
        : { top: 0, left: 0, right: dims.w - SIDEBAR_W, bottom: 0 }
    }
    // Chat FAB
    const fabBottom = isMobile ? 80 : 24
    return {
      top: dims.h - fabBottom - 56 - PAD,
      left: dims.w - 24 - 56 - PAD,
      right: 0,
      bottom: 0,
    }
  }

  function getTooltipStyle(s: number): React.CSSProperties {
    const sp = getSpotlight(s)

    if (s === 0) {
      if (isMobile) {
        // In the dark strip below the spotlight, above the mobile nav
        return { bottom: MOBILE_NAV_H + 8, left: 16, right: 16 }
      }
      // Desktop: in the right panel dark area (RIGHT_PANEL_W wide column on the right)
      return { top: HEADER_H + 16, right: 16, width: RIGHT_PANEL_W - 32 }
    }
    if (s === 1) {
      if (isMobile) {
        // Above the bottom nav
        return { bottom: MOBILE_NAV_H + 12, left: 16, right: 16 }
      }
      // Inside the sidebar column, vertically centered
      return {
        top: dims.h * 0.5 - 72,
        left: 12,
        width: SIDEBAR_W - 24,
      }
    }
    // Above the FAB
    const fabBottom = isMobile ? 80 : 24
    return {
      bottom: fabBottom + 56 + PAD + 12,
      right: 16,
      width: 260,
    }
  }

  const sp = getSpotlight(step)
  const spW = dims.w - sp.left - sp.right
  const spH = dims.h - sp.top - sp.bottom

  function advance() {
    if (step < STEPS.length - 1) {
      // Fade tooltip out, move spotlight, fade tooltip back in
      setTooltipVisible(false)
      setTimeout(() => {
        setStep((s) => s + 1)
        setTooltipVisible(true)
      }, 220)
    } else {
      onDone()
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Full-screen click blocker — prevents interacting with app during tour */}
      <div className="absolute inset-0 pointer-events-auto" />

      {/*
        Single spotlight div using the box-shadow spread technique:
        The div sits over the highlighted area (transparent background).
        A massive box-shadow spreads outward and darkens everything else.
        CSS transitions on top/left/width/height make the spotlight MOVE between steps.
      */}
      <div
        className="absolute rounded-xl pointer-events-none"
        style={{
          top: sp.top,
          left: sp.left,
          width: spW,
          height: spH,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.88)",
          border: "2px solid rgba(48,209,88,0.7)",
          transition: "top 0.45s ease, left 0.45s ease, width 0.45s ease, height 0.45s ease",
        }}
      />

      {/* Tooltip card */}
      <div
        className="absolute bg-surface-dim border border-pitch-green/25 rounded-2xl p-4 pointer-events-auto shadow-glass"
        style={{
          ...getTooltipStyle(step),
          opacity: tooltipVisible ? 1 : 0,
          transition: "opacity 0.18s ease",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg leading-none">{STEPS[step].emoji}</span>
          <span className="text-[11px] font-display font-black text-pitch-green uppercase tracking-widest flex-1">
            {STEPS[step].title}
          </span>
          <span className="text-[9px] font-mono text-on-surface/25">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        <p className="text-xs font-sans text-on-surface/65 leading-relaxed mb-4">
          {STEPS[step].description}
        </p>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-1 items-center">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full"
                style={{
                  width: i === step ? 16 : 6,
                  background: i === step ? "#30D158" : "rgba(255,255,255,0.15)",
                  transition: "width 0.3s ease, background 0.3s ease",
                }}
              />
            ))}
          </div>
          <button
            onClick={onDone}
            className="text-[10px] font-mono text-on-surface/25 hover:text-on-surface/50 transition-colors mr-2"
          >
            Skip
          </button>
          <button
            onClick={advance}
            className="border border-pitch-green/40 hover:bg-pitch-green/15 text-pitch-green text-[11px] font-display font-bold uppercase tracking-widest px-4 py-1.5 rounded-full transition-all active:scale-95"
          >
            {step < STEPS.length - 1 ? "Next →" : "Let's Go ⚽"}
          </button>
        </div>
      </div>
    </div>
  )
}
