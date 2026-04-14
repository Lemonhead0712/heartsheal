"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Wind } from "lucide-react"
import { HavenMark } from "@/components/logo-mark"
import { HavenFlowNav } from "@/components/haven-flow-nav"
import { useTTS } from "@/hooks/use-speech"
import { useAmbientSound } from "@/hooks/use-ambient-sound"
import { readStorage, STORAGE_KEYS } from "@/lib/storage"
import { readHavenFlow, advanceHavenFlow, TOOL_HREFS } from "@/lib/haven-flow"

// ── Types ──────────────────────────────────────────────────────────────────
type Phase = "idle" | "intro" | "inhale" | "hold1" | "exhale" | "hold2" | "rest" | "complete"

interface BreathePattern {
  name: string
  inhale: number
  hold1: number
  exhale: number
  hold2: number
  intro: string
}

// ── Patterns ───────────────────────────────────────────────────────────────
const PATTERNS: Record<string, BreathePattern> = {
  box: {
    name: "Box Breathing",
    inhale: 4, hold1: 4, exhale: 4, hold2: 4,
    intro: "We'll breathe in four equal sides — four in, four hold, four out, four hold. Equal, steady, grounding. Let's begin.",
  },
  "4-7-8": {
    name: "4-7-8 Breathing",
    inhale: 4, hold1: 7, exhale: 8, hold2: 0,
    intro: "Breathe in for four, hold for seven, release slowly for eight. The long exhale is where the calm lives. Let's begin.",
  },
  relaxing: {
    name: "Relaxing Breath",
    inhale: 4, hold1: 0, exhale: 6, hold2: 0,
    intro: "Breathe in for four, out for six. A longer exhale tells your body it is safe. Let's begin.",
  },
}

const PHASE_CUES: Partial<Record<Phase, string>> = {
  inhale: "Breathe in",
  hold1:  "Hold",
  exhale: "Breathe out",
  hold2:  "Hold",
  rest:   "Rest",
}

const POST_EMOTIONS = [
  { emoji: "😌", label: "Calmer" },
  { emoji: "🕊️", label: "Lighter" },
  { emoji: "😮‍💨", label: "Relieved" },
  { emoji: "😰", label: "Still anxious" },
  { emoji: "💭", label: "More clear" },
]

const TARGET_CYCLES = 4

function pickPattern(emotion?: string): BreathePattern {
  const em = (emotion ?? "").toLowerCase()
  if (em.includes("anxi") || em.includes("panic") || em.includes("stress") || em.includes("worry"))
    return PATTERNS["4-7-8"]
  if (em.includes("calm") || em.includes("hopeful") || em.includes("grateful") || em.includes("okay"))
    return PATTERNS.relaxing
  return PATTERNS.box
}

function buildPhaseSeq(p: BreathePattern) {
  const seq: { phase: Exclude<Phase, "idle" | "intro" | "rest" | "complete">; dur: number }[] = []
  seq.push({ phase: "inhale", dur: p.inhale })
  if (p.hold1 > 0) seq.push({ phase: "hold1", dur: p.hold1 })
  seq.push({ phase: "exhale", dur: p.exhale })
  if (p.hold2 > 0) seq.push({ phase: "hold2", dur: p.hold2 })
  return seq
}

// ── Component ──────────────────────────────────────────────────────────────
export default function FlowBreathePage() {
  const router = useRouter()

  // Flow gate — redirect if not active or wrong step
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    const flow = readHavenFlow()
    if (!flow || flow.sequence[flow.currentIndex] !== "breathe") {
      router.replace("/")
    }
  }, [router])

  // Session context (emotion, name)
  const [ctx, setCtx] = useState<{ name?: string; emotion?: string; intensity?: number }>({})
  useEffect(() => {
    const name     = readStorage<string>(STORAGE_KEYS.userName) ?? undefined
    const logs     = readStorage<any[]>(STORAGE_KEYS.emotionLogs) ?? []
    const last     = logs[0]
    setCtx({ name, emotion: last?.emotion, intensity: last?.intensity })
  }, [])

  // Derived pattern
  const [pattern, setPattern] = useState<BreathePattern>(PATTERNS.box)
  useEffect(() => {
    setPattern(pickPattern(ctx.emotion))
  }, [ctx.emotion])

  // Session state
  const [phase, setPhase]             = useState<Phase>("idle")
  const [countdown, setCountdown]     = useState(0)
  const [cycles, setCycles]           = useState(0)
  const [postEmotion, setPostEmotion] = useState<string | null>(null)

  // Refs for stale-closure–free timer logic
  const phaseSeqRef   = useRef(buildPhaseSeq(PATTERNS.box))
  const idxRef        = useRef(0)
  const countRef      = useRef(0)
  const cyclesRef     = useRef(0)
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef      = useRef(false)
  const voiceRef      = useRef(true)
  const patternRef    = useRef(pattern)

  useEffect(() => { phaseSeqRef.current = buildPhaseSeq(pattern); patternRef.current = pattern }, [pattern])

  // TTS + ambient
  const { speak, stop: stopSpeech } = useTTS()
  const { playSound, setAmbientVolume } = useAmbientSound()
  const speakRef = useRef(speak)
  useEffect(() => { speakRef.current = speak }, [speak])

  // Completion — advance Haven flow
  const completeRef = useRef<() => Promise<void>>(async () => {})
  const completeSession = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current = true
    stopSpeech()
    setPhase("complete")
    setCountdown(0)

    if (voiceRef.current) {
      const closings = [
        "You've done beautifully. Take a moment to feel the stillness you've created.",
        `${ctx.name ? ctx.name + ", you" : "You"} showed up for yourself today. That matters more than you know.`,
        "Four cycles, complete. Your nervous system has shifted. Carry this calm forward.",
        "Well done. The breath you just took is yours to keep.",
      ]
      await speakRef.current(closings[cycles % closings.length], { rate: 0.78, pitch: 0.88 })
    }

    // Auto-advance flow after a pause
    setTimeout(() => {
      const nextTool = advanceHavenFlow()
      router.push(nextTool ? TOOL_HREFS[nextTool] : "/insights?flow=done")
    }, 3200)
  }, [stopSpeech, ctx.name, cycles, router])

  useEffect(() => { completeRef.current = completeSession }, [completeSession])

  // Timer tick
  const tick = () => {
    if (abortRef.current) return
    countRef.current -= 1

    if (countRef.current <= 0) {
      idxRef.current = (idxRef.current + 1) % phaseSeqRef.current.length

      if (idxRef.current === 0) {
        // Cycle boundary
        cyclesRef.current += 1
        setCycles(cyclesRef.current)

        if (cyclesRef.current >= TARGET_CYCLES) {
          void completeRef.current()
          return
        }

        // Rest before next cycle
        setPhase("rest")
        countRef.current = 3
        setCountdown(3)
        timerRef.current = setTimeout(tick, 1000)
        return
      }

      const next = phaseSeqRef.current[idxRef.current]
      setPhase(next.phase)
      countRef.current = next.dur
      setCountdown(next.dur)
      const cue = PHASE_CUES[next.phase]
      if (voiceRef.current && cue) void speakRef.current(cue, { rate: 0.78, pitch: 0.88 })
    } else {
      setCountdown(countRef.current)
    }

    timerRef.current = setTimeout(tick, 1000)
  }

  // Start session
  const start = useCallback(async () => {
    abortRef.current  = false
    cyclesRef.current = 0
    idxRef.current    = 0
    setCycles(0)
    setPostEmotion(null)
    setPhase("intro")

    // Start Haven ambient pad
    playSound("meditation")
    setAmbientVolume(0.2)

    if (voiceRef.current) {
      const p = patternRef.current
      const emotionLine = ctx.emotion
        ? `${ctx.name ? ctx.name + ". " : ""}I know you've been feeling ${ctx.emotion.toLowerCase()} today. ${p.intro}`
        : (ctx.name ? `${ctx.name}. ` : "") + p.intro
      await speakRef.current(emotionLine, { rate: 0.78, pitch: 0.88 })
    }

    // Begin visual cycle
    const seq   = phaseSeqRef.current
    idxRef.current   = 0
    const first = seq[0]
    countRef.current = first.dur
    setPhase(first.phase)
    setCountdown(first.dur)
    const cue = PHASE_CUES[first.phase]
    if (voiceRef.current && cue) void speakRef.current(cue, { rate: 0.78, pitch: 0.88 })
    timerRef.current = setTimeout(tick, 1000)
  }, [ctx, playSound, setAmbientVolume]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start after context + pattern are ready
  useEffect(() => {
    if (!mounted) return
    const t = setTimeout(() => { start() }, 600)
    return () => clearTimeout(t)
  }, [mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!mounted) return null

  const isComplete = phase === "complete"
  const isRunning  = ["inhale", "hold1", "exhale", "hold2", "rest"].includes(phase)
  const isIdle     = phase === "idle" || phase === "intro"

  // Circle scale / color per phase
  const circleScale =
    phase === "inhale" ? 1.55 :
    phase === "hold1"  ? 1.55 :
    phase === "exhale" ? 0.72 :
    phase === "hold2"  ? 0.72 :
    phase === "rest"   ? 1.0  : 1.0

  const phaseColor =
    phase === "inhale" ? "from-sky-400/70 to-primary/80" :
    phase === "hold1"  ? "from-violet-400/70 to-primary/80" :
    phase === "exhale" ? "from-rose-400/60 to-primary/70" :
    "from-primary/50 to-primary/70"

  const phaseDur =
    phase === "inhale" ? pattern.inhale :
    phase === "hold1"  ? pattern.hold1 :
    phase === "exhale" ? pattern.exhale :
    phase === "hold2"  ? pattern.hold2 : 1

  const phaseLabel = PHASE_CUES[phase] ?? (phase === "rest" ? "Rest" : "")

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">

      {/* ── Header ── */}
      <div className="w-full max-w-lg mx-auto px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HavenMark className="w-5 h-5" />
          <span className="font-serif font-semibold text-foreground tracking-tight text-sm">Haven</span>
          {ctx.emotion && (
            <span className="text-xs text-muted-foreground/70">· feeling {ctx.emotion.toLowerCase()}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs">
          <Wind className="w-3.5 h-3.5" />
          <span className="font-serif">{pattern.name}</span>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">

        <AnimatePresence mode="wait">

          {/* Idle / Intro */}
          {isIdle && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Wind className="w-10 h-10 text-primary/50" />
              </div>
              <p className="text-sm text-muted-foreground font-serif italic">Haven is preparing your session…</p>
            </motion.div>
          )}

          {/* Running */}
          {isRunning && (
            <motion.div
              key="running"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-8 w-full"
            >
              {/* Cycle counter */}
              <div className="text-xs text-muted-foreground/60 tabular-nums font-medium">
                Round {cyclesRef.current + 1} of {TARGET_CYCLES}
              </div>

              {/* Breathing circle */}
              <div className="relative flex items-center justify-center w-64 h-64">
                {/* Outer pulse ring */}
                <motion.div
                  className="absolute w-full h-full rounded-full bg-primary/6"
                  animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Main circle */}
                <motion.div
                  className={`w-44 h-44 rounded-full bg-gradient-to-br ${phaseColor} shadow-2xl shadow-primary/20`}
                  animate={{ scale: circleScale }}
                  transition={{
                    duration: phaseDur,
                    ease: phase === "inhale" ? "easeIn" : phase === "exhale" ? "easeOut" : "linear",
                  }}
                />
                {/* Phase label + countdown inside */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-white/90 text-sm font-semibold tracking-wide">{phaseLabel}</span>
                  <span className="text-white/70 text-3xl font-bold tabular-nums">{countdown}</span>
                </div>
              </div>

              {/* Pattern info */}
              <p className="text-xs text-muted-foreground/50 text-center">
                {pattern.name} · {[pattern.inhale, pattern.hold1 || null, pattern.exhale, pattern.hold2 || null].filter(Boolean).join("-")}
              </p>
            </motion.div>
          )}

          {/* Complete */}
          {isComplete && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-5 text-center w-full max-w-sm"
            >
              <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center shadow-lg shadow-primary/25"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Wind className="w-8 h-8 text-white/90" />
              </motion.div>

              <div>
                <p className="font-serif text-xl font-semibold text-foreground mb-1">
                  {TARGET_CYCLES} rounds complete
                </p>
                <p className="text-sm text-muted-foreground">
                  Haven is guiding you forward…
                </p>
              </div>

              {/* Post-emotion check-in */}
              <div className="w-full">
                <p className="text-xs text-muted-foreground/70 uppercase tracking-wide mb-3">How do you feel now?</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {POST_EMOTIONS.map(({ emoji, label }) => (
                    <button
                      key={label}
                      onClick={() => setPostEmotion(label)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium transition-all ${
                        postEmotion === label
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/50 bg-card/60 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <span>{emoji}</span><span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Haven Flow Nav — Skip / progress indicator */}
      <HavenFlowNav
        currentTool="breathe"
        showContinue={false}
      />
    </div>
  )
}
