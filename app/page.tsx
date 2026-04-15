"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Send, TrendingUp, Volume2, VolumeX, ChevronRight, Sparkles, Wind, BookHeart, BarChart3 } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { OnboardingModal, type OnboardingEmotionData } from "@/components/onboarding-modal"
import { useTTS, useSTT } from "@/hooks/use-speech"
import { useEmotionLogs } from "@/hooks/use-emotion-logs"
import { useJournalEntries } from "@/hooks/use-journal-entries"
import { useAuth } from "@/contexts/auth-context"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { startHavenFlow, readHavenFlow, TOOL_HREFS } from "@/lib/haven-flow"
import { cn } from "@/lib/utils"
import { HavenMark } from "@/components/logo-mark"

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

type HavenPattern = {
  id: string; name: string; description: string; benefit: string
  inhale: number; hold1: number; exhale: number; hold2: number; color: string
}

const HAVEN_BREATHE_PATTERNS: HavenPattern[] = [
  { id: "box",      name: "Box Breathing",    description: "4-4-4-4",  benefit: "Reduces stress, improves focus",      inhale: 4, hold1: 4, exhale: 4, hold2: 4, color: "sky" },
  { id: "478",      name: "4-7-8 Breathing",  description: "4-7-8",    benefit: "Calms anxiety, promotes rest",        inhale: 4, hold1: 7, exhale: 8, hold2: 0, color: "violet" },
  { id: "relaxing", name: "Relaxing Breath",  description: "4-6",      benefit: "Activates your calm response",        inhale: 4, hold1: 0, exhale: 6, hold2: 0, color: "rose" },
  { id: "equal",    name: "Equal Breathing",  description: "5-5",      benefit: "Balances the nervous system",         inhale: 5, hold1: 0, exhale: 5, hold2: 0, color: "emerald" },
]

function buildBreatheSeq(p: HavenPattern) {
  const seq: { phase: "inhale" | "hold1" | "exhale" | "hold2" | "rest"; label: string; cue: string; dur: number }[] = []
  seq.push({ phase: "inhale", label: "Breathe In",  cue: "Breathe in",  dur: p.inhale })
  if (p.hold1 > 0) seq.push({ phase: "hold1",  label: "Hold",        cue: "Hold",        dur: p.hold1 })
  seq.push({ phase: "exhale", label: "Breathe Out", cue: "Breathe out", dur: p.exhale })
  if (p.hold2 > 0) seq.push({ phase: "hold2",  label: "Hold",        cue: "Hold",        dur: p.hold2 })
  seq.push({ phase: "rest",   label: "Rest",        cue: "Rest",        dur: 3 })
  return seq
}

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

// Prompts vary by emotion and intensity tier (low 1-3 / medium 4-6 / high 7-10)
const EMOTION_JOURNAL_PROMPTS: Record<string, { low: string; medium: string; high: string }> = {
  "Sad":      {
    low:    "What is this quiet sadness about? Is there something you've been carrying that deserves a little more attention?",
    medium: "What does this sadness feel like in your body right now? What does it most need from you?",
    high:   "You're carrying something heavy right now. What would feel like relief, even just for a moment? Let it out here.",
  },
  "Anxious":  {
    low:    "What's sitting in the back of your mind today? What would you need to feel more settled?",
    medium: "What is your anxiety trying to protect you from? What would you say to it with kindness?",
    high:   "When anxiety is this intense, it helps to name it. What specifically is your nervous system afraid of right now? Write it down — outside of you.",
  },
  "Numb":     {
    low:    "Numbness is often rest in disguise. What do you think you're resting from?",
    medium: "When did you last feel something clearly? What were you doing, and who were you with?",
    high:   "Deep numbness can be protection. What might you be protecting yourself from feeling right now? You don't have to feel it — just name it.",
  },
  "Hopeful":  {
    low:    "Something shifted today. What small thing gave you that feeling of possibility?",
    medium: "What sparked this sense of hope today? How can you honour it and let it grow?",
    high:   "This kind of hope feels like a light turning on. What does it make possible for you? Write about the version of yourself this hope is reaching toward.",
  },
  "Grateful": {
    low:    "Something is good today. What are you quietly thankful for right now?",
    medium: "What are you most grateful for right now? Who or what has held you recently?",
    high:   "This depth of gratitude is rare and worth capturing. Who do you most want to thank? What has changed in you that allows you to feel this so fully?",
  },
  "Angry":    {
    low:    "Something isn't sitting right. What bothered you today, and what did it touch in you?",
    medium: "What is your anger telling you about what matters to you? What boundary needs honouring?",
    high:   "This anger is strong and probably justified. What was crossed? What do you need to say that you haven't been able to say yet? Write it here, uncensored.",
  },
  "Calm":     {
    low:    "There's a stillness in you right now. What's contributing to it?",
    medium: "What brought you to this calm? How can you return here when things feel harder?",
    high:   "This kind of peace feels earned. What's different today? What did you do or let go of that led you here?",
  },
  "Grief":    {
    low:    "Grief visits in quiet ways too. What are you missing today, even a little?",
    medium: "What are you grieving? If you could say one thing to what you've lost, what would it be?",
    high:   "Grief this strong means you loved something deeply. Let yourself write about that love — what it meant, what it gave you, what it still means now.",
  },
}

const EMOTION_QUIZ_MAP: Record<string, "emotional-awareness" | "self-compassion"> = {
  "Sad":      "self-compassion",
  "Anxious":  "emotional-awareness",
  "Numb":     "self-compassion",
  "Hopeful":  "emotional-awareness",
  "Grateful": "self-compassion",
  "Angry":    "emotional-awareness",
  "Calm":     "self-compassion",
  "Grief":    "self-compassion",
}

const HAVEN_SYSTEM = `You are Haven — a compassionate AI healing companion.
You speak warmly, gently, and briefly (2-3 sentences max).
You guide the user through their healing by proactively suggesting embedded activities.

Your response MUST always be valid JSON in this exact shape:
{"message":"What you say to the user (plain conversational text, no markdown)","action":null,"chips":["chip 1","chip 2","chip 3"]}

action must be one of: null | "emotion" | "breathe" | "journal" | "survey" | "quiz" | "insights"

Rules for action — set the action field ANY TIME one of these is true:
- "emotion" — user wants to check in, mentions a feeling, or hasn't logged today
- "breathe" — user mentions anxiety, stress, tension, overwhelm, panic, or wants to calm down
- "journal" — user mentions wanting to write, process, reflect, or after any breathing session completes
- "quiz" — IMMEDIATELY after the user reports completing a journal reflection. In the guided walkthrough, quiz always follows journal.
- "survey" — user mentions overall wellbeing or self-care; suggest at most once per session. In the walkthrough, survey comes AFTER the quiz.
- "insights" — user asks about progress, patterns, or after 2+ activities completed
- null — casual reply only; no activity fits right now

Walkthrough transition order (follow this when user is working through activities):
emotion → breathe → journal → quiz → survey → (session complete)

READING AND RESPONDING TO USER INPUT — this is critical:
When the user reports completing an activity and shares what they did or felt, you MUST:
1. First, genuinely acknowledge the specific content they shared — reference it directly, not generically
2. Offer one brief, warm observation about what it reveals or how it makes you feel as their companion
3. Then naturally introduce the next step

Examples of how to respond to each completion:
- After emotion log (e.g. "feeling Anxious at 8/10"): Reflect on that specific emotion and intensity. "That kind of anxious feeling at that level — it takes something out of you just to carry it." Then suggest breathing.
- After breathing (e.g. "completed 5 rounds of Box Breathing"): Acknowledge the effort of doing all those rounds. Then suggest journaling to process what came up.
- After journal (user shares their actual writing): Read what they wrote and respond to the content specifically — mention something they said. Don't be generic. Then move to the quiz.
- After survey (e.g. scores: Emotional State 3/5, Self-Compassion 1/5): Notice the specific scores, especially any that are low. "Your self-compassion score stood out to me — a 1 means you're being really hard on yourself right now." Then move to insights or quiz.
- After quiz (e.g. score 42/100 in self-compassion): Reflect on what that score might feel like to them. Connect it to their emotion earlier if relevant. Then suggest the survey.

chips must be 3-4 short (under 6 words) natural phrases the user would actually say next — not instructions, but words that come from the heart.
Always lead with empathy. Never rush. One warm observation + one gentle next step per response.
If self-harm is mentioned, gently include the 988 Lifeline in your message.

Memory and personalization:
- If the user's name is provided in context, use it naturally — not in every message, but warmly when it feels right.
- Always frame responses through their healing context (loss type) — grief needs different empathy than a breakup or job loss.
- If past session data is provided, notice patterns: if they were anxious last session and seem calmer today, acknowledge the shift. This continuity is what makes you feel like a real companion, not just a chatbot.
- Never say "based on your data" or "I see from your records." Just speak as if you know them naturally.`

// ── Streak helpers ────────────────────────────────────────────────────────────
function getStreak(): number {
  const data = readStorage<{ lastDate: string; count: number }>(STORAGE_KEYS.streakData)
  if (!data) return 0
  const today     = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  if (data.lastDate === today || data.lastDate === yesterday) return data.count
  return 0
}

function saveStreak(): number {
  const data      = readStorage<{ lastDate: string; count: number }>(STORAGE_KEYS.streakData)
  const today     = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  if (data?.lastDate === today) return data.count
  const count = data?.lastDate === yesterday ? data.count + 1 : 1
  writeStorage(STORAGE_KEYS.streakData, { lastDate: today, count })
  return count
}

function streakMilestoneMessage(count: number, emotion: string | null): string {
  const seed = emotion
    ? `You logged feeling ${emotion.toLowerCase()} today — come back tomorrow and let's see how that shifts.`
    : `Come back tomorrow and we'll see how you've moved.`
  if (count >= 30) return `30 days. You've built something real. ${seed}`
  if (count >= 14) return `14 days straight — that's a habit, not a coincidence. ${seed}`
  if (count >= 7)  return `A full week. Something in you is committed to healing. ${seed}`
  if (count >= 3)  return `${count} days running — momentum is building. ${seed}`
  if (count === 1) return `Day one done. That took courage. ${seed}`
  return `${count} days in a row — your consistency is your healing. ${seed}`
}

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
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [welcomeOpen, setWelcomeOpen]     = useState(false)
  const welcomeOpenRef = useRef(false)   // sync ref so audio guards don't need re-render
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<"signin" | "signup">("signup")
  const welcomeShownRef = useRef(false)

  const { addEntry: addEmotion } = useEmotionLogs()
  const { addEntry: addJournal } = useJournalEntries()
  const { speak, stop: stopSpeech, prefetch, voiceEnabled, toggleVoice, isSpeaking } = useTTS()

  // Show welcome screen for unauthenticated users; trigger onboarding after it closes
  useEffect(() => {
    if (!authLoading && !user) {
      welcomeOpenRef.current = true
      setWelcomeOpen(true)
      welcomeShownRef.current = true
      stopSpeech()   // kill any greeting audio that may have already started
    }
    if (user) {
      welcomeOpenRef.current = false
      setWelcomeOpen(false)
      if (welcomeShownRef.current && !readStorage(STORAGE_KEYS.welcomeSeen)) {
        setTimeout(() => setOnboardingOpen(true), 500)
      }
    }
  }, [authLoading, user]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const [selectedEmotion,   setSelectedEmotion]   = useState<string | null>(null)
  const [completedToday,    setCompletedToday]    = useState<Set<string>>(new Set())
  const [streak,            setStreak]            = useState(0)
  const [sessionClosed,     setSessionClosed]     = useState(false)

  // ── Breathing widget state ────────────────────────────────────────────────
  const [havenBreathePattern, setHavenBreathePattern] = useState<HavenPattern>(HAVEN_BREATHE_PATTERNS[0])
  const [breathePhase,          setBreathePhase]          = useState<"idle" | "inhale" | "hold1" | "exhale" | "hold2" | "rest" | "done">("idle")
  const [breatheCount,          setBreatheCount]          = useState(0)
  const [breatheTargetRounds,   setBreatheTargetRounds]   = useState(3)
  const [breatheCyclesDone,     setBreatheCyclesDone]     = useState(0)
  const breatheInterval   = useRef<ReturnType<typeof setInterval> | null>(null)
  const breatheCyclesRef  = useRef(0)
  const prevUserIdRef     = useRef<string | null | undefined>(undefined)
  const breatheTargetRef  = useRef(3)
  const quizPendingReport = useRef<string>("")

  // ── Quiz widget state ─────────────────────────────────────────────────────
  const [quizType,           setQuizType]           = useState<QuizType>("emotional-awareness")
  const [quizIndex,          setQuizIndex]          = useState(0)
  const [quizAnswers,        setQuizAnswers]        = useState<Record<string, number>>({})
  const [quizPhase,          setQuizPhase]          = useState<"idle" | "active" | "scoring" | "done">("idle")
  const [quizResult,         setQuizResult]         = useState<{ score: number; catScores: Record<string, number[]> } | null>(null)
  const [dynamicScQuestions, setDynamicScQuestions] = useState<HavenQuizQ[] | null>(null)
  const [dynamicQLoading,    setDynamicQLoading]    = useState(false)

  // ── Journal widget state ──────────────────────────────────────────────────
  const [journalText,       setJournalText]       = useState("")
  const [journalSaved,      setJournalSaved]      = useState(false)
  const [havenAiPrompt,     setHavenAiPrompt]     = useState<string | null>(null)
  const [havenPromptLoading, setHavenPromptLoading] = useState(false)

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
    // Never speak while the welcome overlay is showing
    if (!welcomeOpenRef.current) speak(msg)
  }, [speak])

  // ── Post-auth onboarding reset ────────────────────────────────────────────
  const handlePostAuth = useCallback(() => {
    setCompletedToday(new Set())
    setChips([])
    setInput("")
    stopSpeech()

    // If the onboarding modal is about to open, let it handle the first emotion
    // capture — don't show the emotion widget here or reset lastCheckin
    const onboardingWillOpen = welcomeShownRef.current && !readStorage(STORAGE_KEYS.welcomeSeen)
    if (onboardingWillOpen) {
      setMode("greeting")
      return
    }

    // Returning user sign-in: run the normal post-auth setup sequence
    setApiMessages([{
      role: "user",
      content: "[ONBOARDING] The user just signed in or created an account. Guide them through a complete setup sequence in order: 1) emotion check-in, 2) breathing session, 3) journal reflection, 4) wellbeing survey, 5) self-assessment quiz, 6) show insights summary. After each activity is reported complete, immediately suggest the next one. Be warm and encouraging, 2 sentences max per response.",
    }])
    setMode("emotion-widget")
    setChips(["I'm ready", "What are we doing?", "Let's go"])
    writeStorage(STORAGE_KEYS.lastCheckin, null)
    const name = readStorage<string>(STORAGE_KEYS.userName)
    const msg = name
      ? `Welcome back, ${name} — I'm glad you're here. How are you feeling today?`
      : `Welcome back — I'm Haven. How are you feeling today?`
    setTimeout(() => showMessage(msg), 400)
  }, [stopSpeech, showMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── After onboarding completes: start Haven flow with the emotion they picked ─
  const handleOnboardingComplete = useCallback((collectedName?: string, emotionData?: OnboardingEmotionData) => {
    setOnboardingOpen(false)
    setMode("chatting")

    const greeting = collectedName
      ? `Welcome, ${collectedName} — I'm so glad you're here. I've set up your journey based on how you're feeling. Let's begin.`
      : `Welcome — I'm Haven. I've set up your journey based on how you're feeling. Let's begin.`

    if (emotionData) {
      // Emotion was logged during onboarding — start Haven flow immediately
      const lossCtx = readStorage<string[]>(STORAGE_KEYS.lossContext) ?? []
      const flowState = startHavenFlow(emotionData.label, emotionData.intensity, lossCtx[0])
      const firstHref = TOOL_HREFS[flowState.sequence[0]]
      showMessage(greeting)
      setTimeout(() => router.push(firstHref), 2000)
    } else {
      // No emotion picked in onboarding (user skipped step 2) — show emotion widget
      setMode("emotion-widget")
      showMessage(collectedName
        ? `Nice to meet you, ${collectedName}. Before we begin, how are you feeling right now?`
        : `Welcome — I'm Haven. Before we begin, how are you feeling right now?`
      )
    }
  }, [showMessage, router]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const hour        = new Date().getHours()
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

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
      // Returning user — reference yesterday's session emotion if available
      const lastSession = readStorage<{ date: string; emotion: string; emoji: string }>(STORAGE_KEYS.lastSession)
      const yesterday   = new Date(Date.now() - 86400000).toDateString()
      if (lastSession?.date === yesterday) {
        message   = `Yesterday you were feeling ${lastSession.emoji} ${lastSession.emotion.toLowerCase()}. How are you carrying that today?`
        initChips = ["Still the same", "A bit better", "Harder now", "Something shifted"]
      } else {
        message   = `${timeGreeting}${name ? ", " + name : ""}. How has today been?`
        initChips = ["It's been hard", "I'm managing", "I actually feel okay", "I want to breathe"]
      }
      initAction = null
    }

    setChips(initChips)
    setActiveAction(initAction)
    if (initAction) setMode(`${initAction}-widget` as HavenMode)

    // Slight delay so page paints before voice + typewriter begin
    const t = setTimeout(() => showMessage(message), 400)

    // Prefetch breathing cues while greeting plays
    prefetch("Breathe in"); prefetch("Hold"); prefetch("Breathe out")

    // Load streak and detect if session already closed today (prevents double-fire)
    setStreak(getStreak())
    const sd = readStorage<{ lastDate: string; count: number }>(STORAGE_KEYS.streakData)
    if (sd?.lastDate === new Date().toDateString()) setSessionClosed(true)

    return () => { clearTimeout(t); if (typewriterRef.current) clearInterval(typewriterRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send a message to Haven AI ────────────────────────────────────────────
  const sendToHaven = useCallback(async (userText: string) => {
    if (!userText.trim() || loading) return
    setInput("")
    setLoading(true)
    setMode("chatting")
    stopSpeech()

    const logs           = readStorage<any[]>(STORAGE_KEYS.emotionLogs) ?? []
    const lossCtx        = readStorage<string[]>(STORAGE_KEYS.lossContext) ?? []
    const userName       = readStorage<string>(STORAGE_KEYS.userName)
    const sessionHistory = readStorage<any[]>(STORAGE_KEYS.sessionHistory) ?? []
    const recentLogs     = logs.slice(0, 3).map((l: any) => `${l.emoji} ${l.emotion}`).join(", ")
    const doneList       = Array.from(completedToday).join(", ")
    const recentSessions = sessionHistory.slice(0, 3)
      .map((s: any) => `${s.date}: felt ${s.emoji ?? ""} ${s.emotion ?? "unknown"}`)
      .join("; ")

    const contextNote = [
      userName         ? `User's name is ${userName}. Use it naturally and warmly.` : "",
      lossCtx.length   ? `Their healing journey: ${lossCtx.join(", ")}.` : "",
      recentSessions   ? `Past sessions: ${recentSessions}.` : "",
      recentLogs        ? `Recent emotions: ${recentLogs}.` : "",
      doneList          ? `Completed today: ${doneList}.` : "",
      selectedEmotion   ? `Current emotion: ${selectedEmotion}.` : "",
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
        } else if (/wrote a reflection|journal/.test(lower) && completedToday.has("journal") && !completedToday.has("quiz")) {
          parsed.action = "quiz"
        }
      }
      // Hard override: breathing skipped → route to the next incomplete step
      if (/skipped the breathing/.test(userText)) {
        if (!completedToday.has("journal"))       parsed.action = "journal"
        else if (!completedToday.has("survey"))   parsed.action = "survey"
        else if (!completedToday.has("quiz"))     parsed.action = "quiz"
        else if (!completedToday.has("insights")) parsed.action = "insights"
      }
      // Hard override: journal skipped → route to next incomplete step
      if (/skipped journaling/.test(userText)) {
        if (!completedToday.has("breathe"))       parsed.action = "breathe"
        else if (!completedToday.has("survey"))   parsed.action = "survey"
        else if (!completedToday.has("quiz"))     parsed.action = "quiz"
        else if (!completedToday.has("insights")) parsed.action = "insights"
      }
      // Hard override: quiz skipped → route to next incomplete step
      if (/skipped the self-assessment/.test(userText)) {
        if (!completedToday.has("breathe"))       parsed.action = "breathe"
        else if (!completedToday.has("journal"))  parsed.action = "journal"
        else if (!completedToday.has("survey"))   parsed.action = "survey"
        else if (!completedToday.has("insights")) parsed.action = "insights"
      }
      // Hard override: journal just completed → quiz must follow
      if (/just wrote a reflection in my journal/.test(userText) && !completedToday.has("quiz")) {
        parsed.action = "quiz"
      }

      setApiMessages([...nextMessages, { role: "assistant", content: raw }])
      setChips(parsed.chips ?? [])
      setActiveAction(parsed.action)
      if (parsed.action && !readHavenFlow()) {
        setMode(`${parsed.action}-widget` as HavenMode)
      }
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

  // ── Session completion: fires when all 5 walkthrough steps are done ────────
  const WALKTHROUGH_KEYS = ["emotion", "breathe", "journal", "quiz", "survey"] as const

  useEffect(() => {
    if (sessionClosed) return
    const allDone = WALKTHROUGH_KEYS.every((k) => completedToday.has(k))
    if (!allDone) return

    setSessionClosed(true)
    const newStreak  = saveStreak()
    setStreak(newStreak)

    // Persist this session's emotion for tomorrow's greeting
    const logs = readStorage<any[]>(STORAGE_KEYS.emotionLogs) ?? []
    const todayEmotion = logs.length > 0 ? logs[0] : null
    if (todayEmotion) {
      writeStorage(STORAGE_KEYS.lastSession, {
        date:    new Date().toDateString(),
        emotion: todayEmotion.emotion,
        emoji:   todayEmotion.emoji,
      })
    }

    // Save rolling session history (last 10) for Haven's cross-session memory
    const history = readStorage<any[]>(STORAGE_KEYS.sessionHistory) ?? []
    writeStorage(STORAGE_KEYS.sessionHistory, [{
      date:       new Date().toDateString(),
      emotion:    todayEmotion?.emotion ?? null,
      emoji:      todayEmotion?.emoji ?? null,
      streak:     newStreak,
      activities: Array.from(completedToday),
    }, ...history].slice(0, 10))

    const milestoneMsg = streakMilestoneMessage(newStreak, todayEmotion?.emotion ?? null)

    setTimeout(() => {
      setMode("chatting")
      showMessage(`You showed up for yourself today — emotion, breathing, journaling, quiz, wellbeing check-in. ${milestoneMsg}`)
      setChips(["That felt good", "I'll be back tomorrow", "Show my insights"])
    }, 1000)
  }, [completedToday, sessionClosed]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Emotion widget ────────────────────────────────────────────────────────
  const [pickedEmotion, setPickedEmotion] = useState<string | null>(null)
  const [intensityStep, setIntensityStep] = useState(false)
  const [emotionIntensity, setEmotionIntensity] = useState(5)

  const handleEmotionPick = useCallback(async (label: string, emoji: string, intensity: number) => {
    setIntensityStep(false)
    setSelectedEmotion(label)
    writeStorage(STORAGE_KEYS.lastCheckin, new Date().toDateString())
    await addEmotion({ emotion: label, emoji, intensity, notes: "" })
    // Update streak immediately on first activity so badge feels live
    const liveStreak = saveStreak()
    setStreak(liveStreak)

    // Start Haven navigation flow: compute personalised tool sequence and
    // navigate to the first tool after a short delay (lets Haven respond first)
    const lossCtx = readStorage<string[]>(STORAGE_KEYS.lossContext) ?? []
    const flowState = startHavenFlow(label, intensity, lossCtx[0])
    const firstHref = TOOL_HREFS[flowState.sequence[0]]

    setTimeout(() => {
      setPickedEmotion(null)
      reportToHaven(`I just logged that I'm feeling ${label} ${emoji} at intensity ${intensity}/10.`, "emotion")
    }, 500)

    // Navigate to first tool after Haven's response has had time to show
    setTimeout(() => {
      router.push(firstHref)
    }, 2400)
  }, [addEmotion, reportToHaven, router])

  // ── Breathing widget ──────────────────────────────────────────────────────
  const saveBreatheSession = useCallback((cycles: number, pattern: HavenPattern) => {
    if (cycles < 1) return
    try {
      const record = { id: Date.now().toString(), timestamp: new Date().toISOString(), pattern: pattern.name, cycles }
      const prev = readStorage<any[]>(STORAGE_KEYS.breathingHistory) ?? []
      writeStorage(STORAGE_KEYS.breathingHistory, [...prev, record])
    } catch {}
  }, [])

  const startBreathing = useCallback((rounds: number, pattern: HavenPattern) => {
    const seq = buildBreatheSeq(pattern)
    breatheCyclesRef.current  = 0
    breatheTargetRef.current  = rounds
    setBreatheCyclesDone(0)
    setBreatheTargetRounds(rounds)

    let seqIdx = 0; let count = seq[0].dur
    setBreathePhase(seq[0].phase); setBreatheCount(count)
    speak(seq[0].cue, { rate: 0.82, pitch: 0.9 })

    breatheInterval.current = setInterval(() => {
      count -= 1; setBreatheCount(count)
      if (count <= 0) {
        seqIdx += 1

        // Cycle completes when we reach the rest phase (last item in seq)
        if (seqIdx === seq.length - 1) {
          breatheCyclesRef.current += 1
          setBreatheCyclesDone(breatheCyclesRef.current)
          if (breatheCyclesRef.current >= breatheTargetRef.current) {
            // Final round — skip rest, end session
            clearInterval(breatheInterval.current!); breatheInterval.current = null
            saveBreatheSession(breatheCyclesRef.current, pattern)
            setBreathePhase("done")
            return
          }
          // More rounds — fall through to show rest phase
        } else if (seqIdx >= seq.length) {
          // Rest phase finished — loop back to inhale for next round
          seqIdx = 0
        }

        const next = seq[seqIdx]; count = next.dur
        setBreathePhase(next.phase); setBreatheCount(count)
        if (next.cue) speak(next.cue, { rate: 0.82, pitch: 0.9 })
      }
    }, 1000)
  }, [speak, saveBreatheSession])

  const endBreathingEarly = useCallback(() => {
    if (breatheInterval.current) { clearInterval(breatheInterval.current); breatheInterval.current = null }
    saveBreatheSession(breatheCyclesRef.current, havenBreathePattern)
    setBreathePhase("done")
  }, [saveBreatheSession, havenBreathePattern])

  const skipBreathing = useCallback(() => {
    if (breatheInterval.current) { clearInterval(breatheInterval.current); breatheInterval.current = null }
    setBreathePhase("idle")
    // Pass completedToday snapshot so the routing logic below picks the right next step
    const done = completedToday
    const nextStep = !done.has("journal") ? "journal" : !done.has("survey") ? "survey" : !done.has("quiz") ? "quiz" : null
    const hint = nextStep
      ? ` What should I do next? (suggest ${nextStep})`
      : " What would you suggest I do next?"
    reportToHaven(`I skipped the breathing exercise for now.${hint}`, "breathe")
  }, [completedToday]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (breatheInterval.current) clearInterval(breatheInterval.current) }, [])

  const breatheCircleScale = breathePhase === "inhale" ? 1.5 : breathePhase === "exhale" ? 0.68 : 1.0
  const breatheDuration    = buildBreatheSeq(havenBreathePattern).find((s) => s.phase === breathePhase)?.dur ?? 4

  // ── Journal widget ────────────────────────────────────────────────────────
  const journalPrompt = (() => {
    if (!selectedEmotion) return "What feeling is taking up the most space in you right now?"
    const tiers = EMOTION_JOURNAL_PROMPTS[selectedEmotion]
    if (!tiers) return "What feeling is taking up the most space in you right now?"
    const intensity = emotionIntensity ?? 5
    if (intensity >= 7) return tiers.high
    if (intensity >= 4) return tiers.medium
    return tiers.low
  })()

  const saveJournal = useCallback(async () => {
    if (!journalText.trim()) return
    const usedPrompt = havenAiPrompt ?? journalPrompt
    await addJournal({ prompt: usedPrompt, entry: journalText.trim() })
    setJournalSaved(true)
    const excerpt = journalText.trim().slice(0, 220)
    const hasMore = journalText.trim().length > 220
    setTimeout(() => {
      reportToHaven(
        `I just wrote in my journal. Here's what I wrote: "${excerpt}${hasMore ? "…" : ""}"`,
        "journal"
      )
    }, 600)
  }, [journalText, havenAiPrompt, journalPrompt, addJournal, reportToHaven])

  const generateHavenPrompt = useCallback(async () => {
    setHavenPromptLoading(true)
    const recentEmotion = selectedEmotion ?? (readStorage<any[]>(STORAGE_KEYS.emotionLogs)?.[0]?.emotion ?? "reflective")
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
      if (res.ok) {
        const data = await res.json()
        const text = data.content?.[0]?.text?.trim()
        if (text) setHavenAiPrompt(text)
      }
    } catch { /* silently keep current prompt */ } finally {
      setHavenPromptLoading(false)
    }
  }, [selectedEmotion])

  // ── Dynamic self-compassion question generation from journal text ─────────
  const generateDynamicScQuestions = useCallback(async (journalExcerpt: string) => {
    setDynamicQLoading(true)
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
Make the questions feel personally connected to the themes in the journal — mirror the user's language and emotional situation. Keep them compassionate and non-judgmental.`,
          messages: [{ role: "user", content: `Generate 5 self-compassion questions based on this journal entry: "${journalExcerpt.slice(0, 400)}"` }],
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const raw  = data.content?.[0]?.text?.trim() ?? ""
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim()
      const parsed: HavenQuizQ[] = JSON.parse(cleaned)
      if (Array.isArray(parsed) && parsed.length >= 3) {
        setDynamicScQuestions(parsed.slice(0, 5))
      }
    } catch {
      setDynamicScQuestions(null)
    } finally {
      setDynamicQLoading(false)
    }
  }, [])

  // ── Survey widget ─────────────────────────────────────────────────────────
  const saveSurvey = useCallback(() => {
    const record = { id: Date.now().toString(), timestamp: new Date().toISOString(), ...survey }
    const prev = readStorage<any[]>(STORAGE_KEYS.surveyResponses) ?? []
    writeStorage(STORAGE_KEYS.surveyResponses, [...prev, record])
    setSurveySaved(true)
    // reportToHaven is called when the user explicitly taps "Continue" in the scorecard
  }, [survey])

  // ── Quiz widget ───────────────────────────────────────────────────────────
  // Pick quiz type: emotion-mapped first, then frequency-balance fallback
  useEffect(() => {
    if (mode !== "quiz-widget") return
    const results = readStorage<any[]>(STORAGE_KEYS.quizResults) ?? []
    const eaCount = results.filter((r) => r.type === "emotional-awareness").length
    const scCount = results.filter((r) => r.type === "self-compassion").length
    const emotionSuggested = selectedEmotion ? EMOTION_QUIZ_MAP[selectedEmotion] : null
    // Use emotion-suggested type if it's the one they've done less (or equal), else frequency-balance
    const pickedType = emotionSuggested
      ? (emotionSuggested === "emotional-awareness" ? (eaCount <= scCount ? "emotional-awareness" : "self-compassion") : (scCount <= eaCount ? "self-compassion" : "emotional-awareness"))
      : (eaCount <= scCount ? "emotional-awareness" : "self-compassion")
    setQuizType(pickedType)
    setQuizIndex(0)
    setQuizAnswers({})
    setQuizPhase("idle")

    // If self-compassion and user wrote in their journal this session, generate personalised questions
    if (pickedType === "self-compassion" && journalText.trim().length > 30) {
      void generateDynamicScQuestions(journalText.trim())
    } else {
      setDynamicScQuestions(null)
    }
  }, [mode, selectedEmotion]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuizAnswer = useCallback((questionId: string, score: number) => {
    setQuizAnswers((prev) => {
      const next = { ...prev, [questionId]: score }
      const questions = (quizType === "self-compassion" && dynamicScQuestions) ? dynamicScQuestions : HAVEN_QUIZ[quizType].questions
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
        setQuizResult({ score: avgScore, catScores })
        setQuizPhase("scoring")
        const label = HAVEN_QUIZ[quizType].label
        const catSummary = Object.entries(catScores)
          .map(([cat, scores]) => `${cat}: ${Math.round((scores as number[]).reduce((a: number, b: number) => a + b, 0) / (scores as number[]).length)}/100`)
          .join(", ")
        // Store the pending report — sent when user taps "Continue" in the scorecard
        quizPendingReport.current = `I just completed the ${label} self-assessment. Overall score: ${avgScore}/100. Category breakdown — ${catSummary}.`
      } else {
        setQuizIndex(Object.keys(next).length)
      }
      return next
    })
  }, [quizType]) // eslint-disable-line react-hooks/exhaustive-deps

  const skipQuiz = useCallback(() => {
    setQuizPhase("idle")
    const done = completedToday
    const nextStep = !done.has("breathe") ? "breathe" : !done.has("journal") ? "journal" : !done.has("survey") ? "survey" : null
    const hint = nextStep
      ? ` What should I do next? (suggest ${nextStep})`
      : " What would you suggest I do next?"
    reportToHaven(`I skipped the self-assessment for now.${hint}`, "quiz")
  }, [completedToday]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // Today-only snapshot for the insights walkthrough widget
  const todayInsightsData = (() => {
    if (typeof window === "undefined") return null
    const todayStr  = new Date().toDateString()
    const logs      = (readStorage<any[]>(STORAGE_KEYS.emotionLogs)      ?? []).filter((l: any) => new Date(l.timestamp).toDateString()          === todayStr)
    const journals  = (readStorage<any[]>(STORAGE_KEYS.journalEntries)   ?? []).filter((l: any) => new Date(l.date ?? l.timestamp).toDateString() === todayStr)
    const breathing = (readStorage<any[]>(STORAGE_KEYS.breathingHistory) ?? []).filter((l: any) => new Date(l.date ?? l.timestamp).toDateString() === todayStr)
    const surveys   = (readStorage<any[]>(STORAGE_KEYS.surveyResponses)  ?? []).filter((l: any) => new Date(l.timestamp).toDateString()           === todayStr)
    const quizzes   = (readStorage<any[]>(STORAGE_KEYS.quizResults)      ?? []).filter((l: any) => new Date(l.created_at).toDateString()          === todayStr)
    const avgI   = logs.length ? logs.reduce((s: number, l: any) => s + (l.intensity ?? 5), 0) / logs.length : 5
    const intS   = 1 - avgI / 10
    let survS    = 0.5
    if (surveys.length) {
      const avg = surveys.reduce((s: number, sv: any) => s + ((sv.emotionalState + sv.selfConnection + sv.selfCompassion + sv.selfCare) / 4), 0) / surveys.length
      survS = avg / 5
    }
    const cons  = logs.length > 0 ? 1 : 0
    const score = Math.round((survS * 0.4 + intS * 0.35 + cons * 0.25) * 100)
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

  // True when a widget panel is open — used to compress the orb/header zone
  const widgetActive = mode !== "greeting" && mode !== "chatting"

  return (
    <div className="flex flex-col bg-background h-[calc(100dvh-140px)] md:h-auto md:flex-1">

      {/* ── Header — mobile only (desktop uses DesktopNav) ── */}
      <header className="md:hidden flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
        {/* Streak badge — fades in when streak > 0 */}
        <div className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all duration-500",
          streak > 0
            ? "bg-primary/10 border-primary/20 opacity-100"
            : "border-transparent opacity-0 pointer-events-none select-none"
        )}>
          <span className="text-xs">🔥</span>
          <span className="text-xs font-semibold text-primary">
            {streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""}` : "‎"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={voiceEnabled ? stopSpeech : toggleVoice}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={voiceEnabled ? "Mute Haven" : "Unmute Haven"}>
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <Link href="/insights"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="View insights">
            <TrendingUp className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── Content — natural scrollable flow ── */}
      <div className="flex-1 flex flex-col items-center px-4 pt-8 min-h-0 overflow-y-auto">

        {/* Orb — compact when a widget is open */}
        <motion.div
          animate={{ width: widgetActive ? 56 : 88, height: widgetActive ? 56 : 88 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn("relative flex items-center justify-center shrink-0 mt-2", widgetActive ? "mb-2" : "mb-3")}
          style={{ width: widgetActive ? 56 : 88, height: widgetActive ? 56 : 88 }}
        >
          {/* Outer ambient ring */}
          <motion.span
            className="absolute rounded-full bg-primary/15"
            style={{ width: "160%", height: "160%" }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: parseFloat(orbPing), repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Mid ring */}
          <motion.span
            className="absolute rounded-full bg-primary/20"
            style={{ width: "130%", height: "130%" }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: parseFloat(orbPing) * 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
          {/* Core orb */}
          <motion.div
            className="absolute inset-0 rounded-full shadow-[0_0_32px_6px] shadow-primary/25 z-10 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--orb-from, #9b6fdf), var(--orb-to, #d472b0))" }}
            animate={loading ? { scale: [1, 1.06, 1] } : {}}
            transition={loading ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : {}}
          >
            <Sparkles className={cn("text-white", widgetActive ? "w-5 h-5" : "w-7 h-7")} />
          </motion.div>
        </motion.div>

        {/* Haven's message bubble */}
        <AnimatePresence mode="wait">
          <motion.div
            key={havenMessage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn("w-full max-w-sm text-center shrink-0", widgetActive ? "mb-2" : "mb-3")}
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
              <p className={cn("font-serif text-foreground leading-snug", widgetActive ? "text-sm text-muted-foreground" : "text-lg md:text-xl")}>{displayText}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Widgets + chips ── */}
        <AnimatePresence mode="wait">

          {/* EMOTION WIDGET */}
          {mode === "emotion-widget" && !completedToday.has("emotion") && (
            <motion.div key="emotion-widget"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="w-full max-w-sm mb-3 rounded-2xl border border-primary/40 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-primary/15"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2.5 text-center">How are you feeling right now?</p>
              {!intensityStep && (
                <div className="grid grid-cols-4 gap-1.5">
                  {EMOTIONS.map(({ label, emoji }) => (
                    <button key={label} disabled={!!pickedEmotion}
                      onClick={() => {
                        if (pickedEmotion) return
                        setPickedEmotion(label)
                        setIntensityStep(true)
                        setEmotionIntensity(5)
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2 rounded-xl border text-center transition-all",
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
              className="w-full max-w-sm mb-3 rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-primary/10 flex flex-col items-center"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                {havenBreathePattern.name} · {havenBreathePattern.description}
              </p>
              <p className="text-[11px] text-muted-foreground mb-4">{havenBreathePattern.benefit}</p>

              {/* Animated orb */}
              <div className="relative w-36 h-36 flex items-center justify-center mb-4">
                <motion.div className="absolute rounded-full bg-primary/10"
                  style={{ width: "100%", height: "100%" }}
                  animate={{ scale: breathePhase !== "idle" && breathePhase !== "done" ? breatheCircleScale : 1 }}
                  transition={{ duration: breatheDuration, ease: breathePhase === "inhale" ? "easeIn" : breathePhase === "exhale" ? "easeOut" : "linear" }}
                />
                <motion.div className="rounded-full shadow-lg z-10"
                  style={{ width: "72px", height: "72px", background: "linear-gradient(135deg, var(--orb-from, #6366F1), var(--orb-to, #8B5CF6))" }}
                  animate={{ scale: breathePhase !== "idle" && breathePhase !== "done" ? breatheCircleScale : 1 }}
                  transition={{ duration: breatheDuration, ease: breathePhase === "inhale" ? "easeIn" : breathePhase === "exhale" ? "easeOut" : "linear" }}
                />
                <div className="absolute z-20 flex flex-col items-center">
                  {breathePhase !== "idle" && breathePhase !== "done" && breathePhase !== "rest" && (
                    <>
                      <p className="text-white text-xs font-semibold drop-shadow">
                        {buildBreatheSeq(havenBreathePattern).find((s) => s.phase === breathePhase)?.label}
                      </p>
                      <p className="text-white/80 text-xl font-bold drop-shadow">{breatheCount}</p>
                    </>
                  )}
                  {breathePhase === "rest" && (
                    <p className="text-white/70 text-xs font-medium drop-shadow tracking-wide">Rest</p>
                  )}
                </div>
              </div>

              {/* PRE-START: pattern picker + round picker + start + skip */}
              {breathePhase === "idle" && (
                <>
                  {/* Pattern selector */}
                  <div className="w-full grid grid-cols-2 gap-1.5 mb-4">
                    {HAVEN_BREATHE_PATTERNS.map((p) => (
                      <button key={p.id} onClick={() => setHavenBreathePattern(p)}
                        className={cn(
                          "flex flex-col items-start px-2.5 py-2 rounded-xl border text-left transition-all",
                          havenBreathePattern.id === p.id
                            ? "border-primary/60 bg-primary/8 text-primary"
                            : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}>
                        <span className="text-[11px] font-semibold leading-tight">{p.name}</span>
                        <span className="text-[10px] opacity-70">{p.description}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">How many rounds?</p>
                  <div className="flex gap-2 mb-4">
                    {[3, 5, 7].map((r) => (
                      <button key={r} onClick={() => setBreatheTargetRounds(r)}
                        className={cn(
                          "w-10 h-10 rounded-full text-sm font-bold border transition-all",
                          breatheTargetRounds === r
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
                        )}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => startBreathing(breatheTargetRounds, havenBreathePattern)}
                    className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 mb-2">
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
                        i < breatheCyclesDone ? "bg-primary" : "bg-primary/20"
                      )} />
                    ))}
                    <span className="text-[11px] text-muted-foreground ml-1">
                      {breatheCyclesDone}/{breatheTargetRounds}
                    </span>
                  </div>
                  <button onClick={endBreathingEarly}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    End session early
                  </button>
                </div>
              )}

              {/* DONE */}
              {breathePhase === "done" && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 w-full">
                  <p className="text-sm text-primary font-medium">
                    {breatheCyclesDone} round{breatheCyclesDone !== 1 ? "s" : ""} complete ✦
                  </p>
                  <button
                    onClick={() => reportToHaven(`I just completed ${breatheCyclesDone} round${breatheCyclesDone !== 1 ? "s" : ""} of ${havenBreathePattern.name}.`, "breathe")}
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
              className="w-full max-w-sm mb-3 rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-primary/10"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
                {selectedEmotion ? `Reflecting on your ${selectedEmotion.toLowerCase()}` : "Write it out"}
              </p>

              {/* Prompt display */}
              <div className="bg-primary/5 rounded-xl px-3.5 py-2.5 mb-2.5 border border-primary/10 min-h-[48px] flex items-start justify-between gap-2">
                {havenPromptLoading ? (
                  <div className="space-y-1.5 w-full">
                    {[100, 75].map((w) => (
                      <div key={w} className="h-3 bg-muted rounded-full animate-pulse" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-foreground/80 font-serif italic leading-relaxed flex-1">"{havenAiPrompt ?? journalPrompt}"</p>
                    <button
                      onClick={() => isSpeaking ? stopSpeech() : speak(havenAiPrompt ?? journalPrompt)}
                      className="shrink-0 mt-0.5 p-1.5 rounded-lg text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors"
                      aria-label={isSpeaking ? "Stop reading" : "Read prompt aloud"}
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>

              {/* New prompt button */}
              <button
                onClick={generateHavenPrompt}
                disabled={havenPromptLoading}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 mb-3 rounded-xl border border-primary/20 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
              >
                {havenPromptLoading
                  ? <span className="inline-block w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  : <span>✨</span>
                }
                {havenPromptLoading ? "Generating…" : "Generate a new prompt"}
              </button>

              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Take your time. Write whatever comes…"
                rows={4}
                className="w-full rounded-xl border border-border/40 bg-background px-3.5 py-2.5 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
              />
              {journalSaved ? (
                <p className="text-xs text-primary text-center py-1">✓ Saved to your journal</p>
              ) : (
                <>
                  <button onClick={saveJournal} disabled={!journalText.trim()}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors mb-2">
                    Save reflection
                  </button>
                  <button
                    onClick={() => {
                      const done = completedToday
                      const nextStep = !done.has("breathe") ? "breathe" : !done.has("survey") ? "survey" : !done.has("quiz") ? "quiz" : null
                      const hint = nextStep
                        ? ` What should I do next? (suggest ${nextStep})`
                        : " What would you suggest I do next?"
                      reportToHaven(`I decided to skip journaling for now.${hint}`, "journal")
                    }}
                    className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors text-center py-1"
                  >
                    Skip for now →
                  </button>
                </>
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
              className="w-full max-w-sm mb-3 rounded-2xl border border-primary/30 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-primary/15"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-4">Wellbeing check-in</p>
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
                    className="w-full accent-primary" />
                </div>
              ))}
              {surveySaved ? (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="pt-1">
                  <p className="text-xs font-semibold text-primary/80 uppercase tracking-wide mb-3 text-center">Today's Check-in</p>
                  <div className="flex flex-col gap-2.5">
                    {([
                      { key: "emotionalState",  label: "Emotional state" },
                      { key: "selfConnection",  label: "Self-connection" },
                      { key: "selfCompassion",  label: "Self-compassion" },
                      { key: "selfCare",        label: "Self-care" },
                    ] as const).map(({ key, label }, i) => {
                      const val = survey[key]
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-semibold text-foreground">{val}/5</span>
                          </div>
                          <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(val / 5) * 100}%` }}
                              transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.08 }}
                              className="h-1.5 rounded-full bg-primary"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => {
                      const avg = ((survey.emotionalState + survey.selfConnection + survey.selfCompassion + survey.selfCare) / 4).toFixed(1)
                      reportToHaven(
                        `I completed the wellbeing check-in. My scores: Emotional State ${survey.emotionalState}/5, Self-Connection ${survey.selfConnection}/5, Self-Compassion ${survey.selfCompassion}/5, Self-Care ${survey.selfCare}/5. Average: ${avg}/5.`,
                        "survey"
                      )
                    }}
                    className="w-full mt-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Continue →
                  </button>
                </motion.div>
              ) : (
                <button onClick={saveSurvey}
                  className="w-full mt-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                  Submit
                </button>
              )}
            </motion.div>
          )}

          {/* QUIZ WIDGET */}
          {mode === "quiz-widget" && !completedToday.has("quiz") && (() => {
            const quiz      = HAVEN_QUIZ[quizType]
            // Use AI-personalised questions when available, fall back to static pool
            const questions = (quizType === "self-compassion" && dynamicScQuestions) ? dynamicScQuestions : quiz.questions
            const current   = questions[quizIndex]

            return (
              <motion.div key="quiz-widget"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="w-full max-w-sm mb-3 rounded-2xl border border-primary/30 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-primary/15"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                    {quiz.emoji} {quiz.label}
                  </p>
                  {quizPhase === "active" && (
                    <span className="text-[11px] text-muted-foreground">{quizIndex + 1} / {questions.length}</span>
                  )}
                </div>

                {/* Progress bar */}
                {quizPhase === "active" && (
                  <div className="w-full bg-muted/40 rounded-full h-1 mb-4 overflow-hidden">
                    <div className="bg-primary h-1 rounded-full transition-all duration-500"
                      style={{ width: `${((quizIndex) / questions.length) * 100}%` }} />
                  </div>
                )}

                {quizPhase === "idle" && (
                  <div className="flex flex-col items-center gap-3 py-2">
                    {dynamicQLoading ? (
                      <p className="text-xs text-muted-foreground text-center animate-pulse py-1">
                        Personalising questions from your journal…
                      </p>
                    ) : dynamicScQuestions && quizType === "self-compassion" ? (
                      <p className="text-xs text-primary/60 text-center py-0.5">
                        ✦ Questions shaped by what you wrote
                      </p>
                    ) : (
                      <p className="text-sm text-foreground/80 text-center leading-relaxed">
                        5 questions to understand yourself more deeply. Takes about 1 minute.
                      </p>
                    )}
                    <button onClick={() => setQuizPhase("active")} disabled={dynamicQLoading}
                      className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
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
                            className="text-left px-3.5 py-2.5 rounded-xl border border-border/50 text-xs text-foreground/80 hover:border-primary/40 hover:bg-primary/8 hover:text-primary transition-all active:scale-[0.98]">
                            {opt}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}

                {quizPhase === "scoring" && quizResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-2">
                    <p className="text-center text-2xl mb-1">✦</p>
                    <p className="text-sm font-semibold text-foreground text-center mb-0.5">Overall: {quizResult.score}/100</p>
                    <p className="text-[11px] text-muted-foreground text-center mb-4">
                      {quizResult.score >= 75 ? "Strong self-awareness" : quizResult.score >= 50 ? "Growing awareness" : "Room to explore"}
                    </p>
                    <div className="flex flex-col gap-2.5">
                      {Object.entries(quizResult.catScores).map(([cat, scores]) => {
                        const avg = Math.round((scores as number[]).reduce((a, b) => a + b, 0) / (scores as number[]).length)
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-muted-foreground capitalize">{cat.replace(/-/g, " ")}</span>
                              <span className="font-semibold text-foreground">{avg}/100</span>
                            </div>
                            <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${avg}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                                className="h-1.5 rounded-full bg-primary"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => {
                        reportToHaven(quizPendingReport.current, "quiz")
                        setQuizPhase("done")
                      }}
                      className="w-full mt-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Continue →
                    </button>
                  </motion.div>
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
              className="w-full max-w-sm mb-3 rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-sm p-4 shadow-[0_0_20px_2px] shadow-primary/10"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Today's snapshot</p>
              <p className="text-[11px] text-muted-foreground mb-4">What you've done in this session</p>
              <div className="flex items-center gap-4 mb-4">
                {todayInsightsData && <ScoreRing score={todayInsightsData.score} />}
                <div className="flex-1 grid grid-cols-4 gap-1">
                  {[
                    { icon: "💜", val: todayInsightsData?.logs      ?? 0, label: "Emotions" },
                    { icon: "🌬️", val: todayInsightsData?.breathing ?? 0, label: "Breathing" },
                    { icon: "📖", val: todayInsightsData?.journals  ?? 0, label: "Journal" },
                    { icon: "🧠", val: todayInsightsData?.quizzes   ?? 0, label: "Quizzes" },
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
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-200">
                See full insights <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Chips — only in greeting/chatting mode ── */}
        {!loading && chips.length > 0 && !widgetActive && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap justify-center gap-2 mt-3 w-full max-w-sm"
          >
            {chips.map((chip) => (
              <button key={chip} onClick={() => sendToHaven(chip)}
                className="px-4 py-2 rounded-full border border-border/50 bg-card/60 text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all active:scale-95">
                {chip}
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Activity panel — shown in greeting/chatting mode ── */}
        {!loading && (mode === "greeting" || mode === "chatting") && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="w-full max-w-sm mt-5 pb-4"
          >
            {/* Today at a Glance */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Today</span>
                {streak > 0 && (
                  <span className="text-[10px] text-primary font-semibold">🔥 {streak}-day streak</span>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {selectedEmotion && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                    {EMOTIONS.find(e => e.label === selectedEmotion)?.emoji} {selectedEmotion}
                  </span>
                )}
                {Array.from(completedToday).map(key => (
                  <span key={key} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary capitalize">
                    ✓ {key}
                  </span>
                ))}
                {completedToday.size === 0 && !selectedEmotion && (
                  <span className="text-xs text-muted-foreground/50 italic">Nothing logged yet — let&apos;s start</span>
                )}
              </div>
            </div>

            {/* Primary CTA — Log Emotion */}
            {!completedToday.has("emotion") && (
              <button
                onClick={() => {
                  setMode("emotion-widget")
                  showMessage("How are you feeling right now? Pick what resonates most.")
                }}
                className="w-full py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm mb-3 shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                Log how I&apos;m feeling
              </button>
            )}

            {/* 2-column activity cards */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {[
                { icon: "🌬️", label: "Breathe",        desc: "Guided breathing exercise",  key: "breathe",  href: "/breathe" },
                { icon: "📖", label: "Journal",         desc: "Write & reflect on feelings", key: "journal",  href: "/thoughts" },
                { icon: "🧘", label: "Wellbeing Check", desc: "Rate how you're doing today", key: "survey",
                  onTap: () => { setMode("survey-widget"); showMessage("Let's check in on how you're doing overall.") } },
                { icon: "🧠", label: "Self-Discovery",  desc: "Quiz to understand yourself", key: "quiz",
                  onTap: () => { setMode("quiz-widget"); showMessage("Ready to explore a bit about yourself?") } },
                { icon: "📸", label: "Analyze",         desc: "Read conversation patterns",  key: "analyze",  href: "/analyze" },
                { icon: "📊", label: "Your Insights",   desc: "Progress & patterns",         key: "insights", href: "/insights" },
                { icon: "🔥", label: "Burn Letter",     desc: "Release what you carry",      key: "burn",     href: "/burn" },
              ].map(({ icon, label, desc, key, onTap, href }) => {
                const done = completedToday.has(key)
                const cardClassName = cn(
                  "flex flex-col items-start gap-2 p-3 rounded-2xl border transition-all relative text-left active:scale-[0.97]",
                  done
                    ? "border-primary/20 bg-primary/5"
                    : "border-border/40 bg-card/60 hover:border-primary/30 hover:bg-primary/5"
                )

                const cardContent = (
                  <>
                    {done && <span className="absolute top-2 right-2.5 text-primary text-xs font-bold">✓</span>}
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{desc}</p>
                    </div>
                  </>
                )

                if (href) {
                  return (
                    <Link key={label} href={href} className={cardClassName}>
                      {cardContent}
                    </Link>
                  )
                }

                return (
                  <button
                    key={label}
                    onClick={onTap}
                    className={cardClassName}
                  >
                    {cardContent}
                  </button>
                )
              })}
            </div>

          </motion.div>
        )}

      </div>{/* end content column */}

      {/* ── Input bar ── */}
      <div className="shrink-0 px-4 pb-4 pt-1.5 border-t border-border/20 bg-background/80 backdrop-blur-md">
        <div className="flex gap-2 items-center max-w-sm mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendToHaven(input) } }}
            placeholder="Type or speak to Haven…"
            rows={1}
            className="flex-1 resize-none bg-[#F3F4F6] border-0 rounded-full px-5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 leading-relaxed transition-all duration-200 dark:bg-card dark:border dark:border-border/40 dark:focus:bg-card"
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
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="fixed inset-0 z-[60] flex flex-col bg-gradient-to-b from-white via-background to-background overflow-y-auto"
          >
            {/* Mirrors Haven's exact layout: header → orb → message → actions */}
            <div className="flex flex-col items-center flex-1 px-5 pt-8 pb-6">

              {/* Logo mark — matches Haven's header */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="flex items-center gap-2 mb-6"
              >
                <HavenMark className="w-8 h-8" />
                <span className="font-serif font-semibold text-foreground tracking-tight text-lg">Haven</span>
              </motion.div>

              {/* Orb — identical to Haven's orb */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center mb-4 shrink-0"
              >
                <motion.span
                  className="absolute rounded-full bg-primary/15"
                  style={{ width: "160%", height: "160%" }}
                  animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.span
                  className="absolute rounded-full bg-primary/20"
                  style={{ width: "130%", height: "130%" }}
                  animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                />
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full shadow-[0_0_48px_10px] shadow-primary/25 z-10 flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--orb-from, #6366F1), var(--orb-to, #8B5CF6))" }}>
                  <span className="text-white text-2xl md:text-3xl select-none">✦</span>
                </div>
              </motion.div>

              {/* Haven's voice — styled exactly like Haven's message bubble */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="w-full max-w-sm text-center mb-3"
              >
                <p className="font-serif text-lg md:text-xl text-foreground leading-snug">
                  Hello. I'm Haven — I'm here to walk alongside you through whatever you're carrying.
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="text-sm text-muted-foreground text-center leading-relaxed max-w-xs mb-5"
              >
                Grief, heartbreak, loss — you don't have to move through it alone. Let's begin.
              </motion.p>

              {/* Feature tags */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="flex flex-wrap justify-center gap-2 mb-5 max-w-[300px]"
              >
                {[
                  { icon: <Sparkles className="w-3 h-3" />, label: "AI companion" },
                  { icon: <Wind className="w-3 h-3" />,     label: "Breathing" },
                  { icon: <BookHeart className="w-3 h-3" />, label: "Journaling" },
                  { icon: <BarChart3 className="w-3 h-3" />, label: "Insights" },
                ].map(({ icon, label }) => (
                  <span key={label} className="glass-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-foreground/70">
                    <span className="text-primary">{icon}</span>{label}
                  </span>
                ))}
              </motion.div>

              {/* CTAs — match Haven's pill input style */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="flex flex-col gap-2.5 w-full max-w-xs"
              >
                <button
                  onClick={() => { setAuthModalMode("signup"); setAuthModalOpen(true) }}
                  className="w-full py-3.5 rounded-full text-white font-semibold text-sm transition-all shadow-lg active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, var(--orb-from, #6366F1), var(--orb-to, #8B5CF6))", boxShadow: "0 4px 20px rgba(99,102,241,0.30)" }}
                >
                  ✦ Begin with Haven
                </button>
                <button
                  onClick={() => { setAuthModalMode("signin"); setAuthModalOpen(true) }}
                  className="w-full py-3 rounded-full border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border transition-all"
                >
                  Sign in to my account
                </button>
                <button
                  onClick={() => {
                    setWelcomeOpen(false)
                    if (!readStorage(STORAGE_KEYS.welcomeSeen)) {
                      setTimeout(() => setOnboardingOpen(true), 350)
                    }
                  }}
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors pt-0.5"
                >
                  Continue without an account
                </button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.4 }}
                className="text-[10px] text-muted-foreground/40 mt-4"
              >
                Free forever · No credit card required
              </motion.p>

              {/* Crisis resources — compact, unobtrusive */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.4 }}
                className="mt-5 w-full max-w-xs rounded-2xl border border-rose-200/40 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/15 px-4 py-3"
              >
                <p className="text-[11px] font-semibold text-rose-600/80 dark:text-rose-400 text-center mb-2">
                  In crisis? You're not alone.
                </p>
                <div className="flex flex-col gap-1">
                  {[
                    { label: "988 Lifeline",      detail: "Call or text 988" },
                    { label: "Crisis Text Line",   detail: "Text HOME to 741741" },
                    { label: "International",      detail: "findahelpline.com" },
                  ].map(({ label, detail }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-rose-700/70 dark:text-rose-400/70 font-medium">{label}</span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-300 font-semibold">{detail}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>
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

      {/* Onboarding — shown once after welcome closes for new users */}
      <OnboardingModal open={onboardingOpen} onComplete={handleOnboardingComplete} />

    </div>
  )
}
