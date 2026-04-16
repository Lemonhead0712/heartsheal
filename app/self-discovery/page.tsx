"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, Brain, Sparkles, CheckCircle2, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { HavenMark } from "@/components/logo-mark"
import { HavenFlowGuide } from "@/components/haven-flow-guide"
import { readHavenFlow } from "@/lib/haven-flow"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { useTTS } from "@/hooks/use-speech"

type QuizQuestion = { id: string; question: string; options: string[]; scores: number[]; category: string }

const QUESTIONS: QuizQuestion[] = [
  { id: "ea1", question: "When you feel upset, how quickly do you recognise the specific emotion?", options: ["Immediately — I always know exactly what I feel", "Within a few minutes of sitting with it", "I feel 'bad' before I can name it", "I struggle to identify emotions at all"], scores: [100, 75, 50, 25], category: "recognition" },
  { id: "ea2", question: "How well can you tell apart similar feelings — like disappointment vs sadness?", options: ["Very well — I notice the subtle differences", "Fairly well — I usually get it right", "Sometimes I confuse similar emotions", "Most emotions feel the same to me"], scores: [100, 75, 50, 25], category: "recognition" },
  { id: "ea3", question: "How aware are you of how emotions show up in your body?", options: ["Very aware — I notice physical cues tied to feelings", "Somewhat aware — I notice it when emotions are strong", "Occasionally — only when they're intense", "Rarely — I don't connect body and emotion"], scores: [100, 75, 50, 25], category: "recognition" },
  { id: "ea4", question: "How comfortable are you expressing emotions to people you trust?", options: ["Very comfortable — I share openly", "Comfortable with close friends or family", "Rarely — I hold back my true feelings", "Very uncomfortable — I keep emotions private"], scores: [100, 75, 50, 25], category: "expression" },
  { id: "ea5", question: "When you're in conflict, how well do you express what you feel without blame?", options: ["Very well — I use 'I feel' language naturally", "Fairly well — I usually keep it constructive", "I often get too emotional or shut down", "I avoid conflicts or react in ways I regret"], scores: [100, 75, 50, 25], category: "expression" },
  { id: "ea6", question: "When a strong emotion hits, how well can you pause before reacting?", options: ["Very well — I almost always pause first", "Usually — I pause when I remember to", "Sometimes — I react and then reflect", "Rarely — I react immediately and impulsively"], scores: [100, 75, 50, 25], category: "regulation" },
  { id: "ea7", question: "How well do you recover your emotional balance after being upset?", options: ["Quickly — I bounce back within hours", "Usually within a day or two", "It often lingers for several days", "I find it very hard to regain balance"], scores: [100, 75, 50, 25], category: "regulation" },
]

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function getScore(score: number): { label: string; color: string; message: string } {
  if (score >= 80) return { label: "Thriving", color: "text-emerald-500", message: "You have a strong foundation here. Keep nurturing it." }
  if (score >= 60) return { label: "Growing", color: "text-sky-500", message: "You're doing well — small consistent practices will strengthen this further." }
  if (score >= 40) return { label: "Developing", color: "text-amber-500", message: "There's real room to grow here. Be patient and kind with yourself." }
  return { label: "Needs Care", color: "text-primary", message: "This area deserves your gentle attention. You deserve care, including from yourself." }
}

export default function SelfDiscoveryPage() {
  const [inFlow, setInFlow] = useState(false)
  const [phase, setPhase] = useState<"intro" | "questions" | "results">("intro")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [avgScore, setAvgScore] = useState(0)
  const [categoryScores, setCategoryScores] = useState<Record<string, number[]>>({})
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null)
  const [interpretationLoading, setInterpretationLoading] = useState(false)

  /* TTS */
  const { speak, stop: stopSpeech, isSpeaking } = useTTS()
  const [ttsText, setTtsText] = useState<string | null>(null)
  useEffect(() => { if (!isSpeaking) setTtsText(null) }, [isSpeaking])
  // Auto-speak AI interpretation only outside of flow (flow audio handled by HavenFlowGuide)
  useEffect(() => {
    if (aiInterpretation && !inFlow) { speak(aiInterpretation); setTtsText(aiInterpretation) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiInterpretation, inFlow])

  useEffect(() => {
    const flow = readHavenFlow()
    if (flow && flow.sequence[flow.currentIndex] === "quiz") {
      setInFlow(true)
      // Auto-start quiz in flow mode
      setQuestions(shuffle(QUESTIONS).slice(0, 5))
      setPhase("questions")
    }
  }, [])

  const startQuiz = () => {
    setQuestions(shuffle(QUESTIONS).slice(0, 5))
    setQuestionIndex(0)
    setAnswers({})
    setPendingSubmit(false)
    setAiInterpretation(null)
    setPhase("questions")
  }

  const answerQuestion = (score: number) => {
    const q = questions[questionIndex]
    const newAnswers = { ...answers, [q.id]: score }
    setAnswers(newAnswers)
    if (questionIndex < questions.length - 1) {
      setTimeout(() => setQuestionIndex((i) => i + 1), 300)
    } else {
      setPendingSubmit(true)
    }
  }

  const submitQuiz = useCallback(async () => {
    setPendingSubmit(false)
    setPhase("results")
    setInterpretationLoading(true)

    const total = Object.values(answers)
    const avg = total.length ? Math.round(total.reduce((a, b) => a + b, 0) / total.length) : 0
    setAvgScore(avg)

    const catScores = questions.reduce((acc, q) => {
      if (answers[q.id] !== undefined) {
        if (!acc[q.category]) acc[q.category] = []
        acc[q.category].push(answers[q.id])
      }
      return acc
    }, {} as Record<string, number[]>)
    setCategoryScores(catScores)

    // Save to storage
    const result = {
      id: Date.now().toString(),
      type: "emotional-awareness",
      score: avg,
      category_scores: catScores,
      created_at: new Date().toISOString(),
    }
    const prev = readStorage<typeof result[]>(STORAGE_KEYS.quizResults) ?? []
    writeStorage(STORAGE_KEYS.quizResults, [...prev, result])

    const catSummary = Object.entries(catScores)
      .map(([cat, scores]) => {
        const catAvg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        const display = ({ recognition: "Emotion Recognition", expression: "Emotion Expression", regulation: "Emotion Regulation" } as Record<string, string>)[cat] ?? cat
        return `${display}: ${catAvg}/100`
      }).join(", ")

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 150,
          system: "You write warm, specific, compassionate 2-3 sentence reflections for people healing emotionally. Speak directly using 'you'. Reference their actual scores. Plain prose only.",
          messages: [{
            role: "user",
            content: `Emotional Awareness quiz. Overall score: ${avg}/100. Categories: ${catSummary}. Write a warm 2-3 sentence reflection on what this reveals and one gentle thing to focus on.`,
          }],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.content?.[0]?.text?.trim()
        if (text) setAiInterpretation(text)
      }
    } catch {}
    setInterpretationLoading(false)
  }, [answers, questions])

  const exerciseData = phase === "results"
    ? `Emotional Awareness score: ${avgScore}/100. ${Object.entries(categoryScores).map(([cat, scores]) => {
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        return `${cat}: ${avg}`
      }).join(", ")}`
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
            <Brain className="w-4 h-4" />
            <span className="font-serif">Self-Discovery</span>
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
              <span className="font-semibold">Haven's flow.</span> There are no right or wrong answers — just honest ones.
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* Intro */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col flex-1"
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🧠</div>
                <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">Emotional Awareness</h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  Understand how well you recognise, express, and regulate your emotions — and where to gently focus your growth.
                </p>
              </div>

              {/* Three areas explored */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { icon: "👁️", label: "Recognition", desc: "Naming what you feel" },
                  { icon: "💬", label: "Expression", desc: "Sharing with others" },
                  { icon: "⚖️", label: "Regulation", desc: "Returning to balance" },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="bg-card/60 border border-border/40 rounded-2xl p-3 text-center">
                    <div className="text-2xl mb-1.5">{icon}</div>
                    <p className="text-[11px] font-semibold text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 mb-8">
                <div className="bg-card/60 border border-border/40 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">What to expect</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    5 short questions across recognition, expression, and regulation. Each question asks you to reflect honestly — there are no right or wrong answers, only useful ones.
                  </p>
                </div>
                <div className="bg-card/60 border border-border/40 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">How it helps</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Emotional awareness is the foundation of healing. When you can name what you feel, you can begin to understand it — and from there, choose how to respond rather than react.
                  </p>
                </div>
                <div className="bg-card/60 border border-border/40 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">Your privacy</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Results are stored only on your device and used to personalise your healing insights. Nothing leaves your phone unless you choose to sync.
                  </p>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <button
                  onClick={startQuiz}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Brain className="w-4 h-4" />
                  Begin Reflection
                </button>
                <Link
                  href="/"
                  className="w-full py-2.5 text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Not today
                </Link>
              </div>
            </motion.div>
          )}

          {/* Questions */}
          {phase === "questions" && questions.length > 0 && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col flex-1"
            >
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span className="text-primary/70 font-medium">Emotional Awareness</span>
                  <span>{questionIndex + 1} / {questions.length}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${(questionIndex / questions.length) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={questionIndex}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="bg-card/60 border border-border/40 rounded-2xl p-6 mb-4"
                >
                  {/* Category badge */}
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary/60 bg-primary/8 px-2.5 py-1 rounded-full">
                      {({ recognition: "👁️ Recognition", expression: "💬 Expression", regulation: "⚖️ Regulation" } as Record<string,string>)[questions[questionIndex].category] ?? questions[questionIndex].category}
                    </span>
                  </div>
                  <p className="font-serif text-lg text-foreground leading-snug mb-6">
                    {questions[questionIndex].question}
                  </p>
                  <div className="space-y-2.5">
                    {questions[questionIndex].options.map((option, i) => (
                      <button
                        key={i}
                        onClick={() => answerQuestion(questions[questionIndex].scores[i])}
                        className={cn(
                          "w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all duration-200",
                          answers[questions[questionIndex].id] !== undefined
                            ? "opacity-50 cursor-default border-border/30"
                            : "border-border/50 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground text-muted-foreground"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              <AnimatePresence>
                {pendingSubmit && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <button
                      onClick={submitQuiz}
                      className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" /> See My Results
                    </button>
                    <p className="text-[11px] text-muted-foreground text-center mt-2">
                      Your results will be saved to your Healing Insights
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {!inFlow && (
                <button
                  onClick={() => setPhase("intro")}
                  className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3 h-3" /> Exit quiz
                </button>
              )}
            </motion.div>
          )}

          {/* Results */}
          {phase === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col flex-1"
            >
              <div className="rounded-2xl p-6 text-center mb-4 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="text-4xl mb-3">🧠</div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/50 mb-1">Your Score</p>
                <h2 className="font-serif text-xl font-semibold text-foreground mb-2">Emotional Awareness</h2>
                <div className={cn("text-5xl font-bold my-3", getScore(avgScore).color)}>{avgScore}<span className="text-lg font-normal text-muted-foreground">/100</span></div>
                <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-3 bg-background/60", getScore(avgScore).color)}>
                  <Sparkles className="w-3 h-3" /> {getScore(avgScore).label}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{getScore(avgScore).message}</p>
              </div>

              {/* Category breakdown */}
              {Object.keys(categoryScores).length > 0 && (
                <div className="bg-card/60 border border-border/40 rounded-2xl p-5 mb-4">
                  <h3 className="font-semibold text-sm text-foreground mb-4">Breakdown</h3>
                  <div className="space-y-3">
                    {Object.entries(categoryScores).map(([cat, scores]) => {
                      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                      const { color, label } = getScore(avg)
                      const displayName = ({ recognition: "Emotion Recognition", expression: "Emotion Expression", regulation: "Emotion Regulation" } as Record<string, string>)[cat] ?? cat
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground font-medium">{displayName}</span>
                            <span className={cn("font-semibold", color)}>{label}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${avg}%` }}
                              transition={{ duration: 0.7, delay: 0.2 }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* AI interpretation */}
              <AnimatePresence>
                {(interpretationLoading || aiInterpretation) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl p-4 border border-primary/20 bg-primary/5 mb-4"
                  >
                    {interpretationLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RotateCcw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        Personalising your reflection…
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/60 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" /> Haven's Reflection
                          </p>
                          {aiInterpretation && (
                            <button
                              onClick={() => {
                                if (isSpeaking && ttsText === aiInterpretation) { stopSpeech(); setTtsText(null) }
                                else { speak(aiInterpretation); setTtsText(aiInterpretation) }
                              }}
                              className="p-1 rounded-lg text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                              aria-label={ttsText === aiInterpretation && isSpeaking ? "Stop" : "Read aloud"}
                            >
                              {ttsText === aiInterpretation && isSpeaking
                                ? <VolumeX className="w-3.5 h-3.5" />
                                : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed font-serif italic">"{aiInterpretation}"</p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {!inFlow && (
                <div className="mt-auto flex flex-col gap-3">
                  <button
                    onClick={startQuiz}
                    className="w-full py-3 rounded-2xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Retake
                  </button>
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
        currentTool="quiz"
        showContinue={phase === "results"}
        exerciseData={exerciseData}
      />
    </div>
  )
}
