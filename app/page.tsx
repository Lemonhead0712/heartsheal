"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, MessageCircle, ChevronRight } from "lucide-react"
import { AuthModal } from "@/components/auth-modal"
import { OnboardingModal, type OnboardingEmotionData } from "@/components/onboarding-modal"
import { HavenChat } from "@/components/haven-chat"
import { useEmotionLogs } from "@/hooks/use-emotion-logs"
import { useAuth } from "@/contexts/auth-context"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import { startHavenFlow, TOOL_HREFS } from "@/lib/haven-flow"
import { cn } from "@/lib/utils"

// ── Emotions ──────────────────────────────────────────────────────────────────
const EMOTIONS = [
  { label: "Sad",      emoji: "😔" },
  { label: "Anxious",  emoji: "😰" },
  { label: "Numb",     emoji: "😶" },
  { label: "Hopeful",  emoji: "🌱" },
  { label: "Grateful", emoji: "🙏" },
  { label: "Angry",    emoji: "😤" },
  { label: "Calm",     emoji: "😌" },
  { label: "Grief",    emoji: "💔" },
]

// ── Daily quotes (rotates by day) ─────────────────────────────────────────────
const DAILY_QUOTES = [
  { text: "Healing isn't linear. Every small step forward counts.", author: "Haven" },
  { text: "The wound is the place where the light enters you.", author: "Rumi" },
  { text: "You are allowed to be both a masterpiece and a work in progress.", author: "Sophia Bush" },
  { text: "Be gentle with yourself. You are a child of the universe.", author: "Max Ehrmann" },
  { text: "Sometimes the bravest thing you can do is simply keep going.", author: "Haven" },
  { text: "Give yourself the same compassion you would give a good friend.", author: "Haven" },
  { text: "You don't have to be positive all the time. It's okay to feel exactly what you feel.", author: "Lori Deschene" },
  { text: "Rest if you must, but don't quit.", author: "Unknown" },
  { text: "Grief is love with nowhere to go — until you give it space.", author: "Haven" },
  { text: "Even the darkest night will end and the sun will rise.", author: "Victor Hugo" },
  { text: "You are worthy of care, including from yourself.", author: "Haven" },
  { text: "It's okay not to be okay. Just don't stay there alone.", author: "Haven" },
]

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

// ── Tools ─────────────────────────────────────────────────────────────────────
const TOOLS = [
  { icon: "🌬️", label: "Breathe",        desc: "Guided breathing",       href: "/breathe",        key: "breathe"  },
  { icon: "📖", label: "Journal",         desc: "Write & reflect",        href: "/thoughts",       key: "journal"  },
  { icon: "🔥", label: "Burn Letter",     desc: "Release what you carry", href: "/burn",           key: "burn"     },
  { icon: "🧠", label: "Self-Discovery",  desc: "Understand yourself",    href: "/self-discovery", key: "quiz"     },
  { icon: "💙", label: "Wellbeing",       desc: "Check in today",         href: "/wellbeing",      key: "survey"   },
  { icon: "📊", label: "Insights",        desc: "Track your progress",    href: "/insights",       key: "insights" },
  { icon: "📸", label: "Analyze",         desc: "Conversation patterns",  href: "/analyze",        key: "analyze"  },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function HavenHome() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [authModalOpen,  setAuthModalOpen]  = useState(false)
  const [authModalMode,  setAuthModalMode]  = useState<"signin" | "signup">("signup")
  const [chatOpen,       setChatOpen]       = useState(false)
  const welcomeShownRef = useRef(false)

  // Session state
  const [selectedEmotion,  setSelectedEmotion]  = useState<string | null>(null)
  const [emotionEmoji,     setEmotionEmoji]      = useState<string>("")
  const [emotionIntensity, setEmotionIntensity]  = useState(5)
  const [completedToday,   setCompletedToday]    = useState<Set<string>>(new Set())
  const [streak,           setStreak]            = useState(0)

  // Inline emotion picker state
  const [showPicker,     setShowPicker]     = useState(false)
  const [pickedEmotion,  setPickedEmotion]  = useState<{ label: string; emoji: string } | null>(null)
  const [intensityStep,  setIntensityStep]  = useState(false)
  const [localIntensity, setLocalIntensity] = useState(5)

  const { addEntry: addEmotion } = useEmotionLogs()

  // Daily quote — stable within a day, rotates each day
  const dailyQuote = DAILY_QUOTES[Math.floor(Date.now() / 86400000) % DAILY_QUOTES.length]

  // ── Load today's status (only when signed in) ──────────────────────────────
  useEffect(() => {
    if (!user) return
    setStreak(getStreak())
    const today = new Date().toDateString()

    const logs = readStorage<any[]>(STORAGE_KEYS.emotionLogs) ?? []
    const todayLog = logs.filter(l => new Date(l.timestamp).toDateString() === today).pop()
    if (todayLog) {
      setSelectedEmotion(todayLog.emotion)
      setEmotionEmoji(todayLog.emoji ?? EMOTIONS.find(e => e.label === todayLog.emotion)?.emoji ?? "")
      setEmotionIntensity(todayLog.intensity ?? 5)
      setCompletedToday(prev => new Set([...prev, "emotion"]))
    }

    const breathingHistory = JSON.parse(localStorage.getItem("heartsHeal_breathingHistory") || "[]")
    if (breathingHistory.some((s: any) => new Date(s.timestamp).toDateString() === today)) {
      setCompletedToday(prev => new Set([...prev, "breathe"]))
    }
  }, [user])

  // ── Clear displayed data immediately on sign-out ───────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      setSelectedEmotion(null)
      setEmotionEmoji("")
      setEmotionIntensity(5)
      setCompletedToday(new Set())
      setStreak(0)
      setShowPicker(false)
      setPickedEmotion(null)
      setIntensityStep(false)
      setChatOpen(false)
    }
  }, [user, authLoading])

  // ── Auth: trigger onboarding for new users ─────────────────────────────────
  const prevUserIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (authLoading) return
    if (!user) { welcomeShownRef.current = true; return }
    const prevId = prevUserIdRef.current
    const nextId = user.id
    if (prevId === null && nextId) {
      if (welcomeShownRef.current && !readStorage(STORAGE_KEYS.welcomeSeen)) {
        setTimeout(() => setOnboardingOpen(true), 500)
      }
    }
    prevUserIdRef.current = nextId
  }, [user, authLoading])

  useEffect(() => {
    if (!authLoading && !user) prevUserIdRef.current = null
  }, [authLoading, user])

  // ── Onboarding complete ────────────────────────────────────────────────────
  const handleOnboardingComplete = useCallback(
    (_name?: string, emotionData?: OnboardingEmotionData) => {
      setOnboardingOpen(false)
      if (emotionData) {
        const lossCtx   = readStorage<string[]>(STORAGE_KEYS.lossContext) ?? []
        const flowState = startHavenFlow(emotionData.label, emotionData.intensity, lossCtx[0])
        setTimeout(() => router.push(TOOL_HREFS[flowState.sequence[0]]), 800)
      }
    },
    [router],
  )

  // ── Log emotion ────────────────────────────────────────────────────────────
  const handleLogEmotion = useCallback(async () => {
    if (!pickedEmotion) return
    await addEmotion({ emotion: pickedEmotion.label, emoji: pickedEmotion.emoji, intensity: localIntensity })
    setSelectedEmotion(pickedEmotion.label)
    setEmotionEmoji(pickedEmotion.emoji)
    setEmotionIntensity(localIntensity)
    setCompletedToday(prev => new Set([...prev, "emotion"]))
    const newStreak = saveStreak()
    setStreak(newStreak)
    writeStorage(STORAGE_KEYS.lastCheckin, new Date().toDateString())
    setShowPicker(false)
    setPickedEmotion(null)
    setIntensityStep(false)
  }, [pickedEmotion, localIntensity, addEmotion])

  // ── Start healing session ──────────────────────────────────────────────────
  const startFlow = useCallback(() => {
    const lossCtx   = readStorage<string[]>(STORAGE_KEYS.lossContext) ?? []
    const flowState = startHavenFlow(selectedEmotion ?? undefined, emotionIntensity, lossCtx[0])
    router.push(TOOL_HREFS[flowState.sequence[0]])
  }, [selectedEmotion, emotionIntensity, router])

  // ── Derived ────────────────────────────────────────────────────────────────
  const userName     = readStorage<string>(STORAGE_KEYS.userName)
  const hour         = new Date().getHours()
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const greeting     = userName ? `${timeGreeting}, ${userName}` : timeGreeting

  // ══════════════════════════════════════════════════════════════════════════
  // Signed-out welcome screen
  // ══════════════════════════════════════════════════════════════════════════
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <motion.div
          className="w-full max-w-lg mx-auto px-6 py-10 flex flex-col flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Brand hero */}
          <div className="flex flex-col items-center text-center mb-8 mt-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-primary/25 mb-5"
              style={{ background: "linear-gradient(135deg, var(--orb-from, #9b6fdf), var(--orb-to, #d472b0))" }}
            >
              <Sparkles className="w-9 h-9 text-white" />
            </div>
            <h1 className="font-serif text-3xl font-semibold text-foreground mb-2">Haven</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Your personal space for emotional healing, gentle reflection, and finding your way back to yourself.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-2.5 mb-8">
            {[
              { icon: "🌬️", title: "Guided Breathing", desc: "Calm your nervous system with personalised breathwork." },
              { icon: "📖", title: "Private Journal",   desc: "Reflect freely with AI-generated prompts tailored to how you feel." },
              { icon: "🔥", title: "Burn Letter",        desc: "Write what you need to release — then let it go, forever." },
              { icon: "🧠", title: "Self-Discovery",     desc: "Understand your emotional patterns and build self-compassion." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-4 rounded-2xl bg-card/60 border border-border/40">
                <span className="text-2xl shrink-0">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3 mt-auto">
            <button
              onClick={() => { setAuthModalMode("signup"); setAuthModalOpen(true) }}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Get Started — It&apos;s Free
            </button>
            <button
              onClick={() => { setAuthModalMode("signin"); setAuthModalOpen(true) }}
              className="w-full py-3 rounded-2xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground/40 text-center mt-5">
            Your data is stored privately on your device. In crisis, call or text{" "}
            <a href="tel:988" className="text-primary/70 font-semibold">988</a>.
          </p>
        </motion.div>

        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultMode={authModalMode} />
      </div>
    )
  }

  // Auth loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Authenticated dashboard
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className={cn("min-h-screen bg-background", chatOpen && "pb-52")}>
      <motion.div
        className="w-full max-w-lg mx-auto px-4 pt-4 pb-28"
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
      >

        {/* ── Hero ── */}
        <motion.div
          className="flex flex-col items-center py-6"
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}
        >
          <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
            <motion.span
              className="absolute rounded-full bg-primary/15"
              style={{ width: "160%", height: "160%" }}
              animate={{ scale: [1, 1.12, 1], opacity: [0.4, 0.1, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="absolute rounded-full bg-primary/10"
              style={{ width: "120%", height: "120%" }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.08, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            <div
              className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-primary/20"
              style={{ background: "linear-gradient(135deg, var(--orb-from, #9b6fdf), var(--orb-to, #d472b0))" }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="font-serif text-2xl font-semibold text-foreground text-center mb-1">{greeting}</h1>

          {selectedEmotion ? (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mt-1"
            >
              {emotionEmoji} Feeling {selectedEmotion} today
            </motion.span>
          ) : (
            <p className="text-sm text-muted-foreground/60 mt-1">How are you feeling today?</p>
          )}

          {streak > 0 && (
            <span className="text-xs text-primary/70 font-semibold mt-2">🔥 {streak}-day streak</span>
          )}
        </motion.div>

        {/* ── Daily Quote ── */}
        <motion.div
          className="mb-5"
          variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
        >
          <div className="rounded-2xl px-5 py-4 bg-gradient-to-br from-primary/8 to-primary/4 border border-primary/15">
            <p className="text-[10px] font-semibold text-primary/50 uppercase tracking-widest mb-2">Today&apos;s Reflection</p>
            <p className="font-serif text-sm text-foreground/85 leading-relaxed italic">&ldquo;{dailyQuote.text}&rdquo;</p>
            <p className="text-[11px] text-muted-foreground/50 mt-1.5 text-right">— {dailyQuote.author}</p>
          </div>
        </motion.div>

        {/* ── Primary CTA ── */}
        <motion.div
          className="mb-5"
          variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
        >
          {selectedEmotion ? (
            <button
              onClick={startFlow}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Begin Healing Session
            </button>
          ) : (
            <button
              onClick={() => { setShowPicker(true); setPickedEmotion(null); setIntensityStep(false) }}
              className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/25 hover:bg-primary/90 active:scale-[0.98] transition-all duration-200"
            >
              Log how I&apos;m feeling
            </button>
          )}
          {selectedEmotion && (
            <button
              onClick={() => { setShowPicker(true); setPickedEmotion(null); setIntensityStep(false) }}
              className="w-full text-center text-xs text-muted-foreground/50 hover:text-muted-foreground mt-2 transition-colors"
            >
              Update emotion
            </button>
          )}
        </motion.div>

        {/* ── Inline emotion picker ── */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              key="emotion-picker"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="mb-5 p-4 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm"
            >
              {!intensityStep ? (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    What best describes how you feel?
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {EMOTIONS.map(({ label, emoji }) => (
                      <button
                        key={label}
                        onClick={() => { setPickedEmotion({ label, emoji }); setIntensityStep(true); setLocalIntensity(5) }}
                        className={cn(
                          "flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all",
                          pickedEmotion?.label === label
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-border/40 bg-card hover:border-primary/30 hover:bg-primary/5"
                        )}
                      >
                        <span className="text-xl">{emoji}</span>
                        <span className="text-[10px]">{label}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowPicker(false)}
                    className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground text-center mt-3 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-1">
                    {pickedEmotion?.emoji} {pickedEmotion?.label}
                  </p>
                  <p className="text-[11px] text-center text-muted-foreground mb-3">How intense is this feeling?</p>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs text-muted-foreground w-4 text-right">1</span>
                    <input
                      type="range" min={1} max={10} value={localIntensity}
                      onChange={e => setLocalIntensity(Number(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground w-4">10</span>
                  </div>
                  <p className="text-center text-2xl font-bold text-primary mb-3">{localIntensity}</p>
                  <button
                    onClick={handleLogEmotion}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all mb-2"
                  >
                    Log this feeling
                  </button>
                  <button
                    onClick={() => setIntensityStep(false)}
                    className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground text-center transition-colors"
                  >
                    ← Pick a different emotion
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Where to start (shown before first emotion log) ── */}
        {!selectedEmotion && (
          <motion.div
            className="mb-5"
            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
          >
            <div className="rounded-2xl border border-border/40 bg-card/50 p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Where to start</p>
              <div className="space-y-3">
                {[
                  {
                    step: "1",
                    label: "Log how you're feeling",
                    desc: "Tap above — it only takes a moment. Honest is better than optimistic.",
                    action: () => { setShowPicker(true); setPickedEmotion(null); setIntensityStep(false) },
                  },
                  {
                    step: "2",
                    label: "Let Haven guide you",
                    desc: "Haven builds a personalised healing flow from your emotion — breathing, journaling, reflection.",
                    action: null,
                  },
                  {
                    step: "3",
                    label: "Track your progress",
                    desc: "Your Insights page shows patterns over time, helping you understand yourself better.",
                    action: null,
                  },
                ].map(({ step, label, desc, action }) => (
                  <button
                    key={step}
                    onClick={action ?? undefined}
                    disabled={!action}
                    className={cn(
                      "w-full flex items-start gap-3 text-left",
                      action ? "cursor-pointer hover:opacity-80 transition-opacity" : "cursor-default"
                    )}
                  >
                    <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                    </div>
                    {action && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mt-1 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Today at a glance ── */}
        {completedToday.size > 0 && (
          <motion.div
            className="mb-4"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.35 } } }}
          >
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block mb-2">Today</span>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from(completedToday).map(key => (
                <span key={key} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary capitalize">
                  ✓ {key}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Tool cards ── */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">Your tools</p>
          <div className="grid grid-cols-2 gap-2.5">
            {TOOLS.map(({ icon, label, desc, href, key }) => {
              const done = completedToday.has(key)
              return (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    "flex flex-col items-start gap-2 p-3.5 rounded-2xl border transition-all relative active:scale-[0.97]",
                    done
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/40 bg-card/60 hover:border-primary/30 hover:bg-primary/5"
                  )}
                >
                  {done && <span className="absolute top-2.5 right-3 text-primary text-[11px] font-bold">✓</span>}
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{desc}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </motion.div>

        {/* ── Talk to Haven ── */}
        <motion.div
          className="mt-5"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3, delay: 0.3 } } }}
        >
          <button
            onClick={() => setChatOpen(true)}
            className="w-full py-3 rounded-2xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Talk to Haven
          </button>
        </motion.div>

      </motion.div>

      {/* ── Haven Chat panel ── */}
      <HavenChat open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* ── Auth modal ── */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultMode={authModalMode} />

      {/* ── Onboarding ── */}
      <OnboardingModal open={onboardingOpen} onComplete={handleOnboardingComplete} />
    </div>
  )
}
