"use client"

import type React from "react"

import { useState, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Save, AlertCircle, RefreshCw, Clock, Calendar } from "lucide-react"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { Logo } from "@/components/logo"
import { EmojiPicker } from "@/components/emoji-picker"

import { useEmotionLogs } from "@/hooks/use-emotion-logs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmotionalSurvey } from "@/components/emotional-survey"
import { EnhancedEmotionalAnalytics } from "@/components/enhanced-emotional-analytics"
import { formatRelativeTime } from "@/utils/date-utils"
import { useRealTimeUpdate } from "@/hooks/use-real-time-update"
import { DailyEmotionFolder } from "@/components/daily-emotion-folder"

export default function EmotionalLogPage() {
  return <EmotionalLog />
}

function EmotionalLog() {
  const { entries, isLoading, error, addEntry, deleteEntry } = useEmotionLogs()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Update the component every minute to keep relative times current
  const currentTime = useRealTimeUpdate(60000)

  // Ensure we have a valid entries array
  const emotionLogs = entries || []

  const [currentEmotion, setCurrentEmotion] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState("😊")
  const [intensity, setIntensity] = useState(5)
  const [notes, setNotes] = useState("")
  const [showSurvey, setShowSurvey] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const emotions = [
    "Joy", "Sadness", "Anger", "Fear", "Anxious", "Calm",
    "Grief", "Hopeful", "Frustrated", "Numb", "Overwhelmed", "Grateful",
  ]

  const [showNudge, setShowNudge] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Group entries by date
  const groupedEntries = emotionLogs.reduce((groups: Record<string, any[]>, entry) => {
    // Get the date part only (without time)
    const date = new Date(entry.timestamp).toISOString().split("T")[0]

    if (!groups[date]) {
      groups[date] = []
    }

    groups[date].push(entry)
    return groups
  }, {})

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // Handle manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    // In a real implementation, this would trigger a data refresh
    // For now, we'll just update the last updated time
    setTimeout(() => {
      setLastUpdated(new Date())
      setIsRefreshing(false)
    }, 500)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const success = addEntry({
      emotion: currentEmotion,
      emoji: selectedEmoji,
      intensity: intensity,
      notes: notes,
    })

    if (success) {
      setCurrentEmotion("")
      setSelectedEmoji("😊")
      setIntensity(5)
      setNotes("")
      setShowSurvey(true)
      setShowNudge(false)
      setLastUpdated(new Date())
    }
  }

  const handleDelete = (id: string) => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    setPendingDeleteId(id)
    deleteTimerRef.current = setTimeout(() => setPendingDeleteId(null), 3000)
  }

  const confirmDelete = () => {
    if (pendingDeleteId) {
      deleteEntry(pendingDeleteId)
      setPendingDeleteId(null)
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
      setLastUpdated(new Date())
    }
  }

  // Animation variants
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
  }

  return (
    <div className="bg-page-gradient">
      <motion.div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-5" variants={container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="flex flex-col items-center mb-3" variants={item}>
          <Logo size="medium" />
        </motion.div>
        <motion.div className="mb-5" variants={item}>
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-foreground mt-3 mb-2">How are you feeling?</h1>
          <p className="text-muted-foreground">There's no right answer — just what's true for you right now.</p>
        </motion.div>

        {error && (
          <motion.div className="mb-4" variants={item}>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Two-column grid */}
        <motion.div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start" variants={item}>

          {/* ── Main column: logging form + journey ── */}
          <div className="space-y-5 min-w-0">

            <Card className="border-border/40 bg-card shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-primary">How are you feeling?</CardTitle>
                  <CardDescription className="text-muted-foreground">Log your current emotional state</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading || isRefreshing} className="h-8 w-8" title="Refresh data">
                  <RefreshCw className={`h-4 w-4 text-primary/70 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span className="sr-only">Refresh</span>
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="emotion" className="text-primary">Emotion</Label>
                    <div className="flex flex-wrap gap-2">
                      {emotions.map((emotion) => (
                        <Button key={emotion} type="button" variant={currentEmotion === emotion ? "default" : "outline"}
                          className={`rounded-full ${currentEmotion === emotion ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "border-border/50 text-muted-foreground hover:bg-primary/8"}`}
                          onClick={() => setCurrentEmotion(emotion)}>{emotion}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emoji" className="text-primary">Choose an emoji that represents how you feel</Label>
                    <div className="mt-2"><EmojiPicker selectedEmoji={selectedEmoji} onEmojiSelect={setSelectedEmoji} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="intensity" className="text-primary">Intensity: {intensity}</Label>
                    <input id="intensity" type="range" min="1" max="10" value={intensity}
                      onChange={(e) => setIntensity(Number.parseInt(e.target.value))} className="w-full accent-primary" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Mild</span><span>Moderate</span><span>Intense</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-primary">Notes</Label>
                    <Textarea id="notes" placeholder="What triggered this emotion? How does it feel in your body?"
                      className="min-h-[100px] border-border/40 focus-visible:ring-primary/30" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!currentEmotion.trim()}>
                    <Save className="mr-2 h-4 w-4" /> Save Entry
                  </Button>
                </form>
              </CardContent>
            </Card>

            {showSurvey && emotionLogs && emotionLogs.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <EmotionalSurvey onComplete={() => { setShowSurvey(false); setShowNudge(true) }} />
              </motion.div>
            )}

            <AnimatePresence>
              {showNudge && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="glass-card rounded-2xl p-5 border border-emerald-200/40 bg-gradient-to-br from-emerald-50/60 to-card dark:from-emerald-900/15 relative">
                    <button
                      onClick={() => setShowNudge(false)}
                      className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="Dismiss"
                    >
                      ×
                    </button>
                    <p className="font-serif text-base text-foreground mb-1">You showed up for yourself today.</p>
                    <p className="text-sm text-muted-foreground mb-4">That matters. What would feel good next?</p>
                    <div className="flex flex-wrap gap-2">
                      <Link href="/breathe" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-sm font-medium hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors">
                        🌬️ Breathe for a moment
                      </Link>
                      <Link href="/thoughts" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                        📖 Write in your journal
                      </Link>
                      <Link href="/companion" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors">
                        💜 Talk to Haven
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-primary mr-2" />
                  <h2 className="text-2xl font-semibold text-foreground">Your Emotional Journey</h2>
                </div>
                <span className="text-xs text-primary/70">Last updated: {formatRelativeTime(lastUpdated)}</span>
              </div>
              {isLoading ? (
                <div className="flex justify-center items-center py-8"><LoadingSpinner size="md" /></div>
              ) : (
                <AnimatePresence>
                  {emotionLogs && emotionLogs.length === 0 ? (
                    <Card className="border-border/40 bg-card p-8 text-center text-muted-foreground">
                      No entries yet. Start tracking your emotions above.
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {sortedDates.map((date) => (
                        <DailyEmotionFolder key={date} date={date} entries={groupedEntries[date]} onDeleteEntry={handleDelete} />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              )}
            </div>

          </div>

          {/* ── Sidebar: date chip + analytics ── */}
          <aside className="lg:sticky lg:top-[76px] lg:self-start space-y-4 min-w-0">

            {/* Date chip */}
            <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary/70" />
              <span className="text-sm font-medium text-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>

            {/* Emotional analytics */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">Analytics</h2>
              <EnhancedEmotionalAnalytics emotionLogs={emotionLogs} isLoading={isLoading} error={error} />
            </div>

          </aside>

        </motion.div>
      </motion.div>

      {/* Inline delete confirmation */}
      <AnimatePresence>
        {pendingDeleteId && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border/60 rounded-2xl shadow-lg px-5 py-3 flex items-center gap-4 whitespace-nowrap"
          >
            <span className="text-sm text-foreground">Delete this entry?</span>
            <button onClick={confirmDelete} className="text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors">
              Yes, delete
            </button>
            <button onClick={() => setPendingDeleteId(null)} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
