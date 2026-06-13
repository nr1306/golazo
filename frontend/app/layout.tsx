import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Golazo — World Cup 2026 Fan Agent",
  description: "104 matches. 16 cities. 3 countries. One agent to navigate it all.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-on-surface font-sans antialiased">
        {/* Stadium backdrop: darkening overlay + radial spotlight */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 25%, rgba(48,209,88,0.04) 0%, transparent 55%), " +
              "linear-gradient(to bottom, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.92) 100%)",
          }}
        />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  )
}
