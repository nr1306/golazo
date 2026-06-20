"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  MatchDetail,
  MatchSuggestions,
  HotelOption,
  CitySpot,
  CityDayPlan,
  fetchMatchDetail,
  fetchMatchSuggestions,
  postMatchInterest,
} from "../lib/api"
import { getFanId } from "../lib/session"
import FloatingChat from "./FloatingChat"
import NavSidebar from "./NavSidebar"

function deriveCheckinCheckout(matchDate: string): { checkin: string; checkout: string } {
  const d = new Date(matchDate.slice(0, 10))
  const co = new Date(d)
  co.setDate(d.getDate() + 2)
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
  return { checkin: fmt(d), checkout: fmt(co) }
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-white/5 rounded-lg animate-pulse ${className ?? "h-3 w-full"}`} />
}

export default function MatchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const matchId = searchParams.get("id") ?? ""

  const [fanId, setFanId] = useState<string | null>(null)
  const [detail, setDetail] = useState<MatchDetail | null>(null)
  const [suggestions, setSuggestions] = useState<MatchSuggestions | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [prefillMessage, setPrefillMessage] = useState<string | undefined>()
  const [chatOpen, setChatOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setFanId(getFanId())
  }, [])

  useEffect(() => {
    if (!matchId) return
    setDetail(null)
    setSuggestions(null)
    fetchMatchDetail(matchId).then(setDetail).catch(() => {})
  }, [matchId])

  useEffect(() => {
    if (!matchId) return
    if (pollRef.current) clearInterval(pollRef.current)
    setSuggestions(null)

    const checkin = detail?.match?.date
      ? deriveCheckinCheckout(detail.match.date).checkin
      : new Date().toISOString().slice(0, 10)
    const checkout = detail?.match?.date
      ? deriveCheckinCheckout(detail.match.date).checkout
      : new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)

    postMatchInterest(matchId, fanId, checkin, checkout).catch(() => {})

    const poll = async () => {
      try {
        const data = await fetchMatchSuggestions(matchId, fanId)
        setSuggestions(data)
        if (data.status === "ready" || data.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch { /* ignore */ }
    }

    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [matchId, fanId, detail?.match?.date])

  function handleAskAgent() {
    if (!detail) return
    const m = detail.match
    const prompt = `Tell me everything about attending ${m.team_a} vs ${m.team_b} at ${m.stadium} in ${m.city} on ${m.date.slice(0, 10)}. What are the best fan zones, match day tips, and top things to do in the city?`
    setPrefillMessage(prompt)
    setChatOpen(true)
  }

  if (!matchId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface/30 font-mono text-sm">No match selected.{" "}
          <button onClick={() => router.push("/")} className="text-pitch-green underline">Back to matches</button>
        </p>
      </div>
    )
  }

  const match = detail?.match
  const isLoading = !suggestions || suggestions.status === "loading" || suggestions.status === "not_found"
  const scoreColor = match && match.atmosphere_score >= 80 ? "text-pitch-green" : match && match.atmosphere_score >= 60 ? "text-trophy-gold" : "text-on-surface/40"
  const statusColor = match?.status === "finished" ? "text-energy-red" : match?.status === "live" ? "text-pitch-green animate-pulse" : "text-on-surface/30"

  const sortedHotels = suggestions?.hotels
    ? [...suggestions.hotels].sort((a, b) =>
        sortOrder === "asc" ? a.price_per_night - b.price_per_night : b.price_per_night - a.price_per_night
      )
    : []

  const checkin = match?.date ? deriveCheckinCheckout(match.date).checkin : ""
  const checkout = match?.date ? deriveCheckinCheckout(match.date).checkout : ""

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <NavSidebar matchId={matchId} />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-on-surface/40 hover:text-on-surface/70 transition-colors text-xs font-mono uppercase tracking-widest shrink-0"
          >
            ← Matches
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-3">
            {match ? (
              <>
                <h1 className="text-sm font-display font-black text-on-surface truncate">
                  {match.team_a}
                  <span className="text-on-surface/25 font-normal text-xs mx-2">vs</span>
                  {match.team_b}
                </h1>
                <span className="hidden md:block text-[9px] font-mono text-on-surface/30 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded-full shrink-0">
                  {match.stage}
                </span>
                <span className={`hidden md:block text-[9px] font-mono uppercase tracking-widest shrink-0 ${statusColor}`}>
                  {match.status}
                </span>
              </>
            ) : (
              <SkeletonBlock className="h-4 w-48 rounded-full" />
            )}
          </div>

          {match && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden lg:flex items-center gap-1.5 mr-1">
                <span className="text-[10px] font-mono text-on-surface/25 uppercase tracking-widest">Atm</span>
                <span className={`text-base font-display font-black ${scoreColor}`}>{match.atmosphere_score}</span>
              </div>
              <button
                onClick={() => router.push(`/lineup/?id=${matchId}`)}
                className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 border border-white/15 hover:border-electric-blue/50 text-on-surface/70 hover:text-electric-blue text-[10px] font-display font-bold uppercase tracking-wider px-3.5 py-2 rounded-full transition-all"
              >
                Lineup
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </button>
              <button
                onClick={handleAskAgent}
                className="flex items-center gap-2 bg-pitch-green hover:bg-pitch-bright text-stadium-navy text-[10px] font-display font-bold uppercase tracking-wider px-4 py-2 rounded-full transition-all shadow-glow-green"
              >
                Ask Agent
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto max-w-7xl mx-auto w-full px-6 py-8">

        {/* Lineup CTA banner */}
        {match && (
          <button
            onClick={() => router.push(`/lineup/?id=${matchId}`)}
            className="w-full mb-6 group relative overflow-hidden glass-elevated hover:border-electric-blue/40 border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-electric-blue/15 flex items-center justify-center text-electric-blue text-lg group-hover:bg-electric-blue/25 transition-colors">
                ⚽
              </div>
              <div className="text-left">
                <div className="text-sm font-display font-bold text-on-surface">
                  View Predicted Lineups
                </div>
                <div className="text-[10px] font-mono text-on-surface/35 mt-0.5 uppercase tracking-widest">
                  {match.team_a} vs {match.team_b} · 4-3-3 formation · Tap any player for full card
                </div>
              </div>
            </div>
            <div className="text-on-surface/30 group-hover:text-electric-blue transition-colors text-lg shrink-0">
              →
            </div>
          </button>
        )}

        {/* Match facts strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Date", value: match?.date.slice(0, 10) ?? null },
            { label: "Kickoff", value: match ? `${match.kickoff_local} local` : null },
            { label: "Stadium", value: match?.stadium ?? null },
            { label: "City", value: match?.city ?? null },
          ].map(({ label, value }) => (
            <div key={label} className="glass-elevated rounded-xl px-4 py-3">
              <p className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest mb-1">{label}</p>
              {value ? (
                <p className="text-xs font-mono text-on-surface/70 truncate">{value}</p>
              ) : (
                <SkeletonBlock className="h-3 w-3/4 mt-1 rounded-full" />
              )}
            </div>
          ))}
        </div>

        {/* 3-column content */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_1fr] gap-6">

          {/* Col 1: Match Briefing */}
          <div className="space-y-5">
            <div>
              <p className="text-[9px] font-mono text-trophy-gold uppercase tracking-widest mb-3">Match Day Briefing</p>
              {!detail ? (
                <div className="space-y-2">
                  <SkeletonBlock className="h-2.5 w-full rounded-full" />
                  <SkeletonBlock className="h-2.5 w-4/5 rounded-full" />
                  <SkeletonBlock className="h-2.5 w-3/5 rounded-full" />
                </div>
              ) : (
                <div className="space-y-4">
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
            </div>
          </div>

          {/* Col 2: Hotels */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-mono text-trophy-gold uppercase tracking-widest">
                Hotels &middot; {match?.city ?? "…"}
              </p>
              {!isLoading && sortedHotels.length > 1 && (
                <button
                  onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
                  className="flex items-center gap-1 text-[9px] font-mono text-on-surface/30 hover:text-on-surface/60 uppercase tracking-widest border border-white/10 hover:border-white/20 px-2 py-1 rounded-md transition-all"
                >
                  {sortOrder === "asc" ? "↑" : "↓"} Price
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="glass-elevated rounded-xl px-4 py-3 animate-pulse flex items-center gap-3">
                    <div className="flex-1 space-y-1.5">
                      <SkeletonBlock className="h-3 w-1/2 rounded-full" />
                      <SkeletonBlock className="h-2 w-1/3 rounded-full" />
                    </div>
                    <SkeletonBlock className="h-5 w-16 rounded-md" />
                  </div>
                ))}
              </div>
            ) : sortedHotels.length === 0 ? (
              <p className="text-xs font-mono text-on-surface/25 uppercase tracking-widest py-4">No hotels found</p>
            ) : (
              <div className="space-y-2">
                {sortedHotels.map((hotel, i) => (
                  <HotelCard key={i} hotel={hotel} checkin={checkin} checkout={checkout} />
                ))}
              </div>
            )}
          </div>

          {/* Col 3: City Guide (AI) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[9px] font-mono text-trophy-gold uppercase tracking-widest">
                City Guide &middot; {match?.city ?? "…"}
              </p>
              {!isLoading && suggestions?.city_guide && (
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border border-pitch-green/30 text-pitch-green bg-pitch-green/5 uppercase tracking-widest">
                  AI
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="glass-elevated rounded-xl px-4 py-3 animate-pulse space-y-1.5">
                      <SkeletonBlock className="h-3 w-1/2 rounded-full" />
                      <SkeletonBlock className="h-2 w-4/5 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : !suggestions?.city_guide ? (
              <p className="text-xs font-mono text-on-surface/25 uppercase tracking-widest py-4">City guide coming soon</p>
            ) : (
              <div className="space-y-6">
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
                    <p className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest mb-2">Food &amp; Drink</p>
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
          </div>
        </div>
      </main>

      <FloatingChat
        fanId={fanId}
        onFanIdChange={setFanId}
        prefillMessage={prefillMessage}
        autoOpen={chatOpen}
      />
      </div>
    </div>
  )
}

function HotelCard({ hotel, checkin, checkout }: { hotel: HotelOption; checkin: string; checkout: string }) {
  const ratingColor = hotel.rating >= 8.5 ? "text-pitch-green" : hotel.rating >= 7 ? "text-trophy-gold" : "text-on-surface/40"
  const bookUrl = hotel.url ||
    `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name)}&checkin=${checkin}&checkout=${checkout}`
  return (
    <div className="glass-elevated rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors">
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
