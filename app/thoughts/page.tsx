"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { ChevronLeft, BookHeart, Brain, Save, RotateCcw, CheckCircle2, ChevronRight, Sparkles, Trash2, X, Volume2, VolumeX } from "lucide-react"
import { HavenFlowGuide } from "@/components/haven-flow-guide"
import { readHavenFlow } from "@/lib/haven-flow"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useJournalEntries } from "@/hooks/use-journal-entries"
import { HavenMark } from "@/components/logo-mark"
import { useTTS } from "@/hooks/use-speech"
import { supabase } from "@/lib/supabase"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
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
  "What feeling is taking up the most space in you right now? Describe where you feel it in your body.",
  "Write a letter to yourself from the perspective of someone who loves you completely.",
  "What would you say to a dear friend who was feeling exactly what you're feeling today?",
  "List three things — however small — that brought you even a moment of ease or beauty today.",
  "Describe a moment when you got through something you thought you couldn't. What carried you?",
  "What does your grief, heartbreak, or pain need from you right now? What would feel like care?",
  "If your current emotion had a colour, shape, and texture — what would it look like?",
  "What is one small thing you can do today to honour where you are in your healing?",
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
  const [inFlow, setInFlow] = useState(false)

  useEffect(() => {
    const flow = readHavenFlow()
    if (flow && flow.sequence[flow.currentIndex] === "journal") setInFlow(true)
  }, [])

  /* Journal state */
  const [activePrompt, setActivePrompt] = useState<string>(() =>
    JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)]
  )
  const [isAiPrompt, setIsAiPrompt] = useState(false)
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [entry, setEntry] = useState("")
  const [saved, setSaved] = useState(false)
  const { entries: journalEntries, addEntry: addJournalEntry, deleteEntry: deleteJournalEntry } = useJournalEntries()

  /* Journal modal + delete confirmation */
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  /* Quiz state */
  const [quizPhase, setQuizPhase] = useState<"select" | "questions" | "results">("select")
  const [quizType, setQuizType] = useState<QuizType>("emotional-awareness")
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null)
  const [interpretationLoading, setInterpretationLoading] = useState(false)
  const [dynamicScQs, setDynamicScQs] = useState<QuizQuestion[] | null>(null)
  const [dynamicScLoading, setDynamicScLoading] = useState(false)

  /* TTS */
  const { speak, stop: stopSpeech, isSpeaking } = useTTS()
  const [ttsText, setTtsText] = useState<string | null>(null)
  const handleSpeak = useCallback((text: string) => {
    if (isSpeaking && ttsText === text) { stopSpeech(); setTtsText(null) }
    else { speak(text); setTtsText(text) }
  }, [isSpeaking, ttsText, speak, stopSpeech])
  // Clear ttsText when speech ends
  useEffect(() => { if (!isSpeaking) setTtsText(null) }, [isSpeaking])
  // Auto-speak AI interpretation when it arrives
  useEffect(() => {
    if (aiInterpretation) { speak(aiInterpretation); setTtsText(aiInterpretation) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiInterpretation])

  /* ── Generate AI prompt ── */
  const generateAiPrompt = async () => {
    setGeneratingPrompt(true)
    const logs = readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? []
    const recentEmotion = logs[0]?.emotion ?? "reflective"
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 120,
          system: "You generate compassionate, trauma-informed journaling prompts for people healing from loss, grief, or emotional pain. Output ONLY the prompt — one or two sentences, warm and open-ended. No preamble, no quotes.",
          messages: [{ role: "user", content: `Generate a unique journaling prompt for someone feeling: ${recentEmotion}. Make it gentle and specific to this emotional state.` }],
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const text = data.content?.[0]?.text?.trim()
      if (text) { setActivePrompt(text); setIsAiPrompt(true); setEntry(""); setSaved(false) }
    } catch {
      // silently keep current prompt if generation fails
    } finally {
      setGeneratingPrompt(false)
    }
  }

  /* ── Journal helpers ── */
  const saveEntry = () => {
    if (!entry.trim()) return
    addJournalEntry({ prompt: activePrompt, entry: entry.trim() })
    setSaved(true)
    const next = JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)]
    setTimeout(() => { setEntry(""); setActivePrompt(next); setIsAiPrompt(false); setSaved(false) }, 1200)
  }

  /* ── Dynamic self-compassion question generation ── */
  const generateDynamicScQs = async (journalExcerpt: string) => {
    setDynamicScLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 700,
          system: `You generate self-compassion quiz questions tailored to a specific journal reflection.
Return ONLY a JSON array of exactly 5 objects, no preamble, no markdown fences:
[{"id":"sc_d1","question":"...","options":["A","B","C","D"],"scores":[100,75,50,25],"category":"self-kindness"},...]
Each object must have: id (string), question (string), options (4-item string array), scores ([100,75,50,25]), category (one of: self-kindness, common-humanity, mindfulness).
Mirror the user's emotional situation and language. Keep them compassionate and non-judgmental.`,
          messages: [{ role: "user", content: `Generate 5 self-compassion questions based on this journal entry: "${journalExcerpt.slice(0, 400)}"` }],
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const raw = data.content?.[0]?.text?.trim() ?? ""
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim()
      const parsed: QuizQuestion[] = JSON.parse(cleaned)
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.slice(0, 5)
      }
    } catch {}
    return null
  }

  /* ── Quiz helpers ── */
  const startQuiz = async (type: QuizType) => {
    setQuizType(type)
    setQuestionIndex(0)
    setAnswers({})
    setPendingSubmit(false)
    setAiInterpretation(null)
    setInterpretationLoading(false)

    // For self-compassion, try to generate questions from the most recent journal entry
    if (type === "self-compassion" && journalEntries[0]?.entry) {
      setDynamicScLoading(true)
      setQuizPhase("questions")
      const dynamic = await generateDynamicScQs(journalEntries[0].entry)
      setDynamicScQs(dynamic)
      setDynamicScLoading(false)
      setQuestions(dynamic ?? shuffle(QUESTIONS[type]).slice(0, 5))
    } else {
      setDynamicScQs(null)
      setQuestions(shuffle(QUESTIONS[type]).slice(0, 5))
      setQuizPhase("questions")
    }
  }

  const answerQuestion = (score: number) => {
    const q = questions[questionIndex]
    const newAnswers = { ...answers, [q.id]: score }
    setAnswers(newAnswers)
    const isLast = questionIndex === questions.length - 1
    if (!isLast) {
      setTimeout(() => setQuestionIndex((i) => i + 1), 300)
    } else {
      setPendingSubmit(true) // show Submit button; user confirms before seeing results
    }
  }

  const submitQuiz = useCallback(async () => {
    setPendingSubmit(false)
    setQuizPhase("results")
    setAiInterpretation(null)
    setInterpretationLoading(true)

    const total = Object.values(answers)
    const avgScore = total.length ? Math.round(total.reduce((a, b) => a + b, 0) / total.length) : 0
    const catScores = questions.reduce((acc, ques) => {
      if (answers[ques.id] !== undefined) {
        if (!acc[ques.category]) acc[ques.category] = []
        acc[ques.category].push(answers[ques.id])
      }
      return acc
    }, {} as Record<string, number[]>)

    // Save to localStorage
    const result = {
      id: Date.now().toString(),
      type: quizType,
      score: avgScore,
      category_scores: catScores,
      created_at: new Date().toISOString(),
    }
    const prev = readStorage<typeof result[]>(STORAGE_KEYS.quizResults) ?? []
    writeStorage(STORAGE_KEYS.quizResults, [...prev, result])

    // Sync to Supabase if authenticated
    try {
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user?.id
      if (userId) {
        await supabase.from("quiz_results").insert({
          user_id: userId, type: quizType, score: avgScore, category_scores: catScores,
        })
      }
    } catch {}

    // Build category context for AI
    const catSummary = Object.entries(catScores)
      .map(([cat, scores]) => {
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        const display = ({ recognition: "Emotion Recognition", expression: "Emotion Expression", regulation: "Emotion Regulation", "self-kindness": "Self-Kindness", "common-humanity": "Common Humanity", mindfulness: "Mindfulness" } as Record<string, string>)[cat] ?? cat
        return `${display}: ${avg}/100`
      }).join(", ")

    const logs = readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? []
    const recentEmotions = logs.slice(0, 5).map((l) => l.emotion).join(", ") || "not logged yet"
    const quizLabel = QUIZ_META[quizType].label

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 150,
          system: "You write warm, specific, compassionate 2-3 sentence reflections for people healing emotionally. Speak directly to the person using 'you'. Reference their actual scores and recent emotions. No generic praise — be honest and caring. Plain prose only.",
          messages: [{
            role: "user",
            content: `Quiz: ${quizLabel}. Overall score: ${avgScore}/100. Category breakdown: ${catSummary}. Recent emotions logged: ${recentEmotions}. Write a personalised 2-3 sentence reflection on what this score reveals about where they are right now and one gentle thing to focus on.`,
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
  }, [answers, questions, quizType])

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
    <div className={`bg-background min-h-screen${inFlow ? " pb-52" : ""}`}>
      <motion.div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-3 md:py-5" variants={container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="flex items-center justify-between mb-3" variants={item}>
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <HavenMark className="w-6 h-6" />
            <span className="font-serif text-[15px] font-semibold text-foreground tracking-tight">Haven</span>
          </Link>
          <h1 className="font-serif text-lg font-semibold text-foreground">Thoughts & Reflection</h1>
          <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
            💜 Talk to Haven
          </Link>
        </motion.div>

        {/* Tab switcher — hidden in flow mode (journal only) */}
        {!inFlow && (
          <motion.div className="flex gap-2 mb-5 p-1 rounded-2xl bg-muted/50 border border-border/40" variants={item}>
            {([["journal", "Journal", BookHeart], ["quiz", "Self-Reflection Quiz", Brain]] as const).map(([value, label, Icon]) => (
              <button key={value} onClick={() => setTab(value)}
                className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  tab === value ? "bg-card shadow-sm text-foreground border border-border/40" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </motion.div>
        )}

        {/* Two-column grid — single column in flow mode */}
        <motion.div className={`grid grid-cols-1 gap-6 lg:gap-8 items-start${inFlow ? "" : " lg:grid-cols-[1fr_320px]"}`} variants={item}>

          {/* ── Main column ── */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">

              {/* ══ JOURNAL TAB ══ */}
              {tab === "journal" && (
                <motion.div key="journal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-5">

                  <div className="glass-card rounded-2xl p-5">
                    {/* Prompt display */}
                    <div className="bg-primary/8 rounded-xl p-4 mb-4 border border-primary/15">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide">
                          {isAiPrompt ? "AI Generated" : "Reflection Prompt"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSpeak(activePrompt)}
                            className="p-1 rounded-lg text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors"
                            aria-label={ttsText === activePrompt && isSpeaking ? "Stop reading" : "Read prompt aloud"}
                          >
                            {ttsText === activePrompt && isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={generateAiPrompt}
                            disabled={generatingPrompt}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                          >
                            {generatingPrompt
                              ? <><RotateCcw className="w-3 h-3 animate-spin" /> Generating…</>
                              : <><Sparkles className="w-3 h-3" /> Generate with AI</>}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed font-serif italic">"{activePrompt}"</p>
                    </div>

                    {/* Write area */}
                    <Textarea
                      value={entry}
                      onChange={(e) => setEntry(e.target.value)}
                      placeholder="Take your time. Write whatever comes…"
                      className="min-h-[140px] resize-none rounded-xl border-border/40 text-sm leading-relaxed focus-visible:ring-primary/30 mb-3"
                    />
                    <Button
                      onClick={saveEntry}
                      disabled={!entry.trim() || saved}
                      className={cn("w-full rounded-xl gap-2", saved && "bg-emerald-500 hover:bg-emerald-500")}
                    >
                      {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Entry</>}
                    </Button>
                  </div>

                </motion.div>
              )}

              {/* ══ QUIZ TAB ══ */}
              {tab === "quiz" && (
                <motion.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>

                  {quizPhase === "select" && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground mb-2">These short reflections help you understand yourself better. There are no right or wrong answers.</p>
                      {(Object.entries(QUIZ_META) as [QuizType, typeof QUIZ_META["self-compassion"]][]).map(([type, meta]) => (
                        <button key={type} onClick={() => startQuiz(type)}
                          className={cn("w-full text-left glass-card rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md", meta.border)}>
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

                  {quizPhase === "questions" && dynamicScLoading && (
                    <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground text-center animate-pulse">
                        Haven is personalising your questions from your journal…
                      </p>
                    </div>
                  )}

                  {quizPhase === "questions" && !dynamicScLoading && questions.length > 0 && (
                    <div>
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span>
                            {QUIZ_META[quizType].emoji} {QUIZ_META[quizType].label}
                            {dynamicScQs && quizType === "self-compassion" && (
                              <span className="ml-2 text-primary/60">✦ personalised</span>
                            )}
                          </span>
                          <span>{questionIndex + 1} / {questions.length}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                          <motion.div className="h-full rounded-full bg-primary"
                            animate={{ width: `${((questionIndex) / questions.length) * 100}%` }} transition={{ duration: 0.4 }} />
                        </div>
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div key={questionIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                          transition={{ duration: 0.3 }} className="glass-card rounded-2xl p-6">
                          <p className="font-serif text-lg text-foreground leading-snug mb-6">{questions[questionIndex].question}</p>
                          <div className="space-y-2.5">
                            {questions[questionIndex].options.map((option, i) => (
                              <button key={i} onClick={() => answerQuestion(questions[questionIndex].scores[i])}
                                className={cn("w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all duration-200",
                                  answers[questions[questionIndex].id] !== undefined
                                    ? "opacity-50 cursor-default border-border/30"
                                    : "border-border/50 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground text-muted-foreground")}>
                                {option}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                      <AnimatePresence>
                        {pendingSubmit && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                            className="mt-5"
                          >
                            <Button onClick={submitQuiz} className="w-full rounded-xl gap-2">
                              <CheckCircle2 className="w-4 h-4" /> Submit Reflection
                            </Button>
                            <p className="text-[11px] text-muted-foreground text-center mt-2">
                              Your results will be saved to your Healing Insights
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <button onClick={() => setQuizPhase("select")} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                        <ChevronLeft className="w-3 h-3" /> Exit quiz
                      </button>
                    </div>
                  )}

                  {quizPhase === "results" && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                      {/* Combined scores card — only when both quizzes have results */}
                      {(() => {
                        const allResults = readStorage<{ type: QuizType; score: number; created_at: string }[]>(STORAGE_KEYS.quizResults) ?? []
                        const otherType: QuizType = quizType === "self-compassion" ? "emotional-awareness" : "self-compassion"
                        const otherResult = allResults.filter((r) => r.type === otherType).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
                        if (!otherResult) return null
                        return (
                          <div className="glass-card rounded-2xl p-4 mb-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">Your Progress</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center p-3 rounded-xl bg-background/60 border border-border/30">
                                <p className="text-xs text-muted-foreground mb-1">{QUIZ_META[quizType].label}</p>
                                <p className={cn("text-2xl font-bold", getScore(avgScore).color)}>{avgScore}</p>
                                <p className={cn("text-[11px] font-medium", getScore(avgScore).color)}>{getScore(avgScore).label}</p>
                              </div>
                              <div className="text-center p-3 rounded-xl bg-background/60 border border-border/30">
                                <p className="text-xs text-muted-foreground mb-1">{QUIZ_META[otherType].label}</p>
                                <p className={cn("text-2xl font-bold", getScore(otherResult.score).color)}>{otherResult.score}</p>
                                <p className={cn("text-[11px] font-medium", getScore(otherResult.score).color)}>{getScore(otherResult.score).label}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                      <div className="glass-card rounded-2xl p-6 text-center">
                        <div className="text-4xl mb-1">{QUIZ_META[quizType].emoji}</div>
                        <h2 className="font-serif text-xl font-semibold text-foreground mb-1">{QUIZ_META[quizType].label}</h2>
                        <div className={cn("text-4xl font-bold my-4", getScore(avgScore).color)}>{avgScore}</div>
                        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-primary/10", getScore(avgScore).color)}>
                          <Sparkles className="w-3 h-3" /> {getScore(avgScore).label}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{getScore(avgScore).message}</p>
                      </div>

                      {/* AI personalised interpretation */}
                      <AnimatePresence>
                        {(interpretationLoading || aiInterpretation) && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="mt-4 rounded-2xl p-4 border border-primary/20 bg-primary/5"
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
                                      onClick={() => handleSpeak(aiInterpretation)}
                                      className="p-1 rounded-lg text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                                      aria-label={ttsText === aiInterpretation && isSpeaking ? "Stop" : "Read aloud"}
                                    >
                                      {ttsText === aiInterpretation && isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm text-foreground/90 leading-relaxed font-serif italic">"{aiInterpretation}"</p>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-3 mt-4">
                        <Button onClick={() => startQuiz(quizType)} variant="outline" className="flex-1 rounded-xl gap-2">
                          <RotateCcw className="w-4 h-4" /> Retake
                        </Button>
                        <Button
                          onClick={() => startQuiz(quizType === "self-compassion" ? "emotional-awareness" : "self-compassion")}
                          className="flex-1 rounded-xl gap-2"
                        >
                          Take {quizType === "self-compassion" ? "Emotional Awareness" : "Self-Compassion"} →
                        </Button>
                      </div>
                      <div className="mt-3 text-center">
                        <Link href="/insights" className="text-xs text-primary hover:underline">
                          View full analysis in Insights →
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Sidebar — hidden in flow mode ── */}
          {!inFlow && <aside className="lg:sticky lg:top-[76px] lg:self-start space-y-4 min-w-0">

            {/* Journal: past entries */}
            {tab === "journal" && journalEntries.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h2 className="font-semibold text-foreground text-sm mb-4">Past Entries</h2>
                <div className="space-y-3">
                  {journalEntries.slice(0, 5).map((e) => (
                    <div key={e.id} className="border border-border/40 rounded-xl overflow-hidden">
                      {pendingDeleteId === e.id ? (
                        /* Inline delete confirmation */
                        <div className="flex items-center justify-between px-4 py-3 bg-destructive/5 border-l-2 border-destructive/40">
                          <span className="text-sm text-foreground">Delete this entry?</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => { deleteJournalEntry(e.id); setPendingDeleteId(null) }}
                              className="text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setPendingDeleteId(null)}
                              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-[11px] text-primary/70 font-medium font-serif italic line-clamp-1 flex-1">"{e.prompt}"</p>
                            <button
                              onClick={() => setPendingDeleteId(e.id)}
                              className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button onClick={() => setViewEntry(e)} className="w-full text-left">
                            <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{e.entry}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                              <span className="text-[10px] text-primary/60 flex items-center gap-0.5 font-medium">
                                Read <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Journal: empty state tip */}
            {tab === "journal" && journalEntries.length === 0 && (
              <div className="glass-card rounded-2xl p-5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your saved journal entries will appear here. Choose a prompt and write your first reflection to get started.
                </p>
              </div>
            )}

            {/* Quiz: category breakdown in results */}
            {tab === "quiz" && quizPhase === "results" && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="font-semibold text-sm text-foreground mb-4">Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(categoryScores).map(([cat, scores]) => {
                    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                    const { color, label } = getScore(avg)
                    const displayName = ({
                      "recognition": "Emotion Recognition",
                      "expression": "Emotion Expression",
                      "regulation": "Emotion Regulation",
                      "self-kindness": "Self-Kindness",
                      "common-humanity": "Common Humanity",
                      "mindfulness": "Mindfulness",
                    } as Record<string, string>)[cat] ?? cat
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground font-medium">{displayName}</span>
                          <span className={cn("font-semibold", color)}>{label}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                          <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }}
                            animate={{ width: `${avg}%` }} transition={{ duration: 0.7, delay: 0.2 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quiz: tip during select/questions */}
            {tab === "quiz" && quizPhase !== "results" && (
              <div className="glass-card rounded-2xl p-5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These reflections help you understand yourself better. There are no right or wrong answers — just honest ones.
                </p>
              </div>
            )}

          </aside>}

        </motion.div>
      </motion.div>

      {/* ── Journal Entry Modal ── */}
      <AnimatePresence>
        {viewEntry && (
          <>
            <motion.div
              key="entry-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setViewEntry(null)}
            />
            <motion.div
              key="entry-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-card border border-border/50 rounded-3xl shadow-2xl w-full max-w-lg pointer-events-auto max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3 border-b border-border/30">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/60 mb-1.5">
                      {new Date(viewEntry.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    {viewEntry.prompt && (
                      <p className="font-serif text-base italic text-foreground/80 leading-snug">"{viewEntry.prompt}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => setViewEntry(null)}
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors mt-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Body */}
                <div className="px-6 py-5 overflow-y-auto flex-1">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{viewEntry.entry}</p>
                </div>
                {/* Footer */}
                <div className="px-6 pb-5 pt-3 border-t border-border/30 flex items-center justify-between gap-3">
                  <button
                    onClick={() => viewEntry && handleSpeak(viewEntry.entry)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Read entry aloud"
                  >
                    {ttsText === viewEntry?.entry && isSpeaking
                      ? <><VolumeX className="w-3.5 h-3.5" /> Stop reading</>
                      : <><Volume2 className="w-3.5 h-3.5" /> Read aloud</>}
                  </button>
                  <button
                    onClick={() => { stopSpeech(); setViewEntry(null) }}
                    className="px-4 py-2 rounded-xl bg-muted/60 hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <HavenFlowGuide
        currentTool="journal"
        exerciseData={journalEntries[0]?.entry ? `User's journal entry: "${journalEntries[0].entry.slice(0, 200)}"` : undefined}
      />
    </div>
  )
}
