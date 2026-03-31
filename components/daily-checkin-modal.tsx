"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2 } from "lucide-react"
import { writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { useEmotionLogs } from "@/hooks/use-emotion-logs"

const EMOTIONS = [
  { emoji: "😔", label: "Sad",        intensity: 6 },
  { emoji: "😟", label: "Anxious",    intensity: 7 },
  { emoji: "😠", label: "Frustrated", intensity: 6 },
  { emoji: "😶", label: "Numb",       intensity: 5 },
  { emoji: "😌", label: "Calm",       intensity: 3 },
  { emoji: "🙂", label: "Okay",       intensity: 4 },
  { emoji: "✨", label: "Hopeful",    intensity: 3 },
  { emoji: "💛", label: "Grateful",   intensity: 2 },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function DailyCheckinModal({ open, onClose }: Props) {
  const { addEntry } = useEmotionLogs()
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone]         = useState(false)

  const handleSelect = async (emotion: typeof EMOTIONS[0]) => {
    setSelected(emotion.label)
    await addEntry({ emotion: emotion.label, emoji: emotion.emoji, intensity: emotion.intensity, notes: "" })
    writeStorage(STORAGE_KEYS.lastCheckin, new Date().toDateString())
    setDone(true)
    setTimeout(onClose, 1600)
  }

  const handleSkip = () => {
    writeStorage(STORAGE_KEYS.lastCheckin, new Date().toDateString())
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-sm"
            onClick={handleSkip}
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-card border border-border/50 rounded-3xl shadow-2xl w-full max-w-sm pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6 pb-2 flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase text-primary/60 mb-1">Daily Check-in</p>
                  <h2 className="font-serif text-xl font-semibold text-foreground leading-snug">
                    How are you feeling<br />right now?
                  </h2>
                </div>
                <button
                  onClick={handleSkip}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors mt-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 pb-6 pt-4">
                {done ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-5 gap-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Logged — thank you for checking in.</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2 mb-5">
                      {EMOTIONS.map((e) => (
                        <motion.button
                          key={e.label}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleSelect(e)}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all duration-150 ${
                            selected === e.label
                              ? "border-primary/50 bg-primary/10"
                              : "border-border/40 hover:border-primary/30 hover:bg-muted/40"
                          }`}
                        >
                          <span className="text-2xl leading-none">{e.emoji}</span>
                          <span className="text-[10px] font-medium text-muted-foreground leading-none">{e.label}</span>
                        </motion.button>
                      ))}
                    </div>

                    <button
                      onClick={handleSkip}
                      className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      Skip for today
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
