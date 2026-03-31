"use client"

import { useMemo } from "react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts"
import { BarChart3, TrendingUp, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EmotionEntry } from "@/hooks/use-emotion-logs"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface EnhancedEmotionalAnalyticsProps {
  emotionLogs: EmotionEntry[]
  isLoading: boolean
  error: string | null
  className?: string
}

// Assign a distinct color per emotion name
const emotionColors: Record<string, string> = {
  Joy:          "hsl(38 95% 56%)",
  Sadness:      "hsl(215 70% 58%)",
  Anger:        "hsl(0 72% 55%)",
  Fear:         "hsl(270 60% 60%)",
  Surprise:     "hsl(160 55% 48%)",
  Disgust:      "hsl(120 40% 48%)",
  Trust:        "hsl(350 56% 46%)",
  Anticipation: "hsl(32 90% 56%)",
  Calm:         "hsl(190 65% 50%)",
  Anxious:      "hsl(300 50% 55%)",
}
const fallbackColors = [
  "hsl(350 56% 46%)",
  "hsl(215 70% 58%)",
  "hsl(160 55% 48%)",
  "hsl(38 95% 56%)",
  "hsl(270 60% 60%)",
  "hsl(32 90% 56%)",
  "hsl(190 65% 50%)",
  "hsl(300 50% 55%)",
]
function colorFor(emotion: string, index: number) {
  return emotionColors[emotion] ?? fallbackColors[index % fallbackColors.length]
}

const CustomBarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const { emotion, count } = payload[0].payload
  return (
    <div className="glass-card-elevated rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{emotion}</p>
      <p className="text-muted-foreground">{count} {count === 1 ? "entry" : "entries"}</p>
    </div>
  )
}

const CustomAreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card-elevated rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">Intensity: <span className="text-primary font-bold">{payload[0].value}</span></p>
    </div>
  )
}

export function EnhancedEmotionalAnalytics({
  emotionLogs,
  isLoading,
  error,
  className,
}: EnhancedEmotionalAnalyticsProps) {
  const frequencyData = useMemo(() => {
    const freq: Record<string, number> = {}
    for (const entry of emotionLogs) {
      freq[entry.emotion] = (freq[entry.emotion] ?? 0) + 1
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([emotion, count]) => ({ emotion, count }))
  }, [emotionLogs])

  const intensityTrend = useMemo(() => {
    return [...emotionLogs]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-14)
      .map((e) => ({
        label: new Date(e.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        intensity: e.intensity,
        emotion: e.emotion,
      }))
  }, [emotionLogs])

  const radarData = useMemo(() => {
    if (emotionLogs.length === 0) return []
    const freq: Record<string, number> = {}
    for (const entry of emotionLogs) {
      freq[entry.emotion] = (freq[entry.emotion] ?? 0) + 1
    }
    return Object.entries(freq).slice(0, 7).map(([emotion, count]) => ({
      emotion,
      count,
      fullMark: emotionLogs.length,
    }))
  }, [emotionLogs])

  const avgIntensity = useMemo(() => {
    if (!emotionLogs.length) return 0
    return (emotionLogs.reduce((sum, e) => sum + e.intensity, 0) / emotionLogs.length).toFixed(1)
  }, [emotionLogs])

  const topEmotion = useMemo(() => {
    if (!frequencyData.length) return "—"
    return frequencyData[0].emotion
  }, [frequencyData])

  if (isLoading) {
    return (
      <div className={cn("glass-card rounded-2xl p-6 flex items-center justify-center h-52", className)}>
        <LoadingSpinner size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("glass-card rounded-2xl p-6", className)}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-5", className)}>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Logs", value: emotionLogs.length, icon: "📝", color: "from-primary/10 to-primary/5" },
          { label: "Avg Intensity", value: avgIntensity, icon: "📊", color: "from-sky-500/10 to-sky-500/5" },
          { label: "Top Emotion", value: topEmotion, icon: "💫", color: "from-amber-500/10 to-amber-500/5" },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className={`glass-card rounded-2xl p-4 bg-gradient-to-br ${color} flex flex-col items-center text-center gap-1`}
          >
            <span className="text-lg">{icon}</span>
            <span className="text-xl font-bold text-foreground">{value}</span>
            <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
          </div>
        ))}
      </div>

      {emotionLogs.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground text-sm">
          No emotion data yet. Start logging to see your analytics.
        </div>
      ) : (
        <>
          {/* ── Intensity over time ── */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Intensity Over Time</p>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={intensityTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(350 56% 46%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(350 56% 46%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 10]}
                  ticks={[0, 5, 10]}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="intensity"
                  stroke="hsl(350 56% 46%)"
                  strokeWidth={2.5}
                  fill="url(#intensityGrad)"
                  dot={{ r: 3, fill: "hsl(350 56% 46%)", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "hsl(350 56% 46%)", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Frequency list ── */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Emotion Frequency</p>
            </div>
            <div className="space-y-3">
              {frequencyData.map((entry, index) => {
                const pct = Math.round((entry.count / frequencyData[0].count) * 100)
                const color = colorFor(entry.emotion, index)
                return (
                  <div key={entry.emotion}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: color }}
                        />
                        <span className="text-sm font-medium text-foreground">{entry.emotion}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {entry.count} {entry.count === 1 ? "log" : "logs"}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Radar chart (if enough variety) ── */}
          {radarData.length >= 3 && (
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Emotional Profile</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="emotion"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Radar
                    name="Frequency"
                    dataKey="count"
                    stroke="hsl(350 56% 46%)"
                    fill="hsl(350 56% 46%)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
