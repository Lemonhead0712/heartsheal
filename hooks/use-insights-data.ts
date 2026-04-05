"use client"

import { useState, useEffect, useCallback } from "react"
import { readStorage, writeStorage, STORAGE_KEYS } from "@/lib/storage"
import type { EmotionEntry } from "@/hooks/use-emotion-logs"
import type { JournalEntry } from "@/hooks/use-journal-entries"

export type DateRange = "7d" | "30d" | "all"

// Valence scores: positive = above neutral, negative = below
const EMOTION_VALENCE: Record<string, number> = {
  Joy: 3.5, Grateful: 3, Hopeful: 2.5, Trust: 2, Calm: 1.5,
  Anticipation: 1.5, Okay: 0.5, Surprise: 0.5,
  Numb: -0.5, Frustrated: -1.5, Frustration: -1.5,
  Anger: -2, Fear: -2, Sad: -2.5, Sadness: -2.5, Anxious: -2.5,
  Disgust: -2.5, Grief: -3.5, Overwhelmed: -3.5,
}

export type MoodPoint = {
  x: number      // timestamp ms (for XAxis type="number")
  y: number      // valence -4 to +4
  z: number      // intensity 1-10 (drives dot size)
  emotion: string
  emoji: string
  dateStr: string
  intensity: number
}

export type SurveyResponse = {
  id: string
  timestamp: string
  emotionalState: number
  selfConnection: number
  selfCompassion: number
  selfCare: number
}

export type BreathingSession = {
  id: string
  timestamp: string
  pattern: string
  cycles: number
}

export type QuizResult = {
  id?: string
  type: "emotional-awareness" | "self-compassion"
  score: number
  category_scores?: Record<string, number[]>
  created_at?: string
  timestamp?: string
}

export type InsightsData = {
  totalEmotionLogs: number
  totalJournalEntries: number
  totalQuizzes: number
  totalBreathingSessions: number
  totalSurveys: number
  currentStreak: number
  longestStreak: number
  healingScore: number
  healingScoreDelta: number
  surveyTrend: {
    date: string
    emotionalState: number
    selfConnection: number
    selfCompassion: number
    selfCare: number
    avg: number
  }[]
  intensityTrend: { date: string; intensity: number }[]
  emotionFrequency: { emotion: string; count: number; avgIntensity: number }[]
  breathingImpact: number | null
  quizHistory: { date: string; type: string; score: number; label: string }[]
  moodTimeline: MoodPoint[]
  havenSessions: { date: string; lossType: string; summary: string; messageCount?: number }[]
  journalActivity: { date: string; count: number }[]
  recentJournalSnippets: { date: string; prompt: string; excerpt: string }[]
  weeklyNarrative: string | null
  narrativeLoading: boolean
  breathingPatternBreakdown: { pattern: string; count: number }[]
  avgSurveyDimensions: { emotionalState: number; selfConnection: number; selfCompassion: number; selfCare: number } | null
  avgIntensity: number | null   // mean intensity across all filtered emotion logs
  milestones: { date: string; label: string; icon: string }[]
}

function getDateRange(range: DateRange): Date | null {
  if (range === "all") return null
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (range === "7d")  d.setDate(d.getDate() - 7)
  if (range === "30d") d.setDate(d.getDate() - 30)
  return d
}

function toDateStr(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getISOWeek(): string {
  const d = new Date()
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil((((d.getTime() - jan1.getTime()) / 86400000) + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`
}

function computeStreaks(activeDates: Set<string>): { current: number; longest: number } {
  if (activeDates.size === 0) return { current: 0, longest: 0 }
  const sorted = Array.from(activeDates).sort((a, b) => b.localeCompare(a))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let current = 0
  let longest = 0
  let streak = 0
  let prev: Date | null = null

  for (const ds of sorted) {
    const d = new Date(ds)
    if (!prev) {
      // Allow streak to start from today or yesterday
      const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
      if (diff <= 1) {
        streak = 1
      } else {
        streak = 1
        if (streak > longest) longest = streak
        // no active current streak since it's not recent
        streak = 0
        prev = d
        continue
      }
    } else {
      const diff = Math.round((prev.getTime() - d.getTime()) / 86400000)
      if (diff === 1) {
        streak++
      } else {
        if (streak > longest) longest = streak
        streak = 1
      }
    }
    prev = d
    if (streak > longest) longest = streak
  }

  // current streak: consecutive from today going back
  const cursor = new Date(today)
  let cur = 0
  for (let i = 0; i < 365; i++) {
    const ds = cursor.toISOString().slice(0, 10)
    if (activeDates.has(ds)) {
      cur++
      cursor.setDate(cursor.getDate() - 1)
    } else if (i === 0) {
      // today not logged — check yesterday
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  current = cur

  return { current, longest: Math.max(longest, current) }
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Thriving"
  if (score >= 60) return "Growing"
  if (score >= 40) return "Developing"
  return "Needs Care"
}

export function useInsightsData(dateRange: DateRange) {
  const [data, setData] = useState<InsightsData | null>(null)

  const computeData = useCallback(async () => {
    if (typeof window === "undefined") return

    const cutoff = getDateRange(dateRange)
    const inRange = (iso: string) => !cutoff || new Date(iso) >= cutoff

    // ── Load all raw data ──
    const emotionLogs    = (readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs)    ?? []).filter((e) => inRange(e.timestamp))
    const journalEntries = (readStorage<JournalEntry[]>(STORAGE_KEYS.journalEntries) ?? []).filter((e) => inRange(e.date))
    const quizResults    = (readStorage<QuizResult[]>(STORAGE_KEYS.quizResults)      ?? []).filter((e) => inRange(e.created_at ?? e.timestamp ?? "1970"))
    const surveyResponses= (readStorage<SurveyResponse[]>(STORAGE_KEYS.surveyResponses) ?? []).filter((e) => inRange(e.timestamp))
    const breathingSessions = (readStorage<BreathingSession[]>(STORAGE_KEYS.breathingHistory) ?? []).filter((e) => inRange(e.timestamp))
    const lastSession    = readStorage<{ summary: string; lossId: string; date: string }>(STORAGE_KEYS.lastSession)

    // All-time for streak (ignore range filter)
    const allEmotionLogs      = readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs)      ?? []
    const allJournalEntries   = readStorage<JournalEntry[]>(STORAGE_KEYS.journalEntries)   ?? []
    const allSurveys          = readStorage<SurveyResponse[]>(STORAGE_KEYS.surveyResponses) ?? []
    const allBreathing        = readStorage<BreathingSession[]>(STORAGE_KEYS.breathingHistory) ?? []

    // ── Streak (all-time) ──
    const activeDates = new Set<string>()
    for (const e of allEmotionLogs)    activeDates.add(e.timestamp.slice(0, 10))
    for (const e of allJournalEntries) activeDates.add(e.date.slice(0, 10))
    for (const e of allSurveys)        activeDates.add(e.timestamp.slice(0, 10))
    for (const e of allBreathing)      activeDates.add(e.timestamp.slice(0, 10))
    const { current: currentStreak, longest: longestStreak } = computeStreaks(activeDates)

    // ── Emotion frequency ──
    const emotionMap = new Map<string, { count: number; totalIntensity: number }>()
    for (const e of emotionLogs) {
      const key = e.emotion
      const existing = emotionMap.get(key) ?? { count: 0, totalIntensity: 0 }
      emotionMap.set(key, { count: existing.count + 1, totalIntensity: existing.totalIntensity + e.intensity })
    }
    const emotionFrequency = Array.from(emotionMap.entries())
      .map(([emotion, { count, totalIntensity }]) => ({ emotion, count, avgIntensity: Math.round((totalIntensity / count) * 10) / 10 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    // ── Intensity trend (daily average) ──
    const intensityByDay = new Map<string, number[]>()
    for (const e of emotionLogs) {
      const day = e.timestamp.slice(0, 10)
      if (!intensityByDay.has(day)) intensityByDay.set(day, [])
      intensityByDay.get(day)!.push(e.intensity)
    }
    const intensityTrend = Array.from(intensityByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, vals]) => ({
        date: toDateStr(day + "T12:00:00"),
        intensity: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
      }))

    // ── Survey trend ──
    const surveyTrend = surveyResponses
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(-20)
      .map((s) => ({
        date: toDateStr(s.timestamp),
        emotionalState: s.emotionalState,
        selfConnection: s.selfConnection,
        selfCompassion: s.selfCompassion,
        selfCare: s.selfCare,
        avg: Math.round(((s.emotionalState + s.selfConnection + s.selfCompassion + s.selfCare) / 4) * 10) / 10,
      }))

    // ── Avg survey dimensions ──
    const avgSurveyDimensions = surveyResponses.length > 0
      ? {
          emotionalState: Math.round((surveyResponses.reduce((s, r) => s + r.emotionalState, 0) / surveyResponses.length) * 10) / 10,
          selfConnection:  Math.round((surveyResponses.reduce((s, r) => s + r.selfConnection,  0) / surveyResponses.length) * 10) / 10,
          selfCompassion:  Math.round((surveyResponses.reduce((s, r) => s + r.selfCompassion,  0) / surveyResponses.length) * 10) / 10,
          selfCare:        Math.round((surveyResponses.reduce((s, r) => s + r.selfCare,        0) / surveyResponses.length) * 10) / 10,
        }
      : null

    // ── Breathing pattern breakdown ──
    const patternMap = new Map<string, number>()
    for (const s of breathingSessions) {
      patternMap.set(s.pattern, (patternMap.get(s.pattern) ?? 0) + 1)
    }
    const breathingPatternBreakdown = Array.from(patternMap.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)

    // ── Breathing impact on intensity ──
    let breathingImpact: number | null = null
    const allTimeBreathing = readStorage<BreathingSession[]>(STORAGE_KEYS.breathingHistory) ?? []
    if (allTimeBreathing.length >= 5) {
      const breathDays = new Set(allTimeBreathing.map((s) => s.timestamp.slice(0, 10)))
      const withBreath: number[] = []
      const withoutBreath: number[] = []
      for (const e of allEmotionLogs) {
        const day = e.timestamp.slice(0, 10)
        if (breathDays.has(day)) withBreath.push(e.intensity)
        else withoutBreath.push(e.intensity)
      }
      if (withBreath.length > 0 && withoutBreath.length > 0) {
        const avgWith    = withBreath.reduce((s, v) => s + v, 0) / withBreath.length
        const avgWithout = withoutBreath.reduce((s, v) => s + v, 0) / withoutBreath.length
        breathingImpact = Math.round((avgWithout - avgWith) * 10) / 10
      }
    }

    // ── Quiz history ──
    const quizHistory = quizResults
      .sort((a, b) => (a.created_at ?? a.timestamp ?? "").localeCompare(b.created_at ?? b.timestamp ?? ""))
      .slice(-10)
      .map((q) => ({
        date: toDateStr(q.created_at ?? q.timestamp ?? new Date().toISOString()),
        type: q.type === "emotional-awareness" ? "Emotional Awareness" : "Self-Compassion",
        score: q.score,
        label: scoreLabel(q.score),
      }))

    // ── Mood timeline — each log plotted as valence + intensity ──
    const moodTimeline: MoodPoint[] = emotionLogs
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((e) => {
        const base = EMOTION_VALENCE[e.emotion] ?? 0
        // Scale valence by intensity: higher intensity amplifies the signal
        const y = Math.round((base * (e.intensity / 5)) * 10) / 10
        return {
          x: new Date(e.timestamp).getTime(),
          y,
          z: e.intensity,
          emotion: e.emotion,
          emoji: e.emoji,
          dateStr: toDateStr(e.timestamp),
          intensity: e.intensity,
        }
      })

    // ── Haven sessions from history (respect date range, show up to 3) ──
    type SessionEntry = { lossId: string; summary: string; date: string; messageCount?: number }
    const sessionHistory = readStorage<SessionEntry[]>(STORAGE_KEYS.sessionHistory) ?? []
    const havenSessions = sessionHistory
      .filter((s) => inRange(s.date))
      .slice(0, 3)
      .map((s) => ({ date: toDateStr(s.date), lossType: s.lossId, summary: s.summary, messageCount: s.messageCount }))

    // ── Average intensity (direct from raw logs, not daily averages) ──
    const avgIntensity = emotionLogs.length
      ? Math.round((emotionLogs.reduce((s, e) => s + e.intensity, 0) / emotionLogs.length) * 10) / 10
      : null

    // ── All-time milestone data ──
    const allQuizAll = readStorage<QuizResult[]>(STORAGE_KEYS.quizResults) ?? []
    const milestones: { date: string; label: string; icon: string }[] = []
    const firstLog     = allEmotionLogs[allEmotionLogs.length - 1]
    const firstJ       = allJournalEntries[allJournalEntries.length - 1]
    const firstBreath  = allBreathing[allBreathing.length - 1]
    const firstQuiz    = allQuizAll[allQuizAll.length - 1]
    if (firstLog)    milestones.push({ date: toDateStr(firstLog.timestamp),                                  label: "First emotion logged",         icon: "💜" })
    if (firstJ)      milestones.push({ date: toDateStr(firstJ.date),                                         label: "First journal entry",          icon: "📖" })
    if (firstBreath) milestones.push({ date: toDateStr(firstBreath.timestamp),                               label: "First breathing session",      icon: "🌬️" })
    if (firstQuiz)   milestones.push({ date: toDateStr(firstQuiz.created_at ?? firstQuiz.timestamp ?? new Date().toISOString()), label: "First self-reflection quiz", icon: "🧠" })
    if (longestStreak >= 3) milestones.push({ date: "Record", label: `${longestStreak}-day streak`,         icon: "🔥" })
    if (allEmotionLogs.length >= 10) milestones.push({ date: toDateStr(allEmotionLogs[allEmotionLogs.length - 10].timestamp), label: "10 emotions logged", icon: "⭐" })
    if (allEmotionLogs.length >= 25) milestones.push({ date: toDateStr(allEmotionLogs[allEmotionLogs.length - 25].timestamp), label: "25 emotions logged", icon: "🌟" })
    milestones.sort((a, b) => (a.date === "Record" ? 1 : b.date === "Record" ? -1 : a.date.localeCompare(b.date)))

    // ── Journal activity ──
    const journalByDay = new Map<string, number>()
    for (const e of journalEntries) {
      const day = e.date.slice(0, 10)
      journalByDay.set(day, (journalByDay.get(day) ?? 0) + 1)
    }
    const journalActivity = Array.from(journalByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ date: toDateStr(day + "T12:00:00"), count }))

    const recentJournalSnippets = journalEntries
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
      .map((e) => ({
        date: toDateStr(e.date),
        prompt: e.prompt ? e.prompt.slice(0, 60) + (e.prompt.length > 60 ? "…" : "") : "Free write",
        excerpt: e.entry.slice(0, 80) + (e.entry.length > 80 ? "…" : ""),
      }))

    // ── Healing score ──
    const surveyComponent = (() => {
      const last5 = [...surveyResponses].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5)
      if (!last5.length) return 0.5  // neutral if no surveys
      const avgs = last5.map((s) => (s.emotionalState + s.selfConnection + s.selfCompassion + s.selfCare) / 4)
      return (avgs.reduce((s, v) => s + v, 0) / avgs.length) / 5
    })()
    const intensityComponent = emotionLogs.length
      ? 1 - (emotionLogs.reduce((s, e) => s + e.intensity, 0) / emotionLogs.length) / 10
      : 0.5
    const daysInPeriod = cutoff ? Math.max(1, Math.round((Date.now() - cutoff.getTime()) / 86400000)) : 30
    const uniqueActiveDaysInRange = new Set([
      ...emotionLogs.map((e) => e.timestamp.slice(0, 10)),
      ...journalEntries.map((e) => e.date.slice(0, 10)),
      ...surveyResponses.map((e) => e.timestamp.slice(0, 10)),
      ...breathingSessions.map((e) => e.timestamp.slice(0, 10)),
    ]).size
    const consistencyComponent = Math.min(1, uniqueActiveDaysInRange / daysInPeriod)
    const quizComponent = (() => {
      const last2 = [...quizResults].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 2)
      if (!last2.length) return 0.5
      return last2.reduce((s, q) => s + q.score, 0) / last2.length / 100
    })()
    const healingScore = Math.round(
      (surveyComponent * 0.40 + intensityComponent * 0.25 + consistencyComponent * 0.25 + quizComponent * 0.10) * 100
    )

    // Delta: compare against prior equivalent period
    const priorCutoff = (() => {
      if (!cutoff) return null
      const prior = new Date(cutoff)
      prior.setDate(prior.getDate() - daysInPeriod)
      return prior
    })()
    let healingScoreDelta = 0
    if (priorCutoff) {
      const priorEmotions   = (readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? []).filter((e) => new Date(e.timestamp) >= priorCutoff && new Date(e.timestamp) < cutoff!)
      const priorSurveys    = (readStorage<SurveyResponse[]>(STORAGE_KEYS.surveyResponses) ?? []).filter((e) => new Date(e.timestamp) >= priorCutoff && new Date(e.timestamp) < cutoff!)
      const priorIntensity  = priorEmotions.length ? 1 - (priorEmotions.reduce((s, e) => s + e.intensity, 0) / priorEmotions.length) / 10 : 0.5
      const priorSurveyComp = priorSurveys.length ? (priorSurveys.map((s) => (s.emotionalState + s.selfConnection + s.selfCompassion + s.selfCare) / 4).reduce((s, v) => s + v, 0) / priorSurveys.length) / 5 : 0.5
      const priorScore = Math.round((priorSurveyComp * 0.40 + priorIntensity * 0.25 + 0.5 * 0.25 + quizComponent * 0.10) * 100)
      healingScoreDelta = healingScore - priorScore
    }

    setData({
      totalEmotionLogs: emotionLogs.length,
      totalJournalEntries: journalEntries.length,
      totalQuizzes: quizResults.length,
      totalBreathingSessions: breathingSessions.length,
      totalSurveys: surveyResponses.length,
      currentStreak,
      longestStreak,
      healingScore,
      healingScoreDelta,
      surveyTrend,
      intensityTrend,
      emotionFrequency,
      breathingImpact,
      quizHistory,
      moodTimeline,
      havenSessions,
      journalActivity,
      recentJournalSnippets,
      weeklyNarrative: null,
      narrativeLoading: false,
      breathingPatternBreakdown,
      avgSurveyDimensions,
      avgIntensity,
      milestones,
    })

    // ── AI Weekly Narrative (cached per ISO week) ──
    const allTimeLogs = readStorage<EmotionEntry[]>(STORAGE_KEYS.emotionLogs) ?? []
    if (allTimeLogs.length >= 3) {
      const currentWeek = getISOWeek()
      const cached = readStorage<{ text: string; week: string }>(STORAGE_KEYS.weeklyNarrative)
      if (cached?.week === currentWeek) {
        setData((prev) => prev ? { ...prev, weeklyNarrative: cached.text } : prev)
        return
      }

      setData((prev) => prev ? { ...prev, narrativeLoading: true } : prev)

      try {
        // Build compact summary for Claude
        const topEmotions = Array.from(emotionMap.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3)
          .map(([e, { count }]) => `${e} ×${count}`)
          .join(", ")
        const avgIntensity = emotionLogs.length
          ? Math.round((emotionLogs.reduce((s, e) => s + e.intensity, 0) / emotionLogs.length) * 10) / 10
          : "N/A"
        const surveyAvgs = avgSurveyDimensions
          ? `emotional state ${avgSurveyDimensions.emotionalState}/5, self-connection ${avgSurveyDimensions.selfConnection}/5, self-compassion ${avgSurveyDimensions.selfCompassion}/5, self-care ${avgSurveyDimensions.selfCare}/5`
          : "no survey data yet"

        const prompt = `You are a compassionate wellness analyst. Write exactly 2-3 warm, personalized sentences summarising this person's healing journey this week based on their data. Be specific, encouraging, and human. Plain prose only — no lists, no markdown.

Data: emotions logged: ${emotionLogs.length} (top: ${topEmotions || "none"}), avg intensity: ${avgIntensity}/10, survey averages: ${surveyAvgs}, breathing sessions: ${breathingSessions.length}, journal entries: ${journalEntries.length}, Haven session: ${lastSession ? lastSession.lossId : "none"}.`

        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 120,
            system: "You write warm, concise 2-3 sentence wellness summaries. Plain prose only.",
            messages: [{ role: "user", content: prompt }],
          }),
        })
        if (res.ok) {
          const json = await res.json()
          const text = json.content?.[0]?.text ?? null
          if (text) {
            writeStorage(STORAGE_KEYS.weeklyNarrative, { text, week: currentWeek })
            setData((prev) => prev ? { ...prev, weeklyNarrative: text, narrativeLoading: false } : prev)
          }
        }
      } catch { /* silently fail */ } finally {
        setData((prev) => prev ? { ...prev, narrativeLoading: false } : prev)
      }
    }
  }, [dateRange])

  useEffect(() => {
    computeData()
  }, [computeData])

  return data
}
