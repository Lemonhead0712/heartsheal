"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Flame, Sparkles } from "lucide-react"
import { HavenMark } from "@/components/logo-mark"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { readHavenFlow, advanceHavenFlow, TOOL_HREFS } from "@/lib/haven-flow"
import { HavenFlowGuide } from "@/components/haven-flow-guide"

type Step = 1 | 2 | 3 | 4 | 5

const EMOTIONS = [
  { label: "Relieved",         emoji: "😮‍💨" },
  { label: "Lighter",          emoji: "🕊️" },
  { label: "Sad",              emoji: "😔" },
  { label: "Numb",             emoji: "😶" },
  { label: "Still processing", emoji: "🌀" },
]

export default function BurnLetterPage() {
  const router                 = useRouter()
  const [step,     setStep]    = useState<Step>(1)
  const [letter,   setLetter]  = useState("")
  const [emotion,  setEmotion] = useState<string | null>(null)
  const [inFlow,   setInFlow]  = useState(false)
  const textareaRef            = useRef<HTMLTextAreaElement>(null)

  // Detect flow mode on mount — if Haven flow is active for this tool, skip intro
  useEffect(() => {
    const flow = readHavenFlow()
    if (flow && flow.sequence[flow.currentIndex] === "burn") {
      setInFlow(true)
      setStep(2) // jump straight to write
    }
  }, [])

  // Autofocus textarea when step 2 mounts
  useEffect(() => {
    if (step === 2) setTimeout(() => textareaRef.current?.focus(), 300)
  }, [step])

  // Auto-advance from burn animation after 3 seconds
  useEffect(() => {
    if (step !== 4) return
    const t = setTimeout(() => setStep(5), 3200)
    return () => clearTimeout(t)
  }, [step])

  const handleEmotionPick = (label: string) => {
    setEmotion(label)
    // Save burn letter record for milestones
    const prev = readStorage<any[]>(STORAGE_KEYS.burnLetters) ?? []
    writeStorage(STORAGE_KEYS.burnLetters, [
      ...prev,
      { id: Date.now().toString(), completedAt: new Date().toISOString(), emotion: label },
    ])
    setTimeout(() => {
      const flow = readHavenFlow()
      if (flow && flow.sequence[flow.currentIndex] === "burn") {
        const next = advanceHavenFlow()
        router.push(next ? TOOL_HREFS[next] : "/insights?flow=done")
      } else {
        router.push("/")
      }
    }, 900)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className={`w-full max-w-lg mx-auto px-4 py-6 flex flex-col flex-1 ${inFlow ? "pb-52" : ""}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <HavenMark className="w-6 h-6" />
            <span className="font-serif text-[15px] font-semibold text-foreground tracking-tight">Haven</span>
          </Link>
          <div className="flex items-center gap-1.5 text-muted-foreground/60 text-sm">
            <Flame className="w-4 h-4" />
            <span className="font-serif">Burn Letter</span>
          </div>
        </div>

        {/* Flow context banner — shown when inside Haven's guided flow */}
        {inFlow && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3 mb-5"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-xs text-primary/80 leading-relaxed">
              <span className="font-semibold">Haven's flow.</span> Write whatever you need to release — it stays between you and the flame.
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* ── Step 1: Intro (standalone only) ── */}
          {step === 1 && !inFlow && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col flex-1"
            >
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">🔥</div>
                <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">Burn Letter</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A private practice for letting go.
                </p>
              </div>

              <div className="flex flex-col gap-5 mb-10">
                <div className="bg-card/60 border border-border/40 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">What to write</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Write directly to whoever or whatever is weighing on you — a person, a version of yourself, a situation, a feeling. Say what you've never been able to say out loud. There are no rules, no judgment, no one watching.
                  </p>
                </div>
                <div className="bg-card/60 border border-border/40 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Why it helps</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Writing externalises what lives inside us. When we put it into words and then release it, we create distance between ourselves and the weight we've been carrying. The act of burning is a ritual of completion.
                  </p>
                </div>
                <div className="bg-card/60 border border-border/40 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">What happens after</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Your letter is never stored anywhere. Once you choose to burn it, it disappears entirely — seen only by you, held only by you, released only by you.
                  </p>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Flame className="w-4 h-4" />
                  I'm ready to write
                </button>
                <Link
                  href="/"
                  className="w-full py-2.5 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Not today
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Write ── */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col flex-1"
            >
              <div className="mb-4">
                <h2 className="font-serif text-2xl font-semibold text-foreground mb-1">
                  {inFlow ? "Write your letter" : "Your letter"}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {inFlow
                    ? "Say what you need to say. No filter, no rules — just you and the page."
                    : "Write to whoever or whatever you need to release. No judgment, no filter."}
                </p>
              </div>

              <textarea
                ref={textareaRef}
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                placeholder="Dear…"
                className="flex-1 w-full min-h-[260px] bg-card/60 border border-border/40 rounded-2xl p-5 text-sm text-foreground placeholder:text-muted-foreground/50 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />

              <div className="flex items-center justify-between mt-3 mb-5">
                <span className="text-xs text-muted-foreground/60">{letter.length} characters</span>
                {letter.trim().length > 0 && (
                  <span className="text-xs text-muted-foreground/60">Take your time</span>
                )}
              </div>

              <div className="flex gap-3">
                {!inFlow && (
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 rounded-2xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={() => setStep(3)}
                  disabled={!letter.trim()}
                  className="flex-1 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                >
                  Continue →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Preview ── */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-col flex-1"
            >
              <div className="mb-5">
                <h2 className="font-serif text-2xl font-semibold text-foreground mb-1">Read it one last time</h2>
                <p className="text-sm text-muted-foreground">Are you ready to let this go?</p>
              </div>

              <div className="flex-1 bg-card/60 border border-border/40 rounded-2xl p-5 mb-6 overflow-y-auto max-h-[320px]">
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-serif italic">
                  {letter}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setStep(4)}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  🔥 Burn it
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Edit
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Burn animation ── */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col flex-1 items-center justify-center gap-8"
            >
              {/* Flame */}
              <motion.div
                animate={{ scale: [1, 1.25, 1, 1.18, 1], rotate: [0, -3, 3, -2, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="text-7xl select-none"
              >
                🔥
              </motion.div>

              {/* Letter text fading + blurring away */}
              <motion.div
                initial={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                animate={{ opacity: 0, filter: "blur(12px)", scale: 0.88 }}
                transition={{ duration: 2.8, ease: "easeIn", delay: 0.3 }}
                className="w-full max-w-sm bg-card/40 border border-border/30 rounded-2xl p-5 max-h-40 overflow-hidden"
              >
                <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap font-serif italic line-clamp-5">
                  {letter}
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 3, times: [0, 0.2, 0.8, 1] }}
                className="text-sm text-muted-foreground font-serif tracking-wide"
              >
                Releasing…
              </motion.p>
            </motion.div>
          )}

          {/* ── Step 5: Complete ── */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col flex-1"
            >
              <div className="text-center mb-8 mt-6">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.1 }}
                  className="text-5xl mb-5 select-none"
                >
                  🕊️
                </motion.div>
                <h2 className="font-serif text-2xl font-semibold text-foreground mb-3">It's gone.</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Whatever you wrote no longer needs to live in your body. You gave it a place to go.
                </p>
              </div>

              <div className="mb-6">
                <p className="text-xs text-muted-foreground text-center mb-4 uppercase tracking-wide">How do you feel right now?</p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {EMOTIONS.map(({ label, emoji }) => (
                    <button
                      key={label}
                      onClick={() => handleEmotionPick(label)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm font-medium transition-all active:scale-95 ${
                        emotion === label
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/50 bg-card/60 text-foreground hover:border-primary/50 hover:bg-primary/8 hover:text-primary"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {!inFlow && (
                <div className="mt-auto">
                  <Link
                    href="/"
                    className="w-full flex items-center justify-center py-3 rounded-2xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    Back to Haven
                  </Link>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <HavenFlowGuide
        currentTool="burn"
        showContinue={false}
        exerciseData={emotion ? `User felt ${emotion} after writing and burning their letter.` : undefined}
      />
    </div>
  )
}
