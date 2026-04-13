"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { ChevronLeft, Wind, Play, Pause, RotateCcw, Volume2, VolumeX, Heart, RefreshCw, Home } from "lucide-react"
import { AiBreathingAffirmation } from "@/components/ai-breathing-affirmation"
import { useTTS } from "@/hooks/use-speech"
import { useAmbientSound, type SoundType } from "@/hooks/use-ambient-sound"
import { cn } from "@/lib/utils"
import { HavenMark } from "@/components/logo-mark"

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
    intro: "Welcome. Let's breathe together. Find a comfortable position — you can sit, lie down, or stand. Let your shoulders drop away from your ears, and rest your hands somewhere that feels natural. Close your eyes if that feels right, or soften your gaze. We are going to use box breathing — four counts in, four counts to hold, four counts out, and four counts to hold again. Like tracing the four sides of a square, each breath is equal, steady, and grounding. There is nothing you need to do right now except follow the rhythm. I will guide you. Let's begin.",
  },
  {
    name: "4-7-8 Breathing",
    description: "Inhale 4 · Hold 7 · Exhale 8",
    inhale: 4, hold1: 7, exhale: 8, hold2: 0,
    color: "from-violet-100 to-violet-50 dark:from-violet-900/30 dark:to-violet-950/20",
    benefit: "Promotes sleep, calms anxiety",
    intro: "Welcome. You've made a gentle choice coming here. This technique — four, seven, eight — was designed to quiet an anxious nervous system and ease the body toward rest. Settle in. Let your jaw soften, let your belly be loose. Breathe in through your nose for four counts, hold for seven, then let the breath go slowly through your mouth for eight. The long exhale is where the magic happens — it activates your body's natural relaxation response. You don't have to fix anything right now. Just breathe. I'll be right here with you.",
  },
  {
    name: "Relaxing Breath",
    description: "Inhale 4 · Exhale 6",
    inhale: 4, hold1: 0, exhale: 6, hold2: 0,
    color: "from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-950/20",
    benefit: "Activates the parasympathetic system",
    intro: "Welcome. I'm glad you're here. This is one of the simplest, most powerful things you can do for your body right now. A slow, extended exhale tells your nervous system that you are safe — that you can let go. We'll breathe in for four counts, and out for six. The exhale is a little longer than the inhale — that's intentional. Each breath out, your body softens a little more. Wherever you are, however you're feeling, that's okay. Let's just breathe together, one breath at a time.",
  },
  {
    name: "Equal Breathing",
    description: "Inhale 5 · Exhale 5",
    inhale: 5, hold1: 0, exhale: 5, hold2: 0,
    color: "from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-950/20",
    benefit: "Balances the nervous system",
    intro: "Welcome. Equal breathing is one of the oldest breathing practices — and for good reason. When the breath in matches the breath out, the nervous system finds balance. Five counts in, five counts out. Simple, steady, like a tide coming and going. Let your body be easy. Release any tension you're holding in your face, your shoulders, your hands. You don't need to be anywhere else, do anything else, or feel any different than you do right now. Just breathe with me, and let the rhythm do its work.",
  },
]

type Phase = "inhale" | "hold1" | "exhale" | "hold2" | "rest" | "idle"
type SessionState = "idle" | "intro" | "running" | "paused" | "complete"

const phaseLabel: Record<Phase, string> = {
  inhale: "Breathe In",
  hold1:  "Hold",
  exhale: "Breathe Out",
  hold2:  "Hold",
  rest:   "Rest",
  idle:   "Ready",
}

const phaseCue: Record<Phase, string> = {
  inhale: "Breathe in",
  hold1:  "Hold gently",
  exhale: "Breathe out slowly",
  hold2:  "Rest and hold",
  rest:   "",
  idle:   "",
}

// Encouraging words spoken between cycles
const CYCLE_ENCOURAGEMENTS: Record<number, string> = {
  1: "Beautiful. Your nervous system is already listening. Rest here for a moment.",
  2: "You're doing so well. Notice how your breath has started to settle. Let that feeling deepen.",
  3: "Three cycles. Something is shifting — even if you can't fully feel it yet, your body is responding. Rest.",
  4: "You're halfway through. Stay right here with me. Each breath is doing something good.",
  5: "Five cycles. You're finding your rhythm now. Let the breath carry you. Just rest.",
  6: "You're doing beautifully. The body knows how to let go — you're just giving it permission. Rest a moment.",
  7: "Seven cycles. This is real care you're giving yourself. Stay with it.",
  8: "Almost there. One more round. You are calm. You are steady.",
  9: "Last one. Breathe fully into this final cycle. You deserve to feel this.",
}

const REST_DURATION = 4 // seconds of rest between cycles

const POST_EMOTIONS = [
  { emoji: "😌", label: "Calmer" },
  { emoji: "🌿", label: "Lighter" },
  { emoji: "💙", label: "Grateful" },
  { emoji: "🌤️", label: "Clearer" },
  { emoji: "😔", label: "Still anxious" },
]

export default function BreathePage() {
  const [selectedPattern, setSelectedPattern] = useState<Pattern>(patterns[0])
  const [sessionState, setSessionState]       = useState<SessionState>("idle")
  const [phase, setPhase]       = useState<Phase>("idle")
  const [countdown, setCountdown] = useState(0)
  const [cycles, setCycles]     = useState(0)
  const [postEmotion, setPostEmotion] = useState<string | null>(null)
  const [closureSpoken, setClosureSpoken] = useState(false)

  const { speak, prefetch, stop: stopSpeech, voiceEnabled, toggleVoice, voiceVolume, setVoiceVolume } = useTTS()
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
      const n = cyclesRef.current
      const closureMap: Record<number, string> = {
        1: "That's one complete cycle — and it matters. You chose to pause, to breathe, to come back to yourself. That is not a small thing. Sit here for a moment. Notice the quality of the air in your chest, the weight of your hands, the quiet behind your thoughts. You are more settled than when you started. When you're ready, consider writing down how you feel — even one sentence. It's worth capturing.",
        2: "Two cycles complete. Your breath has been your anchor, and you stayed with it. Right now, your nervous system is in a different place than when you began. That shift is real. Notice it. You deserve to feel it. When you carry this stillness into your day, it will ripple outward in ways you might not even see. Take a moment before you move on — and if something came up during the breathing, the journal is a wonderful place to let it land.",
        3: "Three full cycles. You gave yourself something real today. Feel the steadiness in your body — that's not luck, that's your own breath doing its work. This is what care for yourself looks like in practice. Not perfect, not dramatic — just showing up, one breath at a time. I want you to carry this feeling forward. If you'd like to go deeper, the journal is waiting. Or simply rest here a little longer. You've earned it.",
        4: "Four cycles. That took presence. That took patience. And you did it. Your heart rate has slowed, your mind has quieted, and your body has been heard. These are not small gifts. Take a breath now — your own breath, not guided — and notice what it feels like to breathe freely. You are grounded. You are here. When you're ready, consider writing or talking to Haven about what you're feeling in this moment. This is a good place to start from.",
        5: "Five cycles — that's a full session, and you stayed the whole way through. That means something. Breathwork takes trust — trust in the process, trust in yourself. You've just demonstrated both. Right now, in this stillness, you are not the same as when you started. Let that be enough. Let it be more than enough. When you're ready to keep going, the journal is a beautiful next step. Or come back to Haven — there's always more to explore.",
      }
      const affirmations = [
        "You are not broken. You are healing. And healing takes exactly the kind of courage you just showed.",
        "The fact that you showed up for yourself today — that's everything. Don't underestimate it.",
        "Stillness is not emptiness. It's the space where healing lives. You've just created some of it.",
        "You are worthy of peace. Not one day — right now, exactly as you are.",
        "Every time you breathe with intention, you are rewiring the way your body holds stress. You are changing, quietly and completely.",
      ]
      const fallback = `${n} breath cycles. You stayed present through all of it, and that is something to honor. Right now, in this quiet after the breath, you are holding something precious — a moment of stillness you created for yourself. ${affirmations[n % affirmations.length]} When you're ready, the journal is a beautiful place to let what surfaced today find its words.`
      const msg = closureMap[n] ?? fallback
      await speak(msg, { rate: 0.78, pitch: 0.88 })
    }
    setClosureSpoken(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak, stopSpeech])

  const reset = () => {
    stopBreathing()
    setCycles(0)
    cyclesRef.current = 0
    setPostEmotion(null)
    setClosureSpoken(false)
  }

  const voiceEnabledRef = useRef(voiceEnabled)
  useEffect(() => { voiceEnabledRef.current = voiceEnabled }, [voiceEnabled])

  const speakPhase = async (p: Phase) => {
    if (!voiceEnabledRef.current || !phaseCue[p]) return
    await speak(phaseCue[p], { rate: 0.78, pitch: 0.88 })
  }

  const tick = () => {
    if (abortedRef.current) return
    countRef.current -= 1
    if (countRef.current <= 0) {
      seqIndexRef.current = (seqIndexRef.current + 1) % sequenceRef.current.length

      if (seqIndexRef.current === 0) {
        // ── Cycle just completed — enter rest phase ──
        cyclesRef.current += 1
        setCycles(cyclesRef.current)

        const ONGOING_ENCOURAGEMENTS = [
          "Stay with it. You're doing beautifully.",
          "Each breath is a gift you're giving yourself.",
          "You are calm. You are steady. You are here.",
          "Let the breath carry you. There's nothing to hold onto.",
          "Presence is the practice. You have it.",
        ]
        const encouragement = CYCLE_ENCOURAGEMENTS[cyclesRef.current]
          ?? ONGOING_ENCOURAGEMENTS[(cyclesRef.current - 1) % ONGOING_ENCOURAGEMENTS.length]

        // Show rest visually
        phaseRef.current = "rest"
        setPhase("rest")
        setCountdown(REST_DURATION)
        countRef.current = REST_DURATION

        ;(async () => {
          if (abortedRef.current) return

          // Speak encouragement during the visual rest pause
          if (voiceEnabledRef.current) {
            await speak(encouragement, { rate: 0.78, pitch: 0.88 })
          }

          if (abortedRef.current) return

          // Tick down any remaining rest seconds after voice
          let restLeft = countRef.current - 1
          const restTick = () => {
            if (abortedRef.current) return
            if (restLeft <= 0) {
              // Transition to next cycle's first phase
              const next = sequenceRef.current[0]
              phaseRef.current = next.phase
              countRef.current = next.duration
              setPhase(next.phase)
              setCountdown(next.duration)
              void speakPhase(next.phase)
              timerRef.current = setTimeout(tick, 1000)
            } else {
              setCountdown(restLeft)
              restLeft -= 1
              timerRef.current = setTimeout(restTick, 1000)
            }
          }
          timerRef.current = setTimeout(restTick, 1000)
        })()
        return // exit — tick resumes after rest above
      }

      const next = sequenceRef.current[seqIndexRef.current]
      phaseRef.current = next.phase
      countRef.current = next.duration
      void speakPhase(next.phase)
      setPhase(next.phase)
      setCountdown(next.duration)
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
    void speakPhase(first.phase)
    setPhase(first.phase)
    setCountdown(first.duration)
    setSessionState("running")
    timerRef.current = setTimeout(tick, 1000)
  }

  const start = async () => {
    abortedRef.current = false
    cyclesRef.current  = 0
    setCycles(0)
    setPostEmotion(null)
    setClosureSpoken(false)
    setSessionState("intro")
    setPhase("idle")

    if (voiceEnabledRef.current) {
      // Warm TTS cache for all phase cues
      prefetch("Breathe in")
      prefetch("Hold gently")
      prefetch("Breathe out slowly")
      prefetch("Rest and hold")
      await speak(selectedPattern.intro, { rate: 0.78, pitch: 0.88 })
      await new Promise<void>((res) => setTimeout(res, 600))
    }

    if (abortedRef.current) return
    beginBreathingCycle()
  }

  useEffect(() => {
    return () => { clearTimer(); abortedRef.current = true }
  }, [])

  const circleScale    = phase === "inhale" ? 1.45 : phase === "exhale" ? 0.75 : 1.0
  const phaseDuration  = phase === "inhale" ? selectedPattern.inhale
    : phase === "exhale" ? selectedPattern.exhale
    : phase === "hold1"  ? selectedPattern.hold1
    : phase === "rest"   ? REST_DURATION
    : selectedPattern.hold2

  const isRunning = sessionState === "running"
  const isIntro   = sessionState === "intro"
  const isComplete = sessionState === "complete"

  const container: Variants = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.07 } },
  }
  const item: Variants = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
  }

  return (
    <div className="bg-background min-h-screen">
      <motion.div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-3 md:py-5" variants={container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="flex items-center justify-between mb-3" variants={item}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ChevronLeft className="h-4 w-4" />
            <HavenMark className="w-5 h-5" />
            <span className="font-serif font-semibold text-foreground tracking-tight">Haven</span>
          </Link>
          <h1 className="font-serif text-lg font-semibold text-foreground">Guided Breathing</h1>
          <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
            💜 Talk to Haven
          </Link>
        </motion.div>

        {/* Two-column grid */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start" variants={item}>

          {/* ── Main column ── */}
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

            {/* ── Completion screen ── */}
            <AnimatePresence mode="wait">
              {isComplete && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center text-center gap-6 py-6"
                >
                  {/* Gentle pulse orb */}
                  <motion.div
                    className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/40 to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Wind className="w-10 h-10 text-white/90" />
                  </motion.div>

                  <div>
                    <p className="font-serif text-2xl font-semibold text-foreground mb-1">
                      {cycles} {cycles === 1 ? "cycle" : "cycles"} complete
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                      {selectedPattern.name} · {closureSpoken
                        ? "Take a moment to sit with how you feel."
                        : "A word before you go…"}
                    </p>
                  </div>

                  {/* Emotional check */}
                  {closureSpoken && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                      className="w-full max-w-sm"
                    >
                      <p className="text-sm font-medium text-foreground mb-3">How are you feeling now?</p>
                      <div className="flex flex-wrap justify-center gap-2 mb-5">
                        {POST_EMOTIONS.map(({ emoji, label }) => (
                          <button
                            key={label}
                            onClick={() => setPostEmotion(label)}
                            className={cn(
                              "flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-medium transition-all",
                              postEmotion === label
                                ? "border-primary bg-primary/15 text-primary scale-[1.04]"
                                : "border-border/50 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            )}
                          >
                            <span>{emoji}</span>
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>

                      {postEmotion && (
                        <motion.div
                          key={postEmotion}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-5 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/15 text-center"
                        >
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {postEmotion === "Still anxious"
                              ? "That's okay — and it's honest. Anxiety doesn't always lift in one session. What matters is you showed up for yourself. Another round may help soften the edges, or you can simply rest here. Your body heard you, even if it doesn't feel like it yet."
                              : postEmotion === "Calmer"
                              ? "That calm is real — your breath created it. Carry it gently. If you'd like to capture what came up during your session, the journal is right here waiting for you."
                              : postEmotion === "Lighter"
                              ? "Something lifted. That happens when we stop holding our breath and finally let it move. Write about it if you can — what felt heavy before that feels a little less so now?"
                              : postEmotion === "Grateful"
                              ? "Gratitude after breathwork is a sign your nervous system has truly settled. That shift from tension to thankfulness — hold onto it. It's yours."
                              : "Clarity is a gift. When the noise quiets, what's real rises to the surface. This is a good moment to write — even one sentence before the clarity fades."
                            }
                          </p>
                        </motion.div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Link
                          href="/thoughts"
                          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
                        >
                          <Heart className="w-4 h-4" /> Journal this feeling
                        </Link>
                        <button
                          onClick={() => {
                            setSessionState("idle")
                            setCycles(0)
                            cyclesRef.current = 0
                            setPostEmotion(null)
                            setClosureSpoken(false)
                          }}
                          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border/50 text-foreground font-semibold text-sm hover:bg-muted/40 transition-all"
                        >
                          <RefreshCw className="w-4 h-4" /> Breathe again
                        </button>
                        <Link
                          href="/"
                          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border/30 text-muted-foreground text-sm hover:bg-muted/30 transition-all"
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
                <AnimatePresence>
                  {sessionState !== "idle" && (
                    <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="text-sm font-medium text-primary/70 mb-4">
                      {selectedPattern.name}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="relative flex items-center justify-center w-64 h-64 mb-6">
                  {/* Outer ambient ring */}
                  <motion.div className="absolute rounded-full" style={{ width: "100%", height: "100%" }}
                    animate={isIntro ? { scale: [1, 1.04, 1], opacity: [0.06, 0.12, 0.06] }
                      : phase === "rest" ? { scale: [1, 1.03, 1], opacity: [0.08, 0.14, 0.08] }
                      : { scale: 1, opacity: 0.1 }}
                    transition={isIntro || phase === "rest" ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : {}}>
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
                      scale: isIntro ? [1, 1.06, 1]
                        : phase === "rest" ? [1, 1.04, 1]
                        : isRunning ? circleScale : 1,
                    }}
                    transition={
                      isIntro ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
                      : phase === "rest" ? { duration: REST_DURATION, ease: "easeInOut" }
                      : {
                        duration: isRunning && phase !== "idle" ? phaseDuration : 0.5,
                        ease: phase === "inhale" ? "easeIn" : phase === "exhale" ? "easeOut" : "linear",
                      }
                    }
                  />

                  {/* Center label */}
                  <div className="absolute flex flex-col items-center px-4 text-center">
                    <AnimatePresence mode="wait">
                      {isIntro ? (
                        <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1">
                          <p className="text-white font-semibold text-sm drop-shadow leading-tight">Arriving…</p>
                          <div className="flex gap-1 mt-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div key={i} className="w-1 h-1 rounded-full bg-white/70"
                                animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.45 }} />
                            ))}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.p key={phase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.3 }} className="text-white font-semibold text-sm drop-shadow">
                          {phaseLabel[phase]}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {isRunning && phase !== "idle" && (
                      <motion.span key={countdown} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="text-white/90 text-2xl font-bold mt-1 drop-shadow">{countdown}</motion.span>
                    )}
                  </div>
                </div>

                {cycles > 0 && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {cycles} {cycles === 1 ? "cycle" : "cycles"} completed
                  </p>
                )}

                {/* Control buttons */}
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
                      <button
                        onClick={() => cycles > 0 ? void completeSession() : stopBreathing()}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-all duration-200"
                      >
                        <Pause className="w-4 h-4" /> End Session
                      </button>
                      <button onClick={reset} className="flex items-center gap-2 px-4 py-3 rounded-full border border-border/50 text-muted-foreground text-sm hover:bg-muted/30 transition-all duration-200">
                        <RotateCcw className="w-4 h-4" /> Reset
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

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
