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
    description: "How steady and balanced do you feel emotionally right now?",
    low: "Very unsettled",
    high: "Very balanced",
  },
  {
    key: "selfConnection" as const,
    label: "Self-Connection",
    description: "How connected do you feel to yourself — your thoughts, needs, and values?",
    low: "Disconnected",
    high: "Deeply connected",
  },
  {
    key: "selfCompassion" as const,
    label: "Self-Compassion",
    description: "How kindly are you treating yourself today?",
    low: "Very hard on myself",
    high: "Very kind to myself",
  },
  {
    key: "selfCare" as const,
    label: "Self-Care",
    description: "How well are you tending to your basic needs — rest, nourishment, movement?",
    low: "Neglecting myself",
    high: "Taking great care",
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
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
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
                <h1 className="font-serif text-2xl font-semibold text-foreground mb-1">How are you doing?</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A gentle check-in on four dimensions of your wellbeing. Move each slider to where you honestly are right now.
                </p>
              </div>

              <div className="space-y-6 flex-1">
                {SLIDERS.map(({ key, label, description, low, high }) => {
                  const value = scores[key]
                  const { text, color } = getLabel(value)
                  return (
                    <div key={key} className="bg-card/60 border border-border/40 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <span className={cn("text-xs font-semibold", color)}>{text}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{description}</p>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={value}
                        onChange={(e) => setScores((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="w-full h-2 rounded-full accent-primary cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1.5">
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
