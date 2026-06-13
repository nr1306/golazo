"use client"

import { useEffect, useRef, useState } from "react"
import {
  MatchItem,
  MatchDetail,
  MatchSuggestions,
  HotelOption,
  CitySpot,
  CityDayPlan,
  fetchMatchDetail,
  fetchMatchSuggestions,
  postMatchInterest,
} from "../lib/api"

interface MatchDetailPanelProps {
  match: MatchItem
  onClose: () => void
  fanId: string | null
}

function deriveCheckinCheckout(matchDate: string): { checkin: string; checkout: string } {
  const d = new Date(matchDate.slice(0, 10))
  const co = new Date(d)
  co.setDate(d.getDate() + 2)
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
  return { checkin: fmt(d), checkout: fmt(co) }
}

function SkeletonRow() {
  return (
    <div className="glass-elevated rounded-xl px-4 py-3 animate-pulse">
      <div className="h-3 bg-white/5 rounded-full w-1/2 mb-2" />
      <div className="h-2 bg-white/5 rounded-full w-1/3" />
    </div>
  )
}

export default function MatchDetailPanel({ match, onClose, fanId }: MatchDetailPanelProps) {
  const [detail, setDetail] = useState<MatchDetail | null>(null)
  const [suggestions, setSuggestions] = useState<MatchSuggestions | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { checkin, checkout } = deriveCheckinCheckout(match.date)

  const scoreColor =
    match.atmosphere_score >= 80 ? "text-pitch-green" :
    match.atmosphere_score >= 60 ? "text-trophy-gold" : "text-on-surface/40"
  const statusColor =
    match.status === "finished" ? "text-energy-red" :
    match.status === "live" ? "text-pitch-green animate-pulse" : "text-on-surface/30"

  useEffect(() => {
    setDetail(null)
    setSuggestions(null)
    fetchMatchDetail(match.id).then(setDetail).catch(() => {})
  }, [match.id])

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    setSuggestions(null)

    postMatchInterest(match.id, fanId, checkin, checkout).catch(() => {})

    const poll = async () => {
      try {
        const data = await fetchMatchSuggestions(match.id, fanId)
        setSuggestions(data)
        if (data.status === "ready" || data.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch { /* ignore */ }
    }

    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [match.id, fanId, checkin, checkout])

  const isLoading = !suggestions || suggestions.status === "loading" || suggestions.status === "not_found"

  const sortedHotels = suggestions?.hotels
    ? [...suggestions.hotels].sort((a, b) =>
        sortOrder === "asc" ? a.price_per_night - b.price_per_night : b.price_per_night - a.price_per_night
      )
    : []

  return (
    <div className="h-full flex flex-col overflow-hidden border-l border-white/10 bg-stadium-navy/60 backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-mono text-pitch-green uppercase tracking-widest mb-1">
              {match.stage} &middot; Match {match.match_number}
            </p>
            <h2 className="text-base font-display font-black text-on-surface leading-tight">
              {match.team_a}
              <span className="text-on-surface/25 font-normal text-xs mx-2">vs</span>
              {match.team_b}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface/25 hover:text-on-surface/60 font-mono text-xl leading-none transition-colors mt-0.5 shrink-0"
          >
            ×
          </button>
        </div>

        {/* Key facts grid */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="glass rounded-lg px-3 py-2">
            <p className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest">Kickoff</p>
            <p className="text-xs font-mono text-on-surface/70 mt-0.5">{match.kickoff_local} local</p>
          </div>
          <div className="glass rounded-lg px-3 py-2">
            <p className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest">Date</p>
            <p className="text-xs font-mono text-on-surface/70 mt-0.5">{match.date.slice(0, 10)}</p>
          </div>
          <div className="glass rounded-lg px-3 py-2 col-span-1">
            <p className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest">Stadium</p>
            <p className="text-xs font-mono text-on-surface/70 mt-0.5 truncate">{match.stadium}</p>
          </div>
          <div className="glass rounded-lg px-3 py-2 flex items-center gap-3">
            <div>
              <p className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest">Atmosphere</p>
              <p className={`text-lg font-display font-black mt-0.5 ${scoreColor}`}>{match.atmosphere_score}</p>
            </div>
            <span className={`text-[9px] font-mono uppercase tracking-widest ml-auto ${statusColor}`}>
              {match.status}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">

        {/* Match Day Briefing */}
        <section>
          <p className="text-[9px] font-mono text-trophy-gold uppercase tracking-widest mb-3">
            Match Day Briefing
          </p>
          {!detail ? (
            <div className="space-y-2 animate-pulse">
              {[3, 4, 2].map((w, i) => (
                <div key={i} className="h-2.5 bg-white/5 rounded-full" style={{ width: `${w * 20}%` }} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {detail.vibe_description && (
                <p className="text-xs text-on-surface/55 font-sans leading-relaxed">{detail.vibe_description}</p>
              )}
              {detail.transport_tips && (
                <div className="glass rounded-lg px-3 py-2.5">
                  <p className="text-[9px] font-mono text-electric-blue uppercase tracking-widest mb-1">Transport</p>
                  <p className="text-xs font-sans text-on-surface/55 leading-relaxed">{detail.transport_tips}</p>
                </div>
              )}
              {detail.fan_zones.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest mb-2">Fan Zones</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.fan_zones.map((zone) => (
                      <span key={zone} className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-pitch-green/20 text-pitch-green bg-pitch-green/5">
                        {zone}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detail.vibe_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.vibe_tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-on-surface/30">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Hotels */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-mono text-trophy-gold uppercase tracking-widest">
              Hotels &middot; {match.city}
            </p>
            {!isLoading && sortedHotels.length > 1 && (
              <button
                onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
                className="flex items-center gap-1 text-[9px] font-mono text-on-surface/30 hover:text-on-surface/60 uppercase tracking-widest border border-white/10 hover:border-white/20 px-2 py-1 rounded-md transition-all"
              >
                <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                <span>Price</span>
              </button>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : sortedHotels.length === 0 ? (
            <p className="text-xs font-mono text-on-surface/25 uppercase tracking-widest">No hotels found</p>
          ) : (
            <div className="h-48 overflow-y-auto space-y-2 pr-0.5">
              {sortedHotels.map((hotel, i) => (
                <HotelCard key={i} hotel={hotel} checkin={checkin} checkout={checkout} />
              ))}
            </div>
          )}
        </section>

        {/* City Guide */}
        <section>
          <p className="text-[9px] font-mono text-trophy-gold uppercase tracking-widest mb-3">
            City Guide &middot; {match.city}
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : !suggestions?.city_guide ? (
            <p className="text-xs font-mono text-on-surface/25 uppercase tracking-widest">City guide coming soon</p>
          ) : (
            <div className="space-y-5">
              {suggestions.city_guide.highlights.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest mb-2">Must See</p>
                  <div className="space-y-2">
                    {suggestions.city_guide.highlights.map((spot, i) => (
                      <SpotCard key={i} spot={spot} />
                    ))}
                  </div>
                </div>
              )}

              {suggestions.city_guide.day_plan.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest mb-3">Your Itinerary</p>
                  <div>
                    {suggestions.city_guide.day_plan.map((day, i) => (
                      <DayPlanRow
                        key={i}
                        day={day}
                        isLast={i === suggestions.city_guide!.day_plan.length - 1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {suggestions.city_guide.food_picks.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest mb-2">Food & Drink</p>
                  <div className="space-y-1.5">
                    {suggestions.city_guide.food_picks.map((pick, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-trophy-gold text-[10px] font-mono shrink-0 mt-0.5">·</span>
                        <p className="text-[11px] font-sans text-on-surface/55 leading-snug">{pick}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function HotelCard({ hotel, checkin, checkout }: { hotel: HotelOption; checkin: string; checkout: string }) {
  const ratingColor = hotel.rating >= 8.5 ? "text-pitch-green" : hotel.rating >= 7 ? "text-trophy-gold" : "text-on-surface/40"
  const bookUrl = hotel.url ||
    `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name)}&checkin=${checkin}&checkout=${checkout}`
  return (
    <div className="glass-elevated rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-semibold text-on-surface truncate">{hotel.name}</p>
        <p className="text-[10px] font-mono text-on-surface/35 mt-0.5">
          {checkin} &rarr; {checkout}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-display font-bold text-trophy-gold">
          ${hotel.price_per_night}<span className="text-[9px] text-on-surface/25 font-normal">/nt</span>
        </p>
        <p className={`text-[10px] font-mono ${ratingColor}`}>{hotel.rating.toFixed(1)} ★</p>
      </div>
      <a
        href={bookUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[9px] font-display font-bold px-3 py-1.5 rounded-lg border border-electric-blue/30 text-electric-blue hover:bg-electric-blue/10 transition-all uppercase tracking-wide shrink-0"
      >
        Book
      </a>
    </div>
  )
}

function SpotCard({ spot }: { spot: CitySpot }) {
  return (
    <div className="glass-elevated rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-display font-semibold text-on-surface leading-tight">{spot.name}</p>
          <p className="text-[10px] font-sans text-on-surface/40 mt-1 leading-snug">{spot.tip}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-electric-blue/20 text-electric-blue bg-electric-blue/5 uppercase tracking-wide">
            {spot.category}
          </span>
          <p className="text-[9px] font-mono text-on-surface/25 mt-1 uppercase tracking-widest">{spot.best_time}</p>
        </div>
      </div>
    </div>
  )
}

function DayPlanRow({ day, isLast }: { day: CityDayPlan; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-2 h-2 rounded-full border-2 border-pitch-green bg-stadium-navy mt-1 shrink-0" />
        {!isLast && <div className="w-px flex-1 bg-pitch-green/20 my-1 min-h-[16px]" />}
      </div>
      <div className={`${isLast ? "pb-0" : "pb-4"}`}>
        <p className="text-[9px] font-mono text-pitch-green uppercase tracking-widest">{day.label}</p>
        <div className="mt-1.5 space-y-1">
          {day.places.map((place, i) => (
            <p key={i} className="text-[11px] font-sans text-on-surface/55 leading-snug">· {place}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
