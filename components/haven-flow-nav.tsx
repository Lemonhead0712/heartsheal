"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Home, Sparkles } from "lucide-react"
import {
  readHavenFlow,
  advanceHavenFlow,
  clearHavenFlow,
  TOOL_HREFS,
  TOOL_LABELS,
  type FlowTool,
} from "@/lib/haven-flow"

interface HavenFlowNavProps {
  /** Which tool this page represents — used to verify the flow is on this step. */
  currentTool: FlowTool
  /**
   * If provided, the parent calls this prop with a `navigate` function.
   * When the user taps "Continue", the component calls the injected navigate fn
   * so parents can do teardown (stop audio, etc.) before routing.
   */
  onAdvance?: (navigateFn: () => void) => void
  /** Extra Tailwind classes on the outer wrapper. */
  className?: string
}

export function HavenFlowNav({ currentTool, onAdvance, className = "" }: HavenFlowNavProps) {
  const router = useRouter()
  const [flow, setFlow] = useState(readHavenFlow)

  // Re-sync if localStorage changes from another tab or on mount after SSR
  useEffect(() => {
    setFlow(readHavenFlow())
  }, [])

  // Only render when a flow is active for the current page
  if (!flow || flow.sequence[flow.currentIndex] !== currentTool) return null

  const total       = flow.sequence.length
  const stepNumber  = flow.currentIndex + 1
  const isLastTool  = flow.currentIndex === total - 1
  const nextTool    = isLastTool ? null : flow.sequence[flow.currentIndex + 1]
  const nextLabel   = isLastTool ? "Insights" : TOOL_LABELS[nextTool!]
  const nextHref    = isLastTool ? "/insights?flow=done" : TOOL_HREFS[nextTool!]

  const handleAdvance = () => {
    const navigate = () => {
      advanceHavenFlow()
      router.push(nextHref)
    }
    if (onAdvance) {
      onAdvance(navigate)
    } else {
      navigate()
    }
  }

  const handleSkip = () => {
    clearHavenFlow()
    router.push("/")
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed bottom-0 inset-x-0 z-40 ${className}`}
      >
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md border-t border-border/40" />

        <div className="relative w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">

          {/* Left: step indicator + next label */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-primary/70" />
              <span className="text-xs font-semibold text-primary tabular-nums">
                Step {stepNumber} of {total}
              </span>
            </div>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <span className="text-xs text-muted-foreground truncate">
              Next:{" "}
              <span className="font-medium text-foreground">{nextLabel}</span>
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Back to Haven (skip flow entirely) */}
            <Link
              href="/"
              onClick={() => clearHavenFlow()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted/40"
            >
              <Home className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Haven
            </Link>

            {/* Skip step → dashboard */}
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl border border-border/50 hover:bg-muted/40"
            >
              Skip
            </button>

            {/* Continue to next tool */}
            <button
              onClick={handleAdvance}
              className="flex items-center gap-1 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-xl transition-colors"
            >
              Continue
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
