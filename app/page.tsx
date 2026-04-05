"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import { BookHeart, Wind, ArrowRight, Sparkles, Heart, Cloud, TrendingUp, Flame, Activity, ChevronRight, PenLine } from "lucide-react"
import { OnboardingModal } from "@/components/onboarding-modal"
import { InspirationalQuote } from "@/components/inspirational-quote"
import { AuthModal } from "@/components/auth-modal"
import { DailyCheckinModal } from "@/components/daily-checkin-modal"
import { CrisisNudge } from "@/components/crisis-nudge"
import { useAuth } from "@/contexts/auth-context"
import { useGuidedSession } from "@/contexts/guided-session-context"
import { readStorage, STORAGE_KEYS } from "@/lib/storage"
import { cn } from "@/lib/utils"

/* ─── Animation variants ─── */
const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
}

/* ─── Quick-access tool links ─── */
const tools = [
  {
    href:   "/companion",
    icon:   Sparkles,
    label:  "Haven",
    sub:    "AI Companion",
    iconBg: "bg-rose-100 text-rose-500 dark:bg-rose-900/40 dark:text-rose-400",
    accent: "from-rose-50/60 dark:from-rose-900/15",
  },
  {
    href:   "/breathe",
    icon:   Wind,
    label:  "Breathe",
    sub:    "Guided session",
    iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    accent: "from-sky-50/60 dark:from-sky-900/15",
  },
  {
    href:   "/thoughts",
    icon:   BookHeart,
    label:  "Thoughts",
    sub:    "Journal & quizzes",
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    accent: "from-amber-50/60 dark:from-amber-900/15",
  },
  {
    href:   "/insights",
    icon:   TrendingUp,
    label:  "Insights",
    sub:    "Healing analytics",
    iconBg: "bg-primary/10 text-primary",
    accent: "from-primary/6",
  },
]

const lossTypes = [
  "Grief & Loss", "Heartbreak", "Divorce", "Job Loss", "Loneliness", "Family Pain", "Identity", "Trauma",
]

/* ─── Helpers ─── */
function getGreeting(name?: string): { salutation: string; sub: string } {
  const h = new Date().getHours()
  const who = name ? `, ${name}` : ""
  if (h >= 5  && h < 12) return { salutation: `Good morning${who}`, sub: "How are you feeling as your day begins?" }
  if (h >= 12 && h < 17) return { salutation: `Good afternoon${who}`, sub: "Taking a moment for yourself today." }
  if (h >= 17 && h < 21) return { salutation: `Good evening${who}`, sub: "How has today been for you?" }
  return { salutation: `You're up late${who}`, sub: "This is a safe space, whenever you need it." }
}

function computeStreak(logs: any[]): number {
  if (!logs.length) return 0
  const days = new Set(logs.map((l: any) => new Date(l.timestamp).toDateString()))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (!days.has(d.toDateString())) break
    streak++
  }
  return streak
}

function computeHealingScore(logs: any[], surveys: any[]): number | null {
  if (logs.length < 2) return null
  const sevenAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent   = logs.filter((l: any) => new Date(l.timestamp).getTime() > sevenAgo)
  if (!recent.length) return null

  const uniqueDays      = new Set(recent.map((l: any) => new Date(l.timestamp).toDateString())).size
  const consistency     = Math.min(uniqueDays / 7, 1)
  const avgIntensity    = recent.reduce((s: number, l: any) => s + (l.intensity ?? 5), 0) / recent.length
  const intensityScore  = 1 - avgIntensity / 10

  let surveyScore = 0.5
  if (surveys.length > 0) {
    const last = surveys.slice(-3)
    const avg  = last.reduce((s: number, sv: any) =>
      s + ((sv.emotionalState + sv.selfConnection + sv.selfCompassion + sv.selfCare) / 4), 0) / last.length
    surveyScore = avg / 5
  }

  return Math.round((surveyScore * 0.40 + intensityScore * 0.35 + consistency * 0.25) * 100)
}

type LiveStats = {
  streak:       number
  healingScore: number | null
  lastEmotion:  { emoji: string; emotion: string } | null
  totalLogs:    number
  hasData:      boolean
}

/* ─── Score ring (SVG) ─── */
function ScoreRing({ score }: { score: number }) {
  const r     = 20
  const circ  = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color  = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#f43f5e"
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-muted/30" />
      <circle
        cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 24 24)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="24" y="29" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
    </svg>
  )
}

export default function Home() {
  const { user } = useAuth()
  const { startSession } = useGuidedSession()
  const [authOpen, setAuthOpen]       = useState(false)
  const [authMode, setAuthMode]       = useState<"signin" | "signup">("signup")
  const [greeting, setGreeting]       = useState({ salutation: "Welcome back", sub: "Your safe space for healing." })
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [stats, setStats]             = useState<LiveStats | null>(null)

  useEffect(() => {
    const name    = readStorage<string>(STORAGE_KEYS.userName) ?? undefined
    setGreeting(getGreeting(name))

    const logs    = readStorage<any[]>(STORAGE_KEYS.emotionLogs)    ?? []
    const surveys = readStorage<any[]>(STORAGE_KEYS.surveyResponses) ?? []
    const last    = logs[0] ?? null
    setStats({
      streak:       computeStreak(logs),
      healingScore: computeHealingScore(logs, surveys),
      lastEmotion:  last ? { emoji: last.emoji, emotion: last.emotion } : null,
      totalLogs:    logs.length,
      hasData:      logs.length > 0,
    })

    const welcomeSeen = readStorage<boolean>(STORAGE_KEYS.welcomeSeen)
    const lastCheckin = readStorage<string>(STORAGE_KEYS.lastCheckin)
    if (welcomeSeen && lastCheckin !== new Date().toDateString()) {
      const t = setTimeout(() => setCheckinOpen(true), 1800)
      return () => clearTimeout(t)
    }
  }, [])

  const openAuth = (mode: "signin" | "signup") => { setAuthMode(mode); setAuthOpen(true) }

  return (
    <div className="min-h-screen bg-page-gradient">
      <motion.div
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 md:pt-6 md:pb-12"
        variants={container}
        initial="hidden"
        animate="show"
      >

        {/* ── Hero ── */}
        <motion.section className="text-center max-w-3xl mx-auto mb-8 md:mb-10" variants={item}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide mb-5">
            <Heart className="w-3.5 h-3.5 fill-primary/30" />
            {greeting.salutation}
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-5 text-balance leading-[1.1]">
            Healing begins with{" "}
            <span className="text-primary">one breath.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed text-pretty max-w-xl mx-auto mb-8">
            {greeting.sub}
          </p>

          {/* Loss type pills */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            {lossTypes.map((t) => (
              <span key={t} className="pill-badge bg-secondary text-muted-foreground text-sm px-4 py-1.5">
                {t}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={startSession}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <Heart className="w-4 h-4" />
              Talk to Haven
            </button>
            <Link
              href="/emotional-log"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-border/60 text-muted-foreground font-semibold text-sm hover:text-foreground hover:border-border transition-colors duration-200"
            >
              <PenLine className="w-4 h-4" />
              Log Emotion
            </Link>
          </div>
        </motion.section>

        {/* ── Crisis Support Banner ── */}
        <motion.section variants={item} className="mb-7 md:mb-9">
          <div className="glass-card rounded-2xl px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🆘</span>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">If you're in crisis right now</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You are not alone. Call or text{" "}
                  <a href="tel:988" className="text-primary font-semibold underline underline-offset-2">988</a>{" "}
                  (Suicide &amp; Crisis Lifeline) anytime. Text <span className="font-semibold text-primary">HOME</span> to{" "}
                  <span className="font-semibold text-primary">741741</span> for the Crisis Text Line.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Quick-access Tools ── */}
        <motion.section className="mb-7 md:mb-9" variants={item}>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
              Your Healing Tools
            </h2>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {tools.map(({ href, icon: Icon, label, sub, iconBg, accent }) => (
              <Link key={href} href={href} className="group">
                <div className={cn(
                  "rounded-2xl bg-card border border-border/40 bg-gradient-to-br to-transparent h-full",
                  "hover:border-border/70 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200",
                  accent,
                )}>
                  <div className="p-4 sm:p-5 flex flex-col gap-3 h-full">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] font-semibold text-foreground leading-snug">{label}</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">{sub}</p>
                    </div>
                    <div className="flex items-center gap-0.5 text-xs font-semibold text-primary/60 group-hover:text-primary transition-colors duration-200">
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ── Your Progress (live stats) ── */}
        <motion.section className="mb-7 md:mb-9" variants={item}>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
              Your Progress
            </h2>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {stats?.hasData ? (
            <Link href="/insights" className="group block">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50/60 via-card/50 to-card dark:from-emerald-900/15 border border-emerald-200/40 dark:border-emerald-800/25 px-5 py-5 hover:border-emerald-300/60 dark:hover:border-emerald-700/40 transition-colors duration-200">
                <div className="flex items-center gap-5 flex-wrap">
                  {/* Score ring */}
                  {stats.healingScore !== null && (
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <ScoreRing score={stats.healingScore} />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">Healing Score</span>
                    </div>
                  )}

                  {/* Stat pills */}
                  <div className="flex flex-wrap gap-3 flex-1">
                    {stats.streak > 0 && (
                      <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-card border border-border/40 px-4 py-2.5 min-w-[72px]">
                        <div className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-orange-400" />
                          <span className="text-lg font-bold text-foreground">{stats.streak}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">day streak</span>
                      </div>
                    )}
                    {stats.lastEmotion && (
                      <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-card border border-border/40 px-4 py-2.5 min-w-[72px]">
                        <span className="text-lg leading-none">{stats.lastEmotion.emoji}</span>
                        <span className="text-[11px] font-medium text-foreground">{stats.lastEmotion.emotion}</span>
                        <span className="text-[10px] text-muted-foreground">last logged</span>
                      </div>
                    )}
                    <div className="flex flex-col items-center justify-center gap-0.5 rounded-xl bg-card border border-border/40 px-4 py-2.5 min-w-[72px]">
                      <div className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        <span className="text-lg font-bold text-foreground">{stats.totalLogs}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">total logs</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="ml-auto shrink-0 flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 group-hover:gap-2 transition-all duration-200">
                    View full insights
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl bg-card border border-border/40 px-5 py-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Start logging your emotions to see your healing progress here.
              </p>
              <Link
                href="/emotional-log"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <PenLine className="w-4 h-4" />
                Log your first emotion
              </Link>
            </div>
          )}
        </motion.section>

        {/* ── Account & Sync (signed-out only) ── */}
        {!user && (
          <motion.section className="mb-7 md:mb-9" variants={item}>
            <div className="rounded-2xl px-5 py-5 bg-primary/5 border border-primary/15">
              <div className="flex items-center gap-2 mb-1">
                <Cloud className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Your progress, safe across devices</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Free forever — create an account to keep your logs and journal safe and accessible anywhere.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => openAuth("signup")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/10 active:scale-[0.98] transition-all"
                >
                  <Cloud className="w-4 h-4" />
                  Create Free Account
                </button>
                <button
                  onClick={() => openAuth("signin")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 text-muted-foreground text-sm font-semibold hover:bg-muted/50 active:scale-[0.98] transition-all"
                >
                  Sign In
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Inspirational Quote ── */}
        <motion.section className="mb-6 md:mb-8" variants={item}>
          <InspirationalQuote />
        </motion.section>

        {/* ── Closing affirmation ── */}
        <motion.section variants={item} className="text-center py-4">
          <div className="section-divider mb-6" />
          <p className="font-serif text-lg text-muted-foreground italic">
            "Healing is not linear. Every moment you're here is an act of courage."
          </p>
        </motion.section>

      </motion.div>

      <OnboardingModal />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
      <DailyCheckinModal open={checkinOpen} onClose={() => setCheckinOpen(false)} />
      <CrisisNudge />
    </div>
  )
}
