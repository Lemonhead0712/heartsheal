"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Send, X, Sparkles } from "lucide-react"
import { useTTS } from "@/hooks/use-speech"
import {
  readHavenFlow,
  advanceHavenFlow,
  clearHavenFlow,
  appendFlowMessage,
  TOOL_HREFS,
  TOOL_LABELS,
  type FlowTool,
  type HavenFlowState,
  type FlowMessage,
} from "@/lib/haven-flow"
import { readStorage, STORAGE_KEYS } from "@/lib/storage"

interface HavenFlowGuideProps {
  currentTool:  FlowTool
  /** Hide the Continue button — used when a page auto-advances on completion */
  showContinue?: boolean
  /** Optional context data from the exercise to inform Haven's responses */
  exerciseData?: string
  /** Called before navigation so the page can clean up */
  onAdvance?: (navigateFn: () => void) => void
}


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

export function HavenFlowGuide({
  currentTool,
  showContinue = true,
  exerciseData,
  onAdvance,
}: HavenFlowGuideProps) {
  const router = useRouter()
  const { speak, stop: stopSpeech } = useTTS()

  // Hydration-safe: always null on server
  const [flow,        setFlow]        = useState<HavenFlowState | null>(null)
  const [mounted,     setMounted]     = useState(false)
  const [havenMsg,    setHavenMsg]    = useState("")
  const [displayText, setDisplayText] = useState("")
  const [input,       setInput]       = useState("")
  const [loading,     setLoading]     = useState(false)
  const [apiMessages, setApiMessages] = useState<FlowMessage[]>([])

  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef      = useRef<HTMLTextAreaElement>(null)

  // Typewriter effect
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

  // Call Haven AI with full session context
  const callHaven = useCallback(async (
    messages: FlowMessage[],
    userContent: string,
    flowState: HavenFlowState,
  ) => {
    setLoading(true)
    const lossCtx  = readStorage<string[]>(STORAGE_KEYS.lossContext) ?? []
    const lossNote = lossCtx.length ? ` Loss context: ${lossCtx.join(", ")}.` : ""
    const dataNote = exerciseData ? ` Exercise data: ${exerciseData}` : ""

    const systemPrompt = `You are Haven, a warm and compassionate healing companion guiding the user through their personal healing session.
The user is currently on: ${TOOL_LABELS[currentTool]}.
Their emotion today: ${flowState.emotion ?? "not shared"} (intensity ${flowState.intensity ?? "?"}/10).${lossNote}${dataNote}
Respond with warmth, emotional intelligence, and continuity. Reference what they have shared in the conversation history. Keep responses to 2–3 sentences. Build on the thread — never start fresh.`

    const nextMessages: FlowMessage[] = [...messages, { role: "user", content: userContent }]

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model:      "claude-haiku-4-5-20251001",
          max_tokens: 200,
          system:     systemPrompt,
          messages:   nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const reply = (data.content?.[0]?.text ?? "I'm here with you.").trim()

      const updatedMessages: FlowMessage[] = [...nextMessages, { role: "assistant", content: reply }]
      setApiMessages(updatedMessages)

      // Persist both messages to the flow's conversation log
      appendFlowMessage("user",      userContent)
      appendFlowMessage("assistant", reply)

      showMessage(reply)
    } catch {
      showMessage("I'm right here with you.")
    } finally {
      setLoading(false)
    }
  }, [currentTool, exerciseData, showMessage])

  // Mount: load flow + fire opening message
  useEffect(() => {
    const f = readHavenFlow()
    setFlow(f)
    setMounted(true)

    if (!f || f.sequence[f.currentIndex] !== currentTool) return

    // Seed API messages from the persisted conversation log
    const priorLog = f.conversationLog ?? []
    setApiMessages(priorLog)

    // Single AI-generated opening — no static intro, no double audio
    callHaven(
      priorLog,
      priorLog.length === 0
        ? `[System: The user just arrived at ${TOOL_LABELS[currentTool]}.${f.emotion ? ` Their emotion: ${f.emotion}, intensity ${f.intensity ?? "?"}/10.` : ""} Give them a brief, warm opening — 1–2 sentences.]`
        : `[System: The user has moved to ${TOOL_LABELS[currentTool]}. Continue the conversation naturally.]`,
      f,
    )

    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current)
      stopSpeech()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!mounted || !flow || flow.sequence[flow.currentIndex] !== currentTool) return null

  const total      = flow.sequence.length
  const stepNumber = flow.currentIndex + 1
  const isLast     = flow.currentIndex === total - 1
  const nextLabel  = isLast ? "Insights" : TOOL_LABELS[flow.sequence[flow.currentIndex + 1]]
  const nextHref   = isLast ? "/insights?flow=done" : TOOL_HREFS[flow.sequence[flow.currentIndex + 1]]

  const doNavigate = () => {
    advanceHavenFlow()
    router.push(nextHref)
  }

  const handleContinue = () => {
    if (onAdvance) onAdvance(doNavigate)
    else doNavigate()
  }

  const handleSkip = () => {
    appendFlowMessage("user", `[User skipped ${TOOL_LABELS[currentTool]}]`)
    const next = advanceHavenFlow()
    router.push(next ? TOOL_HREFS[next] : "/insights?flow=done")
  }

  const handleExit = () => {
    clearHavenFlow()
    router.push("/")
  }

  const handleSend = () => {
    const msg = input.trim()
    if (!msg || loading || !flow) return
    setInput("")
    callHaven(apiMessages, msg, flow)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-0 inset-x-0 z-[60]"
    >
      <div className="bg-background/92 backdrop-blur-xl border-t border-border/40 shadow-2xl shadow-black/10">
        <div className="w-full max-w-2xl mx-auto px-4 py-3 space-y-2.5">

          {/* Row 1 — step progress + exit */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-primary/70 shrink-0" />
              <span className="text-xs font-semibold text-primary tabular-nums shrink-0">
                Step {stepNumber} of {total}
              </span>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground truncate">
                Next: <span className="font-medium text-foreground">{nextLabel}</span>
              </span>
            </div>
            <button
              onClick={handleExit}
              className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0 ml-2"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>

          {/* Row 2 — Haven orb + message */}
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

            {/* Message display */}
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

          {/* Row 3 — chat input */}
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Reply to Haven…"
              rows={1}
              className="flex-1 resize-none rounded-2xl bg-muted/50 border border-border/40 px-4 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/25 leading-relaxed transition-all"
              style={{ minHeight: "38px", maxHeight: "72px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-2xl bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0"
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Row 4 — Skip (always visible) + Continue (when ready) */}
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="flex-1 py-2.5 rounded-2xl bg-muted/70 border border-border/50 text-sm font-semibold text-foreground/70 hover:text-foreground hover:bg-muted active:scale-[0.98] transition-all"
            >
              Skip →
            </button>
            {showContinue && (
              <button
                onClick={handleContinue}
                className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
              >
                Continue <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  )
}
