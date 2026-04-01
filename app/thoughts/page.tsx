"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { ChevronLeft, BookHeart, Brain, Save, RotateCcw, CheckCircle2, ChevronRight, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Logo } from "@/components/logo"
import { BottomNav } from "@/components/bottom-nav"
import { AiJournalPrompt } from "@/components/ai-journal-prompt"
import { cn } from "@/lib/utils"
import { useJournalEntries } from "@/hooks/use-journal-entries"
import { supabase } from "@/lib/supabase"
import { readStorage, STORAGE_KEYS } from "@/lib/storage"
import type { EmotionEntry } from "@/hooks/use-emotion-logs"

/* ─── Types ─── */
type JournalEntry = { id: string; prompt: string | null; entry: string; date: string }
type QuizQuestion = { id: string; question: string; options: string[]; scores: number[]; category: string }
type QuizType = "emotional-awareness" | "self-compassion"

/* ─── Question pools ─── */
const QUESTIONS: Record<QuizType, QuizQuestion[]> = {
  "emotional-awareness": [
    { id: "ea1", question: "When you feel upset, how quickly do you recognise the specific emotion?", options: ["Immediately — I always know exactly what I feel", "Within a few minutes of sitting with it", "I feel 'bad' before I can name it", "I struggle to identify emotions at all"], scores: [100, 75, 50, 25], category: "recognition" },
    { id: "ea2", question: "How well can you tell apart similar feelings — like disappointment vs sadness?", options: ["Very well — I notice the subtle differences", "Fairly well — I usually get it right", "Sometimes I confuse similar emotions", "Most emotions feel the same to me"], scores: [100, 75, 50, 25], category: "recognition" },
    { id: "ea3", question: "How aware are you of how emotions show up in your body?", options: ["Very aware — I notice physical cues tied to feelings", "Somewhat aware — I notice it when emotions are strong", "Occasionally — only when they're intense", "Rarely — I don't connect body and emotion"], scores: [100, 75, 50, 25], category: "recognition" },
    { id: "ea4", question: "How comfortable are you expressing emotions to people you trust?", options: ["Very comfortable — I share openly", "Comfortable with close friends or family", "Rarely — I hold back my true feelings", "Very uncomfortable — I keep emotions private"], scores: [100, 75, 50, 25], category: "expression" },
    { id: "ea5", question: "When you're in conflict, how well do you express what you feel without blame?", options: ["Very well — I use 'I feel' language naturally", "Fairly well — I usually keep it constructive", "I often get too emotional or shut down", "I avoid conflicts or react in ways I regret"], scores: [100, 75, 50, 25], category: "expression" },
    { id: "ea6", question: "When a strong emotion hits, how well can you pause before reacting?", options: ["Very well — I almost always pause first", "Usually — I pause when I remember to", "Sometimes — I react and then reflect", "Rarely — I react immediately and impulsively"], scores: [100, 75, 50, 25], category: "regulation" },
    { id: "ea7", question: "How well do you recover your emotional balance after being upset?", options: ["Quickly — I bounce back within hours", "Usually within a day or two", "It often lingers for several days", "I find it very hard to regain balance"], scores: [100, 75, 50, 25], category: "regulation" },
  ],
  "self-compassion": [
    { id: "sc1", question: "When you fail at something that matters to you, how do you typically speak to yourself?", options: ["With kindness — the way I'd comfort a friend", "With some criticism but also understanding", "Harshly — I focus on what I did wrong", "Very harshly — I'm my own worst critic"], scores: [100, 75, 50, 25], category: "self-kindness" },
    { id: "sc2", question: "When you're going through a hard time, how patient are you with yourself?", options: ["Very patient — I give myself grace", "Usually patient, sometimes slip into self-blame", "I often feel I should be doing better", "Very impatient — I blame myself heavily"], scores: [100, 75, 50, 25], category: "self-kindness" },
    { id: "sc3", question: "When you notice flaws in yourself, what's your first instinct?", options: ["Curiosity — I try to understand them", "I accept them as part of being human", "I feel frustrated or ashamed", "I fixate and feel deeply inadequate"], scores: [100, 75, 50, 25], category: "self-kindness" },
    { id: "sc4", question: "When you're struggling, how much do you remind yourself that others feel this way too?", options: ["Often — it helps me feel less alone", "Sometimes — when I think to do it", "Rarely — my pain feels unique and isolating", "Never — I feel fundamentally alone in it"], scores: [100, 75, 50, 25], category: "common-humanity" },
    { id: "sc5", question: "How much do you believe that suffering and self-doubt are part of the shared human experience?", options: ["Fully — it's what connects us all", "Mostly — though I forget sometimes", "Partially — my situation feels different", "Not really — my pain feels uniquely mine"], scores: [100, 75, 50, 25], category: "common-humanity" },
    { id: "sc6", question: "When you're feeling overwhelmed, how aware are you of your thoughts and feelings without getting swept away?", options: ["Very aware — I observe without over-identifying", "Usually — I can step back most of the time", "Sometimes — I often get swept up in them", "Rarely — I'm consumed by difficult feelings"], scores: [100, 75, 50, 25], category: "mindfulness" },
    { id: "sc7", question: "When something painful happens, how do you relate to it in the moment?", options: ["With balanced awareness — neither ignoring nor exaggerating", "I try to keep perspective", "I tend to blow it out of proportion", "I get completely consumed by the feeling"], scores: [100, 75, 50, 25], category: "mindfulness" },
  ],
}

const JOURNAL_PROMPTS = [
  { id: "1", text: "What feeling is taking up the most space in you right now? Describe where you feel it in your body.", category: "Awareness" },
  { id: "2", text: "Write a letter to yourself from the perspective of someone who loves you completely.", category: "Self-Compassion" },
  { id: "3", text: "What would you say to a dear friend who was feeling exactly what you're feeling today?", category: "Kindness" },
  { id: "4", text: "List three things — however small — that brought you even a moment of ease or beauty today.", category: "Gratitude" },
  { id: "5", text: "Describe a moment when you got through something you thought you couldn't. What carried you?", category: "Resilience" },
  { id: "6", text: "What does your grief, heartbreak, or pain need from you right now? What would feel like care?", category: "Healing" },
  { id: "7", text: "If your current emotion had a colour, shape, and texture — what would it look like?", category: "Expression" },
  { id: "8", text: "What is one small thing you can do today to honour where you are in your healing?", category: "Growth" },
]

const QUIZ_META = {
  "emotional-awareness": {
    label: "Emotional Awareness",
    emoji: "🧠",
    description: "Understand how well you recognise, express, and regulate your emotions.",
    color: "from-sky-500/10 to-sky-500/5",
    border: "border-sky-500/20",
  },
  "self-compassion": {
    label: "Self-Compassion",
    emoji: "💜",
    description: "Explore how kindly you treat yourself when things are hard.",
    color: "from-primary/10 to-primary/5",
    border: "border-primary/20",
  },
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function getScore(score: number): { label: string; color: string; message: string } {
  if (score >= 80) return { label: "Thriving", color: "text-emerald-500", message: "You have a strong foundation here. Keep nurturing it." }
  if (score >= 60) return { label: "Growing", color: "text-sky-500", message: "You're doing well — small consistent practices will strengthen this further." }
  if (score >= 40) return { label: "Developing", color: "text-amber-500", message: "There's real room to grow here. Be patient and kind with yourself." }
  return { label: "Needs Care", color: "text-primary", message: "This area deserves your gentle attention. You deserve care, including from yourself." }
}

/* ─── Main Component ─── */
export default function ThoughtsPage() {
  const [tab, setTab] = useState<"journal" | "quiz">("journal")

  /* Journal state */
  const [selectedPrompt, setSelectedPrompt] = useState<typeof JOURNAL_PROMPTS[0] | null>(null)
  const [contextualCategory, setContextualCategory] = useState<string | null>(null)
  const [entry, setEntry] = useState("")
  const [saved, setSaved] = useState(false)
  const { entries: journalEntries, addEntry: addJournalEntry, deleteEntry: deleteJournalEntry } = useJournalEntries()

  /* Quiz state */
  const [quizPhase, setQuizPhase] = useState<"select" | "questions" | "results">("select")
  const [quizType, setQuizType] = useState<QuizType>("emotional-awareness")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({}) // questionId → score

  /* ── Pick contextual prompt from most recent emotion log ── */
  useEffect(() => {
    const logs = readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? []
    if (!logs.length) { setSelectedPrompt(JOURNAL_PROMPTS[0]); return }

    const recent = logs[0].emotion.toLowerCase()
    const categoryMap: { keywords: string[]; category: string }[] = [
      { keywords: ["sad", "grief", "loss", "heartbreak", "pain", "hurt", "broken", "devastated"], category: "Healing" },
      { keywords: ["anxious", "anxiety", "worried", "scared", "fear", "panic", "nervous", "overwhelmed"], category: "Awareness" },
      { keywords: ["lonely", "alone", "isolated", "empty", "numb", "disconnected"], category: "Kindness" },
      { keywords: ["angry", "frustrated", "rage", "bitter", "resentful", "irritated"], category: "Expression" },
      { keywords: ["hopeful", "grateful", "calm", "peaceful", "content", "okay", "better"], category: "Gratitude" },
      { keywords: ["tired", "exhausted", "drained", "burnt"], category: "Growth" },
    ]

    const match = categoryMap.find(({ keywords }) => keywords.some((k) => recent.includes(k)))
    const category = match?.category ?? "Awareness"
    const prompt = JOURNAL_PROMPTS.find((p) => p.category === category) ?? JOURNAL_PROMPTS[0]
    setContextualCategory(category)
    setSelectedPrompt(prompt)
  }, [])

  /* ── Journal helpers ── */
  const pickRandomPrompt = () => {
    const others = JOURNAL_PROMPTS.filter((p) => p.id !== selectedPrompt?.id)
    setSelectedPrompt(others[Math.floor(Math.random() * others.length)])
    setEntry("")
    setSaved(false)
  }

  const saveEntry = () => {
    if (!entry.trim() || !selectedPrompt) return
    addJournalEntry({ prompt: selectedPrompt.text, entry: entry.trim() })
    setSaved(true)
    setTimeout(() => { setEntry(""); setSelectedPrompt(null); setSaved(false) }, 1200)
  }

  const deleteEntry = (id: string) => {
    deleteJournalEntry(id)
  }

  /* ── Quiz helpers ── */
  const startQuiz = (type: QuizType) => {
    setQuizType(type)
    setQuestions(shuffle(QUESTIONS[type]).slice(0, 5))
    setQuestionIndex(0)
    setAnswers({})
    setQuizPhase("questions")
  }

  const answerQuestion = (score: number) => {
    const q = questions[questionIndex]
    const newAnswers = { ...answers, [q.id]: score }
    setAnswers(newAnswers)
    if (questionIndex < questions.length - 1) {
      setTimeout(() => setQuestionIndex((i) => i + 1), 300)
    } else {
      setTimeout(async () => {
        setQuizPhase("results")
        // Save quiz result to Supabase
        try {
          const { data } = await supabase.auth.getSession()
          const userId = data.session?.user?.id
          if (userId) {
            const allAnswers = { ...newAnswers }
            const total = Object.values(allAnswers)
            const avgScore = total.length ? Math.round(total.reduce((a, b) => a + b, 0) / total.length) : 0
            const catScores = questions.reduce((acc, ques) => {
              if (allAnswers[ques.id] !== undefined) {
                if (!acc[ques.category]) acc[ques.category] = []
                acc[ques.category].push(allAnswers[ques.id])
              }
              return acc
            }, {} as Record<string, number[]>)
            await supabase.from("quiz_results").insert({
              user_id: userId,
              type: quizType,
              score: avgScore,
              category_scores: catScores,
            })
          }
        } catch {}
      }, 300)
    }
  }

  const avgScore = Object.values(answers).length
    ? Math.round(Object.values(answers).reduce((a, b) => a + b, 0) / Object.values(answers).length)
    : 0

  const categoryScores = questions.reduce((acc, q) => {
    if (answers[q.id] !== undefined) {
      if (!acc[q.category]) acc[q.category] = []
      acc[q.category].push(answers[q.id])
    }
    return acc
  }, {} as Record<string, number[]>)

  /* ── Animations ── */
  const container: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }
  const item: Variants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } } }

  return (
    <div className="min-h-screen bg-page-gradient pb-24">
      <motion.div className="max-w-2xl mx-auto px-4 py-5" variants={container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="flex flex-col items-center mb-3" variants={item}>
          <Logo size="small" />
        </motion.div>
        <motion.div className="mb-5" variants={item}>
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-foreground mt-3 mb-1">Thoughts & Reflection</h1>
          <p className="text-muted-foreground text-sm">A quiet space to write, explore, and understand yourself</p>
        </motion.div>

        {/* Tab switcher */}
        <motion.div className="flex gap-2 mb-5 p-1 rounded-2xl bg-muted/50 border border-border/40" variants={item}>
          {([["journal", "Journal", BookHeart], ["quiz", "Self-Reflection Quiz", Brain]] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                tab === value
                  ? "bg-card shadow-sm text-foreground border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ══════ JOURNAL TAB ══════ */}
          {tab === "journal" && (
            <motion.div key="journal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-5">

              {/* AI Prompt */}
              <AiJournalPrompt />

              {/* Prompt picker */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground text-sm">Choose a reflection prompt</h2>
                  {selectedPrompt && (
                    <button onClick={pickRandomPrompt} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                      <RotateCcw className="w-3 h-3" /> New prompt
                    </button>
                  )}
                </div>

                {!selectedPrompt ? (
                  <div className="grid grid-cols-2 gap-2">
                    {JOURNAL_PROMPTS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPrompt(p); setEntry(""); setSaved(false) }}
                        className="text-left p-3 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
                      >
                        <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide block mb-1">{p.category}</span>
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors line-clamp-3">{p.text}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="bg-primary/8 rounded-xl p-4 mb-4 border border-primary/15">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">{selectedPrompt.category}</span>
                        {contextualCategory === selectedPrompt.category && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary/80">
                            suggested for you
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed font-serif italic">"{selectedPrompt.text}"</p>
                    </div>
                    <Textarea
                      value={entry}
                      onChange={(e) => setEntry(e.target.value)}
                      placeholder="Take your time. Write whatever comes…"
                      className="min-h-[140px] resize-none rounded-xl border-border/40 text-sm leading-relaxed focus-visible:ring-primary/30 mb-3"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={saveEntry}
                        disabled={!entry.trim() || saved}
                        className={cn("flex-1 rounded-xl gap-2", saved && "bg-emerald-500 hover:bg-emerald-500")}
                      >
                        {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Entry</>}
                      </Button>
                      <Button variant="outline" onClick={() => { setSelectedPrompt(null); setEntry("") }} className="rounded-xl">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Past entries */}
              {journalEntries.length > 0 && (
                <div className="glass-card rounded-2xl p-5">
                  <h2 className="font-semibold text-foreground text-sm mb-4">Past Entries</h2>
                  <div className="space-y-3">
                    {journalEntries.slice(0, 5).map((e) => (
                      <div key={e.id} className="border border-border/40 rounded-xl p-4 group">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-[11px] text-primary/70 font-medium font-serif italic line-clamp-1 flex-1">"{e.prompt}"</p>
                          <button
                            onClick={() => deleteEntry(e.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">{e.entry}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ══════ QUIZ TAB ══════ */}
          {tab === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>

              {/* Select quiz */}
              {quizPhase === "select" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-2">These short reflections help you understand yourself better. There are no right or wrong answers.</p>
                  {(Object.entries(QUIZ_META) as [QuizType, typeof QUIZ_META["self-compassion"]][]).map(([type, meta]) => (
                    <button
                      key={type}
                      onClick={() => startQuiz(type)}
                      className={cn(
                        "w-full text-left glass-card rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        meta.border
                      )}
                    >
                      <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-gradient-to-r", meta.color)}>
                        <span>{meta.emoji}</span> {meta.label}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{meta.description}</p>
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary/70">
                        5 questions <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Questions — one at a time */}
              {quizPhase === "questions" && questions.length > 0 && (
                <div>
                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>{QUIZ_META[quizType].emoji} {QUIZ_META[quizType].label}</span>
                      <span>{questionIndex + 1} / {questions.length}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${((questionIndex) / questions.length) * 100}%` }}
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
                      className="glass-card rounded-2xl p-6"
                    >
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

                  <button
                    onClick={() => setQuizPhase("select")}
                    className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3 h-3" /> Exit quiz
                  </button>
                </div>
              )}

              {/* Results */}
              {quizPhase === "results" && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Overall score */}
                  <div className="glass-card rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-1">{QUIZ_META[quizType].emoji}</div>
                    <h2 className="font-serif text-xl font-semibold text-foreground mb-1">{QUIZ_META[quizType].label}</h2>
                    <div className={cn("text-4xl font-bold my-4", getScore(avgScore).color)}>{avgScore}</div>
                    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-primary/10", getScore(avgScore).color)}>
                      <Sparkles className="w-3 h-3" /> {getScore(avgScore).label}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{getScore(avgScore).message}</p>
                  </div>

                  {/* Category breakdown */}
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="font-semibold text-sm text-foreground mb-4">Breakdown</h3>
                    <div className="space-y-3">
                      {Object.entries(categoryScores).map(([cat, scores]) => {
                        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                        const { color, label } = getScore(avg)
                        const displayName = {
                          "recognition": "Emotion Recognition",
                          "expression": "Emotion Expression",
                          "regulation": "Emotion Regulation",
                          "self-kindness": "Self-Kindness",
                          "common-humanity": "Common Humanity",
                          "mindfulness": "Mindfulness",
                        }[cat] ?? cat
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

                  <div className="flex gap-3">
                    <Button onClick={() => startQuiz(quizType)} variant="outline" className="flex-1 rounded-xl gap-2">
                      <RotateCcw className="w-4 h-4" /> Retake
                    </Button>
                    <Button onClick={() => setQuizPhase("select")} className="flex-1 rounded-xl gap-2">
                      Try Other Quiz
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <BottomNav />
    </div>
  )
}
