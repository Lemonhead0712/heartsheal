"use client"

import Link from "next/link"
import { useState } from "react"
import { motion } from "framer-motion"
import {
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"
import {
  TrendingUp, TrendingDown, Minus, Flame, Wind, BookHeart,
  Sparkles, BarChart3, Activity, Heart, PlusCircle, RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useInsightsData, type DateRange } from "@/hooks/use-insights-data"
import { Logo } from "@/components/logo"

const SURVEY_COLORS = {
  emotionalState: "#f43f5e",   // rose
  selfConnection:  "#8b5cf6",  // violet
  selfCompassion:  "#0ea5e9",  // sky
  selfCare:        "#10b981",  // emerald
}

const LOSS_LABELS: Record<string, string> = {
  grief:    "Losing Someone",
  breakup:  "Heartbreak",
  job:      "Career Loss",
  family:   "Family Estrangement",
  identity: "Identity Shift",
  other:    "Something Else",
}

function StatCard({
  label, value, sub, icon: Icon, color, delta,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  color: string
  delta?: number
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", color)}>
          <Icon className="w-4 h-4" />
        </div>
        {delta !== undefined && delta !== 0 && (
          <span className={cn(
            "text-xs font-semibold flex items-center gap-0.5",
            delta > 0 ? "text-emerald-500" : "text-rose-400"
          )}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta > 0 ? "+" : ""}{delta}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        <p className="text-[11px] font-medium text-muted-foreground/70 mt-0.5 uppercase tracking-wide">{label}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("glass-card rounded-2xl p-5", className)}>
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
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
    <div className="bg-card border border-border/40 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export function InsightsDashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("30d")
  const data = useInsightsData(dateRange)

  const ranges: { value: DateRange; label: string }[] = [
    { value: "7d",  label: "7D" },
    { value: "30d", label: "30D" },
    { value: "all", label: "All" },
  ]

  const container = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
  }
  const item = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
  }

  return (
    <div className="bg-page-gradient min-h-screen">
      <motion.div
        className="w-full max-w-4xl mx-auto px-4 md:px-8 py-5 pb-24 md:pb-12"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div className="flex flex-col items-center mb-4" variants={item}>
          <Logo size="medium" />
        </motion.div>

        <motion.div className="flex items-start justify-between mb-6 gap-4 flex-wrap" variants={item}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Healing Insights</h1>
              <p className="text-sm text-muted-foreground">Your journey, reflected.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Date range */}
            <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border/30">
              {ranges.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDateRange(value)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150",
                    dateRange === value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Log emotion CTA */}
            <Link
              href="/emotional-log"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <PlusCircle className="w-3 h-3" /> Log
            </Link>
          </div>
        </motion.div>

        {/* Loading skeleton */}
        {!data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[0,1,2,3].map((i) => (
                <div key={i} className="glass-card rounded-2xl p-4 h-28 animate-pulse bg-muted/30" />
              ))}
            </div>
            <div className="glass-card rounded-2xl p-5 h-24 animate-pulse bg-muted/30" />
          </div>
        )}

        {data && (
          <motion.div className="space-y-5" variants={container} initial="hidden" animate="show">

            {/* ── Stat cards ── */}
            <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3" variants={item}>
              <StatCard
                label="Healing Score"
                value={data.healingScore}
                sub={data.healingScoreDelta !== 0 ? `${data.healingScoreDelta > 0 ? "+" : ""}${data.healingScoreDelta} vs prev period` : "Based on your activity"}
                icon={Heart}
                color="text-rose-500 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
                delta={data.healingScoreDelta}
              />
              <StatCard
                label="Check-in Streak"
                value={`${data.currentStreak > 0 ? "🔥 " : ""}${data.currentStreak}`}
                sub={`${data.longestStreak} day best`}
                icon={Flame}
                color="text-orange-500 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400"
              />
              <StatCard
                label="Activities"
                value={data.totalEmotionLogs + data.totalJournalEntries + data.totalBreathingSessions}
                sub="this period"
                icon={Activity}
                color="text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400"
              />
              <StatCard
                label="Avg Intensity"
                value={
                  data.intensityTrend.length > 0
                    ? `${(data.intensityTrend.reduce((s, p) => s + p.intensity, 0) / data.intensityTrend.length).toFixed(1)}`
                    : "—"
                }
                sub="out of 10"
                icon={BarChart3}
                color="text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400"
              />
            </motion.div>

            {/* ── AI Weekly Narrative ── */}
            <motion.div variants={item}>
              {data.totalEmotionLogs >= 3 ? (
                <div className="glass-card rounded-2xl p-5 bg-gradient-to-br from-violet-50/60 to-rose-50/40 dark:from-violet-900/20 dark:to-rose-900/10 border border-violet-200/40 dark:border-violet-800/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
                    <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Weekly Insight</span>
                  </div>
                  {data.narrativeLoading ? (
                    <div className="space-y-2">
                      <div className="h-3 bg-muted/50 rounded-full animate-pulse w-full" />
                      <div className="h-3 bg-muted/50 rounded-full animate-pulse w-4/5" />
                      <div className="h-3 bg-muted/50 rounded-full animate-pulse w-3/5" />
                    </div>
                  ) : data.weeklyNarrative ? (
                    <p className="text-sm text-foreground/90 leading-relaxed">{data.weeklyNarrative}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Generating your personal insight…</p>
                  )}
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-5 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">Log {3 - data.totalEmotionLogs} more emotion{3 - data.totalEmotionLogs !== 1 ? "s" : ""} to unlock your personalised weekly insight.</p>
                </div>
              )}
            </motion.div>

            {/* ── Two-column: Survey trends + Emotion distribution ── */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-5" variants={item}>

              {/* Survey dimensions */}
              <SectionCard title="Wellbeing Dimensions">
                {data.surveyTrend.length >= 2 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data.surveyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="emotionalState" name="Emotional State" stroke={SURVEY_COLORS.emotionalState} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="selfConnection"  name="Self-Connection"  stroke={SURVEY_COLORS.selfConnection}  strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="selfCompassion"  name="Self-Compassion"  stroke={SURVEY_COLORS.selfCompassion}  strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="selfCare"        name="Self-Care"        stroke={SURVEY_COLORS.selfCare}        strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      {Object.entries(SURVEY_COLORS).map(([key, color]) => (
                        <span key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          {key === "emotionalState" ? "Emotional State" :
                           key === "selfConnection"  ? "Self-Connection"  :
                           key === "selfCompassion"  ? "Self-Compassion"  : "Self-Care"}
                        </span>
                      ))}
                    </div>
                    {/* Current averages */}
                    {data.avgSurveyDimensions && (
                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/30">
                        {[
                          { key: "emotionalState", label: "Emotional",  color: SURVEY_COLORS.emotionalState },
                          { key: "selfConnection",  label: "Connected",  color: SURVEY_COLORS.selfConnection },
                          { key: "selfCompassion",  label: "Compassion", color: SURVEY_COLORS.selfCompassion },
                          { key: "selfCare",        label: "Self-Care",  color: SURVEY_COLORS.selfCare },
                        ].map(({ key, label, color }) => (
                          <div key={key} className="text-center">
                            <p className="text-base font-bold" style={{ color }}>{(data.avgSurveyDimensions as any)[key]}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState
                    text="Complete the post-log survey at least twice to see your wellbeing trends over time."
                    action="Log an emotion"
                    href="/emotional-log"
                  />
                )}
              </SectionCard>

              {/* Emotion distribution */}
              <SectionCard title="Emotion Distribution">
                {data.emotionFrequency.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={data.emotionFrequency}
                      layout="vertical"
                      margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.3)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="emotion" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={false} width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Occurrences" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="No emotion data yet for this period." action="Log an emotion" href="/emotional-log" />
                )}
              </SectionCard>
            </motion.div>

            {/* ── Intensity trend ── */}
            <motion.div variants={item}>
              <SectionCard title="Emotion Intensity Over Time">
                {data.intensityTrend.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={data.intensityTrend}>
                      <defs>
                        <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="intensity" name="Avg Intensity" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#intensityGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState text="Log emotions on multiple days to see your intensity trend." action="Log an emotion" href="/emotional-log" />
                )}
              </SectionCard>
            </motion.div>

            {/* ── Breathing + Quiz row ── */}
            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-5" variants={item}>

              {/* Breathing insights */}
              <SectionCard title="Breathing Practice">
                {data.totalBreathingSessions > 0 ? (
                  <div className="space-y-4">
                    {data.breathingImpact !== null ? (
                      <div className={cn(
                        "rounded-xl p-4 flex items-start gap-3",
                        data.breathingImpact > 0
                          ? "bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200/40 dark:border-emerald-800/30"
                          : "bg-muted/30 border border-border/30"
                      )}>
                        <Wind className={cn("w-4 h-4 mt-0.5 shrink-0", data.breathingImpact > 0 ? "text-emerald-500" : "text-muted-foreground")} />
                        <div>
                          {data.breathingImpact > 0 ? (
                            <p className="text-sm text-foreground/90 leading-relaxed">
                              On days you practised breathing, your emotion intensity averaged{" "}
                              <strong className="text-emerald-600 dark:text-emerald-400">{data.breathingImpact} pts lower</strong>. 🌿
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">No intensity difference detected yet — keep going!</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {5 - Math.min(5, data.totalBreathingSessions)} more session{5 - Math.min(5, data.totalBreathingSessions) !== 1 ? "s" : ""} to unlock breathing impact insight.
                      </p>
                    )}

                    {/* Pattern breakdown */}
                    {data.breathingPatternBreakdown.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sessions by pattern</p>
                        {data.breathingPatternBreakdown.map(({ pattern, count }) => (
                          <div key={pattern} className="flex items-center gap-2">
                            <div className="flex-1 bg-muted/40 rounded-full h-1.5">
                              <div
                                className="bg-sky-400 h-1.5 rounded-full"
                                style={{ width: `${(count / data.totalBreathingSessions) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-28 text-right shrink-0">{pattern} ({count})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState text="Start a breathing session to track your practice." action="Go to Breathe" href="/breathe" />
                )}
              </SectionCard>

              {/* Quiz progress */}
              <SectionCard title="Self-Assessment Progress">
                {data.quizHistory.length > 0 ? (
                  <div className="space-y-3">
                    {/* Group by quiz type and show latest score */}
                    {["Emotional Awareness", "Self-Compassion"].map((type) => {
                      const entries = data.quizHistory.filter((q) => q.type === type)
                      if (!entries.length) return null
                      const latest = entries[entries.length - 1]
                      const prev = entries.length >= 2 ? entries[entries.length - 2] : null
                      const delta = prev ? latest.score - prev.score : null
                      return (
                        <div key={type} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{type}</p>
                            <p className="text-xs text-muted-foreground">{latest.date} · {latest.label}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {delta !== null && delta !== 0 && (
                              <span className={cn("text-xs font-semibold flex items-center gap-0.5", delta > 0 ? "text-emerald-500" : "text-rose-400")}>
                                {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {delta > 0 ? "+" : ""}{delta}
                              </span>
                            )}
                            <span className={cn(
                              "text-base font-bold",
                              latest.score >= 80 ? "text-emerald-500" :
                              latest.score >= 60 ? "text-sky-500" :
                              latest.score >= 40 ? "text-amber-500" : "text-rose-400"
                            )}>{latest.score}</span>
                          </div>
                        </div>
                      )
                    })}

                    {/* Mini score history chart */}
                    {data.quizHistory.length >= 3 && (
                      <div className="pt-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Score history</p>
                        <ResponsiveContainer width="100%" height={80}>
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

            {/* ── Activity timeline: journals + Haven ── */}
            <motion.div variants={item}>
              <SectionCard title="Recent Activity">
                {data.recentJournalSnippets.length === 0 && !data.havenSession ? (
                  <EmptyState text="Your journals and Haven sessions will appear here." />
                ) : (
                  <div className="space-y-3">
                    {/* Haven session */}
                    {data.havenSession && (
                      <div className="flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/25 to-rose-200 dark:from-primary/20 dark:to-rose-900/40 flex items-center justify-center shrink-0 mt-0.5">
                          <Heart className="w-3.5 h-3.5 text-primary fill-primary/30" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-foreground">Haven Session</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                              {LOSS_LABELS[data.havenSession.lossType] ?? data.havenSession.lossType}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{data.havenSession.date}</span>
                          </div>
                          <p className="text-xs text-muted-foreground/80 leading-relaxed italic">"{data.havenSession.summary}"</p>
                        </div>
                      </div>
                    )}

                    {/* Journal snippets */}
                    {data.recentJournalSnippets.map((j, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-amber-50/40 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-800/20">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                          <BookHeart className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-foreground">Journal Entry</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{j.date}</span>
                          </div>
                          {j.prompt && j.prompt !== "Free write" && (
                            <p className="text-[10px] text-muted-foreground/70 italic mb-1">Prompt: {j.prompt}</p>
                          )}
                          <p className="text-xs text-muted-foreground leading-relaxed">"{j.excerpt}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </motion.div>

            {/* ── Bottom CTA links ── */}
            <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2" variants={item}>
              {[
                { href: "/emotional-log", label: "Log Emotion",  icon: BarChart3,  color: "text-primary" },
                { href: "/breathe",       label: "Breathe",      icon: Wind,        color: "text-sky-500" },
                { href: "/thoughts",      label: "Journal",      icon: BookHeart,   color: "text-amber-500" },
                { href: "/companion",     label: "Talk to Haven",icon: Sparkles,    color: "text-rose-500" },
              ].map(({ href, label, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="glass-card rounded-2xl p-3 flex flex-col items-center gap-2 hover:border-primary/20 transition-colors group"
                >
                  <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", color)} />
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                </Link>
              ))}
            </motion.div>

          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
