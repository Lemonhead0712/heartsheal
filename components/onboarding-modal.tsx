"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { useEmotionLogs } from "@/hooks/use-emotion-logs"

const LOSS_CHIPS = [
  { id: "grief",    label: "Grief & Loss" },
  { id: "breakup",  label: "Heartbreak" },
  { id: "divorce",  label: "Divorce" },
  { id: "job",      label: "Job Loss" },
  { id: "lonely",   label: "Loneliness" },
  { id: "family",   label: "Family Pain" },
  { id: "identity", label: "Identity" },
  { id: "trauma",   label: "Trauma" },
]

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

function getPersonalizedMessage(firstChip: string | undefined): string {
  switch (firstChip) {
    case "grief":
    case "divorce":
    case "family":
      return "Grief is love with nowhere to go. Haven holds space for all of it."
    case "breakup":
      return "Heartbreak is one of the loneliest pains. You don't have to carry it alone."
    case "job":
      return "Losing work can shake your whole sense of self. That's real, and it matters."
    case "lonely":
      return "Feeling alone is one of the hardest things. Haven is here, always."
    case "identity":
    case "trauma":
      return "Sometimes you lose yourself before you find yourself again. That's okay."
    default:
      return "Whatever brought you here — it's valid. You deserve care."
  }
}

export type OnboardingEmotionData = { label: string; emoji: string; intensity: number }

interface OnboardingModalProps {
  open: boolean
  onComplete: (name?: string, emotion?: OnboardingEmotionData) => void
}

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep]               = useState(0)
  const [name, setName]               = useState("")
  const [selected, setSelected]       = useState<string[]>([])
  const [emotionPicked, setEmotionPicked] = useState<string | null>(null)
  const [pickedEmotionData, setPickedEmotionData] = useState<OnboardingEmotionData | null>(null)
  const { addEntry }                  = useEmotionLogs()

  const dismiss = () => {
    writeStorage(STORAGE_KEYS.welcomeSeen, true)
    onComplete(name.trim() || undefined, pickedEmotionData ?? undefined)
  }

  const goStep1 = () => {
    if (name.trim()) writeStorage(STORAGE_KEYS.userName, name.trim())
    setStep(1)
  }

  const toggleChip = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const goStep2 = () => {
    writeStorage(STORAGE_KEYS.lossContext, selected)
    setStep(2)
  }

  const pickEmotion = async (emotion: typeof EMOTIONS[0]) => {
    if (emotionPicked) return
    setEmotionPicked(emotion.label)
    setPickedEmotionData({ label: emotion.label, emoji: emotion.emoji, intensity: emotion.intensity })
    await addEntry({ emotion: emotion.label, emoji: emotion.emoji, intensity: emotion.intensity, notes: "" })
    writeStorage(STORAGE_KEYS.lastCheckin, new Date().toDateString())
    setTimeout(() => setStep(3), 400)
  }

  const firstChip        = selected[0]
  const personalizedMsg  = getPersonalizedMessage(firstChip)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[80] bg-foreground/30 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-card border border-border/50 rounded-3xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header row: progress dots + skip */}
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <div className="flex items-center gap-2">
                  {[0, 1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`rounded-full transition-all duration-300 ${
                        s <= step
                          ? "w-5 h-2 bg-primary"
                          : "w-2 h-2 bg-border"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={dismiss}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <AnimatePresence mode="wait">

                {/* ── Step 0: Name ── */}
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="px-6 pb-6 pt-4"
                  >
                    <h2 className="font-serif text-2xl font-semibold text-foreground mb-1 leading-snug">
                      What should Haven call you?
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                      Completely optional — Haven will still be here either way.
                    </p>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && goStep1()}
                      placeholder="Your name…"
                      maxLength={40}
                      autoFocus
                      className="w-full rounded-2xl border border-border/50 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-5"
                    />
                    <button
                      onClick={goStep1}
                      className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
                    >
                      {name.trim() ? "Continue →" : "Skip for now →"}
                    </button>
                  </motion.div>
                )}

                {/* ── Step 1: What brought you here ── */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="px-6 pb-6 pt-4"
                  >
                    <h2 className="font-serif text-2xl font-semibold text-foreground mb-1 leading-snug">
                      It takes courage to be here.
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                      Choose what resonates — you can always come back and change this.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {LOSS_CHIPS.map(({ id, label }) => (
                        <button
                          key={id}
                          onClick={() => toggleChip(id)}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150 ${
                            selected.includes(id)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary text-muted-foreground border-border/50 hover:border-primary/40 hover:bg-primary/8"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={goStep2}
                      disabled={selected.length === 0}
                      className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Continue →
                    </button>
                  </motion.div>
                )}

                {/* ── Step 2: How are you feeling ── */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="px-6 pb-6 pt-4"
                  >
                    <h2 className="font-serif text-2xl font-semibold text-foreground mb-1 leading-snug">
                      Right now, in this moment —
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                      How are you?
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {EMOTIONS.map((e) => (
                        <motion.button
                          key={e.label}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => pickEmotion(e)}
                          disabled={!!emotionPicked}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all duration-150 ${
                            emotionPicked === e.label
                              ? "border-primary/50 bg-primary/10"
                              : "border-border/40 hover:border-primary/30 hover:bg-muted/40"
                          } disabled:cursor-default`}
                        >
                          <span className="text-2xl leading-none">{e.emoji}</span>
                          <span className="text-[10px] font-medium text-muted-foreground leading-none">{e.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── Step 3: Personalized welcome ── */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="px-6 pb-6 pt-4"
                  >
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-2xl">
                        💜
                      </div>
                    </div>
                    <h2 className="font-serif text-2xl font-semibold text-foreground mb-2 text-center leading-snug">
                      {name.trim() ? `${name.trim()}, you're in the right place.` : "You're in the right place."}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6 text-center leading-relaxed">
                      {personalizedMsg}
                    </p>
                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={() => { writeStorage(STORAGE_KEYS.welcomeSeen, true); onComplete(name.trim() || undefined, pickedEmotionData ?? undefined) }}
                        className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
                      >
                        Talk to Haven →
                      </button>
                      <button
                        onClick={() => { writeStorage(STORAGE_KEYS.welcomeSeen, true); onComplete(name.trim() || undefined, pickedEmotionData ?? undefined) }}
                        className="w-full py-3 rounded-2xl border border-border/60 text-muted-foreground font-semibold text-sm hover:text-foreground hover:border-border transition-all"
                      >
                        Try a breathing session
                      </button>
                    </div>
                    <button
                      onClick={dismiss}
                      className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                    >
                      Skip for now →
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
