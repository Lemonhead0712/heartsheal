"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Mic, MicOff, Volume2, VolumeX, Sparkles } from "lucide-react"
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

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/50 inline-block"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.16 }}
        />
      ))}
    </span>
  )
}

export function HavenChat({ open, onClose }: HavenChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [havenMsg, setHavenMsg] = useState("")
  const [displayText, setDisplayText] = useState("")

  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef      = useRef<HTMLTextAreaElement>(null)
  const historyRef    = useRef<HTMLDivElement>(null)

  const { speak, stop, isSpeaking, voiceEnabled, toggleVoice } = useTTS()

  // Typewriter effect — mirrors HavenFlowGuide exactly
  const showMessage = useCallback((msg: string) => {
    setHavenMsg(msg)
    setDisplayText("")
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    let i = 0
    typewriterRef.current = setInterval(() => {
      setDisplayText(msg.slice(0, ++i))
      if (i >= msg.length) clearInterval(typewriterRef.current!)
    }, 18)
    speak(msg)
  }, [speak])

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
        showMessage(reply)
      }
    } catch {
      const fallback = "I'm here — something went quiet on my end. Try again in a moment."
      setMessages((prev) => [...prev, { role: "haven", text: fallback }])
      showMessage(fallback)
    } finally {
      setLoading(false)
    }
  }, [loading, messages, showMessage])

  // Greet on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = "Hi, I'm Haven. What's on your mind right now?"
      setMessages([{ role: "haven", text: greeting }])
      setTimeout(() => showMessage(greeting), 300)
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup typewriter on unmount
  useEffect(() => {
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current)
      stop()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll history to bottom when messages change
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [messages])

  // STT
  const onSTTResult = useCallback((transcript: string) => {
    setInput(transcript)
  }, [])
  const onSTTEnd = useCallback((hadResult: boolean) => {
    if (hadResult) {
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

  const hasHistory = messages.length > 1

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="hc-bar"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ opacity: 0, y: 24, transition: { duration: 0.22 } }}
          className="fixed bottom-0 inset-x-0 z-[60]"
        >
          <div className="bg-background/92 backdrop-blur-xl border-t border-border/40 shadow-2xl shadow-black/10">
            <div className="w-full max-w-2xl mx-auto px-4 py-3 space-y-2.5">

              {/* Row 1 — Haven label + voice toggle + close */}
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                <span className="text-xs font-semibold text-primary">Haven</span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-xs text-muted-foreground flex-1">
                  {loading ? "Thinking…" : isSpeaking ? "Speaking…" : "Your companion"}
                </span>
                <button
                  onClick={voiceEnabled ? stop : toggleVoice}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label={voiceEnabled ? "Mute Haven" : "Unmute Haven"}
                >
                  {voiceEnabled
                    ? <Volume2 className="w-3.5 h-3.5" />
                    : <VolumeX className="w-3.5 h-3.5" />
                  }
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Close Haven"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Row 2 — Scrollable conversation history (when > 1 message) */}
              {hasHistory && (
                <div
                  ref={historyRef}
                  className="max-h-28 overflow-y-auto space-y-1.5 px-1"
                >
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted/60 text-foreground rounded-bl-sm"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Row 3 — Pulsing orb + current Haven message (typewriter) */}
              <div className="flex items-start gap-3">
                {/* Pulsing Haven orb */}
                <div className="relative shrink-0 mt-0.5">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ width: 36, height: 36 }}
                  />
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shadow-md shadow-primary/25 relative z-10"
                    style={{ background: "linear-gradient(135deg, var(--orb-from, #9b6fdf), var(--orb-to, #d472b0))" }}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Typewriter message */}
                <div className="flex-1 min-w-0 pt-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={havenMsg}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {loading ? (
                        <LoadingDots />
                      ) : (
                        <p className="text-sm text-foreground/85 font-serif leading-snug">
                          {displayText}
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Row 4 — Quick prompts (before first user message) */}
              {messages.filter((m) => m.role === "user").length === 0 && !loading && (
                <div className="flex flex-wrap gap-1.5 pl-12">
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

              {/* Row 5 — Input row */}
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Reply to Haven…"
                  rows={1}
                  className="flex-1 resize-none rounded-2xl bg-muted/50 border border-border/40 px-4 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 leading-relaxed transition-all"
                  style={{ minHeight: "38px", maxHeight: "72px" }}
                />
                {sttStatus !== "unsupported" && (
                  <button
                    onClick={sttStatus === "listening" ? stopListening : startListening}
                    className={`p-2.5 rounded-2xl border transition-colors shrink-0 ${
                      sttStatus === "listening"
                        ? "bg-rose-100 dark:bg-rose-900/30 border-rose-300/50 text-rose-600"
                        : "bg-muted/50 border-border/40 text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label={sttStatus === "listening" ? "Stop recording" : "Speak to Haven"}
                  >
                    {sttStatus === "listening"
                      ? <MicOff className="w-4 h-4" />
                      : <Mic className="w-4 h-4" />
                    }
                  </button>
                )}
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="p-2.5 rounded-2xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
