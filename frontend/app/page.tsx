"use client"

import { useEffect, useState } from "react"
import { getFanId } from "../lib/session"
import RightPanel from "../components/RightPanel"
import MatchesView from "../components/MatchesView"
import FloatingChat from "../components/FloatingChat"
import NavSidebar from "../components/NavSidebar"
import MobileNav from "../components/MobileNav"

export default function Home() {
  const [fanId, setFanId] = useState<string | null>(null)

  useEffect(() => {
    setFanId(getFanId())
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <NavSidebar matchId={null} />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex items-center px-6 py-3.5 glass border-b border-white/10 shrink-0">
          {/* Logo — shown on mobile only (desktop has sidebar) */}
          <div className="flex md:hidden items-center gap-3 mr-4">
            <span className="text-base font-display font-black tracking-widest text-pitch-green neon-text-green uppercase">
              Golazo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pitch-green shadow-glow-green animate-pulse" />
            <span className="text-[10px] font-mono text-on-surface/30 uppercase tracking-widest">Live</span>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="glass rounded-full px-3 py-1.5">
              {fanId ? (
                <span className="text-[10px] font-mono text-on-surface/50">
                  Fan: {fanId.slice(0, 8)}&hellip;
                </span>
              ) : (
                <span className="text-[10px] font-mono text-on-surface/25">Open chat to get started</span>
              )}
            </div>
          </div>
        </header>

        {/* Section hint */}
        <div className="px-6 py-2.5 border-b border-white/5 shrink-0">
          <p className="text-[10px] font-mono text-on-surface/25 uppercase tracking-widest">
            104 matches &middot; 16 stadiums &middot; 3 countries &mdash; click any match for hotels &amp; city guide
          </p>
        </div>

        {/* Match list */}
        <div className="flex-1 overflow-hidden pb-16 md:pb-0">
          <MatchesView />
        </div>
      </div>

      <RightPanel fanId={fanId} />
      <FloatingChat fanId={fanId} onFanIdChange={setFanId} />
      <MobileNav />
    </div>
  )
}
