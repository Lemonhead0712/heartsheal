"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { ChevronLeft, AlertCircle, RefreshCw, Calendar, TrendingUp } from "lucide-react"
import { motion, AnimatePresence, type Variants } from "framer-motion"

import { useEmotionLogs } from "@/hooks/use-emotion-logs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { formatRelativeTime } from "@/utils/date-utils"
import { useRealTimeUpdate } from "@/hooks/use-real-time-update"
import { DailyEmotionFolder } from "@/components/daily-emotion-folder"

export default function EmotionalLogPage() {
  return <EmotionalLog />
}

function EmotionalLog() {
  const { entries, isLoading, error, deleteEntry } = useEmotionLogs()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Update the component every minute to keep relative times current
  const currentTime = useRealTimeUpdate(60000)

  const emotionLogs = entries || []

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Group entries by date
  const groupedEntries = emotionLogs.reduce((groups: Record<string, any[]>, entry) => {
    const date = new Date(entry.timestamp).toISOString().split("T")[0]
    if (!groups[date]) groups[date] = []
    groups[date].push(entry)
    return groups
  }, {})

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setLastUpdated(new Date())
      setIsRefreshing(false)
    }, 500)
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

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  }

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  }

  return (
    <div className="bg-gradient-to-b from-rose-50/50 via-background to-background dark:from-rose-950/15 min-h-screen">
      <motion.div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-3 md:py-5" variants={container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="flex items-center justify-between mb-3" variants={item}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-primary">♥</span>
            <span className="font-serif font-semibold text-foreground tracking-tight">HeartsHeal</span>
          </Link>
          <h1 className="font-serif text-lg font-semibold text-foreground">Emotion History</h1>
          <div className="flex items-center gap-2">
            <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
              💜 Talk to Haven
            </Link>
            <Link href="/insights" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 text-muted-foreground text-xs font-medium hover:bg-muted hover:text-foreground transition-colors">
              <TrendingUp className="h-3 w-3" /> Insights
            </Link>
            <button onClick={handleRefresh} disabled={isLoading || isRefreshing} className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" title="Refresh data">
              <RefreshCw className={`h-4 w-4 text-primary/70 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="sr-only">Refresh</span>
            </button>
          </div>
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

        {/* Archive */}
        <motion.div className="space-y-5" variants={item}>
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
                {emotionLogs.length === 0 ? (
                  <div className="border border-border/40 bg-card rounded-xl p-8 text-center text-muted-foreground">
                    No entries yet —{" "}
                    <Link href="/" className="text-primary hover:underline font-medium">log your first emotion in Haven</Link>.
                  </div>
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
