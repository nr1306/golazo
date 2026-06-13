export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="text-[10px] font-mono text-on-surface/30 uppercase tracking-widest mr-1">Agent thinking</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-1.5 h-1.5 rounded-full bg-pitch-green animate-bounce shadow-glow-green"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
