"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Send, TrendingUp, Volume2, VolumeX, ChevronRight, Sparkles, Wind, BookHeart, BarChart3 } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { useTTS, useSTT } from "@/hooks/use-speech"
import { useEmotionLogs } from "@/hooks/use-emotion-logs"
import { useJournalEntries } from "@/hooks/use-journal-entries"
import { useAuth } from "@/contexts/auth-context"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────
type HavenMode =
  | "greeting"
  | "chatting"
  | "emotion-widget"
  | "breathe-widget"
  | "journal-widget"
  | "survey-widget"
  | "quiz-widget"
  | "insights-widget"

type HavenAction = "emotion" | "breathe" | "journal" | "survey" | "quiz" | "insights" | null
type QuizType    = "emotional-awareness" | "self-compassion"

type HavenResponse = {
  message: string
  action: HavenAction
  chips: string[]
}

type ApiMessage = { role: "user" | "assistant"; content: string }

// ── Static data ───────────────────────────────────────────────────────────────
const EMOTIONS = [
  { label: "Sad",      emoji: "😔", intensity: 3 },
  { label: "Anxious",  emoji: "😰", intensity: 4 },
  { label: "Numb",     emoji: "😶", intensity: 3 },
  { label: "Hopeful",  emoji: "🌱", intensity: 6 },
  { label: "Grateful", emoji: "🙏", intensity: 7 },
  { label: "Angry",    emoji: "😤", intensity: 5 },
  { label: "Calm",     emoji: "😌", intensity: 6 },
  { label: "Grief",    emoji: "💔", intensity: 2 },
]

const BREATHE_SEQ = [
  { phase: "inhale" as const, label: "Breathe In",  cue: "Breathe in",  dur: 4 },
  { phase: "hold1"  as const, label: "Hold",        cue: "Hold",        dur: 4 },
  { phase: "exhale" as const, label: "Breathe Out", cue: "Breathe out", dur: 4 },
  { phase: "hold2"  as const, label: "Hold",        cue: "Hold",        dur: 3 },
  { phase: "rest"   as const, label: "Rest",        cue: "Rest",        dur: 3 },
]

// ── Quiz data (5-question embedded version, saves to same key as /thoughts) ───
type HavenQuizQ = { id: string; question: string; options: string[]; scores: number[]; category: string }

const HAVEN_QUIZ: Record<QuizType, { label: string; emoji: string; questions: HavenQuizQ[] }> = {
  "emotional-awareness": {
    label: "Emotional Awareness", emoji: "🧠",
    questions: [
      { id: "ea1", question: "When you feel upset, how quickly do you recognise the specific emotion?", options: ["Immediately — I always know", "Within a few minutes", "I feel 'bad' before naming it", "I struggle to identify emotions"], scores: [100, 75, 50, 25], category: "recognition" },
      { id: "ea2", question: "How well can you tell apart similar feelings — like disappointment vs sadness?", options: ["Very well", "Fairly well", "Sometimes I confuse them", "Most emotions feel the same"], scores: [100, 75, 50, 25], category: "recognition" },
      { id: "ea3", question: "When a strong emotion hits, how well can you pause before reacting?", options: ["Almost always pause first", "Usually, when I remember", "I react, then reflect", "I react immediately"], scores: [100, 75, 50, 25], category: "regulation" },
      { id: "ea4", question: "How well do you recover your emotional balance after being upset?", options: ["Quickly — within hours", "Usually within a day or two", "Often lingers for days", "Very hard to regain balance"], scores: [100, 75, 50, 25], category: "regulation" },
      { id: "ea5", question: "How comfortable are you expressing emotions to people you trust?", options: ["Very comfortable", "Comfortable with close people", "Rarely share true feelings", "Very uncomfortable"], scores: [100, 75, 50, 25], category: "expression" },
    ]
  },
  "self-compassion": {
    label: "Self-Compassion", emoji: "💜",
    questions: [
      { id: "sc1", question: "When you fail at something important, how do you speak to yourself?", options: ["Kindly — like comforting a friend", "With some criticism but understanding", "Harshly — focusing on what I did wrong", "Very harshly — I'm my worst critic"], scores: [100, 75, 50, 25], category: "self-kindness" },
      { id: "sc2", question: "When going through hard times, how patient are you with yourself?", options: ["Very patient — I give myself grace", "Usually patient, sometimes slip", "I feel I should be doing better", "Very impatient — I blame myself heavily"], scores: [100, 75, 50, 25], category: "self-kindness" },
      { id: "sc3", question: "When struggling, how much do you remind yourself others feel this way too?", options: ["Often — it helps me feel less alone", "Sometimes — when I think to", "Rarely — my pain feels unique", "Never — I feel fundamentally alone"], scores: [100, 75, 50, 25], category: "common-humanity" },
      { id: "sc4", question: "When overwhelmed, how aware are you of your feelings without being swept away?", options: ["Very aware — I observe, not over-identify", "Usually — I can step back", "Sometimes — I get swept up", "Rarely — I'm consumed by them"], scores: [100, 75, 50, 25], category: "mindfulness" },
      { id: "sc5", question: "When something painful happens, how do you relate to it in the moment?", options: ["With balanced awareness", "I try to keep perspective", "I tend to blow it up", "I'm completely consumed"], scores: [100, 75, 50, 25], category: "mindfulness" },
    ]
  }
}

const EMOTION_JOURNAL_PROMPTS: Record<string, string> = {
  "Sad":      "What does this sadness feel like in your body right now? What does it most need from you?",
  "Anxious":  "What is your anxiety trying to protect you from? What would you say to it with kindness?",
  "Numb":     "When did you last feel something clearly? What were you doing, and who were you with?",
  "Hopeful":  "What sparked this sense of hope today? How can you honour it and let it grow?",
  "Grateful": "What are you most grateful for right now? Who or what has held you recently?",
  "Angry":    "What is your anger telling you about what matters to you? What boundary needs honouring?",
  "Calm":     "What brought you to this calm? How can you return here when things feel harder?",
  "Grief":    "What are you grieving? If you could say one thing to what you've lost, what would it be?",
}

const HAVEN_SYSTEM = `You are Haven, the heart of HeartsHeal — a compassionate AI healing companion.
You speak warmly, gently, and briefly (2-3 sentences max).
You guide the user through their healing by proactively suggesting embedded activities.

Your response MUST always be valid JSON in this exact shape:
{"message":"What you say to the user (plain conversational text, no markdown)","action":null,"chips":["chip 1","chip 2","chip 3"]}

action must be one of: null | "emotion" | "breathe" | "journal" | "survey" | "quiz" | "insights"

Rules for action — set the action field ANY TIME one of these is true:
- "emotion" — user wants to check in, mentions a feeling, or hasn't logged today
- "breathe" — user mentions anxiety, stress, tension, overwhelm, panic, "I can't breathe", or wants to calm down. ALSO set "breathe" when user says "I want to breathe" or "breathing" or "breathe with me"
- "journal" — user mentions wanting to write, process, reflect, "get it out", talk about what happened, or says "I have a lot on my mind". ALSO after any breathing session completes.
- "survey" — user mentions overall wellbeing, self-care, or asks "how am I doing overall"; suggest at most once per session
- "quiz" — user wants to understand themselves, mentions self-awareness, compassion, or emotional intelligence
- "insights" — user asks about progress, patterns, or after 2+ activities completed
- null — casual reply only; no activity fits right now

IMPORTANT: When the user says anything related to breathing or journaling (even implicitly), you MUST set the corresponding action. Never leave action null when breathing or writing is relevant.

chips must be 3-4 short (under 6 words) response options the user can tap.
Always lead with empathy. Never rush. One question or suggestion at a time.
If the user just completed an activity, acknowledge it warmly before moving on.
If self-harm is mentioned, gently include the 988 Lifeline in your message.`

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r    = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color  = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#f43f5e"
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-border/30" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HavenHome() {
  const { user, isLoading: authLoading } = useAuth()
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<"signin" | "signup">("signup")

  // Show welcome screen for unauthenticated users (only evaluated client-side)
  useEffect(() => {
    if (!authLoading && !user) setWelcomeOpen(true)
    if (user) setWelcomeOpen(false)
  }, [authLoading, user])
  const { addEntry: addEmotion } = useEmotionLogs()
  const { addEntry: addJournal } = useJournalEntries()
  const { speak, stop: stopSpeech, prefetch, voiceEnabled, toggleVoice } = useTTS()

  // ── Conversation state ────────────────────────────────────────────────────
  const [mode,          setMode]          = useState<HavenMode>("greeting")
  const [havenMessage,  setHavenMessage]  = useState("")
  const [displayText,   setDisplayText]   = useState("")
  const [chips,         setChips]         = useState<string[]>([])
  const [activeAction,  setActiveAction]  = useState<HavenAction>(null)
  const [apiMessages,   setApiMessages]   = useState<ApiMessage[]>([])
  const [loading,       setLoading]       = useState(false)
  const [input,         setInput]         = useState("")

  // ── Session tracking ──────────────────────────────────────────────────────
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)
  const [completedToday,  setCompletedToday]  = useState<Set<string>>(new Set())

  // ── Breathing widget state ────────────────────────────────────────────────
  const [breathePhase,          setBreathePhase]          = useState<"idle" | "inhale" | "hold1" | "exhale" | "hold2" | "rest" | "done">("idle")
  const [breatheCount,          setBreatheCount]          = useState(0)
  const [breatheTargetRounds,   setBreatheTargetRounds]   = useState(3)
  const [breatheCyclesDone,     setBreatheCyclesDone]     = useState(0)
  const breatheInterval   = useRef<ReturnType<typeof setInterval> | null>(null)
  const breatheCyclesRef  = useRef(0)
  const prevUserIdRef     = useRef<string | null | undefined>(undefined)
  const breatheTargetRef  = useRef(3)

  // ── Quiz widget state ─────────────────────────────────────────────────────
  const [quizType,    setQuizType]    = useState<QuizType>("emotional-awareness")
  const [quizIndex,   setQuizIndex]   = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizPhase,   setQuizPhase]   = useState<"idle" | "active" | "done">("idle")

  // ── Journal widget state ──────────────────────────────────────────────────
  const [journalText,  setJournalText]  = useState("")
  const [journalSaved, setJournalSaved] = useState(false)

  // ── Survey widget state ───────────────────────────────────────────────────
  const [survey, setSurvey] = useState({ emotionalState: 3, selfConnection: 3, selfCompassion: 3, selfCare: 3 })
  const [surveySaved, setSurveySaved] = useState(false)

  // ── Typewriter effect ─────────────────────────────────────────────────────
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const showMessage = useCallback((msg: string) => {
    setHavenMessage(msg)
    setDisplayText("")
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    let i = 0
    typewriterRef.current = setInterval(() => {
      setDisplayText(msg.slice(0, ++i))
      if (i >= msg.length) clearInterval(typewriterRef.current!)
    }, 16)
    speak(msg)
  }, [speak])

  // ── Post-auth onboarding reset ────────────────────────────────────────────
  const handlePostAuth = useCallback(() => {
    setCompletedToday(new Set())
    setApiMessages([{
      role: "user",
      content: "[ONBOARDING] The user just signed in or created an account. Guide them through a complete setup sequence in order: 1) emotion check-in, 2) breathing session, 3) journal reflection, 4) wellbeing survey, 5) self-assessment quiz, 6) show insights summary. After each activity is reported complete, immediately suggest the next one. Be warm and encouraging, 2 sentences max per response.",
    }])
    setMode("emotion-widget")
    setChips(["I'm ready", "What are we doing?", "Let's go"])
    setInput("")
    stopSpeech()
    writeStorage(STORAGE_KEYS.lastCheckin, null)
    const name = readStorage<string>(STORAGE_KEYS.userName)
    const msg = name
      ? `Welcome, ${name} — I'm so glad you're here. Let's take a few minutes together to get your healing space set up.`
      : `Welcome — I'm Haven, your healing companion. Let's take a few minutes to personalize your space and get everything ready.`
    setTimeout(() => showMessage(msg), 400)
  }, [stopSpeech, showMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authLoading) return
    const prevId = prevUserIdRef.current
    const nextId = user?.id ?? null
    if (prevId === null && nextId !== null) handlePostAuth()
    prevUserIdRef.current = nextId
  }, [user, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial greeting (synchronous, no API call) ──────────────────────────
  useEffect(() => {
    const name        = readStorage<string>(STORAGE_KEYS.userName)
    const lastCheckin = readStorage<string>(STORAGE_KEYS.lastCheckin)
    const logs        = readStorage<any[]>(STORAGE_KEYS.emotionLogs) ?? []
    const checkedIn   = lastCheckin === new Date().toDateString()
    const isNew       = logs.length === 0 && !checkedIn

    let message: string
    let initChips: string[]
    let initAction: HavenAction

    if (isNew) {
      message    = "I'm here for you. Let's take this one step at a time."
      initChips  = ["I went through a breakup", "I'm feeling anxious", "I need clarity", "I just want to talk"]
      initAction = "emotion"
    } else if (checkedIn) {
      message    = `Welcome back${name ? ", " + name : ""}. How are you feeling since we last spoke?`
      initChips  = ["Better", "About the same", "Harder today", "I want to try something"]
      initAction = null
    } else {
      message    = `Good to see you${name ? ", " + name : ""}. How has today been?`
      initChips  = ["It's been hard", "I'm managing", "I actually feel okay", "I want to breathe"]
      initAction = null
    }

    setChips(initChips)
    setActiveAction(initAction)
    if (initAction) setMode(`${initAction}-widget` as HavenMode)

    // Slight delay so page paints before voice + typewriter begin
    const t = setTimeout(() => showMessage(message), 400)

    // Prefetch breathing cues while greeting plays
    prefetch("Breathe in"); prefetch("Hold"); prefetch("Breathe out")

    return () => { clearTimeout(t); if (typewriterRef.current) clearInterval(typewriterRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send a message to Haven AI ────────────────────────────────────────────
  const sendToHaven = useCallback(async (userText: string) => {
    if (!userText.trim() || loading) return
    setInput("")
    setLoading(true)
    setMode("chatting")
    stopSpeech()

    const logs       = readStorage<any[]>(STORAGE_KEYS.emotionLogs) ?? []
    const lossCtx    = readStorage<string[]>(STORAGE_KEYS.lossContext) ?? []
    const recentLogs = logs.slice(0, 3).map((l: any) => `${l.emoji} ${l.emotion}`).join(", ")
    const doneList   = Array.from(completedToday).join(", ")

    const contextNote = [
      lossCtx.length   ? `User's loss context: ${lossCtx.join(", ")}.` : "",
      recentLogs        ? `Recent emotions logged: ${recentLogs}.` : "",
      doneList          ? `Completed this session: ${doneList}.` : "",
      selectedEmotion   ? `Current emotion picked today: ${selectedEmotion}.` : "",
    ].filter(Boolean).join(" ")

    const nextMessages: ApiMessage[] = [
      ...apiMessages,
      { role: "user", content: userText },
    ]
    setApiMessages(nextMessages)

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model:      "claude-haiku-4-5-20251001",
          max_tokens: 300,
          system:     HAVEN_SYSTEM + (contextNote ? `\n\nContext: ${contextNote}` : ""),
          messages:   nextMessages.slice(-20),
        }),
      })

      const data = await res.json()
      const raw  = data.content?.[0]?.text ?? ""

      let parsed: HavenResponse = { message: "I'm here with you.", action: null, chips: ["Tell me more", "I'm okay", "What's next?"] }
      try {
        parsed = JSON.parse(raw)
      } catch {
        // Claude occasionally wraps JSON in markdown — strip fences
        const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (match) {
          try { parsed = JSON.parse(match[1]) } catch {}
        } else {
          parsed.message = raw.replace(/[{}"]/g, "").slice(0, 200) || parsed.message
        }
      }

      // Client-side keyword fallback — if Claude missed an obvious trigger, catch it here
      if (!parsed.action) {
        const lower = userText.toLowerCase()
        if (/breath|breathing|breathe|calm down|panic|anxious|anxiety/.test(lower) && !completedToday.has("breathe")) {
          parsed.action = "breathe"
        } else if (/journal|write|writing|process|reflect|get it out|on my mind|talk about/.test(lower) && !completedToday.has("journal")) {
          parsed.action = "journal"
        }
      }

      setApiMessages([...nextMessages, { role: "assistant", content: raw }])
      setChips(parsed.chips ?? [])
      setActiveAction(parsed.action)
      if (parsed.action) setMode(`${parsed.action}-widget` as HavenMode)
      showMessage(parsed.message)
    } catch {
      showMessage("I'm here with you — something went quiet on my end. Take a breath and try again.")
      setChips(["Try again", "I'll come back", "Just breathe"])
    } finally {
      setLoading(false)
    }
  }, [loading, apiMessages, completedToday, selectedEmotion, stopSpeech, showMessage])

  // ── After widget completes: tell Haven what happened ──────────────────────
  const reportToHaven = useCallback((msg: string, key: string) => {
    setCompletedToday((prev) => new Set([...prev, key]))
    setMode("chatting")
    setActiveAction(null)
    sendToHaven(msg)
  }, [sendToHaven])

  // ── Emotion widget ────────────────────────────────────────────────────────
  const [pickedEmotion, setPickedEmotion] = useState<string | null>(null)
  const [intensityStep, setIntensityStep] = useState(false)
  const [emotionIntensity, setEmotionIntensity] = useState(5)

  const handleEmotionPick = useCallback(async (label: string, emoji: string, intensity: number) => {
    setIntensityStep(false)
    setSelectedEmotion(label)
    writeStorage(STORAGE_KEYS.lastCheckin, new Date().toDateString())
    await addEmotion({ emotion: label, emoji, intensity, notes: "" })
    setTimeout(() => {
      setPickedEmotion(null)
      reportToHaven(`I just logged that I'm feeling ${label} ${emoji} at intensity ${intensity}/10.`, "emotion")
    }, 500)
  }, [addEmotion, reportToHaven])

  // ── Breathing widget ──────────────────────────────────────────────────────
  const saveBreatheSession = useCallback((cycles: number) => {
    if (cycles < 1) return
    try {
      const record = { id: Date.now().toString(), timestamp: new Date().toISOString(), pattern: "Box Breathing (4-4-4-2)", cycles }
      const prev = readStorage<any[]>(STORAGE_KEYS.breathingHistory) ?? []
      writeStorage(STORAGE_KEYS.breathingHistory, [...prev, record])
    } catch {}
  }, [])

  const startBreathing = useCallback((rounds = 3) => {
    breatheCyclesRef.current  = 0
    breatheTargetRef.current  = rounds
    setBreatheCyclesDone(0)
    setBreatheTargetRounds(rounds)

    let seqIdx = 0; let count = BREATHE_SEQ[0].dur
    setBreathePhase(BREATHE_SEQ[0].phase); setBreatheCount(count)
    speak(BREATHE_SEQ[0].cue, { rate: 0.82, pitch: 0.9 })

    breatheInterval.current = setInterval(() => {
      count -= 1; setBreatheCount(count)
      if (count <= 0) {
        seqIdx += 1

        // Cycle completes when hold2 (index 3) ends and we enter rest (index 4)
        if (seqIdx === BREATHE_SEQ.length - 1) {
          breatheCyclesRef.current += 1
          setBreatheCyclesDone(breatheCyclesRef.current)
          if (breatheCyclesRef.current >= breatheTargetRef.current) {
            // Final round — skip rest, end session
            clearInterval(breatheInterval.current!); breatheInterval.current = null
            saveBreatheSession(breatheCyclesRef.current)
            setBreathePhase("done")
            return
          }
          // More rounds — fall through to show rest phase
        } else if (seqIdx >= BREATHE_SEQ.length) {
          // Rest phase finished — loop back to inhale for next round
          seqIdx = 0
        }

        const next = BREATHE_SEQ[seqIdx]; count = next.dur
        setBreathePhase(next.phase); setBreatheCount(count)
        if (next.cue) speak(next.cue, { rate: 0.82, pitch: 0.9 })
      }
    }, 1000)
  }, [speak, saveBreatheSession])

  const endBreathingEarly = useCallback(() => {
    if (breatheInterval.current) { clearInterval(breatheInterval.current); breatheInterval.current = null }
    saveBreatheSession(breatheCyclesRef.current)
    setBreathePhase("done")
  }, [saveBreatheSession])

  const skipBreathing = useCallback(() => {
    if (breatheInterval.current) { clearInterval(breatheInterval.current); breatheInterval.current = null }
    setBreathePhase("idle")
    reportToHaven("I skipped the breathing exercise for now.", "breathe")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (breatheInterval.current) clearInterval(breatheInterval.current) }, [])

  const breatheCircleScale = breathePhase === "inhale" ? 1.5 : breathePhase === "exhale" ? 0.68 : 1.0
  const breatheDuration    = BREATHE_SEQ.find((s) => s.phase === breathePhase)?.dur ?? 4

  // ── Journal widget ────────────────────────────────────────────────────────
  const journalPrompt = selectedEmotion
    ? (EMOTION_JOURNAL_PROMPTS[selectedEmotion] ?? "What feeling is taking up the most space in you right now?")
    : "What feeling is taking up the most space in you right now?"

  const saveJournal = useCallback(async () => {
    if (!journalText.trim()) return
    await addJournal({ prompt: journalPrompt, entry: journalText.trim() })
    setJournalSaved(true)
    setTimeout(() => {
      reportToHaven(`I just wrote a reflection in my journal.`, "journal")
    }, 600)
  }, [journalText, journalPrompt, addJournal, reportToHaven])

  // ── Survey widget ─────────────────────────────────────────────────────────
  const saveSurvey = useCallback(() => {
    const record = { id: Date.now().toString(), timestamp: new Date().toISOString(), ...survey }
    const prev = readStorage<any[]>(STORAGE_KEYS.surveyResponses) ?? []
    writeStorage(STORAGE_KEYS.surveyResponses, [...prev, record])
    setSurveySaved(true)
    const avg = ((survey.emotionalState + survey.selfConnection + survey.selfCompassion + survey.selfCare) / 4).toFixed(1)
    setTimeout(() => {
      reportToHaven(`I completed the wellbeing check. My average score was ${avg} out of 5.`, "survey")
    }, 600)
  }, [survey, reportToHaven])

  // ── Quiz widget ───────────────────────────────────────────────────────────
  // When quiz-widget mode opens, pick the less-completed quiz type
  useEffect(() => {
    if (mode !== "quiz-widget") return
    const results = readStorage<any[]>(STORAGE_KEYS.quizResults) ?? []
    const eaCount = results.filter((r) => r.type === "emotional-awareness").length
    const scCount = results.filter((r) => r.type === "self-compassion").length
    setQuizType(eaCount <= scCount ? "emotional-awareness" : "self-compassion")
    setQuizIndex(0)
    setQuizAnswers({})
    setQuizPhase("idle")
  }, [mode])

  const handleQuizAnswer = useCallback((questionId: string, score: number) => {
    setQuizAnswers((prev) => {
      const next = { ...prev, [questionId]: score }
      const questions = HAVEN_QUIZ[quizType].questions
      if (Object.keys(next).length >= questions.length) {
        // All answered — compute + save
        const avgScore = Math.round(Object.values(next).reduce((a, b) => a + b, 0) / questions.length)
        const catScores = questions.reduce((acc, q) => {
          if (next[q.id] !== undefined) {
            if (!acc[q.category]) acc[q.category] = []
            acc[q.category].push(next[q.id])
          }
          return acc
        }, {} as Record<string, number[]>)
        const result = { id: Date.now().toString(), type: quizType, score: avgScore, category_scores: catScores, created_at: new Date().toISOString() }
        const prev2 = readStorage<any[]>(STORAGE_KEYS.quizResults) ?? []
        writeStorage(STORAGE_KEYS.quizResults, [...prev2, result])
        setQuizPhase("done")
        setTimeout(() => {
          const label = HAVEN_QUIZ[quizType].label
          reportToHaven(`I just completed the ${label} self-assessment. My score was ${avgScore} out of 100.`, "quiz")
        }, 800)
      } else {
        setQuizIndex(Object.keys(next).length)
      }
      return next
    })
  }, [quizType]) // eslint-disable-line react-hooks/exhaustive-deps

  const skipQuiz = useCallback(() => {
    setQuizPhase("idle")
    reportToHaven("I skipped the self-assessment for now.", "quiz")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Insights widget data ──────────────────────────────────────────────────
  const insightsData = (() => {
    if (typeof window === "undefined") return null
    const logs      = readStorage<any[]>(STORAGE_KEYS.emotionLogs)      ?? []
    const journals  = readStorage<any[]>(STORAGE_KEYS.journalEntries)   ?? []
    const breathing = readStorage<any[]>(STORAGE_KEYS.breathingHistory) ?? []
    const surveys   = readStorage<any[]>(STORAGE_KEYS.surveyResponses)  ?? []
    // Simple healing score
    const recent = logs.slice(0, 7)
    const days   = new Set(recent.map((l: any) => new Date(l.timestamp).toDateString())).size
    const cons   = Math.min(days / 7, 1)
    const avgI   = recent.length ? recent.reduce((s: number, l: any) => s + (l.intensity ?? 5), 0) / recent.length : 5
    const intS   = 1 - avgI / 10
    let survS    = 0.5
    if (surveys.length) {
      const last3 = surveys.slice(-3)
      const avg   = last3.reduce((s: number, sv: any) => s + ((sv.emotionalState + sv.selfConnection + sv.selfCompassion + sv.selfCare) / 4), 0) / last3.length
      survS = avg / 5
    }
    const score = Math.round((survS * 0.4 + intS * 0.35 + cons * 0.25) * 100)
    const quizzes = readStorage<any[]>(STORAGE_KEYS.quizResults) ?? []
    return { logs: logs.length, journals: journals.length, breathing: breathing.length, quizzes: quizzes.length, score }
  })()

  // ── STT ───────────────────────────────────────────────────────────────────
  const onSTTResult = useCallback((t: string) => setInput(t), [])
  const onSTTEnd    = useCallback((had: boolean) => {
    if (had) setTimeout(() => setInput((cur) => { if (cur.trim()) sendToHaven(cur); return "" }), 300)
  }, [sendToHaven])
  const { status: sttStatus, startListening, stopListening } = useSTT(onSTTResult, onSTTEnd)

  // ── Orb animation config per mode ────────────────────────────────────────
  const orbPing = mode === "chatting" || loading
    ? "1.6s"
    : mode === "greeting"
    ? "3s"
    : "2s"

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-rose-50 via-background to-background dark:from-rose-950/20 dark:via-background dark:to-background overflow-hidden">

      {/* ── Thin header ── */}
      <header className="flex items-center justify-between px-5 pt-2 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-primary">♥</span>
          <span className="font-serif font-semibold text-foreground tracking-tight">HeartsHeal</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={voiceEnabled ? stopSpeech : toggleVoice}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label={voiceEnabled ? "Mute Haven" : "Unmute Haven"}>
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <Link href="/insights"
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label="View insights">
            <TrendingUp className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── Content — fills remaining space, no scrolling ── */}
      <div className="flex-1 flex flex-col items-center px-4 pt-2 min-h-0">

        {/* Orb — smaller on mobile to save vertical space */}
        <div className="relative w-20 h-20 md:w-28 md:h-28 flex items-center justify-center mb-2 shrink-0">
          <motion.span
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: parseFloat(orbPing), repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute inset-0 rounded-full bg-primary/10"
            animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: parseFloat(orbPing) * 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
          <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-rose-300 via-primary to-rose-500 shadow-2xl z-10 flex items-center justify-center">
            <span className="text-white text-xl md:text-2xl select-none">✦</span>
          </div>
        </div>

        {/* Haven's message bubble */}
        <AnimatePresence mode="wait">
          <motion.div
            key={havenMessage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm text-center mb-2 shrink-0"
          >
            {loading ? (
              <div className="flex justify-center gap-1.5">
                {[0,1,2].map((i) => (
                  <motion.span key={i} className="w-2 h-2 rounded-full bg-primary/50"
                    animate={{ opacity: [0.3,1,0.3], y: [0,-4,0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.16 }} />
                ))}
              </div>
            ) : (
              <p className="font-serif text-base md:text-lg text-foreground leading-snug">{displayText}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Middle zone: widgets + chips + quick actions — flex-1 fills remaining space ── */}
        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 overflow-y-auto">

        {/* ── Embedded Widget ── */}
        <AnimatePresence mode="wait">

          {/* EMOTION WIDGET */}
          {mode === "emotion-widget" && !completedToday.has("emotion") && (
            <motion.div key="emotion-widget"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-sm mb-5 rounded-2xl border border-primary/40 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-primary/15"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3 text-center">How are you feeling right now?</p>
              {!intensityStep && (
                <div className="grid grid-cols-4 gap-2">
                  {EMOTIONS.map(({ label, emoji }) => (
                    <button key={label} disabled={!!pickedEmotion}
                      onClick={() => {
                        if (pickedEmotion) return
                        setPickedEmotion(label)
                        setIntensityStep(true)
                        setEmotionIntensity(5)
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3 rounded-xl border text-center transition-all",
                        pickedEmotion === label
                          ? "border-primary bg-primary/10 scale-95"
                          : pickedEmotion
                          ? "border-border/20 opacity-30 cursor-default"
                          : "border-border/40 hover:border-primary/50 hover:bg-primary/5 active:scale-95"
                      )}>
                      <span className="text-xl leading-none">{emoji}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                    </button>
                  ))}
                </div>
              )}
              {intensityStep && pickedEmotion && (
                <motion.div key="intensity-step" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-1">
                  <p className="text-[11px] text-center text-muted-foreground mb-3">
                    How intense is this {pickedEmotion.toLowerCase()}?
                  </p>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs text-muted-foreground w-4 text-right">1</span>
                    <input type="range" min={1} max={10} value={emotionIntensity}
                      onChange={(e) => setEmotionIntensity(Number(e.target.value))}
                      className="flex-1 accent-primary" />
                    <span className="text-xs text-muted-foreground w-4">10</span>
                  </div>
                  <p className="text-center text-2xl font-bold text-primary mb-3">{emotionIntensity}</p>
                  <button
                    onClick={() => {
                      const data = EMOTIONS.find(e => e.label === pickedEmotion)
                      if (data) handleEmotionPick(data.label, data.emoji, emotionIntensity)
                    }}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors mb-2">
                    Log this feeling
                  </button>
                  <button
                    onClick={() => { setPickedEmotion(null); setIntensityStep(false) }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
                    ← Pick a different emotion
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* BREATHE WIDGET */}
          {mode === "breathe-widget" && !completedToday.has("breathe") && (
            <motion.div key="breathe-widget"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-sm mb-5 rounded-2xl border border-sky-300/60 bg-card/80 backdrop-blur-sm p-5 shadow-[0_0_20px_2px] shadow-sky-400/15 flex flex-col items-center"
            >
              <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide mb-4">
                {selectedEmotion ? `Breathing through ${selectedEmotion.toLowerCase()}` : "Box breathing · 4-4-4-2"}
              </p>

              {/* Animated orb */}
              <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                <motion.div className="absolute rounded-full bg-sky-100 dark:bg-sky-900/30"
                  style={{ width: "100%", height: "100%" }}
                  animate={{ scale: breathePhase !== "idle" && breathePhase !== "done" ? breatheCircleScale : 1 }}
                  transition={{ duration: breatheDuration, ease: breathePhase === "inhale" ? "easeIn" : breathePhase === "exhale" ? "easeOut" : "linear" }}
                />
                <motion.div className="rounded-full bg-gradient-to-br from-sky-300 to-sky-500 shadow-lg z-10"
                  style={{ width: "72px", height: "72px" }}
                  animate={{ scale: breathePhase !== "idle" && breathePhase !== "done" ? breatheCircleScale : 1 }}
                  transition={{ duration: breatheDuration, ease: breathePhase === "inhale" ? "easeIn" : breathePhase === "exhale" ? "easeOut" : "linear" }}
                />
                <div className="absolute z-20 flex flex-col items-center">
                  {breathePhase !== "idle" && breathePhase !== "done" && breathePhase !== "rest" && (
                    <>
                      <p className="text-white text-xs font-semibold drop-shadow">
                        {BREATHE_SEQ.find((s) => s.phase === breathePhase)?.label}
                      </p>
                      <p className="text-white/80 text-xl font-bold drop-shadow">{breatheCount}</p>
                    </>
                  )}
                  {breathePhase === "rest" && (
                    <p className="text-white/70 text-xs font-medium drop-shadow tracking-wide">Rest</p>
                  )}
                </div>
              </div>

              {/* PRE-START: round picker + start + skip */}
              {breathePhase === "idle" && (
                <>
                  <p className="text-xs text-muted-foreground mb-2">How many rounds?</p>
                  <div className="flex gap-2 mb-4">
                    {[3, 5, 7].map((r) => (
                      <button key={r} onClick={() => setBreatheTargetRounds(r)}
                        className={cn(
                          "w-10 h-10 rounded-full text-sm font-bold border transition-all",
                          breatheTargetRounds === r
                            ? "bg-sky-500 text-white border-sky-500"
                            : "border-border/50 text-muted-foreground hover:border-sky-400 hover:text-sky-500"
                        )}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => startBreathing(breatheTargetRounds)}
                    className="w-full py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition-colors mb-2">
                    Start {breatheTargetRounds} rounds
                  </button>
                  <button onClick={skipBreathing}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Skip for now
                  </button>
                </>
              )}

              {/* ACTIVE: cycle progress + end early */}
              {breathePhase !== "idle" && breathePhase !== "done" && (
                <div className="flex flex-col items-center gap-3 w-full mt-1">
                  {/* Cycle dots */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: breatheTargetRounds }).map((_, i) => (
                      <span key={i} className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300",
                        i < breatheCyclesDone ? "bg-sky-500" : "bg-sky-200 dark:bg-sky-800"
                      )} />
                    ))}
                    <span className="text-[11px] text-muted-foreground ml-1">
                      {breatheCyclesDone}/{breatheTargetRounds}
                    </span>
                  </div>
                  <button onClick={endBreathingEarly}
                    className="text-xs text-muted-foreground hover:text-sky-500 transition-colors">
                    End session early
                  </button>
                </div>
              )}

              {/* DONE */}
              {breathePhase === "done" && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 w-full">
                  <p className="text-sm text-sky-600 dark:text-sky-400 font-medium">
                    {breatheCyclesDone} round{breatheCyclesDone !== 1 ? "s" : ""} complete ✦
                  </p>
                  <button
                    onClick={() => reportToHaven(`I just completed ${breatheCyclesDone} round${breatheCyclesDone !== 1 ? "s" : ""} of box breathing.`, "breathe")}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Continue →
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* JOURNAL WIDGET */}
          {mode === "journal-widget" && !completedToday.has("journal") && (
            <motion.div key="journal-widget"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-sm mb-5 rounded-2xl border border-amber-300/60 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-amber-400/15"
            >
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3">
                {selectedEmotion ? `Reflecting on your ${selectedEmotion.toLowerCase()}` : "Write it out"}
              </p>
              <div className="bg-amber-50/60 dark:bg-amber-900/20 rounded-xl px-3.5 py-2.5 mb-3 border border-amber-200/40">
                <p className="text-sm text-foreground/80 font-serif italic leading-relaxed">"{journalPrompt}"</p>
              </div>
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Take your time. Write whatever comes…"
                rows={4}
                className="w-full rounded-xl border border-border/40 bg-background px-3.5 py-2.5 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
              />
              {journalSaved ? (
                <p className="text-xs text-emerald-600 text-center py-1">✓ Saved to your journal</p>
              ) : (
                <button onClick={saveJournal} disabled={!journalText.trim()}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors">
                  Save reflection
                </button>
              )}
            </motion.div>
          )}

          {/* SURVEY WIDGET */}
          {mode === "survey-widget" && !completedToday.has("survey") && (
            <motion.div key="survey-widget"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-sm mb-5 rounded-2xl border border-violet-300/60 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-violet-400/15"
            >
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-4">Wellbeing check-in</p>
              {[
                { key: "emotionalState",  label: "Emotional state" },
                { key: "selfConnection",  label: "Connected to yourself" },
                { key: "selfCompassion",  label: "Self-compassion" },
                { key: "selfCare",        label: "Caring for your needs" },
              ].map(({ key, label }) => (
                <div key={key} className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{label}</span>
                    <span className="font-semibold text-foreground">{survey[key as keyof typeof survey]}/5</span>
                  </div>
                  <input type="range" min={1} max={5} step={1}
                    value={survey[key as keyof typeof survey]}
                    onChange={(e) => setSurvey((s) => ({ ...s, [key]: Number(e.target.value) }))}
                    className="w-full accent-violet-500" />
                </div>
              ))}
              {surveySaved ? (
                <p className="text-xs text-emerald-600 text-center py-1">✓ Check-in saved</p>
              ) : (
                <button onClick={saveSurvey}
                  className="w-full mt-2 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors">
                  Submit
                </button>
              )}
            </motion.div>
          )}

          {/* QUIZ WIDGET */}
          {mode === "quiz-widget" && !completedToday.has("quiz") && (() => {
            const quiz      = HAVEN_QUIZ[quizType]
            const questions = quiz.questions
            const current   = questions[quizIndex]

            return (
              <motion.div key="quiz-widget"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="w-full max-w-sm mb-5 rounded-2xl border border-indigo-300/60 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-indigo-400/15"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                    {quiz.emoji} {quiz.label}
                  </p>
                  {quizPhase === "active" && (
                    <span className="text-[11px] text-muted-foreground">{quizIndex + 1} / {questions.length}</span>
                  )}
                </div>

                {/* Progress bar */}
                {quizPhase === "active" && (
                  <div className="w-full bg-muted/40 rounded-full h-1 mb-4 overflow-hidden">
                    <div className="bg-indigo-400 h-1 rounded-full transition-all duration-500"
                      style={{ width: `${((quizIndex) / questions.length) * 100}%` }} />
                  </div>
                )}

                {quizPhase === "idle" && (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <p className="text-sm text-foreground/80 text-center leading-relaxed">
                      5 questions to understand yourself more deeply. Takes about 1 minute.
                    </p>
                    <button onClick={() => setQuizPhase("active")}
                      className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition-colors">
                      Begin assessment
                    </button>
                    <button onClick={skipQuiz} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Skip for now
                    </button>
                  </div>
                )}

                {quizPhase === "active" && current && (
                  <AnimatePresence mode="wait">
                    <motion.div key={current.id}
                      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.22 }}>
                      <p className="text-sm font-medium text-foreground leading-relaxed mb-3">{current.question}</p>
                      <div className="flex flex-col gap-2">
                        {current.options.map((opt, i) => (
                          <button key={i}
                            onClick={() => handleQuizAnswer(current.id, current.scores[i])}
                            className="text-left px-3.5 py-2.5 rounded-xl border border-border/50 text-xs text-foreground/80 hover:border-indigo-400/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all active:scale-[0.98]">
                            {opt}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}

                {quizPhase === "done" && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-2 py-3">
                    <p className="text-2xl">✦</p>
                    <p className="text-sm font-medium text-foreground">Assessment complete</p>
                    <p className="text-xs text-muted-foreground text-center">Haven is reflecting on your answers…</p>
                  </motion.div>
                )}
              </motion.div>
            )
          })()}

          {/* INSIGHTS WIDGET */}
          {mode === "insights-widget" && (
            <motion.div key="insights-widget"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-sm mb-5 rounded-2xl border border-emerald-300/60 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-emerald-400/15"
            >
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-4">Your progress</p>
              <div className="flex items-center gap-4 mb-4">
                {insightsData && <ScoreRing score={insightsData.score} />}
                <div className="flex-1 grid grid-cols-4 gap-1">
                  {[
                    { icon: "💜", val: insightsData?.logs      ?? 0, label: "Emotions" },
                    { icon: "🌬️", val: insightsData?.breathing ?? 0, label: "Breathing" },
                    { icon: "📖", val: insightsData?.journals  ?? 0, label: "Journal" },
                    { icon: "🧠", val: insightsData?.quizzes   ?? 0, label: "Quizzes" },
                  ].map(({ icon, val, label }) => (
                    <div key={label} className="text-center">
                      <p className="text-lg">{icon}</p>
                      <p className="text-base font-bold text-foreground">{val}</p>
                      <p className="text-[9px] text-muted-foreground leading-tight">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/insights"
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors">
                See full insights <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Chips ── */}
        {!loading && chips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap justify-center gap-2 mb-3 w-full max-w-sm"
          >
            {chips.map((chip) => (
              <button key={chip} onClick={() => sendToHaven(chip)}
                className="px-4 py-2 rounded-full border border-border/50 bg-card/60 text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">
                {chip}
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Quick-action panel — fills empty space when no widget is active ── */}
        {!loading && (mode === "greeting" || mode === "chatting") && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="w-full max-w-sm mt-2"
          >
            {/* Primary CTA — Log Emotion */}
            {!completedToday.has("emotion") && (
              <button
                onClick={() => {
                  setMode("emotion-widget")
                  showMessage("How are you feeling right now? Pick what resonates most.")
                }}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm mb-3 shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span className="text-base">💜</span> Log how I'm feeling
              </button>
            )}

            {/* Secondary quick actions */}
            <div className="grid grid-cols-5 gap-1.5">
              {[
                {
                  icon: "🌬️", label: "Breathe",
                  done: completedToday.has("breathe"),
                  onTap: () => { setMode("breathe-widget"); showMessage("Let's take a few deep breaths together.") },
                },
                {
                  icon: "📖", label: "Journal",
                  done: completedToday.has("journal"),
                  onTap: () => { setMode("journal-widget"); showMessage("Take a moment to write what's on your mind.") },
                },
                {
                  icon: "🧘", label: "Survey",
                  done: completedToday.has("survey"),
                  onTap: () => { setMode("survey-widget"); showMessage("Let's check in on how you're doing overall.") },
                },
                {
                  icon: "🧠", label: "Quiz",
                  done: completedToday.has("quiz"),
                  onTap: () => { setMode("quiz-widget"); showMessage("Ready to explore a bit about yourself?") },
                },
                {
                  icon: "📊", label: "Insights",
                  done: false,
                  onTap: () => { setMode("insights-widget") },
                },
              ].map(({ icon, label, done, onTap }) => (
                <button
                  key={label}
                  onClick={onTap}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-2xl border border-border/40 bg-card/60 hover:border-primary/30 hover:bg-primary/5 active:scale-95 transition-all relative"
                >
                  {done && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                  <span className="text-lg">{icon}</span>
                  <span className="text-[9px] font-medium text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        </div>{/* end middle zone */}
      </div>{/* end content column */}

      {/* ── Input hint bar — always visible, anchors to bottom ── */}
      {!welcomeOpen && (
        <div className="shrink-0 px-3 pb-1 pt-1">
          <p className="text-center text-[11px] text-muted-foreground/60 font-medium tracking-wide">
            Type or speak to Haven below ↓
          </p>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="shrink-0 px-4 pb-4 pt-1.5 border-t border-border/20 bg-background/80 backdrop-blur-md">
        <div className="flex gap-2 items-center max-w-sm mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendToHaven(input) } }}
            placeholder="Type or speak to Haven…"
            rows={1}
            className="flex-1 resize-none bg-card border border-border/40 rounded-2xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 leading-relaxed"
            style={{ minHeight: "42px", maxHeight: "80px" }}
          />
          {sttStatus !== "unsupported" && (
            <button
              onClick={sttStatus === "listening" ? stopListening : startListening}
              className={cn(
                "p-2.5 rounded-2xl border transition-all shrink-0",
                sttStatus === "listening"
                  ? "bg-rose-100 dark:bg-rose-900/30 border-rose-300 text-rose-600 animate-pulse"
                  : "bg-card border-border/40 text-muted-foreground hover:text-foreground"
              )}
              aria-label={sttStatus === "listening" ? "Stop" : "Speak"}>
              {sttStatus === "listening" ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => sendToHaven(input)}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-2xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
            aria-label="Send">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Welcome screen overlay ── */}
      <AnimatePresence>
        {welcomeOpen && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-rose-50 via-background to-background dark:from-rose-950/30 dark:via-background dark:to-background"
          >
            {/* Inner wrapper: centers when room exists, scrolls when it doesn't */}
            <div className="min-h-full flex flex-col items-center justify-center px-6 py-8">

            {/* Orb accent */}
            <div className="relative w-16 h-16 mb-4 shrink-0">
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "3s" }} />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-rose-300 via-primary to-rose-500 shadow-2xl flex items-center justify-center">
                <span className="text-white text-xl select-none">✦</span>
              </div>
            </div>

            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground text-center mb-2 leading-tight">
              Welcome to HeartsHeal
            </h1>
            <p className="text-muted-foreground text-center text-sm leading-relaxed max-w-xs mb-5">
              A quiet, compassionate space to process grief, heartbreak, and life transitions — guided by Haven, your personal healing companion.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-5 max-w-xs">
              {[
                { icon: <Sparkles className="w-3.5 h-3.5" />, label: "AI voice companion" },
                { icon: <Wind className="w-3.5 h-3.5" />,     label: "Guided breathing" },
                { icon: <BookHeart className="w-3.5 h-3.5" />, label: "Reflective journaling" },
                { icon: <BarChart3 className="w-3.5 h-3.5" />, label: "Healing insights" },
              ].map(({ icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-xs font-medium text-primary">
                  {icon}{label}
                </span>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={() => { setAuthModalMode("signup"); setAuthModalOpen(true) }}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Let's begin →
              </button>
              <button
                onClick={() => { setAuthModalMode("signin"); setAuthModalOpen(true) }}
                className="w-full py-2.5 rounded-2xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                I already have an account
              </button>
              <button
                onClick={() => setWelcomeOpen(false)}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors pt-1"
              >
                Continue without an account
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground/40 mt-4">Free forever · No credit card required</p>

            {/* Crisis resources */}
            <div className="mt-4 w-full max-w-xs rounded-2xl border border-rose-200/50 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 px-4 py-3">
              <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 text-center mb-2">
                If you're in crisis, please reach out
              </p>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: "988 Suicide & Crisis Lifeline",  detail: "Call or text 988 (US)" },
                  { label: "Crisis Text Line",                detail: "Text HOME to 741741" },
                  { label: "International Association",       detail: "findahelpline.com" },
                ].map(({ label, detail }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-rose-700/80 dark:text-rose-400/80 font-medium leading-tight">{label}</span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-300 font-semibold shrink-0">{detail}</span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-rose-500/60 dark:text-rose-400/40 text-center mt-2 leading-relaxed">
                HeartsHeal supports healing — it is not a substitute for emergency care.
              </p>
            </div>

            </div>{/* end inner wrapper */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth modal triggered from welcome screen */}
      <AuthModal
        key={authModalMode}
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />

    </div>
  )
}
