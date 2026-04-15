"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import {
  Wind, Play, Pause, RotateCcw, Volume2, VolumeX,
  Heart, RefreshCw, Home, BookOpen, Flame, BarChart3, MessageCircle,
} from "lucide-react"
import { AiBreathingAffirmation } from "@/components/ai-breathing-affirmation"
import { useTTS } from "@/hooks/use-speech"
import { useAmbientSound, type SoundType } from "@/hooks/use-ambient-sound"
import { cn } from "@/lib/utils"
import { HavenMark } from "@/components/logo-mark"
import { readStorage, STORAGE_KEYS } from "@/lib/storage"
import { readHavenFlow, advanceHavenFlow, TOOL_HREFS } from "@/lib/haven-flow"
import { HavenFlowGuide } from "@/components/haven-flow-guide"

// ── Types ──────────────────────────────────────────────────────────────────
type Pattern = {
  name: string; description: string; inhale: number; hold1: number
  exhale: number; hold2: number; color: string; benefit: string; intro: string
}
type Phase        = "inhale" | "hold1" | "exhale" | "hold2" | "rest" | "idle"
type SessionState = "idle" | "intro" | "running" | "complete"
type SessionCtx   = { name?: string; emotion?: string; intensity?: number; lossType?: string }

// ── Patterns ───────────────────────────────────────────────────────────────
const patterns: Pattern[] = [
  {
    name: "Box Breathing",
    description: "4-4-4-4 — Equal sides, equal calm",
    inhale: 4, hold1: 4, exhale: 4, hold2: 4,
    color: "from-sky-100 to-sky-50 dark:from-sky-900/30 dark:to-sky-950/20",
    benefit: "Reduces stress, improves focus",
    intro: "Welcome. Let's breathe together. Find a comfortable position — you can sit, lie down, or stand. Let your shoulders drop away from your ears, and rest your hands somewhere that feels natural. Close your eyes if that feels right, or soften your gaze. We're going to use box breathing — four counts in, four counts to hold, four counts out, and four counts to hold again. Like tracing the four sides of a square, each breath is equal, steady, and grounding. There is nothing you need to do right now except follow along. I will guide you. Let's begin.",
  },
  {
    name: "4-7-8 Breathing",
    description: "Inhale 4 · Hold 7 · Exhale 8",
    inhale: 4, hold1: 7, exhale: 8, hold2: 0,
    color: "from-violet-100 to-violet-50 dark:from-violet-900/30 dark:to-violet-950/20",
    benefit: "Promotes sleep, calms anxiety",
    intro: "Welcome. You've made a gentle choice coming here. This technique — four, seven, eight — was designed to quiet an anxious nervous system and ease the body toward rest. Settle in wherever you are. Let your jaw soften, let your belly be loose. You'll breathe in through your nose for four counts, hold for seven, then release slowly through your mouth for eight. The long exhale is where the shift happens — it activates your body's own relaxation response. You don't have to fix anything right now. Just breathe. I'll be right here with you.",
  },
  {
    name: "Relaxing Breath",
    description: "Inhale 4 · Exhale 6",
    inhale: 4, hold1: 0, exhale: 6, hold2: 0,
    color: "from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-950/20",
    benefit: "Activates the parasympathetic system",
    intro: "Welcome. I'm glad you're here. This is one of the simplest, most powerful things you can do for yourself right now. A slow, extended exhale tells your nervous system that you are safe — that you can let go. We'll breathe in for four counts, and out for six. The exhale is intentionally longer than the inhale. With each breath out, your body softens a little more. Wherever you are, however you're feeling, that's okay. Let's just breathe together, one breath at a time.",
  },
  {
    name: "Equal Breathing",
    description: "Inhale 5 · Exhale 5",
    inhale: 5, hold1: 0, exhale: 5, hold2: 0,
    color: "from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-950/20",
    benefit: "Balances the nervous system",
    intro: "Welcome. Equal breathing is one of the oldest practices — and for good reason. When the breath in matches the breath out, the nervous system finds balance. Five counts in, five counts out. Simple, steady, like a tide coming and going. Let your body be easy. Release any tension you're holding in your face, your shoulders, your hands. You don't need to be anywhere else, do anything else, or feel any different than you do right now. Just breathe with me, and let the rhythm do its work.",
  },
]

// ── Phase sequence (outside component so buildSessionScript can use it) ─────
function getPhaseSequence(p: Pattern): { phase: Phase; duration: number }[] {
  const seq: { phase: Phase; duration: number }[] = []
  seq.push({ phase: "inhale", duration: p.inhale })
  if (p.hold1 > 0) seq.push({ phase: "hold1", duration: p.hold1 })
  seq.push({ phase: "exhale", duration: p.exhale })
  if (p.hold2 > 0) seq.push({ phase: "hold2", duration: p.hold2 })
  return seq
}

// ── Session scripts keyed by emotion ──────────────────────────────────────
type Script = {
  open:   string
  phases: Partial<Record<Phase, { first: string; repeat: string }>>
  bridge: string[]
  close:  string
}

const SESSION_SCRIPTS: Record<string, Script> = {
  Anxious: {
    open: "You're safe here. Let's slow everything down together.",
    phases: {
      inhale: { first: "Breathe in",   repeat: "In"   },
      hold1:  { first: "Hold gently",  repeat: "Hold" },
      exhale: { first: "Let it go",    repeat: "Out"  },
      hold2:  { first: "Rest here",    repeat: "Rest" },
    },
    bridge: ["Good. Keep going.", "You're doing beautifully.", "Stay with it."],
    close: "Breathe normally now. You just gave your nervous system real relief. Well done.",
  },
  Grief: {
    open: "Grief is heavy. Let your breath carry some of that weight.",
    phases: {
      inhale: { first: "Breathe in", repeat: "In"   },
      hold1:  { first: "Hold",       repeat: "Hold" },
      exhale: { first: "Release",    repeat: "Out"  },
      hold2:  { first: "Rest",       repeat: "Rest" },
    },
    bridge: ["Still here with you.", "Keep breathing.", "You're not alone."],
    close: "Breathe normally now. That took courage. Let the stillness stay as long as it needs to.",
  },
  Angry: {
    open: "That tension needs somewhere to go. Let your breath move it.",
    phases: {
      inhale: { first: "Breathe in",  repeat: "In"   },
      hold1:  { first: "Hold steady", repeat: "Hold" },
      exhale: { first: "Release it",  repeat: "Out"  },
      hold2:  { first: "Rest",        repeat: "Rest" },
    },
    bridge: ["Good. Keep going.", "Feel the shift.", "Stay with it."],
    close: "Breathe normally now. You moved through something real. Notice how much lighter you feel.",
  },
  Sad: {
    open: "You showed up. That matters. Let's breathe through this together.",
    phases: {
      inhale: { first: "Breathe in", repeat: "In"   },
      hold1:  { first: "Hold",       repeat: "Hold" },
      exhale: { first: "Let go",     repeat: "Out"  },
      hold2:  { first: "Rest",       repeat: "Rest" },
    },
    bridge: ["One more. You've got this.", "Beautiful.", "Keep breathing."],
    close: "Breathe normally now. You stayed. That's the whole practice — just showing up.",
  },
  Numb: {
    open: "Even when you can't feel much, breath is still there. Let's follow it.",
    phases: {
      inhale: { first: "Breathe in",  repeat: "In"   },
      hold1:  { first: "Hold",        repeat: "Hold" },
      exhale: { first: "Breathe out", repeat: "Out"  },
      hold2:  { first: "Rest",        repeat: "Rest" },
    },
    bridge: ["Still here. Keep going.", "One breath at a time.", "Good."],
    close: "Breathe normally now. You came back to your body. That's enough for today.",
  },
  Calm: {
    open: "You're already in a good place. Let's deepen it.",
    phases: {
      inhale: { first: "Breathe in",  repeat: "In"   },
      hold1:  { first: "Hold",        repeat: "Hold" },
      exhale: { first: "Breathe out", repeat: "Out"  },
      hold2:  { first: "Rest",        repeat: "Rest" },
    },
    bridge: ["Wonderful.", "Staying present.", "Beautiful rhythm."],
    close: "Breathe normally now. You've deepened your calm. Carry that with you.",
  },
  Hopeful: {
    open: "That hope in you is real. Let your breath match it.",
    phases: {
      inhale: { first: "Breathe in",  repeat: "In"   },
      hold1:  { first: "Hold",        repeat: "Hold" },
      exhale: { first: "Breathe out", repeat: "Out"  },
      hold2:  { first: "Rest",        repeat: "Rest" },
    },
    bridge: ["Yes. Keep going.", "Feeling good.", "Beautiful."],
    close: "Breathe normally now. You're building something. This session is part of it.",
  },
  Grateful: {
    open: "Gratitude and breath go hand in hand. Let's honor both.",
    phases: {
      inhale: { first: "Breathe in",  repeat: "In"   },
      hold1:  { first: "Hold",        repeat: "Hold" },
      exhale: { first: "Breathe out", repeat: "Out"  },
      hold2:  { first: "Rest",        repeat: "Rest" },
    },
    bridge: ["Keep going.", "Wonderful.", "Present and whole."],
    close: "Breathe normally now. What a gift — to yourself, right here, right now.",
  },
  default: {
    open: "Find a comfortable position and let your shoulders drop. I'll guide you through every breath.",
    phases: {
      inhale: { first: "Breathe in",  repeat: "In"   },
      hold1:  { first: "Hold",        repeat: "Hold" },
      exhale: { first: "Breathe out", repeat: "Out"  },
      hold2:  { first: "Rest",        repeat: "Rest" },
    },
    bridge: ["Good. Keep going.", "Beautiful.", "Stay with it."],
    close: "Breathe normally now. You did every cycle. That's real care for yourself.",
  },
}

// ── Script helpers ─────────────────────────────────────────────────────────
function getSessionScript(emotion?: string): Script {
  if (emotion && emotion in SESSION_SCRIPTS) return SESSION_SCRIPTS[emotion]
  return SESSION_SCRIPTS.default
}

function getPhaseCue(script: Script, phase: Phase, cycleIdx: number): string {
  const entry = script.phases[phase]
  if (!entry) return ""
  return cycleIdx === 0 ? entry.first : entry.repeat
}

function getBridgeCue(script: Script, cycleIdx: number): string {
  return script.bridge[cycleIdx % script.bridge.length]
}

// ── Constants ──────────────────────────────────────────────────────────────
const REST_DURATION  = 3
const CYCLE_OPTIONS  = [3, 5, 7, 10]

const phaseLabel: Record<Phase, string> = {
  inhale: "Breathe In", hold1: "Hold", exhale: "Breathe Out",
  hold2: "Hold", rest: "Rest", idle: "Ready",
}

const POST_EMOTIONS = [
  { emoji: "😌", label: "Calmer" },
  { emoji: "🌿", label: "Lighter" },
  { emoji: "💙", label: "Grateful" },
  { emoji: "🌤️", label: "Clearer" },
  { emoji: "😔", label: "Still anxious" },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function BreathePage() {
  const router = useRouter()
  const [inFlow, setInFlow] = useState(false)
  const [selectedPattern, setSelectedPattern] = useState<Pattern>(patterns[0])
  const [sessionState, setSessionState]       = useState<SessionState>("idle")
  const [phase, setPhase]         = useState<Phase>("idle")
  const [countdown, setCountdown] = useState(0)
  const [cycles, setCycles]       = useState(0)
  const [totalCycles, setTotalCycles] = useState(5)
  const [postEmotion, setPostEmotion] = useState<string | null>(null)
  const [closureSpoken, setClosureSpoken] = useState(false)
  const [sessionCtx, setSessionCtx] = useState<SessionCtx>({})

  const sessionScriptRef = useRef<Script>(SESSION_SCRIPTS.default)

  const { speak, prefetch, stop: stopSpeech, voiceEnabled, toggleVoice, voiceVolume, setVoiceVolume } = useTTS()
  const { play: playSound, stop: stopSound, current: currentSound, volume: ambientVolume, setVolume: setAmbientVolume } = useAmbientSound()

  const SOUNDS: { type: SoundType; label: string; emoji: string }[] = [
    { type: "none",       label: "Off",     emoji: "🔇" },
    { type: "meditation", label: "Haven",   emoji: "✨" },
    { type: "rain",       label: "Rain",    emoji: "🌧️" },
    { type: "ocean",      label: "Ocean",   emoji: "🌊" },
    { type: "bowl",       label: "Bowl",    emoji: "🔔" },
    { type: "forest",     label: "Forest",  emoji: "🌲" },
  ]

  // ── Refs ──────────────────────────────────────────────────────────────────
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef        = useRef<Phase>("idle")
  const countRef        = useRef(0)
  const cyclesRef       = useRef(0)
  const abortedRef      = useRef(false)
  const sequenceRef     = useRef(getPhaseSequence(selectedPattern))
  const seqIndexRef     = useRef(0)
  const totalCyclesRef  = useRef(totalCycles)
  const patternNameRef  = useRef(selectedPattern.name)
  const voiceEnabledRef = useRef(voiceEnabled)

  useEffect(() => { totalCyclesRef.current = totalCycles }, [totalCycles])
  useEffect(() => { patternNameRef.current = selectedPattern.name }, [selectedPattern])
  useEffect(() => { voiceEnabledRef.current = voiceEnabled }, [voiceEnabled])

  // ── Read user context + detect Haven flow on mount ──────────────────────────
  useEffect(() => {
    try {
      const name    = readStorage<string>(STORAGE_KEYS.userName) ?? undefined
      const logs    = readStorage<any[]>(STORAGE_KEYS.emotionLogs)
      const lastLog = logs?.length ? logs[logs.length - 1] : null
      const lossCtx = readStorage<{ lossType?: string }>(STORAGE_KEYS.lossContext)
      setSessionCtx({
        name,
        emotion:   lastLog?.emotion   ?? undefined,
        intensity: lastLog?.intensity ?? undefined,
        lossType:  lossCtx?.lossType  ?? undefined,
      })
    } catch { /* silently fail */ }
    const flow = readHavenFlow()
    if (flow && flow.sequence[flow.currentIndex] === "breathe") setInFlow(true)
  }, [])

  // ── Timer helpers ─────────────────────────────────────────────────────────
  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const saveHistory = () => {
    if (cyclesRef.current > 0) {
      try {
        const record = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          pattern: selectedPattern.name,
          cycles: cyclesRef.current,
        }
        const prev = JSON.parse(localStorage.getItem("heartsHeal_breathingHistory") || "[]")
        localStorage.setItem("heartsHeal_breathingHistory", JSON.stringify([...prev, record]))
        const count = parseInt(localStorage.getItem("heartsHeal_breathingSessions") || "0", 10)
        localStorage.setItem("heartsHeal_breathingSessions", String(count + 1))
      } catch { /* silently fail */ }
    }
  }

  // ── Prefetch ALL phrases for the upcoming session ─────────────────────────
  const prefetchSessionAudio = useCallback((pattern: Pattern, nCycles: number, script: Script) => {
    prefetch(script.open)
    for (let i = 0; i < nCycles; i++) {
      const seq = getPhaseSequence(pattern)
      for (const { phase } of seq) {
        const cue = getPhaseCue(script, phase, i)
        if (cue) prefetch(cue)
      }
      if (i < nCycles - 1) prefetch(getBridgeCue(script, i))
    }
    prefetch(script.close)
  }, [prefetch])

  // ── Stop & reset ──────────────────────────────────────────────────────────
  const stopBreathing = () => {
    clearTimer()
    abortedRef.current = true
    stopSpeech()
    saveHistory()
    setSessionState("idle")
    setPhase("idle")
    setCountdown(0)
    seqIndexRef.current = 0
  }

  const reset = () => {
    stopBreathing()
    setCycles(0)
    cyclesRef.current = 0
    setPostEmotion(null)
    setClosureSpoken(false)
  }

  // ── Session closure ───────────────────────────────────────────────────────
  // Stored in a ref so tick() always calls the latest version
  const completeSessionRef = useRef<() => Promise<void>>(async () => {})

  const completeSession = useCallback(async () => {
    clearTimer()
    abortedRef.current = true
    stopSpeech()
    saveHistory()
    setSessionState("complete")
    setPhase("idle")
    setCountdown(0)
    seqIndexRef.current = 0
    setClosureSpoken(false)

    if (voiceEnabledRef.current) {
      await speak(sessionScriptRef.current.close, { rate: 0.80, pitch: 0.88 })
    }
    setClosureSpoken(true)

    // Advance Haven flow if this session is part of an active flow
    const flow = readHavenFlow()
    if (flow && flow.sequence[flow.currentIndex] === "breathe") {
      setTimeout(() => {
        const next = advanceHavenFlow()
        router.push(next ? TOOL_HREFS[next] : "/insights?flow=done")
      }, 2500)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak, stopSpeech, sessionCtx, router])

  useEffect(() => { completeSessionRef.current = completeSession }, [completeSession])

  // ── Tick — pure visual timer, voice fires fire-and-forget ─────────────────
  const tick = () => {
    if (abortedRef.current) return
    countRef.current -= 1

    if (countRef.current <= 0) {
      seqIndexRef.current = (seqIndexRef.current + 1) % sequenceRef.current.length

      if (seqIndexRef.current === 0) {
        // ── Cycle complete ──
        cyclesRef.current += 1
        setCycles(cyclesRef.current)

        // Auto-complete when target reached
        if (cyclesRef.current >= totalCyclesRef.current) {
          void completeSessionRef.current()
          return
        }

        // Inter-cycle bridge — fire and forget (plays during visual rest)
        const bridge = getBridgeCue(sessionScriptRef.current, cyclesRef.current - 1)
        if (voiceEnabledRef.current) void speak(bridge, { rate: 0.84, pitch: 0.88 })

        // Rest phase
        phaseRef.current  = "rest"
        countRef.current  = REST_DURATION
        setPhase("rest")
        setCountdown(REST_DURATION)
        timerRef.current  = setTimeout(tick, 1000)
        return
      }

      // ── Next phase ──
      const next   = sequenceRef.current[seqIndexRef.current]
      const phrase = getPhaseCue(sessionScriptRef.current, next.phase, cyclesRef.current)
      if (voiceEnabledRef.current && phrase) {
        void speak(phrase, { rate: 0.84, pitch: 0.88 })
      }
      phaseRef.current = next.phase
      countRef.current = next.duration
      setPhase(next.phase)
      setCountdown(next.duration)
    } else {
      setCountdown(countRef.current)
    }

    timerRef.current = setTimeout(tick, 1000)
  }

  // ── Begin the visual breathing loop ───────────────────────────────────────
  const beginBreathingCycle = () => {
    abortedRef.current    = false
    sequenceRef.current   = getPhaseSequence(selectedPattern)
    seqIndexRef.current   = 0
    const first           = sequenceRef.current[0]
    phaseRef.current      = first.phase
    countRef.current      = first.duration
    const firstPhrase     = getPhaseCue(sessionScriptRef.current, first.phase, 0)
    if (voiceEnabledRef.current && firstPhrase) {
      void speak(firstPhrase, { rate: 0.84, pitch: 0.88 })
    }
    setPhase(first.phase)
    setCountdown(first.duration)
    setSessionState("running")
    timerRef.current = setTimeout(tick, 1000)
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  const start = async () => {
    abortedRef.current = false
    cyclesRef.current  = 0
    setCycles(0)
    setPostEmotion(null)
    setClosureSpoken(false)
    setSessionState("intro")
    setPhase("idle")

    // Auto-start Haven meditation pad if nothing is playing
    if (currentSound === "none") {
      playSound("meditation")
      setAmbientVolume(0.22)
    }

    if (voiceEnabledRef.current) {
      const script = getSessionScript(sessionCtx.emotion)
      sessionScriptRef.current = script

      let opener = script.open
      if (sessionCtx.name) opener = `${sessionCtx.name}. ${opener}`

      // Prefetch all session audio while opener plays — zero gaps during cycles
      prefetchSessionAudio(selectedPattern, totalCycles, script)

      await speak(opener, { rate: 0.80, pitch: 0.88 })
      await new Promise<void>((res) => setTimeout(res, 500))
    } else {
      sessionScriptRef.current = getSessionScript(sessionCtx.emotion)
    }

    if (abortedRef.current) return
    beginBreathingCycle()
  }

  useEffect(() => {
    return () => { clearTimer(); abortedRef.current = true }
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────
  const circleScale = phase === "inhale" ? 1.45 : phase === "exhale" ? 0.75 : 1.0
  const phaseDuration =
    phase === "inhale" ? selectedPattern.inhale
    : phase === "exhale" ? selectedPattern.exhale
    : phase === "hold1"  ? selectedPattern.hold1
    : phase === "rest"   ? REST_DURATION
    : selectedPattern.hold2

  const isRunning  = sessionState === "running"
  const isIntro    = sessionState === "intro"
  const isComplete = sessionState === "complete"

  const approxMinutes = Math.max(
    1,
    Math.round(
      (totalCycles * (selectedPattern.inhale + selectedPattern.hold1 + selectedPattern.exhale + selectedPattern.hold2 + REST_DURATION)) / 60,
    ),
  )

  const container: Variants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.07 } },
  }
  const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  }

  // ── Haven sections (completion + skip bar) ────────────────────────────────
  const HAVEN_SECTIONS = [
    { href: "/thoughts", label: "Journal",      desc: "Write what came up",       icon: BookOpen,      color: "text-amber-500",  bg: "bg-amber-50/80 dark:bg-amber-900/20" },
    { href: "/",         label: "Talk to Haven", desc: "Share how you're feeling", icon: MessageCircle, color: "text-primary",     bg: "bg-primary/10" },
    { href: "/burn",     label: "Burn Letter",  desc: "Write it and release it",  icon: Flame,         color: "text-orange-500", bg: "bg-orange-50/80 dark:bg-orange-900/20" },
    { href: "/insights", label: "Insights",     desc: "See your progress",        icon: BarChart3,     color: "text-indigo-500", bg: "bg-indigo-50/80 dark:bg-indigo-900/20" },
  ]

  return (
    <div className={`bg-background min-h-screen ${inFlow ? "pb-52" : ""}`}>
      <motion.div
        className="w-full max-w-4xl mx-auto px-4 md:px-8 py-3 md:py-5"
        variants={container} initial="hidden" animate="show"
      >

        {/* Header */}
        <motion.div className="flex items-center justify-between mb-3" variants={item}>
          <Link href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <HavenMark className="w-6 h-6" />
            <span className="font-serif text-[15px] font-semibold text-foreground tracking-tight">Haven</span>
          </Link>
          <h1 className="font-serif text-lg font-semibold text-foreground">Guided Breathing</h1>
          <Link href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
            Talk to Haven
          </Link>
        </motion.div>

        {/* Two-column grid — single column in flow mode */}
        <motion.div
          className={`grid grid-cols-1 gap-6 lg:gap-8 items-start ${inFlow ? "" : "lg:grid-cols-[1fr_320px]"}`}
          variants={item}
        >

          {/* ── Main column ── */}
          <div className="min-w-0">

            {/* Affirmation — idle only */}
            {sessionState === "idle" && (
              <div className="mb-5">
                <AiBreathingAffirmation breathingPattern={selectedPattern.name} suppressAutoSpeak={inFlow} />
              </div>
            )}

            {/* Pattern + session setup — idle only */}
            {sessionState === "idle" && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Choose a technique
                </h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {patterns.map((p) => (
                    <button key={p.name}
                      onClick={() => { reset(); setSelectedPattern(p) }}
                      className={`text-left p-4 rounded-2xl border transition-all duration-200 ${
                        selectedPattern.name === p.name
                          ? "border-primary/40 bg-gradient-to-br " + p.color + " shadow-md"
                          : "border-border/40 bg-card hover:border-primary/20 hover:bg-muted/30"
                      }`}
                    >
                      <p className="font-semibold text-sm text-foreground mb-0.5">{p.name}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{p.description}</p>
                      <p className="text-[11px] text-primary/70 mt-1.5 font-medium">{p.benefit}</p>
                    </button>
                  ))}
                </div>

                {/* Session length picker */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Session length
                  </p>
                  <div className="flex gap-2 mb-1.5">
                    {CYCLE_OPTIONS.map((n) => (
                      <button key={n}
                        onClick={() => setTotalCycles(n)}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all",
                          totalCycles === n
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "border-border/40 text-muted-foreground hover:border-primary/20",
                        )}
                      >
                        {n} rounds
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    ≈ {approxMinutes} {approxMinutes === 1 ? "minute" : "minutes"}
                    {sessionCtx.emotion && (
                      <span className="text-primary/60 ml-1">
                        · Haven will personalize this session for you
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* ── Completion screen ── */}
            <AnimatePresence mode="wait">
              {isComplete && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center text-center gap-5 py-4"
                >
                  <motion.div
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/40 to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Wind className="w-9 h-9 text-white/90" />
                  </motion.div>

                  <div>
                    <p className="font-serif text-2xl font-semibold text-foreground mb-1">
                      {cycles} {cycles === 1 ? "cycle" : "cycles"} complete
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                      {selectedPattern.name} ·{" "}
                      {closureSpoken ? "Take a moment to sit with how you feel." : "Haven is speaking…"}
                    </p>
                  </div>

                  {closureSpoken && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="w-full max-w-sm"
                    >
                      {/* Emotional check-in */}
                      <p className="text-sm font-medium text-foreground mb-3">How are you feeling now?</p>
                      <div className="flex flex-wrap justify-center gap-2 mb-5">
                        {POST_EMOTIONS.map(({ emoji, label }) => (
                          <button key={label}
                            onClick={() => setPostEmotion(label)}
                            className={cn(
                              "flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-medium transition-all",
                              postEmotion === label
                                ? "border-primary bg-primary/15 text-primary scale-[1.04]"
                                : "border-border/50 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                            )}
                          >
                            <span>{emoji}</span><span>{label}</span>
                          </button>
                        ))}
                      </div>

                      {postEmotion && (
                        <motion.div
                          key={postEmotion}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className="mb-5 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/15 text-center"
                        >
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {postEmotion === "Still anxious"
                              ? "That's okay — and it's honest. Anxiety doesn't always lift in one session. What matters is you showed up for yourself. Another round may soften the edges, or simply rest here. Your body heard you."
                              : postEmotion === "Calmer"
                              ? "That calm is real — your breath created it. Carry it gently. If you'd like to capture what came up, the journal is right here waiting."
                              : postEmotion === "Lighter"
                              ? "Something lifted. That happens when we stop holding our breath and finally let it move. Write about what felt heavy — and what feels less so now."
                              : postEmotion === "Grateful"
                              ? "Gratitude after breathwork is a sign your nervous system has truly settled. That shift from tension to thankfulness — hold onto it. It's yours."
                              : "Clarity is a gift. When the noise quiets, what's real rises to the surface. Write it down before it fades."}
                          </p>
                        </motion.div>
                      )}

                      {/* Haven section navigation */}
                      <div className="text-left mb-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                          Continue your healing with Haven
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {HAVEN_SECTIONS.map(({ href, label, desc, icon: Icon, color, bg }) => (
                            <Link key={href} href={href}
                              className={cn(
                                "rounded-2xl p-3 border border-border/30 flex items-start gap-2.5 hover:border-primary/30 transition-all",
                                bg,
                              )}
                            >
                              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", bg)}>
                                <Icon className={cn("w-4 h-4", color)} />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-foreground leading-none mb-0.5">{label}</p>
                                <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 justify-center flex-wrap">
                        <button
                          onClick={() => {
                            setSessionState("idle")
                            setCycles(0)
                            cyclesRef.current = 0
                            setPostEmotion(null)
                            setClosureSpoken(false)
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border/50 text-foreground text-sm font-semibold hover:bg-muted/40 transition-all"
                        >
                          <RefreshCw className="w-4 h-4" /> Breathe again
                        </button>
                        <Link href="/"
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
                        >
                          <Home className="w-4 h-4" /> Back to Haven
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Breathing circle ── */}
            {!isComplete && (
              <div className="flex flex-col items-center">

                {/* Pattern name + cycle progress */}
                <AnimatePresence>
                  {sessionState !== "idle" && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-3 mb-4"
                    >
                      <p className="text-sm font-medium text-primary/70">{selectedPattern.name}</p>
                      {isRunning && (
                        <span className="text-xs text-muted-foreground tabular-nums bg-muted/40 px-2 py-0.5 rounded-full">
                          {cycles} / {totalCycles}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Circle */}
                <div className="relative flex items-center justify-center w-64 h-64 mb-6">
                  {/* Outer ambient ring */}
                  <motion.div
                    className="absolute rounded-full" style={{ width: "100%", height: "100%" }}
                    animate={
                      isIntro
                        ? { scale: [1, 1.04, 1], opacity: [0.06, 0.12, 0.06] }
                        : phase === "rest"
                        ? { scale: [1, 1.03, 1], opacity: [0.08, 0.14, 0.08] }
                        : { scale: 1, opacity: 0.1 }
                    }
                    transition={
                      isIntro || phase === "rest"
                        ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
                        : {}
                    }
                  >
                    <div className="w-full h-full rounded-full bg-primary/10" />
                  </motion.div>

                  {/* Core breathing circle */}
                  <motion.div
                    className={`rounded-full shadow-lg ${
                      isIntro || phase === "rest"
                        ? "bg-gradient-to-br from-primary/20 to-primary/40"
                        : "bg-gradient-to-br from-primary/30 to-primary/60"
                    }`}
                    style={{ width: "140px", height: "140px" }}
                    animate={{
                      scale: isIntro         ? [1, 1.06, 1]
                           : phase === "rest" ? [1, 1.04, 1]
                           : isRunning        ? circleScale
                           : 1,
                    }}
                    transition={
                      isIntro
                        ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
                        : phase === "rest"
                        ? { duration: REST_DURATION, ease: "easeInOut" }
                        : {
                            duration: isRunning && phase !== "idle" ? phaseDuration : 0.5,
                            ease: phase === "inhale" ? "easeIn" : phase === "exhale" ? "easeOut" : "linear",
                          }
                    }
                  />

                  {/* Center label + countdown */}
                  <div className="absolute flex flex-col items-center px-4 text-center">
                    <AnimatePresence mode="wait">
                      {isIntro ? (
                        <motion.div
                          key="intro"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-1"
                        >
                          <p className="text-white font-semibold text-sm drop-shadow leading-tight">
                            Arriving…
                          </p>
                          <div className="flex gap-1 mt-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div key={i}
                                className="w-1 h-1 rounded-full bg-white/70"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.45 }}
                              />
                            ))}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.p key={phase}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.3 }}
                          className="text-white font-semibold text-sm drop-shadow"
                        >
                          {phaseLabel[phase]}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {isRunning && phase !== "idle" && (
                      <motion.span
                        key={countdown}
                        initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="text-white/90 text-2xl font-bold mt-1 drop-shadow"
                      >
                        {countdown}
                      </motion.span>
                    )}
                  </div>
                </div>

                {cycles > 0 && !isComplete && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {cycles} / {totalCycles} cycles
                  </p>
                )}

                {/* Control buttons */}
                <div className="flex items-center gap-3">
                  {sessionState === "idle" && (
                    <button onClick={start}
                      className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <Play className="w-4 h-4" /> Begin Session
                    </button>
                  )}
                  {isIntro && (
                    <button onClick={stopBreathing}
                      className="flex items-center gap-2 px-6 py-3 rounded-full border border-border/50 text-muted-foreground text-sm hover:bg-muted/30 transition-all duration-200"
                    >
                      Cancel
                    </button>
                  )}
                  {isRunning && (
                    <>
                      <button
                        onClick={() => cycles > 0 ? void completeSession() : stopBreathing()}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-all duration-200"
                      >
                        <Pause className="w-4 h-4" /> End Session
                      </button>
                      <button onClick={reset}
                        className="flex items-center gap-2 px-4 py-3 rounded-full border border-border/50 text-muted-foreground text-sm hover:bg-muted/30 transition-all duration-200"
                      >
                        <RotateCcw className="w-4 h-4" /> Reset
                      </button>
                    </>
                  )}
                </div>

                {/* Skip to Haven — compact link row during session */}
                {isRunning && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="flex flex-wrap gap-2 justify-center mt-5"
                  >
                    <span className="text-[11px] text-muted-foreground/50 self-center mr-0.5">Skip to:</span>
                    {HAVEN_SECTIONS.map(({ href, label, icon: Icon }) => (
                      <Link key={href} href={href}
                        onClick={stopBreathing}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border/30 text-[11px] text-muted-foreground hover:text-foreground hover:border-border/60 transition-all"
                      >
                        <Icon className="w-3 h-3" /> {label}
                      </Link>
                    ))}
                  </motion.div>
                )}

              </div>
            )}

          </div>

          {/* ── Sidebar ── */}
          <aside className="lg:sticky lg:top-[76px] lg:self-start space-y-4 min-w-0">

            {/* Technique detail */}
            <div className={`glass-card rounded-2xl p-5 bg-gradient-to-br ${selectedPattern.color}`}>
              <h3 className="font-semibold text-foreground mb-3">{selectedPattern.name}</h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Inhale", val: selectedPattern.inhale },
                  { label: "Hold",   val: selectedPattern.hold1 || "—" },
                  { label: "Exhale", val: selectedPattern.exhale },
                  { label: "Hold",   val: selectedPattern.hold2 || "—" },
                ].map(({ label, val }, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xl font-bold text-foreground">{val}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3">{selectedPattern.benefit}</p>
            </div>

            {/* Haven voice */}
            <div className="glass-card rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button onClick={toggleVoice}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${voiceEnabled ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <span className="text-xs font-medium text-foreground">Haven voice</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{Math.round(voiceVolume * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={voiceVolume}
                disabled={!voiceEnabled}
                onChange={(e) => setVoiceVolume(Number(e.target.value))}
                className="w-full accent-primary disabled:opacity-40"
              />
              {sessionState === "idle" && voiceEnabled && (
                <p className="text-xs text-muted-foreground/60 mt-2">
                  {sessionCtx.emotion
                    ? `Haven will personalize this session around how you're feeling.`
                    : "Haven guides every breath from beginning to end."}
                </p>
              )}
            </div>

            {/* Background sound */}
            <div className="glass-card rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-foreground">Background sound</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {currentSound === "none" ? "Off" : `${Math.round(ambientVolume * 100)}%`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {SOUNDS.map(({ type, label, emoji }) => (
                  <button key={type}
                    onClick={() => type === "none" ? stopSound() : playSound(type)}
                    className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium border transition-all duration-200 ${
                      currentSound === type
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border/40 text-muted-foreground hover:border-primary/20"
                    }`}
                  >
                    <span className="text-base leading-none">{emoji}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <input type="range" min={0} max={1} step={0.05} value={ambientVolume}
                disabled={currentSound === "none"}
                onChange={(e) => setAmbientVolume(Number(e.target.value))}
                className="w-full accent-primary disabled:opacity-40"
              />
              {currentSound === "none" && sessionState === "idle" && (
                <p className="text-xs text-muted-foreground/50 mt-1.5">
                  ✨ Haven will start gentle music when your session begins.
                </p>
              )}
            </div>

          </aside>

        </motion.div>

      </motion.div>

      <HavenFlowGuide
        currentTool="breathe"
        showContinue={false}
        exerciseData={postEmotion ? `User felt ${postEmotion} after ${cycles} breathing cycles.` : undefined}
      />
    </div>
  )
}
