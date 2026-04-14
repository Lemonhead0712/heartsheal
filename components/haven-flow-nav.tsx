"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronRight, Home, Sparkles } from "lucide-react"
import {
  readHavenFlow,
  advanceHavenFlow,
  clearHavenFlow,
  TOOL_HREFS,
  TOOL_LABELS,
  type FlowTool,
  type HavenFlowState,
} from "@/lib/haven-flow"

interface HavenFlowNavProps {
  currentTool: FlowTool
  /** Hide the Continue button — used when the page auto-advances on natural completion */
  showContinue?: boolean
  /** Called before navigation so the page can clean up (stop audio, etc.) */
  onAdvance?: (navigateFn: () => void) => void
  className?: string
}

export function HavenFlowNav({
  currentTool,
  showContinue = true,
  onAdvance,
  className = "",
}: HavenFlowNavProps) {
  const router = useRouter()
  // Always start null on server to avoid hydration mismatch
  const [flow, setFlow] = useState<HavenFlowState | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setFlow(readHavenFlow())
    setMounted(true)
  }, [])

  if (!mounted || !flow || flow.sequence[flow.currentIndex] !== currentTool) return null

  const total      = flow.sequence.length
  const stepNumber = flow.currentIndex + 1
  const isLast     = flow.currentIndex === total - 1
  const nextLabel  = isLast ? "Insights" : TOOL_LABELS[flow.sequence[flow.currentIndex + 1]]
  const nextHref   = isLast ? "/insights?flow=done" : TOOL_HREFS[flow.sequence[flow.currentIndex + 1]]

  const doNavigate = () => {
    advanceHavenFlow()
    router.push(nextHref)
  }

  const handleContinue = () => {
    if (onAdvance) onAdvance(doNavigate)
    else doNavigate()
  }

  const handleSkip = () => {
    clearHavenFlow()
    router.push("/")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed bottom-0 inset-x-0 z-40 ${className}`}
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md border-t border-border/40" />

      <div className="relative w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">

        {/* Left: step + next */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary/70" />
            <span className="text-xs font-semibold text-primary tabular-nums">
              Step {stepNumber} of {total}
            </span>
          </div>
          <span className="text-muted-foreground/40 text-xs hidden sm:block">·</span>
          <span className="text-xs text-muted-foreground truncate hidden sm:block">
            Next: <span className="font-medium text-foreground">{nextLabel}</span>
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            onClick={() => clearHavenFlow()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted/40 flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <button
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl border border-border/50 hover:bg-muted/40"
          >
            Skip
          </button>

          {showContinue && (
            <button
              onClick={handleContinue}
              className="flex items-center gap-1 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-xl transition-colors"
            >
              Continue <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
