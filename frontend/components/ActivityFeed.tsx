"use client"

import { useEffect, useState } from "react"
import { fetchPendingActions, PendingAction } from "../lib/api"
import ApprovalCard from "./ApprovalCard"

interface ActivityFeedProps {
  fanId: string
  onTripUpdated?: () => void
}

export default function ActivityFeed({ fanId, onTripUpdated }: ActivityFeedProps) {
  const [open, setOpen] = useState(false)
  const [actions, setActions] = useState<PendingAction[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!fanId) return
    const poll = async () => {
      try {
        const { actions: fetched } = await fetchPendingActions(fanId)
        setActions(fetched)
      } catch {
        // silently ignore poll errors
      }
    }
    poll()
    const id = setInterval(poll, 10_000)
    return () => clearInterval(id)
  }, [fanId])

  const visible = actions.filter((a) => !dismissed.has(a.id))
  const badge = visible.length

  function handleApprove(id: string) {
    setDismissed((prev) => new Set(Array.from(prev).concat(id)))
    onTripUpdated?.()
  }

  function handleReject(id: string) {
    setDismissed((prev) => new Set(Array.from(prev).concat(id)))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-2 text-[10px] font-mono text-on-surface/50 hover:text-on-surface glass px-3 py-1.5 rounded-full transition-colors uppercase tracking-widest"
      >
        {badge > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-energy-red animate-pulse" />
        )}
        <span>Activity</span>
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-energy-red text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 max-h-[480px] overflow-y-auto glass-elevated rounded-xl shadow-glass z-10 flex flex-col gap-2 p-3">
          {visible.length === 0 ? (
            <p className="text-[10px] font-mono text-on-surface/30 text-center py-6 uppercase tracking-widest">
              No pending actions
            </p>
          ) : (
            visible.map((action) => (
              <div key={action.id}>
                <ApprovalCard
                  actionId={action.id}
                  summary={action.summary}
                  createdAt={action.created_at}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
