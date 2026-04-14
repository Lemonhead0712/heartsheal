"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ScanSearch } from "lucide-react"
import { HavenMark } from "@/components/logo-mark"
import { HavenFlowNav } from "@/components/haven-flow-nav"
import { ScreenshotAnalysis } from "@/components/screenshot-analysis"
import { readStorage, STORAGE_KEYS } from "@/lib/storage"
import { readHavenFlow } from "@/lib/haven-flow"

export default function FlowAnalyzePage() {
  const router = useRouter()

  // Flow gate
  const [mounted, setMounted] = useState(false)
  const [ctx, setCtx] = useState<{ emotion?: string; name?: string }>({})

  useEffect(() => {
    setMounted(true)
    const flow = readHavenFlow()
    if (!flow || flow.sequence[flow.currentIndex] !== "analyze") {
      router.replace("/")
      return
    }
    const name = readStorage<string>(STORAGE_KEYS.userName) ?? undefined
    const logs = readStorage<any[]>(STORAGE_KEYS.emotionLogs) ?? []
    setCtx({ name, emotion: logs[0]?.emotion })
  }, [router])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">

      {/* Header */}
      <div className="w-full max-w-5xl mx-auto px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HavenMark className="w-5 h-5" />
          <span className="font-serif font-semibold text-foreground tracking-tight text-sm">Haven</span>
          {ctx.emotion && (
            <span className="text-xs text-muted-foreground/70">· {ctx.emotion.toLowerCase()}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground/60 text-xs">
          <ScanSearch className="w-3.5 h-3.5" />
          <span className="font-serif">Analyze</span>
        </div>
      </div>

      {/* Context banner */}
      {ctx.emotion && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-5xl mx-auto px-5 mb-3"
        >
          <div className="bg-primary/6 border border-primary/15 rounded-xl px-4 py-3">
            <p className="text-xs text-foreground/70 leading-relaxed">
              <span className="font-semibold text-primary">Haven · </span>
              You&apos;ve been feeling {ctx.emotion.toLowerCase()} today. Upload any conversation screenshot below — Haven will reflect on the patterns it sees with care.
            </p>
          </div>
        </motion.div>
      )}

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8">
        <ScreenshotAnalysis />
      </div>

      {/* Flow nav — user taps Continue when ready */}
      <HavenFlowNav currentTool="analyze" showContinue />
    </div>
  )
}
