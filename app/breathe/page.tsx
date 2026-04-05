"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { ChevronLeft, Wind, Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { Logo } from "@/components/logo"
import { AiBreathingAffirmation } from "@/components/ai-breathing-affirmation"
import { useTTS } from "@/hooks/use-speech"
import { useAmbientSound, type SoundType } from "@/hooks/use-ambient-sound"

type Pattern = {
  name: string
  description: string
  inhale: number
  hold1: number
  exhale: number
  hold2: number
  color: string
  benefit: string
  intro: string
}

const patterns: Pattern[] = [
  {
    name: "Box Breathing",
    description: "4-4-4-4 — Equal sides, equal calm",
    inhale: 4, hold1: 4, exhale: 4, hold2: 4,
    color: "from-sky-100 to-sky-50 dark:from-sky-900/30 dark:to-sky-950/20",
    benefit: "Reduces stress, improves focus",
    intro: "Let's begin box breathing. Find a comfortable position, relax your shoulders, and let your hands rest gently in your lap. This technique will calm your mind and bring you back to center. Just follow my voice, and we'll breathe together.",
  },
  {
    name: "4-7-8 Breathing",
    description: "Inhale 4 · Hold 7 · Exhale 8",
    inhale: 4, hold1: 7, exhale: 8, hold2: 0,
    color: "from-violet-100 to-violet-50 dark:from-violet-900/30 dark:to-violet-950/20",
    benefit: "Promotes sleep, calms anxiety",
    intro: "Welcome to 4-7-8 breathing. This gentle technique is wonderful for calming anxiety and easing your body toward rest. Settle in somewhere comfortable, soften your jaw, and let your body follow each breath. There is nowhere else to be right now.",
  },
  {
    name: "Relaxing Breath",
    description: "Inhale 4 · Exhale 6",
    inhale: 4, hold1: 0, exhale: 6, hold2: 0,
    color: "from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-950/20",
    benefit: "Activates the parasympathetic system",
    intro: "Let's practice relaxing breath together. This simple rhythm activates your body's natural calm response. Take a moment to arrive here. Let your shoulders drop, unclench your hands, and soften your gaze. You are safe. Breathe with me.",
  },
  {
    name: "Equal Breathing",
    description: "Inhale 5 · Exhale 5",
    inhale: 5, hold1: 0, exhale: 5, hold2: 0,
    color: "from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-950/20",
    benefit: "Balances the nervous system",
    intro: "Welcome to equal breathing. This balancing technique brings harmony to your nervous system. Find stillness wherever you are. Let each breath be an anchor, grounding you gently in this moment. I will guide you every step of the way.",
  },
]

type Phase = "inhale" | "hold1" | "exhale" | "hold2" | "idle"
type SessionState = "idle" | "intro" | "running" | "paused"

const phaseLabel: Record<Phase, string> = {
  inhale: "Breathe In",
  hold1:  "Hold",
  exhale: "Breathe Out",
  hold2:  "Hold",
  idle:   "Ready",
}

const phaseCue: Record<Phase, string> = {
  inhale: "Breathe in",
  hold1:  "Hold",
  exhale: "Breathe out",
  hold2:  "Hold",
  idle:   "",
}

// Encouraging words spoken at the start of certain cycles
const CYCLE_ENCOURAGEMENTS: Record<number, string> = {
  2: "You're doing beautifully.",
  4: "Stay with it. You're doing so well.",
  6: "Keep breathing. You are calm and steady.",
  9: "Almost there. You're doing wonderfully.",
}

export default function BreathePage() {
  const [selectedPattern, setSelectedPattern] = useState<Pattern>(patterns[0])
  const [sessionState, setSessionState]       = useState<SessionState>("idle")
  const [phase, setPhase]       = useState<Phase>("idle")
  const [countdown, setCountdown] = useState(0)
  const [cycles, setCycles]     = useState(0)

  const { speak, stop: stopSpeech, voiceEnabled, toggleVoice, voiceVolume, setVoiceVolume } = useTTS()
  const { play: playSound, stop: stopSound, current: currentSound, volume: ambientVolume, setVolume: setAmbientVolume } = useAmbientSound()

  const SOUNDS: { type: SoundType; label: string; emoji: string }[] = [
    { type: "none",   label: "Off",          emoji: "🔇" },
    { type: "rain",   label: "Rain",         emoji: "🌧️" },
    { type: "ocean",  label: "Ocean",        emoji: "🌊" },
    { type: "bowl",   label: "Singing Bowl", emoji: "🔔" },
    { type: "forest", label: "Forest",       emoji: "🌲" },
  ]

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef    = useRef<Phase>("idle")
  const countRef    = useRef(0)
  const cyclesRef   = useRef(0)
  const abortedRef  = useRef(false)

  const getPhaseSequence = (p: Pattern) => {
    const seq: { phase: Phase; duration: number }[] = []
    seq.push({ phase: "inhale", duration: p.inhale })
    if (p.hold1 > 0) seq.push({ phase: "hold1", duration: p.hold1 })
    seq.push({ phase: "exhale", duration: p.exhale })
    if (p.hold2 > 0) seq.push({ phase: "hold2", duration: p.hold2 })
    return seq
  }

  const sequenceRef = useRef(getPhaseSequence(selectedPattern))
  const seqIndexRef = useRef(0)

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  const stopBreathing = () => {
    clearTimer()
    abortedRef.current = true
    stopSpeech()
    // Persist completed session before resetting counters
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
    setSessionState("idle")
    setPhase("idle")
    setCountdown(0)
    seqIndexRef.current = 0
  }

  const reset = () => {
    stopBreathing()
    setCycles(0)
    cyclesRef.current = 0
  }

  const voiceEnabledRef = useRef(voiceEnabled)
  useEffect(() => { voiceEnabledRef.current = voiceEnabled }, [voiceEnabled])

  const speakPhase = async (p: Phase) => {
    if (!voiceEnabledRef.current || !phaseCue[p]) return
    await speak(phaseCue[p], { rate: 0.82, pitch: 0.9 })
  }

  const tick = () => {
    if (abortedRef.current) return
    countRef.current -= 1
    if (countRef.current <= 0) {
      seqIndexRef.current = (seqIndexRef.current + 1) % sequenceRef.current.length
      if (seqIndexRef.current === 0) {
        cyclesRef.current += 1
        setCycles(cyclesRef.current)
      }
      const next = sequenceRef.current[seqIndexRef.current]
      const encouragement = seqIndexRef.current === 0
        ? CYCLE_ENCOURAGEMENTS[cyclesRef.current]
        : undefined

      if (encouragement && voiceEnabledRef.current) {
        // Suspend the tick while encouragement plays so the visual doesn't race ahead.
        // Phase label + countdown only advance once encouragement is done — in sync with voice cue.
        setTimeout(async () => {
          if (abortedRef.current) return
          await speak(encouragement, { rate: 0.8, pitch: 0.9 })
          if (abortedRef.current) return
          phaseRef.current = next.phase
          countRef.current = next.duration
          setPhase(next.phase)
          setCountdown(next.duration)
          speakPhase(next.phase)
          timerRef.current = setTimeout(tick, 1000)
        }, 200)
        return // exit without rescheduling — tick resumes above after encouragement
      }

      phaseRef.current = next.phase
      countRef.current = next.duration
      setPhase(next.phase)
      setCountdown(next.duration)
      speakPhase(next.phase)
    } else {
      setCountdown(countRef.current)
    }
    timerRef.current = setTimeout(tick, 1000)
  }

  const beginBreathingCycle = () => {
    abortedRef.current = false
    sequenceRef.current = getPhaseSequence(selectedPattern)
    seqIndexRef.current = 0
    const first = sequenceRef.current[0]
    phaseRef.current = first.phase
    countRef.current = first.duration
    setPhase(first.phase)
    setCountdown(first.duration)
    setSessionState("running")
    speakPhase(first.phase)
    timerRef.current = setTimeout(tick, 1000)
  }

  const start = async () => {
    abortedRef.current = false
    cyclesRef.current  = 0
    setCycles(0)
    setSessionState("intro")
    setPhase("idle")

    if (voiceEnabledRef.current) {
      await speak(selectedPattern.intro, { rate: 0.82, pitch: 0.9 })
      // Small pause after intro before breathing begins
      await new Promise<void>((res) => setTimeout(res, 300))
    }

    if (abortedRef.current) return // user stopped during intro
    beginBreathingCycle()
  }

  useEffect(() => {
    return () => { clearTimer(); abortedRef.current = true }
  }, [])

  const circleScale    = phase === "inhale" ? 1.45 : phase === "exhale" ? 0.75 : 1.0
  const phaseDuration  = phase === "inhale" ? selectedPattern.inhale
    : phase === "exhale" ? selectedPattern.exhale
    : phase === "hold1"  ? selectedPattern.hold1
    : selectedPattern.hold2

  const isRunning = sessionState === "running"
  const isIntro   = sessionState === "intro"

  const container: Variants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.07 } },
  }
  const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
  }

  return (
    <div className="bg-page-gradient">
      <motion.div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-5" variants={container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="flex flex-col items-center mb-3" variants={item}>
          <Logo size="medium" />
        </motion.div>
        <motion.div className="mb-5" variants={item}>
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400 flex items-center justify-center">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Guided Breathing</h1>
              <p className="text-sm text-muted-foreground">A few minutes of breath can change everything</p>
            </div>
          </div>
        </motion.div>

        {/* Two-column grid */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start" variants={item}>

          {/* ── Main column: affirmation, pattern selector, breathing circle ── */}
          <div className="min-w-0">

            {/* Affirmation — hide once session starts */}
            {sessionState === "idle" && (
              <div className="mb-5">
                <AiBreathingAffirmation breathingPattern={selectedPattern.name} />
              </div>
            )}

            {/* Pattern selector — hide once session starts */}
            {sessionState === "idle" && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Choose a technique</h2>
                <div className="grid grid-cols-2 gap-3">
                  {patterns.map((p) => (
                    <button key={p.name} onClick={() => { reset(); setSelectedPattern(p) }}
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
              </div>
            )}

            {/* Breathing circle */}
            <div className="flex flex-col items-center">
              <AnimatePresence>
                {sessionState !== "idle" && (
                  <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-sm font-medium text-primary/70 mb-4">
                    {selectedPattern.name}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="relative flex items-center justify-center w-64 h-64 mb-6">
                <motion.div className="absolute rounded-full" style={{ width: "100%", height: "100%" }}
                  animate={isIntro ? { scale: [1, 1.04, 1], opacity: [0.06, 0.12, 0.06] } : { scale: 1, opacity: 0.1 }}
                  transition={isIntro ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : {}}>
                  <div className="w-full h-full rounded-full bg-primary/10" />
                </motion.div>
                <motion.div
                  className={`rounded-full shadow-lg ${isIntro ? "bg-gradient-to-br from-primary/20 to-primary/40" : "bg-gradient-to-br from-primary/30 to-primary/60"}`}
                  style={{ width: "140px", height: "140px" }}
                  animate={{ scale: isIntro ? [1, 1.06, 1] : isRunning ? circleScale : 1 }}
                  transition={isIntro ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : {
                    duration: isRunning && phase !== "idle" ? phaseDuration : 0.5,
                    ease: phase === "inhale" ? "easeIn" : phase === "exhale" ? "easeOut" : "linear",
                  }}
                />
                <div className="absolute flex flex-col items-center px-4 text-center">
                  <AnimatePresence mode="wait">
                    {isIntro ? (
                      <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1">
                        <p className="text-white font-semibold text-sm drop-shadow leading-tight">Settling in…</p>
                        <div className="flex gap-1 mt-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div key={i} className="w-1 h-1 rounded-full bg-white/70"
                              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }} />
                          ))}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.p key={phase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }} className="text-white font-semibold text-sm drop-shadow">
                        {phaseLabel[phase]}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  {isRunning && phase !== "idle" && (
                    <motion.span key={countdown} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="text-white/90 text-2xl font-bold mt-1 drop-shadow">{countdown}</motion.span>
                  )}
                </div>
              </div>

              {cycles > 0 && (
                <p className="text-sm text-muted-foreground mb-4">{cycles} {cycles === 1 ? "cycle" : "cycles"} completed</p>
              )}

              <div className="flex items-center gap-3">
                {sessionState === "idle" && (
                  <button onClick={start} className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                    <Play className="w-4 h-4" /> Begin Session
                  </button>
                )}
                {isIntro && (
                  <button onClick={stopBreathing} className="flex items-center gap-2 px-6 py-3 rounded-full border border-border/50 text-muted-foreground text-sm hover:bg-muted/30 transition-all duration-200">
                    Cancel
                  </button>
                )}
                {isRunning && (
                  <>
                    <button onClick={stopBreathing} className="flex items-center gap-2 px-6 py-3 rounded-full bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-all duration-200">
                      <Pause className="w-4 h-4" /> End Session
                    </button>
                    <button onClick={reset} className="flex items-center gap-2 px-4 py-3 rounded-full border border-border/50 text-muted-foreground text-sm hover:bg-muted/30 transition-all duration-200">
                      <RotateCcw className="w-4 h-4" /> Reset
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* ── Sidebar: technique detail + sound controls ── */}
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

            {/* Voice guidance */}
            <div className="glass-card rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button onClick={toggleVoice} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${voiceEnabled ? "text-primary" : "text-muted-foreground"}`}>
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <span className="text-xs font-medium text-foreground">Voice guidance</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{Math.round(voiceVolume * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={voiceVolume} disabled={!voiceEnabled}
                onChange={(e) => setVoiceVolume(Number(e.target.value))} className="w-full accent-primary disabled:opacity-40" />
              {sessionState === "idle" && voiceEnabled && (
                <p className="text-xs text-muted-foreground/60 mt-2">You'll hear an introduction before each session</p>
              )}
            </div>

            {/* Ambient sound */}
            <div className="glass-card rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-foreground">Ambient sound</span>
                <span className="text-xs text-muted-foreground tabular-nums">{currentSound === "none" ? "Off" : `${Math.round(ambientVolume * 100)}%`}</span>
              </div>
              <div className="flex gap-1.5 mb-3">
                {SOUNDS.map(({ type, label, emoji }) => (
                  <button key={type} onClick={() => type === "none" ? stopSound() : playSound(type)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-medium border transition-all duration-200 ${
                      currentSound === type ? "bg-primary/10 border-primary/30 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/20"
                    }`}>
                    <span className="text-base leading-none">{emoji}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <input type="range" min={0} max={1} step={0.05} value={ambientVolume} disabled={currentSound === "none"}
                onChange={(e) => setAmbientVolume(Number(e.target.value))} className="w-full accent-primary disabled:opacity-40" />
            </div>

          </aside>

        </motion.div>

      </motion.div>
    </div>
  )
}
