"use client"

export type NavSection = "matches" | "trip" | "fanzone" | "fantasy" | "history"

const NAV = [
  { id: "matches"   as NavSection, label: "Matches",      code: "01" },
  { id: "trip"      as NavSection, label: "Trip Planner", code: "02" },
  { id: "fanzone"   as NavSection, label: "Fan Zone",     code: "03" },
  { id: "fantasy"   as NavSection, label: "Fantasy",      code: "04" },
  { id: "history"   as NavSection, label: "History",      code: "05" },
]

interface SidebarProps {
  activeSection: NavSection
  onNavigate: (section: NavSection) => void
  fanId: string | null
}

export default function Sidebar({ activeSection, onNavigate, fanId }: SidebarProps) {
  return (
    <aside className="w-56 flex flex-col glass border-r border-white/10 shrink-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 border-b border-white/10">
        <span className="text-lg font-display font-black tracking-widest text-pitch-green neon-text-green uppercase block">
          Golazo
        </span>
        <span className="text-[10px] font-mono text-on-surface/30 tracking-widest uppercase">
          WC2026 Agent
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ id, label, code }) => {
          const active = activeSection === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                active
                  ? "bg-pitch-green/10 border border-pitch-green/20 text-pitch-green"
                  : "text-on-surface/40 hover:text-on-surface/70 hover:bg-white/5 border border-transparent"
              }`}
            >
              <span className={`text-[10px] font-mono shrink-0 ${active ? "text-pitch-green" : "text-on-surface/20"}`}>
                {code}
              </span>
              <span className="text-xs font-display font-semibold uppercase tracking-wide flex-1">
                {label}
              </span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-pitch-green shadow-glow-green shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom: fan profile + VIP */}
      <div className="px-4 pb-5 pt-3 border-t border-white/10 space-y-3">
        {fanId ? (
          <div className="glass rounded-lg px-3 py-2.5">
            <p className="text-[9px] font-mono text-on-surface/30 uppercase tracking-widest mb-0.5">Fan Profile</p>
            <p className="text-[11px] font-mono text-on-surface/60 truncate">ID: {fanId.slice(0, 10)}&hellip;</p>
          </div>
        ) : (
          <div className="glass rounded-lg px-3 py-2.5 text-center">
            <p className="text-[9px] font-mono text-on-surface/20 uppercase tracking-widest leading-relaxed">
              Use chat bubble<br />to create profile
            </p>
          </div>
        )}

        <button className="w-full text-[10px] font-display font-bold uppercase tracking-widest text-trophy-gold border border-trophy-gold/30 hover:border-trophy-gold/60 hover:bg-trophy-gold/5 px-3 py-2 rounded-lg transition-all">
          Upgrade to VIP
        </button>
      </div>
    </aside>
  )
}
