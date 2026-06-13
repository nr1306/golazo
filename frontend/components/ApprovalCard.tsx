"use client"

import { useState } from "react"
import { approveAction, rejectAction } from "../lib/api"

interface ApprovalCardProps {
  actionId: string
  summary: string
  createdAt: string
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export default function ApprovalCard({
  actionId, summary, createdAt, onApprove, onReject,
}: ApprovalCardProps) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)

  async function handleApprove() {
    setLoading("approve")
    try {
      await approveAction(actionId)
      onApprove(actionId)
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    setLoading("reject")
    try {
      await rejectAction(actionId)
      onReject(actionId)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="glass-elevated rounded-xl p-4 accent-border-gold">
      <p className="text-[10px] font-mono text-on-surface/30 mb-2 uppercase tracking-widest">
        {new Date(createdAt).toLocaleString()}
      </p>
      <p className="text-sm text-on-surface/90 font-sans leading-relaxed mb-4">{summary}</p>
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading !== null}
          className="flex-1 bg-pitch-green hover:bg-pitch-bright disabled:opacity-30 text-stadium-navy text-xs font-display font-bold py-2 rounded-lg transition-all shadow-glow-green uppercase tracking-wide"
        >
          {loading === "approve" ? "Applying…" : "Approve"}
        </button>
        <button
          onClick={handleReject}
          disabled={loading !== null}
          className="flex-1 bg-energy-red/20 hover:bg-energy-red/30 border border-energy-red/40 disabled:opacity-30 text-energy-red text-xs font-display font-bold py-2 rounded-lg transition-all uppercase tracking-wide"
        >
          {loading === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </div>
  )
}
