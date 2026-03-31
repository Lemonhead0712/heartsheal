"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import { BookHeart, Wind, BarChart3, ArrowRight, Sparkles, Heart, Cloud } from "lucide-react"
import { WelcomeBanner } from "@/components/welcome-banner"
import { SnapshotsSection } from "@/components/snapshots-section"
import { EmotionTrendsWidget } from "@/components/emotion-trends-widget"
import { InspirationalQuote } from "@/components/inspirational-quote"
import { AuthModal } from "@/components/auth-modal"
import { DailyCheckinModal } from "@/components/daily-checkin-modal"
import { CrisisNudge } from "@/components/crisis-nudge"
import { useAuth } from "@/contexts/auth-context"
import { readStorage, STORAGE_KEYS } from "@/lib/storage"

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

/* ─── Feature card data ─── */
const features = [
  {
    href:        "/companion",
    icon:        Sparkles,
    title:       "Haven AI Companion",
    description: "A compassionate AI that listens without judgment, holding space for whatever loss you're carrying.",
    iconBg:      "bg-rose-100 text-rose-500 dark:bg-rose-900/40 dark:text-rose-400",
    accent:      "from-rose-50/70 dark:from-rose-900/20",
    badge:       "New" as string | null,
  },
  {
    href:        "/emotional-log",
    icon:        BarChart3,
    title:       "Emotional Log",
    description: "Capture your feelings and watch patterns emerge over time.",
    iconBg:      "bg-primary/10 text-primary",
    accent:      "from-primary/6",
    badge:       null,
  },
  {
    href:        "/breathe",
    icon:        Wind,
    title:       "Guided Breathing",
    description: "Soft animations guide each breath toward calm and clarity.",
    iconBg:      "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
    accent:      "from-sky-50/60 dark:from-sky-900/20",
    badge:       null,
  },
  {
    href:        "/thoughts",
    icon:        BookHeart,
    title:       "Thoughts Journal",
    description: "Reflect through guided journaling and self-compassion quizzes.",
    iconBg:      "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    accent:      "from-amber-50/60 dark:from-amber-900/20",
    badge:       null,
  },
]

const lossTypes = [
  "Grief & Loss", "Heartbreak", "Divorce", "Job Loss", "Loneliness", "Family Pain", "Identity", "Trauma"
]

function getGreeting(name?: string): { salutation: string; sub: string } {
  const h = new Date().getHours()
  const who = name ? `, ${name}` : ""
  if (h >= 5  && h < 12) return { salutation: `Good morning${who}`, sub: "How are you feeling as your day begins?" }
  if (h >= 12 && h < 17) return { salutation: `Good afternoon${who}`, sub: "Taking a moment for yourself today." }
  if (h >= 17 && h < 21) return { salutation: `Good evening${who}`, sub: "How has today been for you?" }
  return { salutation: `You're up late${who}`, sub: "This is a safe space, whenever you need it." }
}

export default function Home() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen]   = useState(false)
  const [authMode, setAuthMode]   = useState<"signin" | "signup">("signup")
  const [greeting, setGreeting]   = useState({ salutation: "Welcome back", sub: "Your safe space for healing." })
  const [checkinOpen, setCheckinOpen] = useState(false)

  useEffect(() => {
    const name = readStorage<string>(STORAGE_KEYS.userName) ?? undefined
    setGreeting(getGreeting(name))

    // Show daily check-in if not done today
    const last = readStorage<string>(STORAGE_KEYS.lastCheckin)
    const today = new Date().toDateString()
    if (last !== today) {
      const t = setTimeout(() => setCheckinOpen(true), 1800)
      return () => clearTimeout(t)
    }
  }, [])

  const openAuth = (mode: "signin" | "signup") => { setAuthMode(mode); setAuthOpen(true) }

  return (
    <div className="min-h-screen bg-page-gradient">
      <motion.div
        className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-10 md:pt-10 md:pb-16"
        variants={container}
        initial="hidden"
        animate="show"
      >

        {/* ── Hero ── */}
        <motion.section className="text-center max-w-2xl mx-auto mb-10 md:mb-14" variants={item}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide mb-5">
            <Heart className="w-3.5 h-3.5 fill-primary/30" />
            {greeting.salutation}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-4 text-balance leading-tight">
            Healing begins with{" "}
            <span className="text-primary">one breath.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed text-pretty max-w-xl mx-auto mb-6">
            {greeting.sub}
          </p>

          {/* Loss type pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {lossTypes.map((t) => (
              <span key={t} className="pill-badge bg-secondary text-muted-foreground text-xs">
                {t}
              </span>
            ))}
          </div>

          {/* Primary CTA */}
          <Link
            href="/companion"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <Heart className="w-4 h-4" />
            Talk to Haven, Your AI Companion
          </Link>
        </motion.section>

        {/* ── Crisis Support Banner ── */}
        <motion.section variants={item} className="mb-10 md:mb-14">
          <div className="glass-card rounded-2xl px-5 py-4 max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🆘</span>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">If you're in crisis right now</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You are not alone. Call or text{" "}
                  <a href="tel:988" className="text-primary font-semibold underline underline-offset-2">988</a>{" "}
                  (Suicide & Crisis Lifeline) anytime. Text <span className="font-semibold text-primary">HOME</span> to{" "}
                  <span className="font-semibold text-primary">741741</span> for the Crisis Text Line.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Inspirational Quote ── */}
        <motion.section className="mb-10 md:mb-14" variants={item}>
          <InspirationalQuote />
        </motion.section>

        {/* ── Account & Sync (signed-out only) ── */}
        {!user && (
          <motion.section className="mb-10 md:mb-14" variants={item}>
            <div className="glass-card rounded-2xl px-5 py-5 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-1">
                <Cloud className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Save your progress</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Create a free account to keep your emotional logs, journal entries, and insights safe — and access them from any device.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => openAuth("signup")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md"
                >
                  <Cloud className="w-4 h-4" />
                  Create Free Account
                </button>
                <button
                  onClick={() => openAuth("signin")}
                  className="px-5 py-3 rounded-xl border border-border/60 text-sm font-semibold text-foreground hover:bg-muted/50 active:scale-[0.98] transition-all"
                >
                  Sign In
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Welcome Banner (first visit only) ── */}
        <motion.section className="mb-10 md:mb-14" variants={item}>
          <WelcomeBanner />
        </motion.section>

        {/* ── Feature Cards ── */}
        <motion.section className="mb-12 md:mb-16" variants={item}>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
              Your Healing Tools
            </h2>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ href, icon: Icon, title, description, iconBg, accent, badge }) => (
              <motion.div key={href} variants={item}>
                <Link href={href} className="group block h-full">
                  <div
                    className={`
                      feature-card h-full rounded-2xl bg-card border border-border/40
                      bg-gradient-to-br ${accent} to-transparent
                    `}
                  >
                    <div className="p-5 sm:p-6 flex flex-col h-full">
                      {/* Icon + badge */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </div>
                        {badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground uppercase tracking-wide">
                            {badge}
                          </span>
                        )}
                      </div>

                      {/* Text */}
                      <h3 className="text-[15px] font-semibold text-foreground mb-1.5 leading-snug">
                        {title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                        {description}
                      </p>

                      {/* CTA row */}
                      <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-primary/70 group-hover:text-primary transition-colors duration-200">
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Dashboard Grid ── */}
        <motion.section className="mb-12 md:mb-16" variants={item}>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-foreground">
              Your Dashboard
            </h2>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <SnapshotsSection />
            <EmotionTrendsWidget />
          </div>
        </motion.section>

        {/* ── Closing affirmation ── */}
        <motion.section variants={item} className="text-center py-8">
          <div className="section-divider mb-6" />
          <p className="font-serif text-lg text-muted-foreground italic">
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
