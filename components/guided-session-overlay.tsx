"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X, Minimize2, Wind, BookHeart, TrendingUp } from "lucide-react"
import { useGuidedSession, type StepId } from "@/contexts/guided-session-context"
import { useEmotionLogs } from "@/hooks/use-emotion-logs"

// ── Local emotion list (not imported from other modals) ───────────────────────
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

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEP_META: Record<StepId, { icon: React.ReactNode; heading: string; body: string; cta: string; href: string; color: string }> = {
  "emotion-checkin": {
    icon: null,
    heading: "How are you feeling right now?",
    body: "",
    cta: "",
    href: "",
    color: "",
  },
  breathe: {
    icon: <Wind className="w-5 h-5" />,
    heading: "Breathing for calm",
    body: "A simple breathing pattern can quiet anxiety in minutes. Take a few minutes with our guided session.",
    cta: "Open breathing session →",
    href: "/breathe",
    color: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
  },
  journal: {
    icon: <BookHeart className="w-5 h-5" />,
    heading: "Write it out",
    body: "Journaling helps you process what you're carrying. Even a few sentences can bring real clarity.",
    cta: "Write a reflection →",
    href: "/thoughts",
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  },
  insights: {
    icon: <TrendingUp className="w-5 h-5" />,
    heading: "See your progress",
    body: "Your Insights page tracks emotion trends, healing score, and journal activity over time.",
    cta: "See your progress →",
    href: "/insights",
    color: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
  },
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

  const { addEntry } = useEmotionLogs()
  const [pickedEmotion, setPickedEmotion] = useState<string | null>(null)

  // Reset local emotion pick when step changes
  const currentStep = steps[currentStepIndex]

  const handleEmotionPick = useCallback(
    async (label: string, emoji: string, intensity: number) => {
      if (pickedEmotion) return
      setPickedEmotion(label)
      await addEntry({ emotion: label, emoji, intensity, notes: "" })
      setTimeout(() => {
        setPickedEmotion(null)
        markStepComplete("emotion-checkin")
      }, 350)
    },
    [pickedEmotion, addEntry, markStepComplete],
  )

  const handleNavigationStep = useCallback(
    (id: StepId, href: string) => {
      markStepComplete(id)
      minimize()
      router.push(href)
    },
    [markStepComplete, minimize, router],
  )

  // Nothing to render when complete or not yet triggered
  if (isComplete) return null

  const STEP_ORDER: StepId[] = ["emotion-checkin", "breathe", "journal", "insights"]

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="gs-backdrop"
            className="fixed inset-0 z-[51] bg-foreground/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={minimize}
          />

          {/* Panel */}
          <motion.div
            key="gs-panel"
            className="fixed inset-x-4 bottom-[96px] md:bottom-6 md:right-6 md:left-auto md:w-[400px]
                       z-[52] bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2.5">
                {/* Pulsing orb */}
                <div className="relative w-7 h-7 shrink-0">
                  <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping"
                        style={{ animationDuration: "2.8s" }} />
                  <span className="relative w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-primary block z-10" />
                </div>
                <span className="text-xs font-semibold text-primary">Haven</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={minimize}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Minimise"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={dismiss}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Progress dots (guided phase only) ── */}
            {phase === "guided" && (
              <div className="flex items-center justify-center gap-1.5 pt-3 px-5">
                {STEP_ORDER.map((id, i) => {
                  const step = steps.find((s) => s.id === id)
                  const isCurrent = i === currentStepIndex
                  const isDone    = step?.status === "completed" || step?.status === "skipped"
                  const isSkipped = step?.status === "skipped"
                  return (
                    <span
                      key={id}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isDone && !isSkipped
                          ? "bg-primary w-4"
                          : isSkipped
                          ? "bg-muted-foreground/40 w-2.5"
                          : isCurrent
                          ? "bg-primary w-4 animate-pulse"
                          : "bg-border w-2.5"
                      }`}
                    />
                  )
                })}
              </div>
            )}

            {/* ── Content ── */}
            <div className="px-5 py-4">
              <AnimatePresence mode="wait">

                {/* INTRO */}
                {phase === "intro" && (
                  <motion.div
                    key="intro"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2 className="font-serif text-xl font-semibold text-foreground mb-2 leading-snug">
                      Hi, I'm Haven.
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      I'll guide you through 4 short experiences to help you settle in.
                      You can explore freely or skip anything — this is your space.
                    </p>
                    <button
                      onClick={advancePhaseToGuided}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors mb-2"
                    >
                      Let's begin
                    </button>
                    <button
                      onClick={minimize}
                      className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Explore freely →
                    </button>
                  </motion.div>
                )}

                {/* STEP 1 — Emotion check-in */}
                {phase === "guided" && currentStepIndex === 0 && (
                  <motion.div
                    key="step-emotion"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Step 1 of 4
                    </p>
                    <h2 className="font-serif text-lg font-semibold text-foreground mb-4 leading-snug">
                      How are you feeling right now?
                    </h2>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {EMOTIONS.map(({ label, emoji, intensity }) => (
                        <button
                          key={label}
                          disabled={!!pickedEmotion}
                          onClick={() => handleEmotionPick(label, emoji, intensity)}
                          className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all duration-200 ${
                            pickedEmotion === label
                              ? "border-primary/60 bg-primary/10"
                              : pickedEmotion
                              ? "border-border/30 opacity-40 cursor-default"
                              : "border-border/50 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                          }`}
                        >
                          <span className="text-xl leading-none">{emoji}</span>
                          <span className="text-[10px] font-medium text-muted-foreground leading-tight">
                            {label}
                          </span>
                        </button>
                      ))}
                    </div>
                    <StepFooter
                      onSkip={() => markStepSkipped("emotion-checkin")}
                      onMinimize={minimize}
                    />
                  </motion.div>
                )}

                {/* STEPS 2–4 — navigation steps */}
                {phase === "guided" && currentStepIndex >= 1 && currentStepIndex <= 3 && (() => {
                  const stepId = STEP_ORDER[currentStepIndex]
                  const meta   = STEP_META[stepId]
                  return (
                    <motion.div
                      key={`step-${stepId}`}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                        Step {currentStepIndex + 1} of 4
                      </p>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                          {meta.icon}
                        </div>
                        <h2 className="font-serif text-lg font-semibold text-foreground leading-snug">
                          {meta.heading}
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{meta.body}</p>
                      <button
                        onClick={() => handleNavigationStep(stepId, meta.href)}
                        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors mb-2"
                      >
                        {meta.cta}
                      </button>
                      <StepFooter
                        onSkip={() => markStepSkipped(stepId)}
                        onMinimize={minimize}
                      />
                    </motion.div>
                  )
                })()}

                {/* COMPLETE */}
                {phase === "guided" && currentStepIndex >= 4 && (
                  <motion.div
                    key="complete"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25 }}
                    className="text-center py-2"
                  >
                    <div className="text-4xl mb-3">💜</div>
                    <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
                      You're all set.
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                      Haven is always here. Come back anytime.
                    </p>
                    <button
                      onClick={dismiss}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Start healing →
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Shared step footer ────────────────────────────────────────────────────────
function StepFooter({ onSkip, onMinimize }: { onSkip: () => void; onMinimize: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onSkip}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        Skip for now
      </button>
      <button
        onClick={onMinimize}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        Explore freely →
      </button>
    </div>
  )
}
