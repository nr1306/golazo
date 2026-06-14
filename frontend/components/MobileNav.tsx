"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Suspense } from "react"

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Matches",
    href: "/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    key: "match",
    label: "Hotels",
    hrefParam: "match",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: "lineup",
    label: "Lineup",
    hrefParam: "lineup",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },
]

function MobileNavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const matchId = searchParams.get("id")

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-white/10 flex items-stretch h-16">
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === "dashboard" ? pathname === "/" : pathname === `/${item.key}`
        const href = item.href ?? (matchId ? `/${item.hrefParam}/?id=${matchId}` : null)
        const disabled = !href

        if (disabled) {
          return (
            <div
              key={item.key}
              className="flex-1 flex flex-col items-center justify-center gap-1 text-on-surface/20 select-none"
            >
              {item.icon}
              <span className="text-[9px] font-mono uppercase tracking-widest">{item.label}</span>
            </div>
          )
        }

        return (
          <Link
            key={item.key}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive ? "text-pitch-green" : "text-on-surface/40 hover:text-on-surface/70"
            }`}
          >
            {item.icon}
            <span className="text-[9px] font-mono uppercase tracking-widest">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function MobileNav() {
  return (
    <Suspense fallback={null}>
      <MobileNavInner />
    </Suspense>
  )
}
