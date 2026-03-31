"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, RefreshCw } from "lucide-react"

interface Props {
  breathingPattern?: string
  className?: string
}

const staticAffirmations = [
  "Right now, your breath is your anchor. You don't need to fix anything — just breathe.",
  "Whatever weight you're carrying, you can set it down for just these few minutes.",
  "You are safe in this moment. Your nervous system is ready to find calm.",
  "Grief is love with nowhere to go. Let your breath be a gentle place for it to rest.",
  "You don't have to be okay. You just have to breathe.",
  "Each exhale releases what you no longer need to hold. You are allowed to let go.",
  "This moment belongs only to you. Breathe in. Breathe out. You're doing beautifully.",
]

export function AiBreathingAffirmation({ breathingPattern, className }: Props) {
  const [affirmation, setAffirmation] = useState<string>("")
  const [isLoading, setIsLoading]     = useState(false)
  const [useAI, setUseAI]             = useState(false)

  // Load a static affirmation immediately on mount
  useEffect(() => {
    const random = staticAffirmations[Math.floor(Math.random() * staticAffirmations.length)]
    setAffirmation(random)
  }, [])

  const generateAIAffirmation = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: `You write brief, compassionate grounding affirmations for people about to do a breathing exercise. They may be grieving, anxious, heartbroken, or in emotional pain.

Rules:
- 1-2 sentences maximum
- Acknowledge pain gently before offering hope
- Ground them in the present breath
- Warm, human, never clinical or preachy
- Output ONLY the affirmation, no preamble`,
          messages: [
            {
              role: "user",
              content: breathingPattern
                ? `Write a compassionate grounding affirmation for someone about to do ${breathingPattern} breathing. They may be going through loss or emotional pain.`
                : "Write a compassionate grounding affirmation for someone about to start a breathing exercise. They may be going through loss or emotional pain."
            }
          ],
        }),
      })
      if (!response.ok) throw new Error()
      const data = await response.json()
      const text = data.content?.[0]?.text?.trim()
      if (text) {
        setAffirmation(text)
        setUseAI(true)
      }
    } catch {
      // Silently fall back to static
    } finally {
      setIsLoading(false)
    }
  }

  const refreshStatic = () => {
    const current = affirmation
    let next = staticAffirmations[Math.floor(Math.random() * staticAffirmations.length)]
    // Avoid same one twice
    while (next === current && staticAffirmations.length > 1) {
      next = staticAffirmations[Math.floor(Math.random() * staticAffirmations.length)]
    }
    setAffirmation(next)
    setUseAI(false)
  }

  if (!affirmation) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <div className="glass-card rounded-2xl px-5 py-4 relative group">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <Heart className="w-3.5 h-3.5 text-primary fill-primary/25" />
          </div>
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.p
                key={affirmation}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="font-serif text-sm text-foreground/85 leading-relaxed italic"
              >
                {affirmation}
              </motion.p>
            </AnimatePresence>
            {useAI && (
              <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-medium">✨ Personalized by Haven AI</p>
            )}
          </div>

          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={refreshStatic}
              title="New affirmation"
              className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle AI option */}
      {!useAI && (
        <div className="flex justify-end mt-1.5">
          <button
            onClick={generateAIAffirmation}
            disabled={isLoading}
            className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-1"
          >
            {isLoading
              ? <><RefreshCw className="w-2.5 h-2.5 animate-spin" /> Personalizing…</>
              : <>✨ Personalize with Haven AI</>
            }
          </button>
        </div>
      )}
    </motion.div>
  )
}
