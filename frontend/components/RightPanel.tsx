"use client"

import { useEffect, useState } from "react"
import {
  fetchPendingActions,
  PendingAction,
  fetchAtmosphere,
  AtmosphereRanking,
  fetchCrowd,
  CrowdInsight,
} from "../lib/api"
import ApprovalCard from "./ApprovalCard"

interface RightPanelProps {
  fanId: string | null
}

export default function RightPanel({ fanId }: RightPanelProps) {
  const [actions, setActions] = useState<PendingAction[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [rankings, setRankings] = useState<AtmosphereRanking[]>([])
  const [crowd, setCrowd] = useState<CrowdInsight | null>(null)

  useEffect(() => {
    if (!fanId) return
    const poll = async () => {
      try {
        const { actions: fetched } = await fetchPendingActions(fanId)
        setActions(fetched)
      } catch { /* ignore */ }
    }
    poll()
    const id = setInterval(poll, 5_000)
    return () => clearInterval(id)
  }, [fanId])

  useEffect(() => {
    const load = async () => {
      try {
        const { rankings: r } = await fetchAtmosphere(5)
        setRankings(r)
      } catch { /* ignore */ }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCrowd("Dallas")
        setCrowd(data)
      } catch { /* ignore */ }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [])

  const visibleActions = actions.filter((a) => !dismissed.has(a.id))

  function handleApprove(id: string) {
    setDismissed((prev) => new Set(Array.from(prev).concat(id)))
  }
  function handleReject(id: string) {
    setDismissed((prev) => new Set(Array.from(prev).concat(id)))
  }

  return (
    <aside className="hidden md:flex w-72 flex-col glass border-l border-white/10 shrink-0 overflow-y-auto">
      {/* Agent Actions */}
      <section className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-pitch-green shadow-glow-green animate-pulse shrink-0" />
          <span className="text-[10px] font-mono text-on-surface/40 uppercase tracking-widest flex-1">
            Agent Actions
          </span>
          {visibleActions.length > 0 && (
            <span className="bg-energy-red text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0">
              {visibleActions.length}
            </span>
          )}
        </div>

        {!fanId ? (
          <p className="text-[10px] font-mono text-on-surface/20 text-center py-5 uppercase tracking-widest">
            Chat to activate agent
          </p>
        ) : visibleActions.length === 0 ? (
          <p className="text-[10px] font-mono text-on-surface/20 text-center py-5 uppercase tracking-widest">
            No pending actions
          </p>
        ) : (
          <div className="space-y-2">
            {visibleActions.map((action) => (
              <ApprovalCard
                key={action.id}
                actionId={action.id}
                summary={action.summary}
                createdAt={action.created_at}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </section>

      {/* Atmosphere Rankings */}
      <section className="px-4 pt-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono text-trophy-gold uppercase tracking-widest">
            Atmosphere Rankings
          </span>
        </div>

        {rankings.length === 0 ? (
          <p className="text-[10px] font-mono text-on-surface/20 text-center py-3 uppercase tracking-widest">
            Loading&hellip;
          </p>
        ) : (
          <div className="space-y-1.5">
            {rankings.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="text-[10px] font-mono text-on-surface/30 w-4 shrink-0 text-right">
                  {r.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-display font-semibold text-on-surface truncate">
                    {r.team_a} vs {r.team_b}
                  </p>
                  <p className="text-[9px] font-mono text-on-surface/30 uppercase tracking-wide">
                    {r.city}
                  </p>
                </div>
                <AtmosphereBar score={r.atmosphere_score} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Crowd Intelligence */}
      <section className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono text-electric-blue uppercase tracking-widest">
            Crowd Intel &mdash; Dallas
          </span>
        </div>

        {!crowd ? (
          <p className="text-[10px] font-mono text-on-surface/20 text-center py-3 uppercase tracking-widest">
            Loading&hellip;
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-2xl font-display font-black text-on-surface">
              {crowd.fans_booked.toLocaleString()}
              <span className="text-xs font-sans font-normal text-on-surface/40 ml-1">fans booked</span>
            </p>
            <div className="space-y-1 text-[11px] font-mono text-on-surface/50">
              <p>
                <span className="text-on-surface/30">Avg hotel: </span>
                <span className="text-trophy-gold">${crowd.avg_hotel_price}/nt</span>
              </p>
              {crowd.top_neighbourhoods.length > 0 && (
                <p>
                  <span className="text-on-surface/30">Top areas: </span>
                  {crowd.top_neighbourhoods.join(", ")}
                </p>
              )}
              {crowd.overbooked_zones.length > 0 && (
                <p className="text-energy-red">
                  Overbooked: {crowd.overbooked_zones.join(", ")}
                </p>
              )}
            </div>
            <p className="text-[11px] font-sans text-on-surface/60 bg-electric-blue/10 border border-electric-blue/20 rounded-lg px-3 py-2 leading-snug">
              {crowd.budget_tip}
            </p>
          </div>
        )}
      </section>
    </aside>
  )
}

function AtmosphereBar({ score }: { score: number }) {
  const colorClass =
    score >= 80
      ? "bg-pitch-green shadow-glow-green"
      : score >= 60
      ? "bg-trophy-gold"
      : "bg-energy-red"
  const textColor =
    score >= 80 ? "text-pitch-green" : score >= 60 ? "text-trophy-gold" : "text-energy-red"

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-10 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[10px] font-mono ${textColor} w-6 text-right`}>{score}</span>
    </div>
  )
}
