"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    href: () => "/",
    matchRequired: false,
  },
  {
    key: "match",
    label: "Hotels & Guide",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    href: (matchId: string) => `/match/?id=${matchId}`,
    matchRequired: true,
  },
  {
    key: "lineup",
    label: "Lineup",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    ),
    href: (matchId: string) => `/lineup/?id=${matchId}`,
    matchRequired: true,
  },
]

export default function NavSidebar({ matchId }: { matchId?: string | null }) {
  const pathname = usePathname()

  const getActive = (key: string) => {
    if (key === "dashboard") return pathname === "/"
    if (key === "match")     return pathname === "/match"
    if (key === "lineup")    return pathname === "/lineup"
    return false
  }

  return (
    <aside className="hidden md:flex w-[200px] shrink-0 flex-col h-screen sticky top-0 glass border-r border-white/10 overflow-hidden">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/8">
        <div className="text-base font-display font-black text-pitch-green uppercase tracking-widest neon-text-green">
          Golazo
        </div>
        <div className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest mt-0.5">
          WC2026 Fan Agent
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive  = getActive(item.key)
          const available = !item.matchRequired || !!matchId

          if (available) {
            const href = item.matchRequired
              ? (item.href as (id: string) => string)(matchId!)
              : "/"
            return (
              <Link
                key={item.key}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? "bg-pitch-green/15 text-pitch-green border border-pitch-green/20 shadow-glow-green/20"
                    : "text-on-surface/45 hover:text-on-surface/80 hover:bg-white/6"
                }`}
              >
                <span className={isActive ? "text-pitch-green" : "text-on-surface/30"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          }

          // Disabled (no matchId yet)
          return (
            <div
              key={item.key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-widest text-on-surface/18 cursor-not-allowed select-none"
            >
              <span className="text-on-surface/15">{item.icon}</span>
              {item.label}
            </div>
          )
        })}
      </nav>

      {/* Bottom: live indicator */}
      <div className="px-5 pb-5 pt-3 border-t border-white/8">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-pitch-green animate-pulse shadow-glow-green" />
          <span className="text-[9px] font-mono text-on-surface/25 uppercase tracking-widest">Live</span>
        </div>
        <div className="text-[9px] font-mono text-on-surface/15 mt-1 leading-relaxed">
          WC2026 · Jun–Jul 2026
        </div>
      </div>
    </aside>
  )
}
