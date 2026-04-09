"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import type { EmotionEntry } from "@/hooks/use-emotion-logs"
import { formatRelativeTime } from "@/utils/date-utils"

interface DailyEmotionFolderProps {
  date: string
  entries: EmotionEntry[]
  onDeleteEntry: (id: string) => void
  className?: string
}

export function DailyEmotionFolder({
  date,
  entries,
  onDeleteEntry,
  className,
}: DailyEmotionFolderProps) {
  const [open, setOpen] = useState(true)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const requestDelete = (id: string) => setPendingId(id)
  const confirmDelete = () => {
    if (pendingId) {
      onDeleteEntry(pendingId)
      setPendingId(null)
    }
  }
  const cancelDelete = () => setPendingId(null)

  return (
    <div className={cn("rounded-2xl border border-border/60 overflow-hidden", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-raised transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">{date}</span>
          <span className="pill-badge bg-primary/10 text-primary text-[10px] px-2 py-0.5">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border/40">
              {entries.map((entry) => (
                <div key={entry.id}>
                  <AnimatePresence mode="wait" initial={false}>
                    {pendingId === entry.id ? (
                      /* ── Inline delete confirmation ── */
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-between px-4 py-3 bg-destructive/5 border-l-2 border-destructive/40"
                      >
                        <span className="text-sm text-foreground">Delete this entry?</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={confirmDelete}
                            className="text-sm font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={cancelDelete}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      /* ── Normal entry row ── */
                      <motion.div
                        key="entry"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-start gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
                      >
                        <span className="text-xl flex-shrink-0 mt-0.5">{entry.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{entry.emotion}</span>
                            <span className="text-xs text-muted-foreground">
                              {entry.intensity}/10
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {entry.notes}
                            </p>
                          )}
                          <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                            {formatRelativeTime(new Date(entry.timestamp))}
                          </span>
                        </div>
                        <button
                          onClick={() => requestDelete(entry.id)}
                          aria-label="Delete entry"
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
