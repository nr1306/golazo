interface CrowdCardProps {
  fans_booked: number
  top_neighbourhoods: string[]
  avg_hotel_price: number
  overbooked_zones: string[]
  budget_tip: string
}

export default function CrowdCard({
  fans_booked, top_neighbourhoods, avg_hotel_price, overbooked_zones, budget_tip,
}: CrowdCardProps) {
  return (
    <div className="glass-elevated rounded-xl p-4 accent-border-blue">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono text-electric-blue uppercase tracking-widest">Crowd Intelligence</span>
      </div>

      <p className="text-2xl font-display font-black text-on-surface">
        {fans_booked.toLocaleString()}
        <span className="text-sm font-sans font-normal text-on-surface/40 ml-2">fans booked</span>
      </p>

      <div className="mt-3 space-y-2 text-xs font-mono text-on-surface/60">
        <p>
          <span className="text-on-surface/30">Top areas: </span>
          {top_neighbourhoods.join(", ")}
        </p>
        <p>
          <span className="text-on-surface/30">Avg hotel: </span>
          <span className="text-trophy-gold">${avg_hotel_price}/night</span>
        </p>
        {overbooked_zones.length > 0 && (
          <p className="text-energy-red">
            ⚠ Overbooked: {overbooked_zones.join(", ")}
          </p>
        )}
        <p className="mt-2 text-on-surface/70 bg-electric-blue/10 border border-electric-blue/20 rounded-lg px-3 py-2 font-sans">
          💡 {budget_tip}
        </p>
      </div>
    </div>
  )
}
