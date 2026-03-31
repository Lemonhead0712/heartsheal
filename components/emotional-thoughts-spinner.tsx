"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

const THOUGHTS = [
  "I am allowed to feel everything I feel.",
  "Healing is not linear — and that's okay.",
  "I am worthy of love, including my own.",
  "This pain is temporary. I will get through it.",
  "I am not broken. I am healing.",
  "Every breath is a small act of courage.",
  "I can hold both grief and hope at the same time.",
  "My feelings are valid, even when they're hard.",
  "I am doing the best I can with what I have.",
  "I am more resilient than I realize.",
  "This moment will pass. I can endure.",
  "I deserve gentleness, especially from myself.",
]

interface EmotionalThoughtsSpinnerProps {
  className?: string
}

export function EmotionalThoughtsSpinner({ className }: EmotionalThoughtsSpinnerProps) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1)
      setIndex((i) => (i + 1) % THOUGHTS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const next = () => {
    setDirection(1)
    setIndex((i) => (i + 1) % THOUGHTS.length)
  }

  return (
    <div
      className={cn(
        "glass-card rounded-2xl px-6 py-6 text-center relative overflow-hidden",
        className,
      )}
    >
      {/* Decorative rotating ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-36 h-36 rounded-full border-2 border-primary/10 animate-breathe-ring" />
      </div>

      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-4">
        Healing Thought
      </p>

      <div className="min-h-[80px] flex items-center justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.p
            key={index}
            custom={direction}
            initial={{ opacity: 0, y: 16 * direction }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 * direction }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-base sm:text-lg text-foreground/90 italic leading-relaxed"
          >
            {THOUGHTS[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-3 mt-5">
        <div className="flex gap-1">
          {THOUGHTS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-full transition-all duration-300",
                i === index ? "w-3 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-border",
              )}
            />
          ))}
        </div>
        <button
          onClick={next}
          aria-label="Next thought"
          className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
