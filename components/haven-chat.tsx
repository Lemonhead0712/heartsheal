"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react"
import { useTTS, useSTT } from "@/hooks/use-speech"

interface HavenChatProps {
  open: boolean
  onClose: () => void
}

type Message = { role: "haven" | "user"; text: string }

const HAVEN_SYSTEM = `You are Haven — a warm and compassionate AI healing companion. You offer gentle guidance, emotional support, and help users navigate features like emotion check-ins, breathing exercises, journaling prompts, and insights.

Keep responses brief (2-4 sentences), warm, and grounding. Speak in first person as Haven. Never give medical advice. If someone is in crisis, gently direct them to professional support.`

const QUICK_PROMPTS = [
  "How am I doing?",
  "Help me breathe",
  "I need a journal prompt",
  "What should I try next?",
]

export function HavenChat({ open, onClose }: HavenChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState("")
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLTextAreaElement>(null)

  const { speak, stop, isSpeaking, voiceEnabled, toggleVoice } = useTTS()

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setInput("")
    const userMsg: Message = { role: "user", text: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const history = [...messages, userMsg]
      const apiMessages = history.map((m) => ({
        role: m.role === "haven" ? "assistant" : "user",
        content: m.text,
      }))

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 256,
          system: HAVEN_SYSTEM,
          messages: apiMessages,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const reply = data.content?.[0]?.text ?? "I'm here with you."
        setMessages((prev) => [...prev, { role: "haven", text: reply }])
        speak(reply)
      }
    } catch {
      setMessages((prev) => [...prev, { role: "haven", text: "I'm here — something went quiet on my end. Try again in a moment." }])
    } finally {
      setLoading(false)
    }
  }, [loading, messages, speak])

  // Greet on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = "Hi, I'm Haven. What's on your mind right now?"
      setMessages([{ role: "haven", text: greeting }])
      setTimeout(() => speak(greeting), 300)
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // STT
  const onSTTResult = useCallback((transcript: string) => {
    setInput(transcript)
  }, [])
  const onSTTEnd = useCallback((hadResult: boolean) => {
    if (hadResult) {
      // auto-send after voice input (brief delay so user sees transcript)
      setTimeout(() => {
        setInput((current) => {
          if (current.trim()) sendMessage(current)
          return ""
        })
      }, 400)
    }
  }, [sendMessage])

  const { status: sttStatus, startListening, stopListening } = useSTT(onSTTResult, onSTTEnd)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — tap to close */}
          <motion.div
            key="hc-backdrop"
            className="fixed inset-0 z-[58] bg-transparent"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            key="hc-panel"
            className="fixed bottom-[100px] md:bottom-[76px] right-4 md:right-6 z-[59]
                       w-[min(340px,calc(100vw-2rem))]
                       bg-card border border-border/50 rounded-2xl shadow-2xl
                       flex flex-col overflow-hidden pointer-events-auto"
            style={{ maxHeight: "min(420px, calc(100dvh - 180px))" }}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 340, damping: 26 } }}
            exit={{ opacity: 0, y: 12, scale: 0.94, transition: { duration: 0.18 } }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 shrink-0">
              {/* Orb indicator */}
              <div className="relative shrink-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-400 to-primary flex items-center justify-center">
                  <span className="text-[10px]">✦</span>
                </div>
                <span className="absolute inset-0 rounded-full bg-primary/25 animate-ping"
                      style={{ animationDuration: "2.8s" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-none">Haven</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {loading ? "Thinking…" : isSpeaking ? "Speaking…" : "Your companion"}
                </p>
              </div>
              {/* Voice toggle */}
              <button
                onClick={voiceEnabled ? stop : toggleVoice}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label={voiceEnabled ? "Mute Haven" : "Unmute Haven"}
              >
                {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Close Haven chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted/60 text-foreground rounded-bl-sm"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted/60 rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
                        animate={{ opacity: [0.4, 1, 0.4], y: [0, -3, 0] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Quick prompts — only before first user message */}
            {messages.filter((m) => m.role === "user").length === 0 && !loading && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-full
                               bg-primary/8 text-primary border border-primary/20
                               hover:bg-primary/15 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 shrink-0 border-t border-border/30 pt-2.5">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Haven anything…"
                  rows={1}
                  className="flex-1 resize-none bg-muted/40 border border-border/40 rounded-xl
                             px-3 py-2 text-xs placeholder:text-muted-foreground/60
                             focus:outline-none focus:ring-1 focus:ring-primary/40
                             leading-relaxed max-h-20 overflow-y-auto"
                  style={{ minHeight: "36px" }}
                />
                {/* Mic button */}
                {sttStatus !== "unsupported" && (
                  <button
                    onClick={sttStatus === "listening" ? stopListening : startListening}
                    className={`p-2 rounded-xl border transition-colors shrink-0 ${
                      sttStatus === "listening"
                        ? "bg-rose-100 dark:bg-rose-900/30 border-rose-300/50 text-rose-600"
                        : "bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label={sttStatus === "listening" ? "Stop recording" : "Speak to Haven"}
                  >
                    {sttStatus === "listening"
                      ? <MicOff className="w-3.5 h-3.5" />
                      : <Mic className="w-3.5 h-3.5" />
                    }
                  </button>
                )}
                {/* Send button */}
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-xl bg-primary text-primary-foreground
                             disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
