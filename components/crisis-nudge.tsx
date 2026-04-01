"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, X } from "lucide-react"
import Link from "next/link"
import { readStorage, STORAGE_KEYS } from "@/lib/storage"
import type { EmotionEntry } from "@/hooks/use-emotion-logs"

const DISTRESS_WORDS = [
  "hopeless", "worthless", "suicidal", "give up", "can't go on",
  "alone", "empty", "numb", "desperate", "broken", "exhausted",
  "hate myself", "no point", "falling apart",
]

function detectDistress(logs: EmotionEntry[]): boolean {
  if (!logs.length) return false
  const cutoff = Date.now() - 24 * 60 * 60 * 1000 // last 24h
  const recent = logs.filter((l) => new Date(l.timestamp).getTime() > cutoff)

  // 3+ high-intensity logs in 24h
  const highIntensity = recent.filter((l) => l.intensity >= 7)
  if (highIntensity.length >= 3) return true

  // Any distress keyword in recent logs
  const hasKeyword = recent.some((l) =>
    DISTRESS_WORDS.some((w) => l.emotion.toLowerCase().includes(w))
  )
  return hasKeyword
}

export function CrisisNudge() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const logs = readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? []
    if (detectDistress(logs)) {
      const t = setTimeout(() => setVisible(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="bg-card border border-primary/20 rounded-2xl shadow-xl px-5 py-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="w-4 h-4 text-primary fill-primary/20" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground mb-0.5">
                It sounds like you're carrying something heavy.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Haven is here whenever you're ready to talk. You don't have to go through this alone.
              </p>
              <div className="flex gap-2">
                <Link
                  href="/companion"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Talk to Haven
                </Link>
                <a
                  href="tel:988"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border/60 text-foreground hover:bg-muted/50 transition-colors"
                >
                  Call 988
                </a>
              </div>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
