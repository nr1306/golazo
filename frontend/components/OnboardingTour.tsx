"use client"

import { useState, useEffect, useRef, CSSProperties } from "react"

interface OnboardingTourProps {
  onDone: () => void
}

const STEPS = [
  {
    title: "Browse all 104 matches",
    description: "Tap any match to explore hotels, city guides, and stadium vibes.",
  },
  {
    title: "Navigate the app",
    description: "Switch between Matches, Hotels, and Lineup from here.",
  },
  {
    title: "Chat with your AI agent",
    description:
      "Ask anything — hotels, lineups, crowd predictions. Your agent is always ready.",
  },
]

type Rect = { top: number; left: number; width: number; height: number }

function getSpotlight(step: number, isMobile: boolean, vw: number, vh: number): Rect {
  if (isMobile) {
    switch (step) {
      case 0: return { top: 72, left: 0, width: vw, height: vh - 72 - 64 - 100 }
      case 1: return { top: vh - 64, left: 0, width: vw, height: 64 }
      // FAB: mobile bottom-20 right-6 = 80px bottom, 24px right, w-14 h-14 = 56px
      case 2: return { top: vh - 136, left: vw - 80, width: 56, height: 56 }
    }
  } else {
    switch (step) {
      // NavSidebar = w-[200px], RightPanel = w-72 (288px)
      case 0: return { top: 0, left: 200, width: vw - 200 - 288, height: vh }
      case 1: return { top: 0, left: 0, width: 200, height: vh }
      // FAB: desktop bottom-6 right-6 = 24px, w-14 h-14 = 56px
      case 2: return { top: vh - 80, left: vw - 80, width: 56, height: 56 }
    }
  }
  return { top: 0, left: 0, width: vw, height: vh }
}

function getTooltipStyle(step: number, isMobile: boolean, spot: Rect): CSSProperties {
  if (isMobile) {
    switch (step) {
      case 0: return { bottom: 72, left: "50%", transform: "translateX(-50%)" }
      case 1: return { bottom: spot.height + 16, left: "50%", transform: "translateX(-50%)" }
      case 2: return { bottom: 96, right: 16 }
    }
  } else {
    switch (step) {
      case 0: return { top: "50%", right: 0, transform: "translateY(-50%)" }
      case 1: return { top: "50%", left: 216, transform: "translateY(-50%)" }
      case 2: return { bottom: 96, right: 16 }
    }
  }
  return {}
}

export default function OnboardingTour({ onDone }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const [dims, setDims] = useState({ vw: 0, vh: 0 })
  const [tooltipVisible, setTooltipVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function update() {
      setDims({ vw: window.innerWidth, vh: window.innerHeight })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const { vw, vh } = dims
  if (!vw || !vh) return null

  const isMobile = vw < 768
  const spot = getSpotlight(step, isMobile, vw, vh)
  const tooltipStyle = getTooltipStyle(step, isMobile, spot)

  function handleNext() {
    const isLast = step >= STEPS.length - 1
    setTooltipVisible(false)
    timerRef.current = setTimeout(() => {
      if (isLast) {
        onDone()
        return
      }
      setStep((s) => s + 1)
      timerRef.current = setTimeout(() => setTooltipVisible(true), 450)
    }, 180)
  }

  function handleSkip() {
    setTooltipVisible(false)
    timerRef.current = setTimeout(onDone, 200)
  }

  return (
    <>
      {/* Full-screen click blocker */}
      <div className="fixed inset-0 z-[89] pointer-events-auto" />

      {/* Single spotlight div — box-shadow creates the dark surround, CSS transition slides it */}
      <div
        className="fixed pointer-events-none z-[90]"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          boxShadow:
            "0 0 0 9999px rgba(0,0,0,0.88), 0 0 20px rgba(57,255,20,0.3), inset 0 0 20px rgba(57,255,20,0.05)",
          border: "2px solid rgba(57,255,20,0.7)",
          transition: "top 450ms ease, left 450ms ease, width 450ms ease, height 450ms ease",
        }}
      />

      {/* Tooltip card */}
      <div
        className="fixed z-[91] pointer-events-auto"
        style={{
          ...tooltipStyle,
          opacity: tooltipVisible ? 1 : 0,
          transition: "opacity 180ms ease",
        }}
      >
        <div
          className="w-72 rounded-2xl p-5 flex flex-col gap-3"
          style={{
            background: "rgba(10, 15, 30, 0.95)",
            border: "1px solid rgba(57,255,20,0.3)",
            boxShadow: "0 4px 32px rgba(0,0,0,0.6)",
          }}
        >
          <div>
            <h3 className="text-sm font-display font-bold text-white mb-1">
              {STEPS[step].title}
            </h3>
            <p className="text-[12px] font-sans text-white/60 leading-relaxed">
              {STEPS[step].description}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-200"
                style={{
                  width: i === step ? 20 : 8,
                  background: i === step ? "#39FF14" : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-1">
            <button
              onClick={handleSkip}
              className="text-[11px] font-mono text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-full text-[11px] font-display font-bold tracking-widest uppercase transition-transform hover:scale-105 active:scale-95"
              style={{ background: "#39FF14", color: "#0a0f1e" }}
            >
              {step < STEPS.length - 1 ? "Next →" : "Let's Go →"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
