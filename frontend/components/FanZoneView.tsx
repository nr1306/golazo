"use client"

import { useEffect, useState } from "react"
import { fetchCrowd, CrowdInsight } from "../lib/api"
import CrowdCard from "./CrowdCard"

const CITIES = ["Dallas", "Los Angeles", "Miami", "New York", "Toronto", "Vancouver", "Seattle", "Houston"]

export default function FanZoneView() {
  const [selected, setSelected] = useState("Dallas")
  const [crowd, setCrowd] = useState<CrowdInsight | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setCrowd(null)
    fetchCrowd(selected)
      .then(setCrowd)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selected])

  return (
    <div className="h-full overflow-y-auto px-5 py-5 space-y-4">
      <div className="flex flex-wrap gap-2">
        {CITIES.map((city) => (
          <button
            key={city}
            onClick={() => setSelected(city)}
            className={`text-[11px] font-mono px-3 py-1.5 rounded-full border transition-all uppercase tracking-wide ${
              selected === city
                ? "border-electric-blue/50 bg-electric-blue/10 text-electric-blue"
                : "border-white/10 text-on-surface/40 hover:border-white/25 hover:text-on-surface/60"
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[11px] font-mono text-on-surface/30 text-center py-10 uppercase tracking-widest">
          Loading&hellip;
        </p>
      ) : crowd ? (
        <CrowdCard
          fans_booked={crowd.fans_booked}
          top_neighbourhoods={crowd.top_neighbourhoods}
          avg_hotel_price={crowd.avg_hotel_price}
          overbooked_zones={crowd.overbooked_zones}
          budget_tip={crowd.budget_tip}
        />
      ) : null}
    </div>
  )
}
