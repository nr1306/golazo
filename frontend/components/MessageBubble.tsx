import ReactMarkdown from "react-markdown"
import MatchCard from "./MatchCard"
import TripCard from "./TripCard"
import CrowdCard from "./CrowdCard"

export interface CardPayload {
  card_type: "match" | "matches" | "trip" | "crowd"
  data: unknown
}

export interface Message {
  role: "user" | "agent"
  content: string
  cards?: CardPayload[]
}

function toMatchCardProps(m: any) {
  return {
    matchNumber: m.match_number,
    stage: m.stage,
    teamA: m.team_a,
    teamB: m.team_b,
    date: (m.date || "").split("T")[0] || m.date || "",
    kickoffLocal: m.kickoff_local || "TBD",
    city: m.city,
    stadium: m.stadium,
    atmosphereScore: m.atmosphere?.score ?? m.atmosphere_score ?? 70,
    country: m.country || "",
    status: m.status,
    scoreA: m.score_a ?? null,
    scoreB: m.score_b ?? null,
    winner: m.winner ?? null,
  }
}

function AgentMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="text-sm text-on-surface/85 leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-on-surface">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-on-surface/70">{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="my-2 space-y-1 pl-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 space-y-1 pl-1 list-decimal list-inside">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm text-on-surface/85 leading-relaxed">
            <span className="text-pitch-green mt-1 shrink-0 text-xs">•</span>
            <span>{children}</span>
          </li>
        ),
        h1: ({ children }) => (
          <h1 className="text-base font-display font-bold text-on-surface mb-2 mt-3 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-sm font-display font-bold text-on-surface mb-1.5 mt-3 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xs font-display font-bold text-pitch-green uppercase tracking-widest mb-1.5 mt-3 first:mt-0">{children}</h3>
        ),
        code: ({ children }) => (
          <code className="text-xs font-mono bg-black/30 text-pitch-green px-1.5 py-0.5 rounded">{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-pitch-green/40 pl-3 my-2 text-on-surface/60 italic text-sm">{children}</blockquote>
        ),
        hr: () => <hr className="border-white/10 my-3" />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div className={`flex flex-col gap-2 w-full ${isUser ? "items-end" : "items-start"}`}>
      {message.content && (
        <div
          className={`max-w-[82%] min-w-0 px-4 py-3 break-words [overflow-wrap:anywhere] ${
            isUser
              ? "bg-pitch-green text-stadium-navy font-medium text-sm leading-relaxed rounded-2xl rounded-br-none shadow-glow-green"
              : "glass-elevated rounded-2xl rounded-bl-none"
          }`}
        >
          {isUser ? (
            message.content
          ) : (
            <AgentMarkdown content={message.content} />
          )}
        </div>
      )}

      {message.cards?.map((card, i) => (
        <div key={i} className="w-full max-w-[480px] flex flex-col gap-2">
          {card.card_type === "match" && (() => {
            const d = card.data as any
            const m = d.match || d
            return <MatchCard {...toMatchCardProps(m)} atmosphereScore={d.atmosphere_score ?? m.atmosphere?.score ?? 70} />
          })()}
          {card.card_type === "matches" && (card.data as any).matches?.slice(0, 5).map((m: any, j: number) => (
            <MatchCard key={j} {...toMatchCardProps(m)} />
          ))}
          {card.card_type === "trip"  && <TripCard  {...(card.data as any)} />}
          {card.card_type === "crowd" && <CrowdCard {...(card.data as any)} />}
        </div>
      ))}
    </div>
  )
}
