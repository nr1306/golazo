"use client"

import { useEffect, useState } from "react"
import { LineupPlayer } from "../lib/api"

const GK_STATS = ["DIV", "HAN", "KIC", "REF", "SPE", "POS"] as const
const FIELD_STATS = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"] as const

const POSITION_COLORS: Record<string, string> = {
  GK:  "bg-trophy-gold text-stadium-navy",
  DEF: "bg-electric-blue text-white",
  MID: "bg-pitch-green text-stadium-navy",
  FWD: "bg-energy-red text-white",
}

function usePlayerPhoto(name: string): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const encoded = encodeURIComponent(name)
    fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encoded}`)
      .then(r => r.json())
      .then(data => {
        const thumb = data?.player?.[0]?.strThumb
        if (thumb) setUrl(thumb)
      })
      .catch(() => {})
  }, [name])
  return url
}

function StatRow({ label, value }: { label: string; value: number }) {
  const color =
    value >= 85 ? "bg-pitch-green" :
    value >= 70 ? "bg-trophy-gold" :
    value >= 55 ? "bg-electric-blue" :
    "bg-black/20"

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-stadium-navy/60 w-7 text-right shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-black text-stadium-navy w-5 shrink-0 text-right">{value}</span>
    </div>
  )
}

export default function PlayerModal({
  player,
  onClose,
}: {
  player: LineupPlayer
  onClose: () => void
}) {
  const photoUrl = usePlayerPhoto(player.name)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  const isGK = player.position === "GK"
  const statKeys = isGK ? GK_STATS : FIELD_STATS
  const statValues = statKeys.map(k => ({ label: k, value: (player.stats as any)[k] ?? 0 }))
  const leftStats  = statValues.slice(0, 3)
  const rightStats = statValues.slice(3)
  const initials   = player.name.split(" ").map(w => w[0]).slice(0, 2).join("")
  const lastName   = player.name.split(" ").slice(-1)[0].toUpperCase()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

      <div
        className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Gold FIFA-style card */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "linear-gradient(150deg, #f9e872 0%, #d4a017 40%, #9a6f00 100%)",
          }}
        >
          {/* Subtle diagonal texture */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg,transparent,transparent 8px,#000 8px,#000 9px)",
            }}
          />

          <div className="relative p-5">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/25 hover:bg-black/40 flex items-center justify-center text-stadium-navy font-bold text-sm transition-colors"
            >
              ✕
            </button>

            {/* Top: rating + position + nationality */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-5xl font-black text-stadium-navy leading-none tracking-tight">
                  {player.rating}
                </div>
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${POSITION_COLORS[player.position]}`}>
                  {player.position}
                </span>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-stadium-navy/55 uppercase tracking-widest">
                  {player.nationality}
                </div>
                <div className="text-xs font-semibold text-stadium-navy mt-0.5 max-w-[120px] text-right">
                  {player.club}
                </div>
              </div>
            </div>

            {/* Photo */}
            <div className="flex justify-center my-3">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={player.name}
                  className="w-24 h-24 rounded-full object-cover border-3 border-black/20 shadow-lg"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-black/20 flex items-center justify-center border-4 border-black/10 shadow-lg">
                  <span className="text-3xl font-black text-stadium-navy/60">{initials}</span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className="text-center mb-1">
              <div className="text-2xl font-black text-stadium-navy tracking-widest uppercase">
                {lastName}
              </div>
              <div className="text-xs text-stadium-navy/55 mt-0.5">{player.name}</div>
            </div>

            {/* Meta: age + shirt */}
            <div className="flex justify-center gap-4 mb-4 text-[10px] font-mono text-stadium-navy/55 uppercase tracking-widest">
              {player.age != null && <span>Age {player.age}</span>}
              {player.shirt_number != null && <span>#{player.shirt_number}</span>}
            </div>

            {/* Stats block */}
            <div className="bg-black/12 rounded-xl p-3.5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="space-y-1.5">
                  {leftStats.map(s => <StatRow key={s.label} label={s.label} value={s.value} />)}
                </div>
                <div className="space-y-1.5">
                  {rightStats.map(s => <StatRow key={s.label} label={s.label} value={s.value} />)}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 text-center text-[9px] font-mono text-stadium-navy/40 uppercase tracking-widest">
              National: {player.nationality} · Club: {player.club}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
