// Upgrade to HTTPS when page is served over HTTPS — Safari strictly blocks mixed content
function resolveApiUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  if (typeof window !== "undefined" && window.location.protocol === "https:" && raw.startsWith("http:")) {
    return raw.replace("http:", "https:")
  }
  return raw
}

const API_URL = resolveApiUrl()

export type SSEEvent =
  | { type: "token";       content: string }
  | { type: "tool_call";   tool: string; status: "running" }
  | { type: "tool_result"; tool: string; data: unknown }
  | { type: "card";        card_type: "match" | "trip" | "crowd"; data: unknown }
  | { type: "done";        fan_id: string }
  | { type: "error";       message: string }

export interface ChatRequest {
  session_id: string
  fan_id: string | null
  message: string
  attachments?: { type: "image"; base64: string }[]
}

export async function streamChat(
  req: ChatRequest,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Chat request failed: ${res.status} ${text}`)
  }

  if (!res.body) throw new Error("No response body")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      try {
        const event = JSON.parse(line.slice(6)) as SSEEvent
        onEvent(event)
      } catch {
        // skip malformed lines
      }
    }
  }
}

export async function fetchPendingActions(fanId: string) {
  const res = await fetch(`${API_URL}/pending-actions?fan_id=${fanId}`)
  if (!res.ok) throw new Error(`Failed to fetch pending actions: ${res.status}`)
  return res.json() as Promise<{ actions: PendingAction[] }>
}

export async function approveAction(actionId: string) {
  const res = await fetch(`${API_URL}/actions/${actionId}/approve`, { method: "POST" })
  if (!res.ok) throw new Error(`Approve failed: ${res.status}`)
  return res.json()
}

export async function rejectAction(actionId: string) {
  const res = await fetch(`${API_URL}/actions/${actionId}/reject`, { method: "POST" })
  if (!res.ok) throw new Error(`Reject failed: ${res.status}`)
  return res.json()
}

export async function fetchTrip(fanId: string) {
  const res = await fetch(`${API_URL}/trip?fan_id=${fanId}`)
  if (!res.ok) throw new Error(`Failed to fetch trip: ${res.status}`)
  return res.json()
}

export interface PendingAction {
  id: string
  action_type: string
  summary: string
  created_at: string
}

export interface MatchItem {
  id: string
  match_number: number
  stage: string
  team_a: string
  team_b: string
  date: string
  kickoff_local: string
  city: string
  stadium: string
  status: string
  atmosphere_score: number
  score_a?: number | null
  score_b?: number | null
  winner?: string | null
}

export interface AtmosphereRanking {
  id: string
  rank: number
  team_a: string
  team_b: string
  stage: string
  city: string
  date: string
  atmosphere_score: number
  status: string
}

export interface CrowdInsight {
  fans_booked: number
  top_neighbourhoods: string[]
  avg_hotel_price: number
  overbooked_zones: string[]
  budget_tip: string
}

export interface HistoryItem {
  id: string
  action_type: string
  summary: string
  status: string
  created_at: string
}

export async function fetchMatches(params?: {
  team?: string
  city?: string
  stage?: string
  limit?: number
}) {
  const qs = new URLSearchParams()
  if (params?.team) qs.set("team", params.team)
  if (params?.city) qs.set("city", params.city)
  if (params?.stage) qs.set("stage", params.stage)
  if (params?.limit) qs.set("limit", String(params.limit))
  const res = await fetch(`${API_URL}/matches?${qs}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch matches: ${res.status}`)
  return res.json() as Promise<{ matches: MatchItem[] }>
}

export async function fetchAtmosphere(limit = 8) {
  const res = await fetch(`${API_URL}/atmosphere?limit=${limit}`)
  if (!res.ok) throw new Error(`Failed to fetch atmosphere: ${res.status}`)
  return res.json() as Promise<{ rankings: AtmosphereRanking[] }>
}

export async function fetchCrowd(city: string) {
  const res = await fetch(`${API_URL}/crowd?city=${encodeURIComponent(city)}`)
  if (!res.ok) throw new Error(`Failed to fetch crowd: ${res.status}`)
  return res.json() as Promise<CrowdInsight>
}

export async function fetchHistory(fanId: string) {
  const res = await fetch(`${API_URL}/history?fan_id=${fanId}`)
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`)
  return res.json() as Promise<{ history: HistoryItem[] }>
}

export async function fetchFantasy(fanId: string) {
  const res = await fetch(`${API_URL}/fantasy/${fanId}`)
  if (!res.ok) throw new Error(`Failed to fetch fantasy: ${res.status}`)
  return res.json()
}

export interface HotelOption {
  name: string
  price_per_night: number
  rating: number
  url: string
}

export interface CitySpot {
  name: string
  category: string
  best_time: string
  tip: string
}

export interface CityDayPlan {
  label: string
  places: string[]
}

export interface CityGuide {
  highlights: CitySpot[]
  day_plan: CityDayPlan[]
  food_picks: string[]
}

export interface MatchSuggestions {
  status: "loading" | "ready" | "error" | "not_found"
  hotels: HotelOption[]
  city_guide: CityGuide | null
}

export interface MatchDetail {
  match: MatchItem
  fan_zones: string[]
  transport_tips: string
  vibe_description: string
  vibe_tags: string[]
}

export async function fetchMatchDetail(match_id: string): Promise<MatchDetail> {
  const res = await fetch(`${API_URL}/match-detail/${match_id}`)
  if (!res.ok) throw new Error(`match-detail failed: ${res.status}`)
  return res.json()
}

export async function postMatchInterest(
  match_id: string,
  fan_id: string | null,
  checkin: string,
  checkout: string,
): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/match-interest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ match_id, fan_id, checkin, checkout }),
  })
  if (!res.ok) throw new Error(`match-interest failed: ${res.status}`)
  return res.json()
}

export async function fetchMatchSuggestions(
  match_id: string,
  fan_id: string | null,
): Promise<MatchSuggestions> {
  const qs = new URLSearchParams({ match_id })
  if (fan_id) qs.set("fan_id", fan_id)
  const res = await fetch(`${API_URL}/match-suggestions?${qs}`)
  if (!res.ok) throw new Error(`match-suggestions failed: ${res.status}`)
  return res.json()
}

export interface PlayerStats {
  PAC?: number; SHO?: number; PAS?: number
  DRI?: number; DEF?: number; PHY?: number
  DIV?: number; HAN?: number; KIC?: number
  REF?: number; SPE?: number; POS?: number
}

export interface LineupPlayer {
  id: string
  name: string
  position: "GK" | "DEF" | "MID" | "FWD"
  shirt_number: number | null
  age: number | null
  nationality: string
  club: string
  form: number
  rating: number
  stats: PlayerStats
  x: number
  y: number
}

export interface TeamLineup {
  team: string
  formation: string
  players: LineupPlayer[]
  bench: LineupPlayer[]
}

export interface MatchLineup {
  match_id: string
  team_a: TeamLineup
  team_b: TeamLineup
}

export async function fetchLineup(match_id: string): Promise<MatchLineup> {
  const res = await fetch(`${API_URL}/lineup/${match_id}`)
  if (!res.ok) throw new Error(`lineup failed: ${res.status}`)
  return res.json()
}

export async function proposeAction(
  fan_id: string,
  action_type: string,
  summary: string,
  payload: Record<string, unknown>,
): Promise<{ action_id: string; status: string }> {
  const res = await fetch(`${API_URL}/propose-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fan_id, action_type, summary, payload }),
  })
  if (!res.ok) throw new Error(`propose-action failed: ${res.status}`)
  return res.json()
}
