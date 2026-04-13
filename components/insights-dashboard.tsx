"use client"

import Link from "next/link"
import { useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"
import {
  AreaChart, Area,
  BarChart, Bar, Cell,
  LineChart, Line,
  ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  TrendingUp, TrendingDown, Flame, Wind, BookHeart,
  Sparkles, BarChart3, Activity, Heart, PlusCircle,
  Volume2, VolumeX,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useInsightsData, type DateRange } from "@/hooks/use-insights-data"
import { useTTS } from "@/hooks/use-speech"

/* ── Palette ── */
const SURVEY_COLORS = {
  emotionalState: "#6366F1",   // indigo
  selfConnection:  "#8B5CF6",  // violet
  selfCompassion:  "#0EA5E9",  // sky
  selfCare:        "#10B981",  // emerald
}

const LOSS_LABELS: Record<string, string> = {
  grief: "Losing Someone", breakup: "Heartbreak", job: "Career Loss",
  family: "Family Estrangement", identity: "Identity Shift", other: "Something Else",
}

/* ── Date range options ── */
const RANGES: { value: DateRange; label: string }[] = [
  { value: "7d",  label: "This Week" },
  { value: "30d", label: "This Month" },
  { value: "all", label: "All Time" },
]

/* ── Emotion pill color by intensity bucket ── */
function emotionPillColor(avgIntensity: number) {
  if (avgIntensity >= 7.5) return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/40"
  if (avgIntensity >= 5)   return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/40"
  return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/40"
}

/* ── Bar color by valence (for mood bar chart) ── */
function barColor(v: number) {
  if (v >= 2)    return "#0EA5E9"   // sky — lighter/calmer feelings
  if (v >= 0.5)  return "#6366F1"   // indigo — mildly positive
  if (v >= -0.5) return "#94A3B8"   // slate — neutral
  if (v >= -2)   return "#8B5CF6"   // violet — heavier feelings
  return "#F43F5E"                   // rose — intense weight
}

/* ── Intensity progress bar color ── */
function intensityBarColor(avg: number) {
  if (avg >= 7.5) return "bg-[#6366F1]"   // indigo
  if (avg >= 5)   return "bg-[#8B5CF6]"   // violet
  return "bg-[#0EA5E9]"                    // sky calm
}

/* ── Reusable shell components ── */
function ScoreRing({ score }: { score: number }) {
  const r = 20; const circ = 2 * Math.PI * r
  // Brand gradient colors: indigo at high, violet at medium, slate at low
  const color = score >= 70 ? "#6366F1" : score >= 45 ? "#8B5CF6" : "#94A3B8"
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" className="shrink-0">
      <defs>
        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle cx="25" cy="25" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-border/20" />
      <circle cx="25" cy="25" r={r} fill="none" stroke={score >= 45 ? "url(#scoreGrad)" : color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
        strokeLinecap="round" transform="rotate(-90 25 25)" />
      <text x="25" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
    </svg>
  )
}

function StatCard({ label, value, sub, icon: Icon, color, delta, scoreRing }: {
  label: string; value: string | number; sub: string
  icon: React.ElementType; color: string; delta?: number; scoreRing?: boolean
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", color)}>
          <Icon className="w-4 h-4" />
        </div>
        {delta !== undefined && delta !== 0 && (
          <span className={cn("text-xs font-semibold flex items-center gap-0.5", delta > 0 ? "text-emerald-500" : "text-rose-400")}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          {!scoreRing && <p className="text-2xl font-bold text-foreground leading-none">{value}</p>}
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          <p className="text-[11px] font-medium text-muted-foreground/70 mt-0.5 uppercase tracking-wide">{label}</p>
        </div>
        {scoreRing && typeof value === "number" && <ScoreRing score={value} />}
      </div>
    </div>
  )
}

function SectionCard({ title, subtitle, children, accent, className }: {
  title: string; subtitle?: string; children: React.ReactNode; accent?: string; className?: string
}) {
  return (
    <div className={cn("glass-card rounded-2xl p-5", accent, className)}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text, action, href }: { text: string; action?: string; href?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{text}</p>
      {action && href && (
        <Link href={href} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
          <PlusCircle className="w-3 h-3" /> {action}
        </Link>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border/40 rounded-xl px-3 py-2 shadow-lg text-xs max-w-[160px]">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? "hsl(var(--foreground))" }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

/* ── Mood bar chart tooltip ── */
const MoodBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.[0]) return null
  const v = payload[0].value as number
  const mood = v >= 1.5 ? "Lighter 🌱" : v >= -0.5 ? "Neutral 〰" : "Heavier 💙"
  return (
    <div className="bg-card border border-border/40 rounded-xl px-3 py-2 shadow-lg text-xs max-w-[160px]">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-muted-foreground">{mood}</p>
      <p className="text-muted-foreground">Avg valence: {v > 0 ? "+" : ""}{v}</p>
      {payload[0].payload.emotions && (
        <p className="text-muted-foreground mt-1 leading-relaxed">{payload[0].payload.emotions}</p>
      )}
    </div>
  )
}

/* ── Main component ── */
export function InsightsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("30d")
  const [activeTab, setActiveTab] = useState<"overview" | "analyses">("overview")
  const data = useInsightsData(dateRange)

  /* TTS */
  const { speak, stop: stopTTS, isSpeaking } = useTTS()
  const [ttsText, setTtsText] = useState<string | null>(null)
  const handleSpeak = useCallback((text: string) => {
    if (isSpeaking && ttsText === text) { stopTTS(); setTtsText(null) }
    else { speak(text); setTtsText(text) }
  }, [isSpeaking, ttsText, speak, stopTTS])
  useEffect(() => { if (!isSpeaking) setTtsText(null) }, [isSpeaking])

  const anim = {
    container: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } },
    item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } } },
  }

  return (
    <div className="bg-page-gradient min-h-screen">
      <motion.div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-5 pb-24 md:pb-12"
        variants={anim.container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="flex items-center justify-between mb-5 gap-3 flex-wrap" variants={anim.item}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground font-serif leading-none">Your Insights</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Your journey, reflected.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border/40">
              {RANGES.map(({ value, label }) => (
                <button key={value} onClick={() => setDateRange(value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap",
                    dateRange === value ? "bg-card text-foreground shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {label}
                </button>
              ))}
            </div>
            <Link href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
              💜 Haven
            </Link>
          </div>
        </motion.div>

        {/* Tab strip */}
        <motion.div variants={anim.item} className="flex items-center gap-1 p-1 rounded-2xl bg-card/60 border border-border/40 mb-5 max-w-sm">
          {(["overview", "analyses"] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={cn(
                "flex-1 py-2 px-4 rounded-xl text-xs font-semibold transition-all",
                activeTab === t
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              {t === "overview" ? "Overview" : "Conversation Analysis"}
            </button>
          ))}
        </motion.div>

        {/* Conversation Analysis tab */}
        {activeTab === "analyses" && (
          <motion.div variants={anim.item}>
            <ScreenshotAnalysis />
          </motion.div>
        )}

        {/* Overview tab content */}
        {activeTab === "overview" && <>

        {/* Loading skeleton */}
        {!data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[0,1,2,3].map((i) => <div key={i} className="glass-card rounded-2xl p-4 h-28 animate-pulse bg-muted/30" />)}
            </div>
            <div className="glass-card rounded-2xl p-5 h-24 animate-pulse bg-muted/30" />
            <div className="glass-card rounded-2xl p-5 h-48 animate-pulse bg-muted/30" />
          </div>
        )}

        {data && (
          <motion.div className="space-y-5" variants={anim.container} initial="hidden" animate="show">

            {/* ── Completeness hints ── */}
            {(() => {
              const hints = [
                data.totalEmotionLogs < 3 && {
                  text: `${3 - data.totalEmotionLogs} more emotion log${(3 - data.totalEmotionLogs) !== 1 ? "s" : ""} needed to unlock your weekly reflection`,
                  href: "/", label: "Open Haven",
                },
                data.totalJournalEntries === 0 && {
                  text: "No journal entries yet — Haven can guide you through a reflection",
                  href: "/", label: "Open Haven",
                },
                data.totalBreathingSessions === 0 && {
                  text: "No breathing sessions yet — Haven can guide one right now",
                  href: "/", label: "Open Haven",
                },
                data.totalQuizzes === 0 && {
                  text: "No self-assessment yet — Haven can walk you through a quick check-in",
                  href: "/", label: "Open Haven",
                },
              ].filter(Boolean) as { text: string; href: string; label: string }[]

              return hints.length > 0 ? (
                <motion.div variants={anim.item}>
                  <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:border-amber-800/30 dark:bg-amber-900/10 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        Data limited
                      </p>
                    </div>
                    <ul className="space-y-1.5">
                      {hints.map((h, i) => (
                        <li key={i} className="flex items-center justify-between gap-3">
                          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">{h.text}</p>
                          <Link href={h.href}
                            className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline whitespace-nowrap shrink-0">
                            {h.label} →
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ) : null
            })()}

            {/* ── 4 stat cards ── */}
            <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3" variants={anim.item}>
              <StatCard label="Healing Score" icon={Heart}
                value={data.totalEmotionLogs >= 3 ? data.healingScore : "—"}
                sub={data.totalEmotionLogs >= 3
                  ? (data.healingScoreDelta !== 0 ? `${data.healingScoreDelta > 0 ? "+" : ""}${data.healingScoreDelta} vs last period` : "Based on your activity")
                  : `Log ${Math.max(0, 3 - data.totalEmotionLogs)} more to unlock`}
                color="text-rose-500 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
                delta={data.totalEmotionLogs >= 3 ? data.healingScoreDelta : undefined}
                scoreRing={data.totalEmotionLogs >= 3} />
              <StatCard label="Daily Streak" icon={Flame}
                value={`${data.currentStreak > 0 ? "🔥 " : ""}${data.currentStreak}`}
                sub={`Best: ${data.longestStreak} days`}
                color="text-orange-500 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400" />
              <StatCard label="Activities" icon={Activity}
                value={data.totalEmotionLogs + data.totalJournalEntries + data.totalBreathingSessions}
                sub={`${data.totalEmotionLogs} logs · ${data.totalJournalEntries} journals · ${data.totalBreathingSessions} breaths`}
                color="text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400" />
              <StatCard label="Avg Intensity" icon={BarChart3}
                value={data.avgIntensity !== null ? data.avgIntensity.toFixed(1) : "—"}
                sub="out of 10"
                color="text-primary bg-primary/10" />
            </motion.div>

            {/* ── AI Weekly Narrative ── */}
            <motion.div variants={anim.item}>
              {data.totalEmotionLogs >= 3 ? (
                <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-primary/5 to-rose-50/30 dark:from-primary/10 dark:to-rose-900/10 border border-primary/20">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">Your Weekly Reflection</span>
                    </div>
                    {data.weeklyNarrative && (
                      <button
                        onClick={() => handleSpeak(data.weeklyNarrative!)}
                        className="p-1 rounded-lg text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                        aria-label={ttsText === data.weeklyNarrative && isSpeaking ? "Stop" : "Read aloud"}
                      >
                        {ttsText === data.weeklyNarrative && isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  {data.narrativeLoading ? (
                    <div className="space-y-2">
                      {[100, 80, 60].map((w) => (
                        <div key={w} className="h-3 bg-muted/50 rounded-full animate-pulse" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  ) : data.weeklyNarrative ? (
                    <p className="text-sm text-foreground/90 leading-relaxed">{data.weeklyNarrative}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Preparing your personal insight…</p>
                  )}
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Log {Math.max(0, 3 - data.totalEmotionLogs)} more emotion{3 - data.totalEmotionLogs !== 1 ? "s" : ""} to unlock your weekly reflection.
                  </p>
                </div>
              )}
            </motion.div>

            {/* ── AI Journal Themes ── */}
            <motion.div variants={anim.item}>
              {data.totalJournalEntries >= 2 ? (
                <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-amber-50/60 to-primary/5 dark:from-amber-900/15 dark:to-primary/10 border border-amber-200/40 dark:border-amber-800/30">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <BookHeart className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Journal Themes</span>
                    </div>
                    {data.journalInsight && (
                      <button
                        onClick={() => handleSpeak(data.journalInsight!)}
                        className="p-1 rounded-lg text-primary/50 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                        aria-label={ttsText === data.journalInsight && isSpeaking ? "Stop" : "Read aloud"}
                      >
                        {ttsText === data.journalInsight && isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  {data.journalInsightLoading ? (
                    <div className="space-y-2">
                      {[100, 85, 65].map((w) => (
                        <div key={w} className="h-3 bg-muted/50 rounded-full animate-pulse" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  ) : data.journalInsight ? (
                    <p className="text-sm text-foreground/90 leading-relaxed">{data.journalInsight}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Preparing your journal analysis…</p>
                  )}
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
                  <BookHeart className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Write {Math.max(0, 2 - data.totalJournalEntries)} more journal entr{2 - data.totalJournalEntries !== 1 ? "ies" : "y"} to unlock theme analysis.{" "}
                    <Link href="/thoughts" className="text-primary hover:underline">Open Thoughts →</Link>
                  </p>
                </div>
              )}
            </motion.div>

            {/* ── HEALING JOURNEY MILESTONES ── */}
            {data.milestones.length > 0 && (
              <motion.div variants={anim.item}>
                <SectionCard title="Your Healing Journey" subtitle="Milestones you've reached along the way">
                  <div className="relative">
                    <div className="absolute top-5 left-5 right-5 h-px bg-border/40" />
                    <div className="flex gap-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                      {data.milestones.map((m, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 min-w-[80px] relative">
                          <div className="w-10 h-10 rounded-full bg-card border-2 border-border/60 flex items-center justify-center text-lg shrink-0 z-10">
                            {m.icon}
                          </div>
                          <p className="text-[10px] font-semibold text-foreground text-center leading-tight">{m.label}</p>
                          <p className="text-[9px] text-muted-foreground text-center">{m.date}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ── MOOD TIMELINE — vertical bar chart ── */}
            <motion.div variants={anim.item}>
              <SectionCard
                title="Mood Timeline"
                subtitle="Daily average valence — bars above the line feel lighter, below feel heavier."
                accent="bg-gradient-to-br from-slate-50/50 to-sky-50/30 dark:from-slate-900/20 dark:to-sky-900/10"
              >
                {data.moodTimeline.length >= 2 ? (() => {
                  // Group moodTimeline points into daily buckets
                  const buckets: Record<string, { vals: number[]; emotions: string[] }> = {}
                  data.moodTimeline.forEach((pt) => {
                    const d = pt.dateStr
                    if (!buckets[d]) buckets[d] = { vals: [], emotions: [] }
                    buckets[d].vals.push(pt.y)
                    buckets[d].emotions.push(`${pt.emoji ?? ""} ${pt.emotion}`.trim())
                  })
                  const dailyMood = Object.entries(buckets)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, { vals, emotions }]) => ({
                      date,
                      avgValence: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)),
                      emotions: emotions.slice(0, 3).join(", "),
                    }))

                  return (
                    <>
                      {/* Legend */}
                      <div className="flex items-center gap-4 mb-3 flex-wrap">
                        {[
                          { color: "#10b981", label: "Lighter feelings" },
                          { color: "#94a3b8", label: "Neutral" },
                          { color: "#f43f5e", label: "Heavier feelings" },
                        ].map(({ color, label }) => (
                          <span key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                            {label}
                          </span>
                        ))}
                      </div>

                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={dailyMood} margin={{ top: 16, right: 8, bottom: 0, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.25)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            tickLine={false} axisLine={false}
                          />
                          <YAxis
                            domain={[-4.5, 4.5]}
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            tickLine={false} axisLine={false}
                            tickFormatter={(v) => v === 0 ? "0" : v > 0 ? `+${v}` : `${v}`}
                          />
                          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.4} strokeDasharray="6 3" />
                          <Tooltip content={<MoodBarTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                          <Bar dataKey="avgValence" radius={[4, 4, 0, 0]} maxBarSize={32}>
                            {dailyMood.map((entry, i) => (
                              <Cell key={i} fill={barColor(entry.avgValence)} fillOpacity={0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )
                })() : (
                  <EmptyState text="Log a few emotions to see your mood mapped over time." action="Open Haven" href="/" />
                )}
              </SectionCard>
            </motion.div>

            {/* ── Emotion frequency pills + Survey trends (2-col) ── */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-5" variants={anim.item}>

              {/* Emotion frequency with horizontal bars */}
              <SectionCard title="Emotions This Period" subtitle="How often each emotion appeared — color shows intensity">
                {data.emotionFrequency.length > 0 ? (
                  <div className="space-y-2.5 pt-1">
                    {data.emotionFrequency.slice(0, 8).map(({ emotion, count, avgIntensity }) => {
                      const max = data.emotionFrequency[0].count
                      const pct = Math.round((count / max) * 100)
                      return (
                        <div key={emotion} className="flex items-center gap-2.5">
                          <span className="text-xs text-foreground/80 font-medium w-28 shrink-0 truncate">{emotion}</span>
                          <div className="flex-1 bg-muted/40 rounded-full h-2 overflow-hidden">
                            <div
                              className={cn("h-2 rounded-full transition-all duration-500", intensityBarColor(avgIntensity))}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-5 text-right shrink-0">{count}</span>
                        </div>
                      )
                    })}
                    {/* Intensity legend */}
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      {[
                        { cls: "bg-rose-400",   label: "High intensity" },
                        { cls: "bg-amber-400",  label: "Medium" },
                        { cls: "bg-emerald-400", label: "Low intensity" },
                      ].map(({ cls, label }) => (
                        <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className={cn("w-2 h-2 rounded-full shrink-0", cls)} />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState text="No emotions logged this period." action="Open Haven" href="/" />
                )}
              </SectionCard>

              {/* Survey dimension trends */}
              <SectionCard title="Wellbeing Check-In" subtitle="Your self-ratings after each check-in (scale 1–5)">
                {data.surveyTrend.length >= 2 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={data.surveyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.25)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickCount={5} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="emotionalState" name="Emotional State" stroke={SURVEY_COLORS.emotionalState} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="selfConnection"  name="Self-Connection"  stroke={SURVEY_COLORS.selfConnection}  strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="selfCompassion"  name="Self-Compassion"  stroke={SURVEY_COLORS.selfCompassion}  strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="selfCare"        name="Self-Care"        stroke={SURVEY_COLORS.selfCare}        strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                      {(Object.entries(SURVEY_COLORS) as [keyof typeof SURVEY_COLORS, string][]).map(([key, color]) => (
                        <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {key === "emotionalState" ? "Emotional State" : key === "selfConnection" ? "Self-Connection" : key === "selfCompassion" ? "Self-Compassion" : "Self-Care"}
                        </span>
                      ))}
                    </div>
                    {data.avgSurveyDimensions && (
                      <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-border/30">
                        {(["emotionalState","selfConnection","selfCompassion","selfCare"] as const).map((key) => (
                          <div key={key} className="text-center">
                            <p className="text-sm font-bold" style={{ color: SURVEY_COLORS[key] }}>
                              {(data.avgSurveyDimensions as NonNullable<typeof data.avgSurveyDimensions>)[key]}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {key === "emotionalState" ? "Emotional" : key === "selfConnection" ? "Connection" : key === "selfCompassion" ? "Compassion" : "Self-Care"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState text="After logging an emotion, complete the 4-question survey that follows. Your answers will appear here." action="Open Haven" href="/" />
                )}
              </SectionCard>
            </motion.div>

            {/* ── Intensity area chart ── */}
            <motion.div variants={anim.item}>
              <SectionCard
                title="Emotion Intensity Over Time"
                subtitle="Daily average — how strongly you felt each day"
                accent="bg-gradient-to-br from-primary/5 to-transparent"
              >
                {data.intensityTrend.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={data.intensityTrend}>
                      <defs>
                        <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.25)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="intensity" name="Avg Intensity" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#intensityGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="Log emotions on multiple days to see your intensity trend." action="Open Haven" href="/" />
                )}
              </SectionCard>
            </motion.div>

            {/* ── Breathing + Quiz ── */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-5" variants={anim.item}>

              <SectionCard title="Breathing Practice" accent="bg-gradient-to-br from-sky-50/50 to-emerald-50/30 dark:from-sky-900/10 dark:to-emerald-900/10">
                {data.totalBreathingSessions > 0 ? (
                  <div className="space-y-4">
                    {data.breathingImpact !== null ? (
                      <div className={cn("rounded-xl p-4 flex items-start gap-3",
                        data.breathingImpact > 0
                          ? "bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30"
                          : "bg-muted/30 border border-border/30")}>
                        <Wind className={cn("w-4 h-4 mt-0.5 shrink-0", data.breathingImpact > 0 ? "text-emerald-500" : "text-muted-foreground")} />
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          {data.breathingImpact > 0
                            ? <>On days you breathed, intensity averaged <strong className="text-emerald-600 dark:text-emerald-400">{data.breathingImpact} pts lower</strong>. 🌿</>
                            : "Keep going — breathing impact will show once patterns emerge."}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {Math.max(0, 5 - data.totalBreathingSessions)} more session{5 - data.totalBreathingSessions !== 1 ? "s" : ""} to unlock your breathing impact.
                      </p>
                    )}
                    {data.breathingPatternBreakdown.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Sessions by pattern</p>
                        {data.breathingPatternBreakdown.map(({ pattern, count }) => (
                          <div key={pattern} className="flex items-center gap-2">
                            <div className="flex-1 bg-muted/40 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-sky-400 h-1.5 rounded-full transition-all" style={{ width: `${(count / data.totalBreathingSessions) * 100}%` }} />
                            </div>
                            <span className="text-[11px] text-muted-foreground shrink-0 text-right w-32">{pattern} ({count})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState text="Start a breathing session to track your practice." action="Go to Breathe" href="/breathe" />
                )}
              </SectionCard>

              <SectionCard title="Self-Assessment Scores" accent="bg-gradient-to-br from-amber-50/50 to-rose-50/30 dark:from-amber-900/10 dark:to-rose-900/10">
                {data.quizHistory.length > 0 ? (
                  <div className="space-y-3">
                    {["Emotional Awareness", "Self-Compassion"].map((type) => {
                      const entries = data.quizHistory.filter((q) => q.type === type)
                      if (!entries.length) return null
                      const latest = entries[entries.length - 1]
                      const prev = entries.length >= 2 ? entries[entries.length - 2] : null
                      const delta = prev ? latest.score - prev.score : null
                      return (
                        <div key={type} className="flex items-center justify-between p-3 rounded-xl bg-background/60 border border-border/30">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{type}</p>
                            <p className="text-[11px] text-muted-foreground">{latest.date} · {latest.label}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {delta !== null && delta !== 0 && (
                              <span className={cn("text-xs font-semibold flex items-center gap-0.5", delta > 0 ? "text-emerald-500" : "text-rose-400")}>
                                {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {delta > 0 ? "+" : ""}{delta}
                              </span>
                            )}
                            <span className={cn("text-xl font-bold",
                              latest.score >= 80 ? "text-emerald-500" : latest.score >= 60 ? "text-sky-500" : latest.score >= 40 ? "text-amber-500" : "text-rose-400"
                            )}>{latest.score}</span>
                          </div>
                        </div>
                      )
                    })}
                    {data.quizHistory.length >= 3 && (
                      <div className="pt-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Score history</p>
                        <ResponsiveContainer width="100%" height={70}>
                          <LineChart data={data.quizHistory}>
                            <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                            <XAxis dataKey="date" hide />
                            <YAxis domain={[0, 100]} hide />
                            <Tooltip content={<CustomTooltip />} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState text="Take a self-assessment quiz to start tracking your growth." action="Go to Thoughts" href="/thoughts" />
                )}
              </SectionCard>
            </motion.div>

            {/* ── Haven Sessions ── */}
            {data.havenSessions.length > 0 && (
              <motion.div variants={anim.item}>
                <SectionCard title="Haven Conversations" subtitle="Recent sessions with your AI companion">
                  <div className="space-y-3">
                    {data.havenSessions.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background/60 border border-border/30">
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg whitespace-nowrap shrink-0 mt-0.5">{s.date}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-primary mb-0.5">{LOSS_LABELS[s.lossType] ?? s.lossType}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{s.summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ── Quick-access footer ── */}
            <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1" variants={anim.item}>
              {[
                { href: "/emotional-log", label: "History",       icon: BarChart3, color: "text-primary" },
                { href: "/breathe",       label: "Breathe",       icon: Wind,       color: "text-sky-500" },
                { href: "/thoughts",      label: "Journal",       icon: BookHeart,  color: "text-amber-500" },
                { href: "/",              label: "Talk to Haven", icon: Sparkles,   color: "text-rose-500" },
              ].map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href}
                  className="glass-card rounded-2xl p-3 flex flex-col items-center gap-2 hover:border-primary/20 transition-colors group">
                  <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", color)} />
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                </Link>
              ))}
            </motion.div>

          </motion.div>
        )}

        </> }
      </motion.div>
    </div>
  )
}
