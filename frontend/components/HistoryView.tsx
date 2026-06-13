"use client"

import { useEffect, useState } from "react"
import { fetchHistory, HistoryItem } from "../lib/api"

interface HistoryViewProps {
  fanId: string | null
}

export default function HistoryView({ fanId }: HistoryViewProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!fanId) {
      setLoading(false)
      return
    }
    fetchHistory(fanId)
      .then((data) => setHistory(data.history))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fanId])

  return (
    <div className="h-full overflow-y-auto px-5 py-5 space-y-2">
      {loading ? (
        <p className="text-[11px] font-mono text-on-surface/30 text-center py-16 uppercase tracking-widest">
          Loading history&hellip;
        </p>
      ) : !fanId ? (
        <div className="text-center py-24">
          <p className="text-on-surface/30 font-mono text-xs tracking-widest uppercase">
            Chat to create your profile
          </p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-on-surface/30 font-mono text-xs tracking-widest uppercase">
            No completed actions yet
          </p>
        </div>
      ) : (
        history.map((item) => <HistoryRow key={item.id} item={item} />)
      )}
    </div>
  )
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const approved = item.status === "applied" || item.status === "approved"
  return (
    <div className="glass-elevated rounded-xl px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 w-2 h-2 rounded-full shrink-0 ${approved ? "bg-pitch-green shadow-glow-green" : "bg-energy-red"}`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-on-surface/80 font-sans leading-relaxed">{item.summary}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span
              className={`text-[10px] font-mono uppercase tracking-widest ${
                approved ? "text-pitch-green" : "text-energy-red"
              }`}
            >
              {item.status}
            </span>
            <span className="text-[10px] font-mono text-on-surface/30">
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
