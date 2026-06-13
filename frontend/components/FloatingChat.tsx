"use client"

import { useEffect, useState } from "react"
import ChatInterface from "./ChatInterface"

interface FloatingChatProps {
  fanId: string | null
  onFanIdChange: (id: string) => void
  prefillMessage?: string
  autoOpen?: boolean
}

export default function FloatingChat({ fanId, onFanIdChange, prefillMessage, autoOpen }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [lastSeenCount, setLastSeenCount] = useState(0)

  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true)
      setLastSeenCount(messageCount)
    }
  }, [autoOpen])  // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = messageCount - lastSeenCount

  function handleOpen() {
    setIsOpen(true)
    setLastSeenCount(messageCount)
  }

  function handleClose() {
    setIsOpen(false)
    setLastSeenCount(messageCount)
  }

  return (
    <>
      {/* Slide-in drawer — always mounted to preserve chat history */}
      <div
        className={`fixed right-0 top-0 h-full w-[420px] z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="glass border-l border-white/10 h-full flex flex-col shadow-glass">
          <div className="flex items-center px-4 py-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pitch-green shadow-glow-green animate-pulse" />
              <span className="text-[10px] font-display font-bold text-on-surface/50 uppercase tracking-widest">
                Golazo Agent
              </span>
            </div>
            <button
              onClick={handleClose}
              className="ml-auto text-on-surface/30 hover:text-on-surface/60 font-mono text-xl leading-none transition-colors"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              fanId={fanId}
              onFanIdChange={onFanIdChange}
              onMessageCountChange={setMessageCount}
              prefillMessage={prefillMessage}
            />
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      {/* Floating bubble — hidden while drawer is open */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-pitch-green shadow-glow-green flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95 ${isOpen ? "hidden" : ""}`}
        aria-label="Open chat"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-stadium-navy"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-energy-red text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  )
}
