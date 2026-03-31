"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { QuizProgressIndicator } from "@/components/quiz-progress-indicator"

interface Question {
  id: string
  text: string
  options: { label: string; value: number }[]
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "How would you describe your overall emotional state right now?",
    options: [
      { label: "Very heavy / overwhelmed", value: 1 },
      { label: "Somewhat low", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Somewhat okay", value: 4 },
      { label: "Calm and grounded", value: 5 },
    ],
  },
  {
    id: "q2",
    text: "How connected do you feel to yourself today?",
    options: [
      { label: "Very disconnected", value: 1 },
      { label: "A little distant", value: 2 },
      { label: "Somewhat present", value: 3 },
      { label: "Mostly connected", value: 4 },
      { label: "Fully present", value: 5 },
    ],
  },
  {
    id: "q3",
    text: "How much self-compassion have you shown yourself lately?",
    options: [
      { label: "Very little — I've been harsh on myself", value: 1 },
      { label: "Some, but struggling", value: 2 },
      { label: "A moderate amount", value: 3 },
      { label: "Quite a bit", value: 4 },
      { label: "Practicing consistently", value: 5 },
    ],
  },
  {
    id: "q4",
    text: "How well are you caring for your basic needs (sleep, food, rest)?",
    options: [
      { label: "Neglecting them", value: 1 },
      { label: "Struggling to keep up", value: 2 },
      { label: "Managing okay", value: 3 },
      { label: "Taking care of myself", value: 4 },
      { label: "Prioritizing them well", value: 5 },
    ],
  },
]

interface EmotionalSurveyProps {
  onComplete: () => void
  className?: string
}

export function EmotionalSurvey({ onComplete, className }: EmotionalSurveyProps) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<number | null>(null)

  const question = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1

  const handleNext = () => {
    if (selected === null) return
    const updated = { ...answers, [question.id]: selected }
    setAnswers(updated)
    setSelected(null)

    if (isLast) {
      onComplete()
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <div className={cn("glass-card rounded-2xl p-6 space-y-5", className)}>
      <QuizProgressIndicator current={step + 1} total={QUESTIONS.length} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <p className="text-sm font-medium text-foreground leading-relaxed">{question.text}</p>
          <div className="space-y-2">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-150 border",
                  selected === opt.value
                    ? "bg-primary/10 border-primary/40 text-foreground font-medium"
                    : "bg-surface border-border/40 text-foreground/80 hover:bg-accent/50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <Button onClick={handleNext} disabled={selected === null} className="w-full">
        {isLast ? "Complete" : "Next"}
      </Button>
    </div>
  )
}
