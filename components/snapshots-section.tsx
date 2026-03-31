"use client"

import { useMemo } from "react"
import { BarChart3, Heart, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEmotionLogs } from "@/hooks/use-emotion-logs"

interface SnapshotsSectionProps {
  className?: string
}

export function SnapshotsSection({ className }: SnapshotsSectionProps) {
  const { entries, isLoading } = useEmotionLogs()

  const snapshot = useMemo(() => {
    if (!entries.length) return null

    const mostRecent = entries[0]

    const freq: Record<string, number> = {}
    for (const e of entries) {
      freq[e.emotion] = (freq[e.emotion] ?? 0) + 1
    }
    const mostCommon = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]

    return { mostRecent, mostCommon: mostCommon?.[0] ?? mostRecent.emotion }
  }, [entries])

  if (isLoading) {
    return (
      <div className={cn("glass-card rounded-2xl p-5 animate-pulse", className)}>
        <div className="h-4 bg-muted rounded w-40 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("glass-card rounded-2xl p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Your Emotional Snapshot</h3>
      </div>

      {!snapshot ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No entries yet. Start logging your emotions to see your snapshot.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <TrendingUp className="w-4 h-4 text-primary mb-1" />
            <span className="text-xl font-bold text-foreground">{entries.length}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Total Entries</span>
          </div>
          <div className="stat-card">
            <span className="text-2xl mb-1">{snapshot.mostRecent.emoji}</span>
            <span className="text-xs font-medium text-foreground truncate w-full text-center">
              {snapshot.mostRecent.emotion}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">Most Recent</span>
          </div>
          <div className="stat-card">
            <Heart className="w-4 h-4 text-primary mb-1" />
            <span className="text-xs font-medium text-foreground truncate w-full text-center">
              {snapshot.mostCommon}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">Most Common</span>
          </div>
        </div>
      )}
    </div>
  )
}
