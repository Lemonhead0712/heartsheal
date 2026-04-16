"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, Sparkles, CheckCircle2 } from "lucide-react"
import { HavenMark } from "@/components/logo-mark"
import { HavenFlowGuide } from "@/components/haven-flow-guide"
import { readHavenFlow } from "@/lib/haven-flow"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { cn } from "@/lib/utils"

const SLIDERS = [
  {
    key: "emotionalState" as const,
    label: "Emotional State",
    icon: "🌊",
    description: "How steady and balanced do you feel emotionally right now? Honest is better than optimistic.",
    low: "Very unsettled",
    high: "Very balanced",
    accent: "from-sky-500/10 to-sky-500/5",
    accentBorder: "border-sky-500/20",
  },
  {
    key: "selfConnection" as const,
    label: "Self-Connection",
    icon: "🪞",
    description: "How connected do you feel to yourself — your thoughts, needs, and values right now?",
    low: "Disconnected",
    high: "Deeply connected",
    accent: "from-violet-500/10 to-violet-500/5",
    accentBorder: "border-violet-500/20",
  },
  {
    key: "selfCompassion" as const,
    label: "Self-Compassion",
    icon: "💜",
    description: "How kindly are you treating yourself today? Would you speak to a friend this way?",
    low: "Very hard on myself",
    high: "Very kind to myself",
    accent: "from-primary/10 to-primary/5",
    accentBorder: "border-primary/20",
  },
  {
    key: "selfCare" as const,
    label: "Self-Care",
    icon: "🌱",
    description: "How well are you tending to your basic needs — rest, nourishment, movement, and stillness?",
    low: "Neglecting myself",
    high: "Taking great care",
    accent: "from-emerald-500/10 to-emerald-500/5",
    accentBorder: "border-emerald-500/20",
  },
]

type SurveyScores = {
  emotionalState: number
  selfConnection: number
  selfCompassion: number
  selfCare: number
}

function getLabel(score: number) {
  if (score >= 5) return { text: "Thriving", color: "text-emerald-500" }
  if (score >= 4) return { text: "Good", color: "text-sky-500" }
  if (score >= 3) return { text: "Okay", color: "text-amber-500" }
  if (score >= 2) return { text: "Struggling", color: "text-orange-500" }
  return { text: "Needs care", color: "text-primary" }
}

export default function WellbeingPage() {
  const [inFlow, setInFlow] = useState(false)
  const [scores, setScores] = useState<SurveyScores>({
    emotionalState: 3,
    selfConnection: 3,
    selfCompassion: 3,
    selfCare: 3,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const flow = readHavenFlow()
    if (flow && flow.sequence[flow.currentIndex] === "survey") setInFlow(true)
  }, [])

  const handleSave = () => {
    // Save to surveyResponses (same schema + key as the dashboard widget and insights system)
    const record = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...scores,
    }
    const prev = readStorage<typeof record[]>(STORAGE_KEYS.surveyResponses) ?? []
    writeStorage(STORAGE_KEYS.surveyResponses, [...prev, record])
    // Also save to wellbeingCheckins for dedicated wellbeing history
    const checkin = { date: record.timestamp, scores }
    const prevCheckins = readStorage<typeof checkin[]>(STORAGE_KEYS.wellbeingCheckins) ?? []
    writeStorage(STORAGE_KEYS.wellbeingCheckins, [...prevCheckins, checkin])
    setSaved(true)
  }

  const overallAvg = Math.round(
    (scores.emotionalState + scores.selfConnection + scores.selfCompassion + scores.selfCare) / 4 * 10
  ) / 10

  const exerciseData = saved
    ? `Wellbeing check-in: Emotional State ${scores.emotionalState}/5, Self-Connection ${scores.selfConnection}/5, Self-Compassion ${scores.selfCompassion}/5, Self-Care ${scores.selfCare}/5. Overall average: ${overallAvg}/5.`
    : undefined

  return (
    <div className={`min-h-screen bg-background flex flex-col${inFlow ? " pb-52" : ""}`}>
      <div className="w-full max-w-lg mx-auto px-4 py-6 flex flex-col flex-1">

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
            <Heart className="w-4 h-4" />
            <span className="font-serif">Wellbeing Check</span>
          </div>
        </div>

        {/* Flow banner */}
        {inFlow && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3 mb-5"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-xs text-primary/80 leading-relaxed">
              <span className="font-semibold">Haven's flow.</span> Take a moment to be honest with yourself — there's no judgment here.
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* Slider form */}
          {!saved && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col flex-1"
            >
              <div className="mb-6">
                <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">How are you doing?</h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  A gentle, honest check-in across four dimensions of your wellbeing. There are no right answers — just where you genuinely are right now.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {["🌊 Emotional", "🪞 Connection", "💜 Compassion", "🌱 Self-Care"].map(d => (
                    <span key={d} className="text-[11px] text-muted-foreground/70 px-2.5 py-1 rounded-full bg-muted/50 border border-border/30">{d}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-4 flex-1">
                {SLIDERS.map(({ key, label, icon, description, low, high, accent, accentBorder }) => {
                  const value = scores[key]
                  const { text, color } = getLabel(value)
                  return (
                    <div key={key} className={cn("rounded-2xl p-5 border bg-gradient-to-br", accent, accentBorder)}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none">{icon}</span>
                          <p className="text-sm font-semibold text-foreground">{label}</p>
                        </div>
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full bg-background/60", color)}>{text}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed pl-7">{description}</p>

                      {/* Score dots */}
                      <div className="flex justify-between mb-2 px-0.5">
                        {[1,2,3,4,5].map(n => (
                          <button
                            key={n}
                            onClick={() => setScores((prev) => ({ ...prev, [key]: n }))}
                            className={cn(
                              "w-8 h-8 rounded-full text-xs font-bold transition-all duration-200",
                              value === n
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-110"
                                : "bg-background/70 border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1 px-1">
                        <span>{low}</span>
                        <span>{high}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6">
                <button
                  onClick={handleSave}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Check-in
                </button>
                {!inFlow && (
                  <Link
                    href="/"
                    className="w-full block py-2.5 text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
                  >
                    Not today
                  </Link>
                )}
              </div>
            </motion.div>
          )}

          {/* Summary after save */}
          {saved && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col flex-1"
            >
              <div className="text-center mb-8 mt-4">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.1 }}
                  className="text-5xl mb-4 select-none"
                >
                  💜
                </motion.div>
                <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">Check-in saved.</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Thank you for taking a moment for yourself. Your check-in has been recorded.
                </p>
              </div>

              {/* Score summary */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {SLIDERS.map(({ key, label }) => {
                  const value = scores[key]
                  const { text, color } = getLabel(value)
                  return (
                    <div key={key} className="bg-card/60 border border-border/40 rounded-2xl p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className={cn("text-2xl font-bold", color)}>{value}</p>
                      <p className={cn("text-[11px] font-medium", color)}>{text}</p>
                    </div>
                  )
                })}
              </div>

              {/* Overall */}
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 text-center mb-6">
                <p className="text-xs text-muted-foreground mb-1">Overall average</p>
                <p className={cn("text-3xl font-bold", getLabel(Math.round(overallAvg)).color)}>{overallAvg} <span className="text-base font-normal text-muted-foreground">/ 5</span></p>
                <p className={cn("text-sm font-medium mt-1", getLabel(Math.round(overallAvg)).color)}>{getLabel(Math.round(overallAvg)).text}</p>
              </div>

              {!inFlow && (
                <div className="mt-auto">
                  <Link
                    href="/"
                    className="w-full flex items-center justify-center py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
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
        currentTool="survey"
        showContinue={saved}
        exerciseData={exerciseData}
      />
    </div>
  )
}
