interface TripLeg {
  match_number: number
  stage: string
  team_a: string
  team_b: string
  date: string
  kickoff_local: string
  stadium: string
  city: string
  atmosphere_score: number
  hotel: { name: string; price_per_night: number }
  transport: string
  food_spots: string[]
}

interface TripCardProps {
  legs: TripLeg[]
  totalEstimatedCost: number
  currency?: string
}

export default function TripCard({ legs, totalEstimatedCost, currency = "USD" }: TripCardProps) {
  return (
    <div className="glass-elevated rounded-xl p-4 accent-border-gold">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs font-display font-bold text-trophy-gold uppercase tracking-widest">Your Trip</span>
        <span className="text-[10px] font-mono text-on-surface/50">
          Est. {currency} {totalEstimatedCost.toLocaleString()}
        </span>
      </div>

      <div className="relative">
        {legs.map((leg, i) => (
          <div key={i} className="flex gap-3 mb-6 last:mb-0">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-trophy-gold shadow-glow-gold mt-1 shrink-0" />
              {i < legs.length - 1 && (
                <div className="w-px flex-1 bg-white/10 mt-1" />
              )}
            </div>

            <div className="flex-1 pb-2">
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm font-display font-bold text-on-surface">
                  {leg.team_a} vs {leg.team_b}
                </span>
                <span className="text-[10px] font-mono text-on-surface/40 bg-surface-high px-2 py-0.5 rounded-full shrink-0">
                  {leg.stage}
                </span>
              </div>
              <p className="text-[11px] font-mono text-on-surface/40 mt-0.5">
                {leg.date} · {leg.kickoff_local} · {leg.city}
              </p>

              <div className="mt-2 space-y-1 text-xs text-on-surface/60">
                <p>🏨 {leg.hotel.name} <span className="text-on-surface/30">${leg.hotel.price_per_night}/nt</span></p>
                <p>🚌 {leg.transport}</p>
                {leg.food_spots.length > 0 && (
                  <p>🍽 {leg.food_spots.join(", ")}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
