interface MatchCardProps {
  matchNumber: number
  stage: string
  teamA: string
  teamB: string
  date: string
  kickoffLocal: string
  city: string
  stadium: string
  atmosphereScore: number
  country: string
  status?: string
  scoreA?: number | null
  scoreB?: number | null
  winner?: string | null
}

function AtmosphereBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-pitch-green shadow-glow-green" :
    score >= 50 ? "bg-trophy-gold shadow-glow-gold" :
                  "bg-energy-red"
  return (
    <div className="mt-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-[10px] font-mono text-on-surface/40 uppercase tracking-widest">Atmosphere</span>
        <span className="text-[10px] font-mono text-on-surface/60">{score}/100</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface-high">
        <div
          className={`h-1.5 rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

export default function MatchCard({
  matchNumber, stage, teamA, teamB, date, kickoffLocal, city, stadium,
  atmosphereScore, country, status, scoreA, scoreB, winner,
}: MatchCardProps) {
  const isFinished = status === "completed" || status === "finished"
  const hasScore = isFinished && scoreA !== null && scoreA !== undefined && scoreB !== null && scoreB !== undefined

  return (
    <div className="glass-elevated rounded-xl p-4 accent-border-green">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-mono text-pitch-green uppercase tracking-widest">
          {stage} · Match {matchNumber}
        </span>
        <div className="flex items-center gap-2">
          {isFinished && (
            <span className="text-[9px] font-mono text-energy-red uppercase tracking-widest">FT</span>
          )}
          <span className="text-[10px] font-mono text-on-surface/40 uppercase tracking-wider">{country}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 font-display font-bold text-on-surface">
        <span className={`flex-1 text-right text-base ${hasScore && winner === teamA ? "text-pitch-green" : ""}`}>
          {teamA}
        </span>
        {hasScore ? (
          <span className="text-xl font-black text-on-surface tabular-nums px-1">
            {scoreA} <span className="text-on-surface/30">–</span> {scoreB}
          </span>
        ) : (
          <span className="text-on-surface/30 text-xs font-mono font-normal px-2">VS</span>
        )}
        <span className={`flex-1 text-left text-base ${hasScore && winner === teamB ? "text-pitch-green" : ""}`}>
          {teamB}
        </span>
      </div>

      {hasScore && !winner && (
        <p className="text-center text-[9px] font-mono text-on-surface/30 uppercase tracking-widest mt-1">Draw</p>
      )}

      <div className="mt-3 flex gap-4 text-xs font-mono text-on-surface/50">
        <span>{date}</span>
        <span>{kickoffLocal}</span>
      </div>
      <div className="mt-1 flex gap-4 text-xs font-mono text-on-surface/50">
        <span>{stadium}</span>
        <span>{city}</span>
      </div>

      <AtmosphereBar score={atmosphereScore} />
    </div>
  )
}
