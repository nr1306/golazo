"use client"

import { useEffect, useState } from "react"
import { fetchTrip } from "../lib/api"
import TripCard from "./TripCard"

interface TripViewProps {
  fanId: string | null
}

export default function TripView({ fanId }: TripViewProps) {
  const [trip, setTrip] = useState<{ legs: unknown[]; total_estimated_cost: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!fanId) {
      setLoading(false)
      return
    }
    fetchTrip(fanId)
      .then((data) => setTrip(data.trip))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fanId])

  return (
    <div className="h-full overflow-y-auto px-5 py-5">
      {loading ? (
        <p className="text-[11px] font-mono text-on-surface/30 text-center py-16 uppercase tracking-widest">
          Loading trip&hellip;
        </p>
      ) : !fanId ? (
        <div className="text-center py-24">
          <p className="text-on-surface/30 font-mono text-xs tracking-widest uppercase">
            Chat with the agent to plan your trip
          </p>
        </div>
      ) : !trip ? (
        <div className="text-center py-24">
          <p className="text-on-surface/30 font-mono text-xs tracking-widest uppercase">
            No trip yet &mdash; ask the agent to build one
          </p>
        </div>
      ) : (
        <TripCard
          legs={trip.legs as Parameters<typeof TripCard>[0]["legs"]}
          totalEstimatedCost={trip.total_estimated_cost}
        />
      )}
    </div>
  )
}
