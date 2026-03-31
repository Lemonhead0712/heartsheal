"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { QuizProgressIndicator } from "@/components/quiz-progress-indicator"

interface Step {
  id: string
  title: string
  description: string
  prompt: string
  emoji: string
}

const STEPS: Step[] = [
  {
    id: "acknowledge",
    title: "Acknowledge Your Pain",
    description:
      "The first step is simply noticing and naming what you're experiencing — without judgement.",
    prompt:
      "Take a deep breath and say to yourself: \"This is a moment of suffering. I am hurting right now, and that is real.\"",
    emoji: "💧",
  },
  {
    id: "common-humanity",
    title: "Common Humanity",
    description:
      "Suffering is a shared human experience. You are not alone in this feeling.",
    prompt:
      "Remind yourself: \"I am not the only one who has ever felt this way. Many others have hurt like this and found their way through.\"",
    emoji: "🌍",
  },
  {
    id: "self-kindness",
    title: "Offer Yourself Kindness",
    description:
      "Treat yourself with the same warmth you would offer a dear friend going through the same thing.",
    prompt:
      "Place your hand on your heart and say: \"May I be kind to myself. May I give myself the compassion I need. May I heal.\"",
    emoji: "💗",
  },
]

interface SelfCompassionPracticeProps {
  className?: string
}

export function SelfCompassionPractice({ className }: SelfCompassionPracticeProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [completed, setCompleted] = useState(false)

  const current = STEPS[step]

  const go = (dir: 1 | -1) => {
    setDirection(dir)
    const next = step + dir
    if (next >= STEPS.length) {
      setCompleted(true)
    } else if (next < 0) {
      return
    } else {
      setStep(next)
    }
  }

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("glass-card rounded-2xl p-8 text-center", className)}
      >
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-7 h-7 text-primary fill-primary/40" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
          Practice Complete
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You have shown yourself compassion today. That is a meaningful act of healing. Carry this
          gentleness with you.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => { setStep(0); setCompleted(false) }}
        >
          Practice Again
        </Button>
      </motion.div>
    )
  }

  return (
    <div className={cn("glass-card rounded-2xl p-6 space-y-5", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">Self-Compassion Practice</h3>
        <QuizProgressIndicator current={step + 1} total={STEPS.length} />
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: 24 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 * direction }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{current.emoji}</span>
            <h4 className="font-serif text-base font-semibold text-foreground">{current.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
          <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
            <p className="text-sm text-foreground/80 leading-relaxed italic">{current.prompt}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between items-center pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => go(-1)}
          disabled={step === 0}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button size="sm" onClick={() => go(1)} className="gap-1">
          {step === STEPS.length - 1 ? "Complete" : "Next"}
          {step < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}
