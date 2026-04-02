"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import { BookHeart, Wind, ArrowRight, Sparkles, Heart, Cloud, TrendingUp, Flame, Activity, ChevronRight, PenLine } from "lucide-react"
import { WelcomeBanner } from "@/components/welcome-banner"
import { InspirationalQuote } from "@/components/inspirational-quote"
import { AuthModal } from "@/components/auth-modal"
import { DailyCheckinModal } from "@/components/daily-checkin-modal"
import { CrisisNudge } from "@/components/crisis-nudge"
import { useAuth } from "@/contexts/auth-context"
import { readStorage, STORAGE_KEYS } from "@/lib/storage"
import { cn } from "@/lib/utils"

/* ─── Animation variants ─── */
const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
}
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
}

/* ─── Quick-access tool links ─── */
const tools = [
  {
    href:    "/companion",
    icon:    Sparkles,
    label:   "Haven",
    sub:     "AI Companion",
    iconBg:  "bg-rose-100 text-rose-500 dark:bg-rose-900/40 dark:text-rose-400",
    accent:  "from-rose-50/60 dark:from-rose-900/15",
  },
  {
    href:    "/breathe",
    icon:    Wind,
    label:   "Breathe",
    sub:     "Guided session",
    iconBg:  "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    accent:  "from-sky-50/60 dark:from-sky-900/15",
  },
  {
    href:    "/thoughts",
    icon:    BookHeart,
    label:   "Thoughts",
    sub:     "Journal & quizzes",
    iconBg:  "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    accent:  "from-amber-50/60 dark:from-amber-900/15",
  },
  {
    href:    "/insights",
    icon:    TrendingUp,
    label:   "Insights",
    sub:     "Healing analytics",
    iconBg:  "bg-primary/10 text-primary",
    accent:  "from-primary/6",
  },
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
  const recent = logs.filter((l: any) => new Date(l.timestamp).getTime() > sevenAgo)
  if (!recent.length) return null

  const uniqueDays = new Set(recent.map((l: any) => new Date(l.timestamp).toDateString())).size
  const consistency = Math.min(uniqueDays / 7, 1)
  const avgIntensity = recent.reduce((s: number, l: any) => s + (l.intensity ?? 5), 0) / recent.length
  const intensityScore = 1 - avgIntensity / 10

  let surveyScore = 0.5
  if (surveys.length > 0) {
    const last = surveys.slice(-3)
    const avg = last.reduce((s: number, sv: any) =>
      s + ((sv.emotionalState + sv.selfConnection + sv.selfCompassion + sv.selfCare) / 4), 0) / last.length
    surveyScore = avg / 5
  }

  return Math.round((surveyScore * 0.40 + intensityScore * 0.35 + consistency * 0.25) * 100)
}

type LiveStats = {
  streak: number
  healingScore: number | null
  lastEmotion: { emoji: string; emotion: string; intensity: number } | null
  totalLogs: number
  hasData: boolean
}

/* ─── Stat mini-card ─── */
function StatPill({ icon, value, label, className }: { icon: React.ReactNode; value: string; label: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-card/80 border border-border/40 px-4 py-3 min-w-[80px]", className)}>
      <div className="text-muted-foreground mb-0.5">{icon}</div>
      <span className="text-lg font-bold text-foreground leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight whitespace-nowrap">{label}</span>
    </div>
  )
}

/* ─── Score ring (SVG) ─── */
function ScoreRing({ score }: { score: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#f43f5e"
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
      <circle
        cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 28 28)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="28" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>{score}</text>
    </svg>
  )
}

export default function Home() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen]       = useState(false)
  const [authMode, setAuthMode]       = useState<"signin" | "signup">("signup")
  const [greeting, setGreeting]       = useState({ salutation: "Welcome back", sub: "Your safe space for healing." })
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [stats, setStats]             = useState<LiveStats | null>(null)

  useEffect(() => {
    const name = readStorage<string>(STORAGE_KEYS.userName) ?? undefined
    setGreeting(getGreeting(name))

    // Compute live stats
    const logs    = readStorage<any[]>(STORAGE_KEYS.emotionLogs)    ?? []
    const surveys = readStorage<any[]>(STORAGE_KEYS.surveyResponses) ?? []
    const last    = logs[0] ?? null
    setStats({
      streak:       computeStreak(logs),
      healingScore: computeHealingScore(logs, surveys),
      lastEmotion:  last ? { emoji: last.emoji, emotion: last.emotion, intensity: last.intensity ?? 5 } : null,
      totalLogs:    logs.length,
      hasData:      logs.length > 0,
    })

    // Show daily check-in if not done today
    const lastCheckin = readStorage<string>(STORAGE_KEYS.lastCheckin)
    if (lastCheckin !== new Date().toDateString()) {
      const t = setTimeout(() => setCheckinOpen(true), 1800)
      return () => clearTimeout(t)
    }
  }, [])

  const openAuth = (mode: "signin" | "signup") => { setAuthMode(mode); setAuthOpen(true) }

  const hasData  = stats?.hasData ?? false

  return (
    <div className="min-h-screen bg-page-gradient">
      <motion.div
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 md:pt-6 md:pb-12"
        variants={container}
        initial="hidden"
        animate="show"
      >

        {/* ── Personal Hero ── */}
        <motion.section className="mb-6 md:mb-8" variants={item}>
          <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-card/60 to-card border border-border/30 px-5 py-6 md:px-8 md:py-7">

            {/* Greeting */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tracking-wide mb-2">
                  <Heart className="w-3 h-3 fill-primary/40" />
                  HeartsHeal
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground leading-snug">
                  {greeting.salutation}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{greeting.sub}</p>
              </div>
            </div>

            {/* Live stats row — only when user has data */}
            {hasData && stats ? (
              <div className="flex flex-wrap gap-2 mb-5">
                {stats.streak > 0 && (
                  <StatPill
                    icon={<Flame className="w-3.5 h-3.5 text-orange-400" />}
                    value={`${stats.streak}`}
                    label={stats.streak === 1 ? "day streak" : "day streak"}
                  />
                )}
                {stats.healingScore !== null && (
                  <div className="flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-card/80 border border-border/40 px-3 py-2">
                    <ScoreRing score={stats.healingScore} />
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">Healing Score</span>
                  </div>
                )}
                {stats.lastEmotion && (
                  <StatPill
                    icon={<span className="text-base leading-none">{stats.lastEmotion.emoji}</span>}
                    value={stats.lastEmotion.emotion}
                    label="last logged"
                  />
                )}
                <StatPill
                  icon={<Activity className="w-3.5 h-3.5 text-primary" />}
                  value={`${stats.totalLogs}`}
                  label="total logs"
                />
              </div>
            ) : (
              /* First-time / no data state */
              <p className="text-sm text-muted-foreground mb-5 max-w-md">
                Start your healing journey — log how you feel today and watch your patterns emerge over time.
              </p>
            )}

            {/* Primary action buttons */}
            <div className="flex flex-wrap gap-2">
              <Link
                href="/companion"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 hover:-translate-y-px transition-all duration-200"
              >
                <Sparkles className="w-4 h-4" />
                Talk to Haven
              </Link>
              <Link
                href="/emotional-log"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/60 text-foreground text-sm font-semibold hover:bg-muted/60 transition-colors duration-200"
              >
                <PenLine className="w-4 h-4 text-primary" />
                Log Emotion
              </Link>
              <Link
                href="/breathe"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/60 text-foreground text-sm font-semibold hover:bg-muted/60 transition-colors duration-200"
              >
                <Wind className="w-4 h-4 text-sky-500" />
                Breathe
              </Link>
            </div>
          </div>
        </motion.section>

        {/* ── Healing Insights Preview (only with data) ── */}
        {hasData && stats?.healingScore !== null && (
          <motion.section className="mb-6 md:mb-8" variants={item}>
            <Link href="/insights" className="group block">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50/70 via-card/50 to-card dark:from-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30 px-5 py-5 hover:border-emerald-300/70 dark:hover:border-emerald-700/50 transition-colors duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-sm font-semibold text-foreground">Your Healing Insights</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      {stats!.streak > 1
                        ? `You've been showing up for yourself — ${stats!.streak} days in a row. That consistency is your foundation.`
                        : "Track your wellbeing across emotions, breathing, journaling, and more in one place."}
                    </p>
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:gap-2 transition-all duration-200">
                      View full insights
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <ScoreRing score={stats!.healingScore!} />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Healing Score</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.section>
        )}

        {/* ── Crisis Support Banner ── */}
        <motion.section variants={item} className="mb-6 md:mb-8">
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
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-foreground">
              Your Healing Tools
            </h2>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {tools.map(({ href, icon: Icon, label, sub, iconBg, accent }) => (
              <Link key={href} href={href} className="group">
                <div className={cn(
                  "rounded-2xl bg-card border border-border/40 bg-gradient-to-br to-transparent transition-all duration-200",
                  "hover:border-border/70 hover:shadow-sm hover:-translate-y-0.5",
                  accent,
                )}>
                  <div className="p-4 flex flex-col gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
                      <Icon className="w-4.5 h-4.5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-snug">{label}</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">{sub}</p>
                    </div>
                    <div className="flex items-center gap-0.5 text-[11px] font-semibold text-primary/60 group-hover:text-primary transition-colors duration-200 mt-auto">
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ── Account & Sync (signed-out only) ── */}
        {!user && (
          <motion.section className="mb-6 md:mb-8" variants={item}>
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

        {/* ── Welcome Banner (first visit only) ── */}
        <motion.section variants={item}>
          <WelcomeBanner />
        </motion.section>

        {/* ── Inspirational Quote ── */}
        <motion.section className="mb-6 md:mb-8" variants={item}>
          <InspirationalQuote />
        </motion.section>

        {/* ── Closing affirmation ── */}
        <motion.section variants={item} className="text-center py-2">
          <div className="section-divider mb-5" />
          <p className="font-serif text-base text-muted-foreground italic">
            "Healing is not linear. Every moment you're here is an act of courage."
          </p>
        </motion.section>

      </motion.div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
      <DailyCheckinModal open={checkinOpen} onClose={() => setCheckinOpen(false)} />
      <CrisisNudge />
    </div>
  )
}
