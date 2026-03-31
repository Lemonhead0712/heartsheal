"use client"

import { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEmotionLogs } from "@/hooks/use-emotion-logs"

interface EmotionTrendsWidgetProps {
  className?: string
}

export function EmotionTrendsWidget({ className }: EmotionTrendsWidgetProps) {
  const { entries, isLoading } = useEmotionLogs()

  const chartData = useMemo(() => {
    return entries
      .slice(0, 14)
      .reverse()
      .map((entry) => ({
        time: new Date(entry.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        intensity: entry.intensity,
        emotion: entry.emotion,
      }))
  }, [entries])

  if (isLoading) {
    return (
      <div className={cn("glass-card rounded-2xl p-5 h-52 animate-pulse", className)}>
        <div className="h-4 bg-muted rounded w-32 mb-4" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className={cn("glass-card rounded-2xl p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Emotion Trends</h3>
      </div>

      {chartData.length < 2 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Log at least 2 emotions to see your trend chart.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(350 56% 46%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(350 56% 46%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [value, "Intensity"]}
            />
            <Area
              type="monotone"
              dataKey="intensity"
              stroke="hsl(350 56% 46%)"
              strokeWidth={2}
              fill="url(#intensityGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
