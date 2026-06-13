"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchMatches, MatchItem } from "../lib/api"

export default function MatchesView() {
  const router = useRouter()
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    fetchMatches({ limit: 104 })
      .then(({ matches: m }) => setMatches(m))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter
    ? matches.filter(
        (m) =>
          m.team_a.toLowerCase().includes(filter.toLowerCase()) ||
          m.team_b.toLowerCase().includes(filter.toLowerCase()) ||
          m.city.toLowerCase().includes(filter.toLowerCase()),
      )
    : matches

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-5 py-3 border-b border-white/10 shrink-0">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by team, city or stage…"
          className="w-full bg-surface-dim border border-white/10 rounded-full px-4 py-2 text-sm text-on-surface placeholder-on-surface/30 outline-none focus:border-pitch-green/40 font-sans transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {loading && (
          <p className="text-[11px] font-mono text-on-surface/30 text-center py-12 uppercase tracking-widest">
            Loading matches&hellip;
          </p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-[11px] font-mono text-on-surface/30 text-center py-12 uppercase tracking-widest">
            No matches found
          </p>
        )}
        {filtered.map((m) => (
          <MatchRow
            key={m.id}
            match={m}
            onClick={() => router.push(`/match/?id=${m.id}`)}
          />
        ))}
      </div>
    </div>
  )
}

function MatchRow({ match, onClick }: { match: MatchItem; onClick: () => void }) {
  const score = match.atmosphere_score
  const scoreColor =
    score >= 80 ? "text-pitch-green" : score >= 60 ? "text-trophy-gold" : "text-on-surface/40"
  const statusColor =
    match.status === "finished"
      ? "text-energy-red"
      : match.status === "live"
      ? "text-pitch-green animate-pulse"
      : "text-on-surface/30"

  return (
    <div
      onClick={onClick}
      className="glass-elevated rounded-xl px-4 py-3 flex items-center gap-4 cursor-pointer transition-all accent-border-green hover:bg-white/5 hover:border-white/15 hover:shadow-glow-green/10"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-display font-bold text-on-surface">
            {match.team_a} <span className="text-on-surface/30 font-normal">vs</span> {match.team_b}
          </p>
          <span className={`text-[9px] font-mono uppercase tracking-widest shrink-0 ${statusColor}`}>
            {match.status}
          </span>
        </div>
        <p className="text-[10px] font-mono text-on-surface/40 mt-0.5">
          {match.date.slice(0, 10)} &middot; {match.kickoff_local} &middot; {match.city} &middot; {match.stage}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-lg font-display font-black ${scoreColor}`}>{score}</p>
        <p className="text-[9px] font-mono text-on-surface/20 uppercase tracking-widest">atm</p>
      </div>
      <span className="text-on-surface/20 font-mono text-sm shrink-0">→</span>
    </div>
  )
}
