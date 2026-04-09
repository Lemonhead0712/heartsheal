"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, AlertCircle, RefreshCw } from "lucide-react"
import { motion, AnimatePresence, type Variants } from "framer-motion"

import { useEmotionLogs } from "@/hooks/use-emotion-logs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useRealTimeUpdate } from "@/hooks/use-real-time-update"
import { DailyEmotionFolder } from "@/components/daily-emotion-folder"

export default function EmotionalLogPage() {
  return <EmotionalLog />
}

function EmotionalLog() {
  const { entries, isLoading, error, deleteEntry } = useEmotionLogs()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Triggers re-renders every 60s so formatRelativeTime stays current
  useRealTimeUpdate(60000)

  const emotionLogs = entries || []

  const groupedEntries = useMemo(() =>
    emotionLogs.reduce((groups: Record<string, any[]>, entry) => {
      const date = new Date(entry.timestamp).toISOString().split("T")[0]
      if (!groups[date]) groups[date] = []
      groups[date].push(entry)
      return groups
    }, {}),
    [emotionLogs]
  )

  const sortedDates = useMemo(() =>
    Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
    [groupedEntries]
  )

  useEffect(() => {
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current) }
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshTimerRef.current = setTimeout(() => setIsRefreshing(false), 500)
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
    <div className="bg-gradient-to-b from-[#13101b] via-background to-background min-h-screen">
      <motion.div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-4 md:py-6" variants={container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="flex items-center justify-between mb-6" variants={item}>
          <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-primary">♥</span>
            <span className="font-serif font-semibold text-foreground tracking-tight">HeartsHeal</span>
          </Link>

          <h1 className="font-serif text-lg font-semibold text-foreground">Emotion History</h1>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              💜 Haven
            </Link>
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Refresh"
            >
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

        {/* Entry list */}
        <motion.div variants={item}>
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <AnimatePresence>
              {emotionLogs.length === 0 ? (
                <div className="border border-border/40 bg-card rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
                  <span className="text-5xl select-none">💜</span>
                  <div>
                    <p className="text-base font-semibold text-foreground mb-1">Your journey starts here</p>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                      Haven is ready when you are. Log your first emotion and it will appear here.
                    </p>
                  </div>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Open Haven
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedDates.map((date) => (
                    <DailyEmotionFolder
                      key={date}
                      date={date}
                      entries={groupedEntries[date]}
                      onDeleteEntry={deleteEntry}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          )}
        </motion.div>

      </motion.div>
    </div>
  )
}
