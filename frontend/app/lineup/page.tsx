import { Suspense } from "react"
import LineupPageContent from "../../components/LineupPageContent"

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-on-surface/20 font-mono text-xs uppercase tracking-widest animate-pulse">
        Loading lineup…
      </div>
    </div>
  )
}

export default function LineupPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LineupPageContent />
    </Suspense>
  )
}
