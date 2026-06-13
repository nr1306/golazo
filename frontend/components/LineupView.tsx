"use client"

import { useState } from "react"
import { LineupPlayer, TeamLineup } from "../lib/api"
import PlayerModal from "./PlayerModal"

const POS_BADGE: Record<string, string> = {
  GK:  "bg-trophy-gold text-stadium-navy",
  DEF: "bg-electric-blue text-white",
  MID: "bg-pitch-green text-stadium-navy",
  FWD: "bg-energy-red text-white",
}

function MiniCard({
  player,
  onClick,
}: {
  player: LineupPlayer
  onClick: () => void
}) {
  const lastName = player.name.split(" ").slice(-1)[0]
  return (
    <button
      onClick={onClick}
      style={{ left: `${player.x}%`, top: `${player.y}%` }}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group"
    >
      <div
        className="relative rounded-lg shadow-xl transition-transform duration-150 group-hover:scale-110 group-active:scale-95"
        style={{
          width: 60,
          background: "linear-gradient(150deg,#f9e872 0%,#d4a017 45%,#9a6f00 100%)",
        }}
      >
        {/* Texture */}
        <div
          className="absolute inset-0 rounded-lg opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg,transparent,transparent 4px,#000 4px,#000 5px)",
          }}
        />
        <div className="relative px-1.5 py-1.5 text-center">
          <div className="text-base font-black text-stadium-navy leading-none">
            {player.shirt_number ?? "—"}
          </div>
          <span
            className={`inline-block px-0.5 rounded text-[7px] font-bold uppercase leading-tight my-0.5 ${POS_BADGE[player.position]}`}
          >
            {player.position}
          </span>
          <div className="text-[8px] font-bold text-stadium-navy uppercase truncate leading-tight" style={{ maxWidth: 52 }}>
            {lastName}
          </div>
        </div>
      </div>
    </button>
  )
}

function SubRow({
  player,
  onClick,
}: {
  player: LineupPlayer
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/8 transition-colors group text-left"
    >
      <div
        className="w-7 h-7 rounded flex items-center justify-center shrink-0 text-xs font-black text-stadium-navy shadow"
        style={{
          background: "linear-gradient(135deg,#f9e872 0%,#d4a017 100%)",
          minWidth: 28,
        }}
      >
        {player.rating}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-on-surface/90 truncate group-hover:text-white transition-colors">
          {player.name.split(" ").slice(-1)[0]}
        </div>
        <div className="text-[9px] text-on-surface/35 truncate">{player.club}</div>
      </div>
      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${POS_BADGE[player.position]}`}>
        {player.position}
      </span>
    </button>
  )
}

function FootballPitch({
  players,
  onSelect,
}: {
  players: LineupPlayer[]
  onSelect: (p: LineupPlayer) => void
}) {
  return (
    /* Aspect-ratio container (portrait pitch) */
    <div className="relative w-full" style={{ paddingBottom: "130%" }}>

      {/* ── LAYER 1: pitch background + markings (overflow-hidden for rounded corners) ── */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg,#1a7a30 0%,#1d8a36 16.67%,#1a7a30 33.33%,#1d8a36 50%,#1a7a30 66.67%,#1d8a36 83.33%,#1a7a30 100%)",
        }}
      >
        {/* Outer white border */}
        <div className="absolute inset-2.5 border-2 border-white/25 rounded-sm" />

        {/* Center line */}
        <div className="absolute left-2.5 right-2.5 top-[50%] h-px bg-white/25" />

        {/* Center circle */}
        <div
          className="absolute border border-white/25 rounded-full"
          style={{ width: "24%", paddingBottom: "24%", left: "38%", top: "calc(50% - 12%)" }}
        />
        {/* Center spot */}
        <div
          className="absolute w-1.5 h-1.5 rounded-full bg-white/40"
          style={{ left: "calc(50% - 3px)", top: "calc(50% - 3px)" }}
        />

        {/* Top penalty area */}
        <div
          className="absolute border border-white/20"
          style={{ left: "20%", right: "20%", top: "2.5%", height: "18%" }}
        />
        {/* Top 6-yard box */}
        <div
          className="absolute border border-white/15"
          style={{ left: "33%", right: "33%", top: "2.5%", height: "7%" }}
        />

        {/* Bottom penalty area */}
        <div
          className="absolute border border-white/20"
          style={{ left: "20%", right: "20%", bottom: "2.5%", height: "18%" }}
        />
        {/* Bottom 6-yard box */}
        <div
          className="absolute border border-white/15"
          style={{ left: "33%", right: "33%", bottom: "2.5%", height: "7%" }}
        />
      </div>

      {/* ── LAYER 2: player cards (no overflow clipping so cards aren't clipped at edges) ── */}
      <div className="absolute inset-0">
        {players.map(p => (
          <MiniCard key={p.id || p.name} player={p} onClick={() => onSelect(p)} />
        ))}
      </div>
    </div>
  )
}

export default function LineupView({
  teamA,
  teamB,
}: {
  teamA: TeamLineup
  teamB: TeamLineup
}) {
  const [activeTeam, setActiveTeam] = useState<"a" | "b">("a")
  const [selected, setSelected] = useState<LineupPlayer | null>(null)

  const lineup = activeTeam === "a" ? teamA : teamB

  return (
    <div className="flex flex-col gap-4">

      {/* Team tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
        {(["a", "b"] as const).map(side => {
          const team = side === "a" ? teamA : teamB
          return (
            <button
              key={side}
              onClick={() => setActiveTeam(side)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-display font-bold transition-all ${
                activeTeam === side
                  ? "bg-pitch-green text-stadium-navy shadow-glow-green"
                  : "text-on-surface/50 hover:text-on-surface/80"
              }`}
            >
              {team.team}
            </button>
          )
        })}
      </div>

      {/* Formation label */}
      <p className="text-center text-[9px] font-mono text-on-surface/30 uppercase tracking-widest">
        {lineup.team} · {lineup.formation} · Predicted XI · Last tournament form
      </p>

      {/* Main content: pitch + substitutes */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4 items-start">

        {/* Pitch */}
        <FootballPitch players={lineup.players} onSelect={setSelected} />

        {/* Substitutes */}
        <div className="glass-elevated rounded-xl p-2">
          <p className="text-[9px] font-mono text-on-surface/30 uppercase tracking-widest px-2 py-1.5">
            Substitutes
          </p>
          {lineup.bench && lineup.bench.length > 0 ? (
            <div className="space-y-0.5">
              {lineup.bench.map(p => (
                <SubRow key={p.id || p.name} player={p} onClick={() => setSelected(p)} />
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-on-surface/20 px-3 py-2">No squad data</p>
          )}
        </div>
      </div>

      {/* Position key */}
      <div className="flex flex-wrap justify-center gap-3">
        {(["GK", "DEF", "MID", "FWD"] as const).map(pos => (
          <div key={pos} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-sm ${POS_BADGE[pos].split(" ")[0]}`} />
            <span className="text-[9px] font-mono text-on-surface/35 uppercase">{pos}</span>
          </div>
        ))}
        <span className="text-[9px] font-mono text-on-surface/20">· Tap any card for full stats</span>
      </div>

      {/* Player modal */}
      {selected && (
        <PlayerModal player={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
