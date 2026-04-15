"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import Link from "next/link"
import { AlertCircle, RefreshCw, BookHeart, Trash2, X } from "lucide-react"
import { motion, AnimatePresence, type Variants } from "framer-motion"

import { useEmotionLogs } from "@/hooks/use-emotion-logs"
import { useJournalEntries, type JournalEntry } from "@/hooks/use-journal-entries"
import { HavenMark } from "@/components/logo-mark"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useRealTimeUpdate } from "@/hooks/use-real-time-update"
import { DailyEmotionFolder } from "@/components/daily-emotion-folder"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export default function EmotionalLogPage() {
  return <EmotionalLog />
}

function EmotionalLog() {
  const { entries, isLoading, error, deleteEntry } = useEmotionLogs()
  const { entries: journalEntries, isLoading: journalLoading, deleteEntry: deleteJournal } = useJournalEntries()
  const [activeTab, setActiveTab] = useState<"emotions" | "journal">("emotions")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null)
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

  const sortedJournalEntries = useMemo(() =>
    [...journalEntries].sort((a, b) => b.date.localeCompare(a.date)),
    [journalEntries]
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
    <div className="bg-background min-h-screen">
      <motion.div className="w-full max-w-3xl mx-auto px-4 md:px-8 py-4 md:py-6" variants={container} initial="hidden" animate="show">

        {/* Header */}
        <motion.div className="flex items-center justify-between mb-6" variants={item}>
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <HavenMark className="w-6 h-6" />
            <span className="font-serif text-[15px] font-semibold text-foreground tracking-tight">Haven</span>
          </Link>

          <h1 className="font-serif text-lg font-semibold text-foreground">History</h1>

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

        {/* Tab switcher */}
        <motion.div className="flex gap-1 p-1 rounded-2xl bg-muted/50 border border-border/40 mb-5" variants={item}>
          {(["emotions", "journal"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "emotions" ? "Emotions" : "Journal"}
            </button>
          ))}
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

        {/* Emotions tab */}
        {activeTab === "emotions" && (
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
        )}

        {/* Journal tab */}
        {activeTab === "journal" && (
          <motion.div variants={item}>
            {journalLoading ? (
              <div className="flex justify-center items-center py-16">
                <LoadingSpinner size="md" />
              </div>
            ) : sortedJournalEntries.length === 0 ? (
              <div className="border border-border/40 bg-card rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
                <BookHeart className="w-10 h-10 text-muted-foreground/40" />
                <div>
                  <p className="text-base font-semibold text-foreground mb-1">No journal entries yet</p>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                    Write your first reflection in Thoughts and it will appear here.
                  </p>
                </div>
                <Link
                  href="/thoughts"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Open Thoughts
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedJournalEntries.map((entry) => (
                  <div key={entry.id} className="border border-border/40 bg-card rounded-2xl overflow-hidden">
                    {pendingDeleteId === entry.id ? (
                      <div className="flex items-center justify-between px-4 py-3 bg-destructive/5 border-l-2 border-destructive/40">
                        <span className="text-sm text-foreground">Delete this entry?</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { deleteJournal(entry.id); setPendingDeleteId(null) }}
                            className="text-sm font-semibold text-destructive hover:text-destructive/80 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setPendingDeleteId(null)}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground mb-1">{formatDate(entry.date)}</p>
                            {entry.prompt && (
                              <p className="text-sm font-medium text-foreground/80 font-serif italic truncate mb-1">{entry.prompt}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setViewEntry(entry)}
                              className="text-xs text-primary hover:underline px-2 py-1"
                            >
                              Read
                            </button>
                            <button
                              onClick={() => setPendingDeleteId(entry.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{entry.entry}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

      </motion.div>

      {/* Journal view modal */}
      <AnimatePresence>
        {viewEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewEntry(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border/40 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{formatDate(viewEntry.date)}</p>
                  {viewEntry.prompt && (
                    <p className="text-base font-semibold text-foreground font-serif italic">{viewEntry.prompt}</p>
                  )}
                </div>
                <button
                  onClick={() => setViewEntry(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{viewEntry.entry}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
