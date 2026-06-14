"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MatchLineup, fetchLineup } from "../lib/api"
import LineupView from "./LineupView"
import FloatingChat from "./FloatingChat"
import { getFanId } from "../lib/session"
import NavSidebar from "./NavSidebar"
import MobileNav from "./MobileNav"

function SkeletonCard() {
  return (
    <div className="glass-elevated rounded-xl p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-2/3" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
      <div className="h-64 bg-white/5 rounded-xl" />
    </div>
  )
}

export default function LineupPageContent() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const matchId       = searchParams.get("id") ?? ""

  const [fanId,   setFanId]   = useState<string | null>(null)
  const [lineup,  setLineup]  = useState<MatchLineup | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setFanId(getFanId()) }, [])

  useEffect(() => {
    if (!matchId) return
    setLoading(true)
    setError(null)
    fetchLineup(matchId)
      .then(data => { setLineup(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [matchId])

  if (!matchId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface/30 font-mono text-sm">
          No match selected.{" "}
          <button onClick={() => router.push("/")} className="text-pitch-green underline">
            Back to matches
          </button>
        </p>
      </div>
    )
  }

  const teamA = lineup?.team_a
  const teamB = lineup?.team_b

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <NavSidebar matchId={matchId} />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-on-surface/40 hover:text-on-surface/70 transition-colors text-xs font-mono uppercase tracking-widest shrink-0"
          >
            ← Back
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-3">
            {lineup ? (
              <>
                <h1 className="text-sm font-display font-black text-on-surface truncate">
                  {teamA?.team}
                  <span className="text-on-surface/25 font-normal text-xs mx-2">vs</span>
                  {teamB?.team}
                </h1>
                <span className="hidden md:block text-[9px] font-mono text-on-surface/30 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                  Predicted XI
                </span>
              </>
            ) : (
              <div className="h-4 bg-white/10 rounded w-48 animate-pulse" />
            )}
          </div>

          {lineup && (
            <button
              onClick={() => router.push(`/match/?id=${matchId}`)}
              className="shrink-0 text-xs font-mono text-on-surface/40 hover:text-electric-blue transition-colors uppercase tracking-widest"
            >
              Hotels & Guide →
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full px-4 py-6 pb-24 md:pb-6">
        {loading && (
          <div className="space-y-4">
            <SkeletonCard />
          </div>
        )}

        {error && (
          <div className="glass-elevated rounded-xl p-6 text-center">
            <p className="text-on-surface/40 text-sm">
              Lineup not available for this match —{" "}
              <span className="text-on-surface/25 text-xs">{error}</span>
            </p>
            <p className="text-on-surface/25 text-xs mt-2">
              Teams without seeded players will show an empty lineup.
            </p>
          </div>
        )}

        {!loading && !error && lineup && teamA && teamB && (
          <div className="glass-elevated rounded-2xl p-4 md:p-6">
            <LineupView teamA={teamA} teamB={teamB} />
          </div>
        )}
      </main>

      <FloatingChat fanId={fanId} onFanIdChange={setFanId} />
      <MobileNav />
      </div>
    </div>
  )
}
