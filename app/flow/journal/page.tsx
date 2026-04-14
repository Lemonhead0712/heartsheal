"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { BookHeart, CheckCircle2, Save } from "lucide-react"
import { HavenMark } from "@/components/logo-mark"
import { HavenFlowNav } from "@/components/haven-flow-nav"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { readHavenFlow, advanceHavenFlow, TOOL_HREFS } from "@/lib/haven-flow"

// Emotion-keyed journal prompts for Haven's guided flow
const FLOW_PROMPTS: Record<string, string> = {
  sad:        "What are you carrying right now that feels heaviest? Let it out here, in your own words.",
  sadness:    "What are you carrying right now that feels heaviest? Let it out here, in your own words.",
  grief:      "Tell me about what you've lost — not the facts of it, but the feeling of it.",
  heartbreak: "What did this cost you that you haven't been able to say out loud yet?",
  anxious:    "What is your mind circling back to right now? Write it down — outside of you — where you can see it.",
  anxiety:    "What is your mind circling back to right now? Write it down — outside of you — where you can see it.",
  angry:      "What happened, and what did it cost you? Write without filtering anything.",
  anger:      "What happened, and what did it cost you? Write without filtering anything.",
  numb:       "If you could feel something right now, what would you most want to feel? And why has that felt out of reach?",
  hopeful:    "What is the small thread of hope you're holding onto right now? Describe it as vividly as you can.",
  grateful:   "What are three things — however small — that feel like a gift today, and why?",
  calm:       "What does your body feel like right now? Start there, and let the words go wherever they need to.",
}

const DEFAULT_PROMPT = "What feeling is taking up the most space in you right now? Describe where you feel it in your body."

function getPrompt(emotion?: string): string {
  if (!emotion) return DEFAULT_PROMPT
  const key = emotion.toLowerCase()
  return FLOW_PROMPTS[key] ?? DEFAULT_PROMPT
}

type Phase = "write" | "saved"

export default function FlowJournalPage() {
  const router = useRouter()

  // Flow gate
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    const flow = readHavenFlow()
    if (!flow || flow.sequence[flow.currentIndex] !== "journal") {
      router.replace("/")
    }
  }, [router])

  const [ctx, setCtx]     = useState<{ emotion?: string; name?: string }>({})
  const [entry, setEntry] = useState("")
  const [phase, setPhase] = useState<Phase>("write")

  useEffect(() => {
    const name = readStorage<string>(STORAGE_KEYS.userName) ?? undefined
    const logs = readStorage<any[]>(STORAGE_KEYS.emotionLogs) ?? []
    setCtx({ name, emotion: logs[0]?.emotion })
  }, [])

  const prompt = getPrompt(ctx.emotion)

  const saveEntry = () => {
    if (!entry.trim()) return

    // Save to journal entries storage
    const entries = readStorage<any[]>(STORAGE_KEYS.journalEntries) ?? []
    writeStorage(STORAGE_KEYS.journalEntries, [
      { id: Date.now().toString(), prompt, entry: entry.trim(), date: new Date().toISOString() },
      ...entries,
    ])

    setPhase("saved")

    // Advance flow
    setTimeout(() => {
      const nextTool = advanceHavenFlow()
      router.push(nextTool ? TOOL_HREFS[nextTool] : "/insights?flow=done")
    }, 1600)
  }

  if (!mounted) return null

  const greeting = ctx.name
    ? `${ctx.name}, take your time.`
    : "Take your time."

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">

      {/* Header */}
      <div className="w-full max-w-lg mx-auto px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HavenMark className="w-5 h-5" />
          <span className="font-serif font-semibold text-foreground tracking-tight text-sm">Haven</span>
          {ctx.emotion && (
            <span className="text-xs text-muted-foreground/70">· {ctx.emotion.toLowerCase()}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs">
          <BookHeart className="w-3.5 h-3.5" />
          <span className="font-serif">Journal</span>
        </div>
      </div>

      {/* Main */}
      <div className="w-full max-w-lg mx-auto px-5 flex flex-col flex-1 pt-4">
        <AnimatePresence mode="wait">

          {/* Write phase */}
          {phase === "write" && (
            <motion.div
              key="write"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col flex-1"
            >
              {/* Haven prompt */}
              <div className="bg-primary/6 border border-primary/15 rounded-2xl p-5 mb-5">
                <p className="text-[10px] font-semibold text-primary/60 uppercase tracking-widest mb-2">
                  Haven&apos;s prompt for you
                </p>
                <p className="font-serif text-sm text-foreground italic leading-relaxed">
                  &ldquo;{prompt}&rdquo;
                </p>
              </div>

              <p className="text-xs text-muted-foreground/60 mb-3">{greeting} Write whatever comes — there are no rules here.</p>

              <textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="Start writing…"
                autoFocus
                className="flex-1 min-h-[220px] w-full bg-card/60 border border-border/40 rounded-2xl p-5 text-sm text-foreground placeholder:text-muted-foreground/40 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />

              <div className="flex items-center justify-between mt-3 mb-5">
                <span className="text-xs text-muted-foreground/50">{entry.length} characters</span>
                {entry.trim().length > 10 && (
                  <span className="text-xs text-muted-foreground/50">Take all the time you need</span>
                )}
              </div>

              <button
                onClick={saveEntry}
                disabled={!entry.trim()}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save & Continue
              </button>
            </motion.div>
          )}

          {/* Saved phase */}
          {phase === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col flex-1 items-center justify-center text-center gap-5"
            >
              <motion.div
                initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
                className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center"
              >
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </motion.div>
              <div>
                <p className="font-serif text-xl font-semibold text-foreground mb-1">Saved.</p>
                <p className="text-sm text-muted-foreground">Haven is continuing your session…</p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <HavenFlowNav currentTool="journal" showContinue={false} />
    </div>
  )
}
