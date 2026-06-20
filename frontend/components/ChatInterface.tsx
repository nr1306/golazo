"use client"

import { useEffect, useRef, useState } from "react"
import { streamChat, SSEEvent } from "../lib/api"
import { getSessionId, setFanId } from "../lib/session"
import MessageBubble, { Message, CardPayload } from "./MessageBubble"
import TypingIndicator from "./TypingIndicator"

interface ChatInterfaceProps {
  fanId: string | null
  onFanIdChange: (id: string) => void
  onMessageCountChange?: (count: number) => void
  prefillMessage?: string
}

export default function ChatInterface({ fanId, onFanIdChange, onMessageCountChange, prefillMessage }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isToolRunning, setIsToolRunning] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    onMessageCountChange?.(messages.length)
  }, [messages.length, onMessageCountChange])

  useEffect(() => {
    if (prefillMessage) setInput(prefillMessage)
  }, [prefillMessage])

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  function appendAgentToken(content: string) {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === "agent") {
        return [...prev.slice(0, -1), { ...last, content: last.content + content }]
      }
      return [...prev, { role: "agent", content, cards: [] }]
    })
    scrollToBottom()
  }

  function appendCard(card: CardPayload) {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === "agent") {
        return [...prev.slice(0, -1), { ...last, cards: [...(last.cards ?? []), card] }]
      }
      return [...prev, { role: "agent", content: "", cards: [card] }]
    })
  }

  function dispatch(event: SSEEvent) {
    switch (event.type) {
      case "token":
        setIsToolRunning(false)
        appendAgentToken(event.content)
        break
      case "tool_call":
        setIsToolRunning(true)
        break
      case "tool_result":
        setIsToolRunning(false)
        break
      case "card":
        appendCard({ card_type: event.card_type, data: event.data })
        break
      case "done":
        if (event.fan_id) {
          setFanId(event.fan_id)
          onFanIdChange(event.fan_id)
        }
        setIsStreaming(false)
        setIsToolRunning(false)
        break
      case "error":
        appendAgentToken(`\n${event.message}`)
        setIsStreaming(false)
        setIsToolRunning(false)
        break
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setIsStreaming(true)
    setIsToolRunning(false)
    scrollToBottom()

    abortRef.current = new AbortController()

    try {
      await streamChat(
        { session_id: getSessionId(), fan_id: fanId, message: text },
        dispatch,
        abortRef.current.signal,
      )
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        appendAgentToken("Connection error. Please try again.")
      }
      setIsStreaming(false)
      setIsToolRunning(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Command center header */}
      <div className="flex items-center px-5 py-4 glass border-b border-white/10 shrink-0">
        <div>
          <p className="text-xs font-display font-bold text-on-surface/60 uppercase tracking-widest">
            Golazo Matchday Agent
          </p>
          <p className="text-[10px] font-mono text-on-surface/25 uppercase tracking-widest">
            Powered by Gemini 2.0 Flash + MongoDB Atlas
          </p>
        </div>
        {isStreaming && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-pitch-green animate-ping" />
            <span className="text-[10px] font-mono text-pitch-green uppercase tracking-widest">Streaming</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 space-y-4 min-w-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center pb-16">
            <div className="w-12 h-12 rounded-full bg-pitch-green/10 border border-pitch-green/20 flex items-center justify-center">
              <span className="text-xl font-display font-black text-pitch-green">G</span>
            </div>
            <div className="space-y-1">
              <p className="text-on-surface/60 font-display font-bold text-sm">
                Your World Cup command center
              </p>
              <p className="text-on-surface/25 font-mono text-[10px] tracking-widest uppercase">
                Ask about matches &middot; plan a trip &middot; follow your team
              </p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {isToolRunning && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 glass border-t border-white/10 shrink-0">
        <div className="flex items-end gap-3 bg-surface-dim rounded-full px-5 py-2.5 border border-white/10 focus-within:border-pitch-green/40 transition-colors duration-200">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Command the agent&hellip;"
            className="flex-1 bg-transparent resize-none text-sm text-on-surface placeholder-on-surface/30 outline-none max-h-32 font-sans leading-relaxed"
          />
          <button
            onClick={send}
            disabled={!input.trim() || isStreaming}
            className="bg-pitch-green hover:bg-pitch-bright disabled:opacity-25 text-stadium-navy text-xs font-display font-bold px-4 py-1.5 rounded-full transition-all shadow-glow-green shrink-0 uppercase tracking-wide"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
