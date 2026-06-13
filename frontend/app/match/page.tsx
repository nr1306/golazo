import { Suspense } from "react"
import MatchPageContent from "../../components/MatchPageContent"

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-[11px] font-mono text-on-surface/25 uppercase tracking-widest animate-pulse">
        Loading match&hellip;
      </p>
    </div>
  )
}

export default function MatchPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <MatchPageContent />
    </Suspense>
  )
}
