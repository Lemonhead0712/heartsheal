"use client"

import { cn } from "@/lib/utils"

interface EmotionalAwarenessMeterProps {
  score: number
  maxScore: number
  className?: string
}

const getLabel = (pct: number) => {
  if (pct < 25) return { label: "Developing", color: "text-chart-4" }
  if (pct < 50) return { label: "Growing", color: "text-chart-2" }
  if (pct < 75) return { label: "Aware", color: "text-chart-3" }
  return { label: "Highly Aware", color: "text-primary" }
}

export function EmotionalAwarenessMeter({
  score,
  maxScore,
  className,
}: EmotionalAwarenessMeterProps) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100))
  const { label, color } = getLabel(pct)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Emotional Awareness</span>
        <span className={cn("text-sm font-semibold", color)}>{label}</span>
      </div>

      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span className="font-medium text-foreground">
          {score}/{maxScore}
        </span>
        <span>{maxScore}</span>
      </div>
    </div>
  )
}
