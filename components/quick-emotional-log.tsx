"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEmotionLogs } from "@/hooks/use-emotion-logs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface QuickEmotionalLogProps {
  className?: string
}

export function QuickEmotionalLog({ className }: QuickEmotionalLogProps) {
  const { addEntry } = useEmotionLogs()
  const [emotion, setEmotion] = useState("")
  const [intensity, setIntensity] = useState(5)
  const [success, setSuccess] = useState(false)

  const handleSave = () => {
    if (!emotion.trim()) return
    const ok = addEntry({ emotion: emotion.trim(), emoji: "💙", intensity, notes: "" })
    if (ok) {
      setSuccess(true)
      setEmotion("")
      setIntensity(5)
      setTimeout(() => setSuccess(false), 2500)
    }
  }

  return (
    <div className={cn("glass-card rounded-2xl p-5", className)}>
      <h3 className="font-semibold text-sm text-foreground mb-4">Quick Emotion Log</h3>

      {success ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center animate-fade-in-up">
          <CheckCircle2 className="w-8 h-8 text-primary" />
          <p className="text-sm font-medium text-foreground">Emotion logged!</p>
          <p className="text-xs text-muted-foreground">Keep tracking your journey.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="quick-emotion">How are you feeling?</Label>
            <Input
              id="quick-emotion"
              placeholder="e.g. anxious, hopeful, calm…"
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="quick-intensity">Intensity</Label>
              <span className="text-sm font-semibold text-primary">{intensity}/10</span>
            </div>
            <input
              id="quick-intensity"
              type="range"
              min={1}
              max={10}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              style={{ "--range-progress": intensity * 10 } as React.CSSProperties}
              className="w-full"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={!emotion.trim()}
            className="w-full"
          >
            Save Entry
          </Button>
        </div>
      )}
    </div>
  )
}
