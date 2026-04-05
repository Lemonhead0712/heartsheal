"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  X, Minimize2, Wind, BookHeart, TrendingUp,
  Sparkles, Eye, EyeOff, RotateCcw, CheckCircle2,
} from "lucide-react"
import { useGuidedSession, type StepId } from "@/contexts/guided-session-context"
import { useEmotionLogs } from "@/hooks/use-emotion-logs"
import { useJournalEntries } from "@/hooks/use-journal-entries"
import { useTTS } from "@/hooks/use-speech"
import { useAuth } from "@/contexts/auth-context"
import { readStorage, STORAGE_KEYS } from "@/lib/storage"
import { cn } from "@/lib/utils"

// ── Local data ────────────────────────────────────────────────────────────────
const EMOTIONS = [
  { label: "Sad",      emoji: "😔", intensity: 3 },
  { label: "Anxious",  emoji: "😰", intensity: 4 },
  { label: "Numb",     emoji: "😶", intensity: 3 },
  { label: "Hopeful",  emoji: "🌱", intensity: 6 },
  { label: "Grateful", emoji: "🙏", intensity: 7 },
  { label: "Angry",    emoji: "😤", intensity: 5 },
  { label: "Calm",     emoji: "😌", intensity: 6 },
  { label: "Grief",    emoji: "💔", intensity: 2 },
]

const JOURNAL_PROMPTS = [
  "What feeling is taking up the most space in you right now?",
  "What would you say to a dear friend feeling exactly what you feel today?",
  "What is one small thing you can do today to honour where you are in your healing?",
  "If your current emotion had a colour, shape, and texture — what would it look like?",
]

// Emotion-specific journal prompts — used when user picks an emotion in step 1
const EMOTION_JOURNAL_PROMPTS: Record<string, string> = {
  "Sad":      "What does this sadness feel like in your body right now? What does it most need from you?",
  "Anxious":  "What is your anxiety trying to protect you from? What would you say to it with kindness?",
  "Numb":     "When did you last feel something clearly? What were you doing, and who were you with?",
  "Hopeful":  "What sparked this sense of hope today? How can you honour it and let it grow?",
  "Grateful": "What are you most grateful for right now? Who or what has held you recently?",
  "Angry":    "What is your anger telling you about what matters to you? What boundary needs honouring?",
  "Calm":     "What brought you to this calm? How can you return here when things feel harder?",
  "Grief":    "What are you grieving? If you could say one thing to what you've lost, what would it be?",
}

// Personalised breathing voice lines keyed by emotion label
const EMOTION_BREATH_LINES: Record<string, string> = {
  "Sad":      "Sadness holds a lot of weight. Let's use this breath to ease some of that heaviness, gently.",
  "Anxious":  "Anxiety lives in the breath. One cycle of box breathing can soften it — let's try together.",
  "Numb":     "When we feel numb, breath is an anchor. Let's use it to reconnect with yourself.",
  "Hopeful":  "You're feeling hopeful — let's breathe in and let that feeling settle even deeper in your body.",
  "Grateful": "Let's breathe in and let that gratitude really land. You deserve to feel this fully.",
  "Angry":    "Anger holds a lot of energy. Breathing helps you move through it rather than stay stuck in it.",
  "Calm":     "You're already calm — this breath will anchor that feeling so you can carry it with you.",
  "Grief":    "Grief is love with nowhere to go. Let's breathe gently and give it some space to move.",
}

const STEP_IDS: StepId[] = ["emotion-checkin", "breathe", "journal", "insights"]

const BREATHE_SEQ = [
  { phase: "inhale" as const, label: "Breathe In",  cue: "Breathe in",  dur: 4 },
  { phase: "hold1"  as const, label: "Hold",         cue: "Hold",        dur: 4 },
  { phase: "exhale" as const, label: "Breathe Out", cue: "Breathe out", dur: 4 },
  { phase: "hold2"  as const, label: "Hold",         cue: "Hold",        dur: 2 },
]

const HAVEN_CHIPS = [
  "Tell me about the breathing exercises",
  "Give me a journal prompt for today",
  "What should I focus on in my healing?",
  "I'm good for now",
]

// ── Voice lines per step ──────────────────────────────────────────────────────
const VOICE_LINES: Record<string, string> = {
  auth:     "Welcome to HeartsHeal. Sign in to save your healing journey and access it from any device.",
  intro:    "Hi, I'm Haven. I'll guide you through your first healing session — a check-in, a breath, a reflection, and a look at your progress. Let's go gently.",
  "step-0": "How are you feeling right now? Choose the emotion that feels most true in this moment.",
  "step-1": "Let's breathe together. Just one cycle. Press start and follow the circle.",
  "step-2": "Take a moment to write. Even a few words can bring real clarity.",
  "step-3": "Let's take a look at where you are. Every step you've taken here counts.",
  complete: "You've completed your first session with me. Is there anything else you'd like to explore today?",
}

// ── Shared slide animation ────────────────────────────────────────────────────
const SLIDE = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
  exit:    { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

// ── Component ─────────────────────────────────────────────────────────────────
export function GuidedSessionOverlay() {
  const router = useRouter()
  const {
    phase, steps, currentStepIndex,
    isVisible, isComplete,
    markStepComplete, markStepSkipped,
    minimize, dismiss, advancePhaseToGuided,
  } = useGuidedSession()

  const { user, signIn, signUp } = useAuth()
  const { addEntry } = useEmotionLogs()
  const { addEntry: addJournalEntry } = useJournalEntries()
  const { speak, stop: stopSpeech, prefetch, voiceEnabled } = useTTS()

  // ── Auth step ──────────────────────────────────────────────────────────────
  const [authSkipped,  setAuthSkipped]  = useState(false)
  const [authMode,     setAuthMode]     = useState<"signup" | "signin">("signup")
  const [authEmail,    setAuthEmail]    = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authShowPw,   setAuthShowPw]   = useState(false)
  const [authError,    setAuthError]    = useState<string | null>(null)
  const [authWorking,  setAuthWorking]  = useState(false)
  const [authDone,     setAuthDone]     = useState(false)

  const authStepVisible = phase === "intro" && !user && !authSkipped && !authDone

  const handleAuthSubmit = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Please enter your email and password.")
      return
    }
    setAuthWorking(true); setAuthError(null)
    const fn = authMode === "signin" ? signIn : signUp
    const { error } = await fn(authEmail.trim(), authPassword)
    setAuthWorking(false)
    if (error) { setAuthError(error) }
    else {
      setAuthDone(true)
      setTimeout(() => setAuthSkipped(true), 1600)
    }
  }

  useEffect(() => {
    if (user) setAuthSkipped(true)
  }, [user])

  // ── Step 1 — emotion ───────────────────────────────────────────────────────
  const [pickedEmotion,   setPickedEmotion]   = useState<string | null>(null)
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)

  const handleEmotionPick = useCallback(async (label: string, emoji: string, intensity: number) => {
    if (pickedEmotion) return
    setPickedEmotion(label)
    setSelectedEmotion(label)
    await addEntry({ emotion: label, emoji, intensity, notes: "" })
    setTimeout(() => {
      setPickedEmotion(null)
      markStepComplete("emotion-checkin")
    }, 400)
  }, [pickedEmotion, addEntry, markStepComplete])

  // ── Step 2 — breathing ─────────────────────────────────────────────────────
  const [breathePhase, setBreathePhase] = useState<"idle" | "inhale" | "hold1" | "exhale" | "hold2" | "done">("idle")
  const [breatheCount, setBreatheCount] = useState(0)
  const breatheInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const startMiniBreathing = useCallback(() => {
    let seqIdx = 0
    let count  = BREATHE_SEQ[0].dur
    setBreathePhase(BREATHE_SEQ[0].phase)
    setBreatheCount(count)
    speak(BREATHE_SEQ[0].cue, { rate: 0.82, pitch: 0.9 })

    breatheInterval.current = setInterval(() => {
      count -= 1
      setBreatheCount(count)
      if (count <= 0) {
        seqIdx += 1
        if (seqIdx >= BREATHE_SEQ.length) {
          clearInterval(breatheInterval.current!)
          breatheInterval.current = null
          setBreathePhase("done")
          return
        }
        const next = BREATHE_SEQ[seqIdx]
        count = next.dur
        setBreathePhase(next.phase)
        setBreatheCount(count)
        speak(next.cue, { rate: 0.82, pitch: 0.9 })
      }
    }, 1000)
  }, [speak])

  const clearBreathing = useCallback(() => {
    if (breatheInterval.current) { clearInterval(breatheInterval.current); breatheInterval.current = null }
    setBreathePhase("idle"); setBreatheCount(0)
  }, [])

  useEffect(() => {
    if (!isVisible) { clearBreathing(); stopSpeech() }
  }, [isVisible, clearBreathing, stopSpeech])

  useEffect(() => () => { if (breatheInterval.current) clearInterval(breatheInterval.current) }, [])

  // ── Step 3 — journal ───────────────────────────────────────────────────────
  const [journalFallback] = useState(() => JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)])
  // Uses emotion-specific prompt if user picked an emotion in step 1, else random fallback
  const journalPrompt = selectedEmotion
    ? (EMOTION_JOURNAL_PROMPTS[selectedEmotion] ?? journalFallback)
    : journalFallback
  const [journalText,   setJournalText]   = useState("")
  const [journalSaved,  setJournalSaved]  = useState(false)

  const saveJournal = useCallback(async () => {
    if (!journalText.trim()) return
    await addJournalEntry({ prompt: journalPrompt, entry: journalText.trim() })
    setJournalSaved(true)
    setTimeout(() => markStepComplete("journal"), 600)
  }, [journalText, journalPrompt, addJournalEntry, markStepComplete])

  // ── Step 4 — insights preview ──────────────────────────────────────────────
  const quickStats = (() => {
    if (typeof window === "undefined") return null
    const logs      = readStorage<{ emotion: string }[]>(STORAGE_KEYS.emotionLogs)      ?? []
    const journals  = readStorage<unknown[]>(STORAGE_KEYS.journalEntries)               ?? []
    const breathing = readStorage<unknown[]>(STORAGE_KEYS.breathingHistory)             ?? []
    return { logs: logs.length, journals: journals.length, breathing: breathing.length, recent: logs[0]?.emotion ?? null }
  })()

  // ── Completion conversation ────────────────────────────────────────────────
  const [completionReply,   setCompletionReply]   = useState<string | null>(null)
  const [completionLoading, setCompletionLoading] = useState(false)
  const [completionInput,   setCompletionInput]   = useState("")
  const [completionDone,    setCompletionDone]    = useState(false)

  const askHaven = useCallback(async (question: string) => {
    if (question === "I'm good for now") { dismiss(); return }
    setCompletionLoading(true); setCompletionReply(null)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 160,
          system: "You are Haven, a warm, compassionate AI guide in the HeartsHeal healing app. Give a brief, caring 2-3 sentence response. Be specific and warm. Speak directly to the person using 'you'. End with a gentle, actionable suggestion.",
          messages: [{ role: "user", content: question }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text?.trim() ?? "I'm here with you. Take your time."
      setCompletionReply(text)
      speak(text)
      setCompletionDone(true)
    } catch {
      setCompletionReply("I'm here with you. Take your time.")
    } finally {
      setCompletionLoading(false)
    }
  }, [dismiss, speak])

  // ── Voice: speak each step intro ──────────────────────────────────────────
  const lastSpokenKey = useRef<string | null>(null)

  useEffect(() => {
    if (!isVisible) return
    const key = authStepVisible
      ? "auth"
      : phase === "intro"
      ? "intro"
      : currentStepIndex >= STEP_IDS.length
      ? "complete"
      : `step-${currentStepIndex}`

    if (lastSpokenKey.current === key) return
    lastSpokenKey.current = key

    // Use emotion-personalised breathing line if the user picked an emotion
    let line: string | undefined
    if (key === "step-1" && selectedEmotion && EMOTION_BREATH_LINES[selectedEmotion]) {
      line = EMOTION_BREATH_LINES[selectedEmotion]
    } else {
      line = VOICE_LINES[key]
    }
    if (!line) return
    const t = setTimeout(() => speak(line!), 500)
    return () => clearTimeout(t)
  }, [phase, currentStepIndex, isVisible, authStepVisible, selectedEmotion, speak])

  // Prefetch breathing cues whenever overlay becomes visible (step 1 prep)
  useEffect(() => {
    if (!isVisible || !voiceEnabled) return
    BREATHE_SEQ.forEach((s) => prefetch(s.cue))
  }, [isVisible, voiceEnabled, prefetch])

  if (isComplete) return null

  const breatheCircleScale =
    breathePhase === "inhale" ? 1.5 :
    breathePhase === "exhale" ? 0.68 : 1.0
  const breatheDuration = BREATHE_SEQ.find((s) => s.phase === breathePhase)?.dur ?? 4

  return (
    <AnimatePresence>
      {isVisible && (

        // ══════════════════════════════════════════════════════════════════
        // INTRO / AUTH — full-screen immersive takeover
        // ══════════════════════════════════════════════════════════════════
        phase === "intro" ? (
          <motion.div
            key="gs-intro-screen"
            className="fixed inset-0 z-[52] flex flex-col items-center justify-center overflow-y-auto
                       bg-gradient-to-b from-rose-50 via-background to-background
                       dark:from-rose-950/30 dark:via-background dark:to-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
          >
            <AnimatePresence mode="wait">

              {/* ════ AUTH STEP ════ */}
              {authStepVisible && (
                <motion.div key="auth" {...SLIDE}
                  className="w-full max-w-sm mx-auto px-6 py-8 flex flex-col items-center text-center">
                  <div className="text-5xl mb-5">🌿</div>
                  <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-3 leading-snug">
                    Save your journey
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-xs">
                    Sign in to keep your progress across all your devices. Your data stays on this device until then.
                  </p>

                  <div className="w-full bg-card/80 backdrop-blur-sm rounded-2xl border border-border/40 p-5 shadow-lg">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 rounded-xl bg-muted/50 mb-4">
                      {(["signup", "signin"] as const).map((m) => (
                        <button key={m} onClick={() => { setAuthMode(m); setAuthError(null) }}
                          className={cn("flex-1 text-xs py-2 rounded-lg font-semibold transition-all",
                            authMode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                          {m === "signup" ? "Create Account" : "Sign In"}
                        </button>
                      ))}
                    </div>

                    {authDone ? (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center py-4 gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <p className="font-semibold text-sm text-foreground">
                          {authMode === "signup" ? "Account created! Check your email." : "Signed in!"}
                        </p>
                      </motion.div>
                    ) : (
                      <>
                        <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="Email address"
                          className="w-full rounded-xl border border-border/50 bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2.5" />
                        <div className="relative mb-4">
                          <input type={authShowPw ? "text" : "password"} value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()}
                            placeholder="Password"
                            className="w-full rounded-xl border border-border/50 bg-background px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                          <button type="button" onClick={() => setAuthShowPw((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {authShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {authError && <p className="text-xs text-destructive mb-3 text-left">{authError}</p>}
                        <button onClick={handleAuthSubmit} disabled={authWorking}
                          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 mb-3">
                          {authWorking ? "Please wait…" : authMode === "signup" ? "Create Account & Save Data" : "Sign In & Sync Data"}
                        </button>
                      </>
                    )}
                  </div>

                  <button onClick={() => setAuthSkipped(true)}
                    className="mt-5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                    Continue without saving →
                  </button>
                </motion.div>
              )}

              {/* ════ INTRO ════ */}
              {!authStepVisible && (
                <motion.div key="intro" {...SLIDE}
                  className="w-full max-w-md mx-auto px-6 py-8 flex flex-col items-center text-center">
                  {/* Large orb */}
                  <div className="relative w-32 h-32 mx-auto mb-8">
                    <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "3s" }} />
                    <span className="relative w-32 h-32 rounded-full bg-gradient-to-br from-rose-300 to-primary block z-10 shadow-2xl" />
                  </div>

                  <h2 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-snug">
                    Hi, I'm Haven.
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-sm">
                    I'll guide you through a check-in, a breathing moment, a reflection, and a look at your progress.
                    You can skip anything — this is your space.
                  </p>

                  {!user && (
                    <p className="text-sm text-muted-foreground/70 mb-5">
                      Continuing as guest ·{" "}
                      <button onClick={() => { setAuthSkipped(false); setAuthDone(false) }}
                        className="text-primary hover:underline">
                        Sign in to save data
                      </button>
                    </p>
                  )}

                  <button onClick={advancePhaseToGuided}
                    className="w-full max-w-xs py-4 rounded-2xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-colors shadow-lg mb-3">
                    Let's begin
                  </button>
                  <button onClick={minimize}
                    className="py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Explore freely →
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>

        ) : (

        // ══════════════════════════════════════════════════════════════════
        // GUIDED STEPS — large centered panel with strong backdrop
        // ══════════════════════════════════════════════════════════════════
        <>
          {/* Backdrop */}
          <motion.div
            key="gs-backdrop"
            className="fixed inset-0 z-[51] bg-foreground/50 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={minimize}
          />

          {/* Panel container — full-screen mobile, centered large card desktop */}
          <div className="fixed inset-0 z-[52] flex items-center justify-center md:p-6 pointer-events-none">
            <motion.div
              key="gs-panel"
              className="bg-card border-0 md:border md:border-border/40
                         rounded-none md:rounded-3xl shadow-2xl
                         w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh]
                         overflow-y-auto pointer-events-auto flex flex-col"
              style={{ scrollbarWidth: "none" }}
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >

              {/* ── Header ── */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/20 sticky top-0 bg-card/95 backdrop-blur-sm z-10 md:rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 shrink-0">
                    <span className="absolute inset-0 rounded-full bg-primary/25 animate-ping" style={{ animationDuration: "2.6s" }} />
                    <span className="relative w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-primary block z-10 shadow-md" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Haven</p>
                    <p className="text-[11px] text-muted-foreground">Your healing guide</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={minimize}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    aria-label="Minimise">
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button onClick={dismiss}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── Progress dots (guided phase only) ── */}
              {currentStepIndex < STEP_IDS.length && (
                <div className="flex items-center justify-center gap-2.5 pt-5 px-8">
                  {STEP_IDS.map((id, i) => {
                    const step = steps.find((s) => s.id === id)
                    const isCurrent = i === currentStepIndex
                    const isDone    = step?.status === "completed"
                    const isSkipped = step?.status === "skipped"
                    return (
                      <span key={id} className={cn(
                        "h-1.5 rounded-full transition-all duration-400",
                        isDone    ? "bg-primary w-6" :
                        isSkipped ? "bg-muted-foreground/35 w-3" :
                        isCurrent ? "bg-primary w-6 animate-pulse" :
                                    "bg-border w-3"
                      )} />
                    )
                  })}
                </div>
              )}

              {/* ── Step content ── */}
              <div className="flex-1 px-8 pb-8 pt-5">
                <AnimatePresence mode="wait">

                  {/* ════ STEP 1 — Emotion ════ */}
                  {currentStepIndex === 0 && (
                    <motion.div key="step-emotion" {...SLIDE}>
                      <StepLabel n={1} />
                      <h2 className="font-serif text-2xl font-semibold text-foreground mb-1 leading-snug">
                        How are you feeling right now?
                      </h2>
                      <p className="text-sm text-muted-foreground mb-6">Choose the emotion that feels most true in this moment.</p>
                      <div className="grid grid-cols-4 gap-3 mb-6">
                        {EMOTIONS.map(({ label, emoji, intensity }) => (
                          <button key={label} disabled={!!pickedEmotion}
                            onClick={() => handleEmotionPick(label, emoji, intensity)}
                            className={cn(
                              "flex flex-col items-center gap-2 py-4 rounded-2xl border text-center transition-all duration-200",
                              pickedEmotion === label
                                ? "border-primary/60 bg-primary/10 scale-95"
                                : pickedEmotion
                                ? "border-border/30 opacity-40 cursor-default"
                                : "border-border/50 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                            )}>
                            <span className="text-2xl leading-none">{emoji}</span>
                            <span className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</span>
                          </button>
                        ))}
                      </div>
                      <StepFooter onSkip={() => markStepSkipped("emotion-checkin")} onMinimize={minimize} />
                    </motion.div>
                  )}

                  {/* ════ STEP 2 — Breathing ════ */}
                  {currentStepIndex === 1 && (
                    <motion.div key="step-breathe" {...SLIDE}>
                      <StepLabel n={2} />
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0">
                          <Wind className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                        </div>
                        <h2 className="font-serif text-2xl font-semibold text-foreground leading-snug">
                          {selectedEmotion ? `Breathing through ${selectedEmotion.toLowerCase()}` : "Breathing for calm"}
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                        {selectedEmotion && EMOTION_BREATH_LINES[selectedEmotion]
                          ? EMOTION_BREATH_LINES[selectedEmotion]
                          : "One cycle of box breathing. Press start and follow the circle — breathe with me."
                        }
                      </p>

                      {/* Breathing circle */}
                      <div className="flex flex-col items-center my-4">
                        <div className="relative w-44 h-44 flex items-center justify-center mb-5">
                          <motion.div
                            className="absolute rounded-full bg-sky-100 dark:bg-sky-900/30"
                            style={{ width: "100%", height: "100%" }}
                            animate={{ scale: breathePhase !== "idle" && breathePhase !== "done" ? breatheCircleScale : 1 }}
                            transition={{ duration: breatheDuration, ease: breathePhase === "inhale" ? "easeIn" : breathePhase === "exhale" ? "easeOut" : "linear" }}
                          />
                          <motion.div
                            className="rounded-full bg-gradient-to-br from-sky-300 to-sky-500 shadow-lg z-10"
                            style={{ width: "80px", height: "80px" }}
                            animate={{ scale: breathePhase !== "idle" && breathePhase !== "done" ? breatheCircleScale : 1 }}
                            transition={{ duration: breatheDuration, ease: breathePhase === "inhale" ? "easeIn" : breathePhase === "exhale" ? "easeOut" : "linear" }}
                          />
                          <div className="absolute z-20 flex flex-col items-center">
                            {breathePhase !== "idle" && breathePhase !== "done" && (
                              <>
                                <p className="text-white text-xs font-semibold drop-shadow">
                                  {BREATHE_SEQ.find((s) => s.phase === breathePhase)?.label}
                                </p>
                                <p className="text-white/80 text-2xl font-bold drop-shadow">{breatheCount}</p>
                              </>
                            )}
                          </div>
                        </div>

                        {breathePhase === "idle" && (
                          <button onClick={startMiniBreathing}
                            className="px-8 py-3 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition-colors">
                            Start breathing
                          </button>
                        )}
                        {breathePhase === "done" && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-3">✓ Well done.</p>
                            <button onClick={() => markStepComplete("breathe")}
                              className="px-8 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                              Continue →
                            </button>
                          </motion.div>
                        )}
                      </div>

                      <StepFooter onSkip={() => { clearBreathing(); markStepSkipped("breathe") }} onMinimize={minimize} />
                    </motion.div>
                  )}

                  {/* ════ STEP 3 — Journal ════ */}
                  {currentStepIndex === 2 && (
                    <motion.div key="step-journal" {...SLIDE}>
                      <StepLabel n={3} />
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                          <BookHeart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h2 className="font-serif text-2xl font-semibold text-foreground leading-snug">
                          {selectedEmotion ? `Reflecting on your ${selectedEmotion.toLowerCase()}` : "Write it out"}
                        </h2>
                      </div>
                      <div className="bg-primary/6 rounded-xl px-4 py-3 mb-4 border border-primary/15">
                        <p className="text-sm text-foreground/80 font-serif italic">"{journalPrompt}"</p>
                      </div>
                      <textarea
                        value={journalText}
                        onChange={(e) => setJournalText(e.target.value)}
                        placeholder="Take your time. Write whatever comes…"
                        rows={5}
                        className="w-full rounded-xl border border-border/40 bg-background px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
                      />
                      {journalSaved ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-3">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Saved to your journal
                        </p>
                      ) : (
                        <button onClick={saveJournal} disabled={!journalText.trim()}
                          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors mb-3">
                          Save reflection
                        </button>
                      )}
                      <StepFooter onSkip={() => markStepSkipped("journal")} onMinimize={minimize} />
                    </motion.div>
                  )}

                  {/* ════ STEP 4 — Insights preview ════ */}
                  {currentStepIndex === 3 && (
                    <motion.div key="step-insights" {...SLIDE}>
                      <StepLabel n={4} />
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <h2 className="font-serif text-2xl font-semibold text-foreground leading-snug">Your progress</h2>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                        Every action you take here contributes to your healing journey. Here's where you are today.
                      </p>

                      <div className="grid grid-cols-3 gap-4 mb-5">
                        {[
                          { label: "Emotions logged",    value: quickStats?.logs      ?? 0, icon: "💜" },
                          { label: "Journal entries",    value: quickStats?.journals   ?? 0, icon: "📖" },
                          { label: "Breathing sessions", value: quickStats?.breathing ?? 0, icon: "🌬️" },
                        ].map(({ label, value, icon }) => (
                          <div key={label} className="glass-card rounded-2xl p-4 text-center">
                            <p className="text-3xl mb-1">{icon}</p>
                            <p className="text-2xl font-bold text-foreground">{value}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
                          </div>
                        ))}
                      </div>

                      {quickStats?.recent && (
                        <p className="text-xs text-muted-foreground mb-5 text-center">
                          Last emotion logged: <span className="text-foreground font-medium">{quickStats.recent}</span>
                        </p>
                      )}

                      <button onClick={() => { markStepComplete("insights"); minimize(); router.push("/insights") }}
                        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors mb-3">
                        View full insights →
                      </button>
                      <StepFooter onSkip={() => markStepSkipped("insights")} onMinimize={minimize} />
                    </motion.div>
                  )}

                  {/* ════ COMPLETION ════ */}
                  {currentStepIndex >= STEP_IDS.length && (
                    <motion.div key="complete" {...SLIDE} className="py-2">
                      <div className="text-center mb-6">
                        <div className="text-6xl mb-4">💜</div>
                        <h2 className="font-serif text-2xl font-semibold text-foreground mb-2 leading-snug">
                          You've done your first session.
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Is there anything else you'd like to explore today?
                        </p>
                      </div>

                      {!completionReply && !completionLoading && !completionDone && (
                        <div className="grid grid-cols-2 gap-3 mb-5">
                          {HAVEN_CHIPS.map((chip) => (
                            <button key={chip} onClick={() => askHaven(chip)}
                              className={cn(
                                "text-left px-4 py-3 rounded-xl border text-xs font-medium transition-all duration-200",
                                chip === "I'm good for now"
                                  ? "border-border/50 text-muted-foreground hover:bg-muted/40"
                                  : "border-primary/25 bg-primary/5 text-foreground hover:bg-primary/10 hover:border-primary/40"
                              )}>
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}

                      {completionLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                          <RotateCcw className="w-3.5 h-3.5 animate-spin shrink-0" />
                          Haven is thinking…
                        </div>
                      )}

                      {completionReply && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/60 flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-3 h-3" /> Haven
                          </p>
                          <p className="text-sm text-foreground/90 leading-relaxed font-serif italic">"{completionReply}"</p>
                          <button onClick={() => { setCompletionReply(null); setCompletionDone(false) }}
                            className="text-xs text-primary/70 hover:text-primary transition-colors mt-2">
                            Ask something else →
                          </button>
                        </motion.div>
                      )}

                      {!completionLoading && (
                        <div className="flex gap-2 mt-2">
                          <input
                            value={completionInput}
                            onChange={(e) => setCompletionInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && completionInput.trim()) { askHaven(completionInput.trim()); setCompletionInput("") } }}
                            placeholder="Ask Haven anything…"
                            className="flex-1 rounded-xl border border-border/50 bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            onClick={() => { if (completionInput.trim()) { askHaven(completionInput.trim()); setCompletionInput("") } }}
                            disabled={!completionInput.trim()}
                            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0">
                            Ask
                          </button>
                        </div>
                      )}

                      <button onClick={dismiss}
                        className="w-full mt-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        I'm done for now →
                      </button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

            </motion.div>
          </div>
        </>
        )
      )}
    </AnimatePresence>
  )
}

// ── Shared step sub-components ────────────────────────────────────────────────
function StepLabel({ n }: { n: number }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
      Step {n} of 4
    </p>
  )
}

function StepFooter({ onSkip, onMinimize }: { onSkip: () => void; onMinimize: () => void }) {
  return (
    <div className="flex items-center justify-between pt-2 mt-1">
      <button onClick={onSkip}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
        Skip for now
      </button>
      <button onClick={onMinimize}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
        Explore freely →
      </button>
    </div>
  )
}
