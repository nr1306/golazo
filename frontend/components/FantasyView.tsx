"use client"

import { useEffect, useState } from "react"
import { fetchFantasy } from "../lib/api"

interface FantasyViewProps {
  fanId: string | null
}

interface Player {
  player_id: string
  name: string
  team: string
  position: string
  form: number
  available: boolean
}

const POSITION_COLOR: Record<string, string> = {
  Goalkeeper: "text-trophy-gold border-trophy-gold/30 bg-trophy-gold/5",
  Defender:   "text-electric-blue border-electric-blue/30 bg-electric-blue/5",
  Midfielder: "text-pitch-green border-pitch-green/30 bg-pitch-green/5",
  Forward:    "text-energy-red border-energy-red/30 bg-energy-red/5",
}

export default function FantasyView({ fanId }: FantasyViewProps) {
  const [roster, setRoster] = useState<Player[]>([])
  const [xi, setXi] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"squad" | "xi">("xi")

  useEffect(() => {
    if (!fanId) { setLoading(false); return }
    fetchFantasy(fanId)
      .then((data) => {
        setRoster(data.roster || [])
        setXi(data.suggested_xi || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fanId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[11px] font-mono text-on-surface/30 uppercase tracking-widest">Loading squad&hellip;</p>
      </div>
    )
  }

  if (!fanId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <p className="text-on-surface/30 font-mono text-xs tracking-widest uppercase">
          Use the chat bubble to build your fantasy squad
        </p>
        <p className="text-on-surface/20 font-mono text-[10px] tracking-widest uppercase">
          Tell the agent which players you want to add
        </p>
      </div>
    )
  }

  if (roster.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
        <p className="text-on-surface/30 font-mono text-xs tracking-widest uppercase">No squad yet</p>
        <p className="text-on-surface/20 font-mono text-[10px] tracking-widest uppercase leading-relaxed">
          Open chat and say "Add Mbappe and Vinicius to my fantasy roster"
        </p>
      </div>
    )
  }

  const display = tab === "xi" ? xi : roster

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-1 px-5 py-3 border-b border-white/10 shrink-0">
        <button
          onClick={() => setTab("xi")}
          className={`text-[10px] font-mono uppercase tracking-widest px-4 py-1.5 rounded-full border transition-all ${
            tab === "xi"
              ? "border-pitch-green/40 bg-pitch-green/10 text-pitch-green"
              : "border-white/10 text-on-surface/30 hover:text-on-surface/50"
          }`}
        >
          Best XI
        </button>
        <button
          onClick={() => setTab("squad")}
          className={`text-[10px] font-mono uppercase tracking-widest px-4 py-1.5 rounded-full border transition-all ${
            tab === "squad"
              ? "border-pitch-green/40 bg-pitch-green/10 text-pitch-green"
              : "border-white/10 text-on-surface/30 hover:text-on-surface/50"
          }`}
        >
          Full Squad ({roster.length})
        </button>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {display.map((p) => {
          const posClass = POSITION_COLOR[p.position] || "text-on-surface/40 border-white/10 bg-white/5"
          const formColor = p.form >= 85 ? "text-pitch-green" : p.form >= 70 ? "text-trophy-gold" : "text-on-surface/40"
          return (
            <div
              key={p.player_id}
              className={`glass-elevated rounded-xl px-4 py-3 flex items-center gap-3 ${!p.available ? "opacity-40" : ""}`}
            >
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wide shrink-0 ${posClass}`}>
                {p.position.slice(0, 3)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-on-surface truncate">{p.name}</p>
                <p className="text-[10px] font-mono text-on-surface/40">{p.team}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-base font-display font-black ${formColor}`}>{p.form}</p>
                <p className="text-[9px] font-mono text-on-surface/20 uppercase">form</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
