"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronLeft } from "lucide-react"
import { ScreenshotAnalysis } from "@/components/screenshot-analysis"
import { HavenMark } from "@/components/logo-mark"
import { HavenFlowNav } from "@/components/haven-flow-nav"

export default function AnalyzePage() {
  return (
    <div className="bg-background min-h-screen">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-5xl mx-auto px-4 md:px-8 py-3 md:py-5"
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ChevronLeft className="h-4 w-4" />
            <HavenMark className="w-5 h-5" />
            <span className="font-serif font-semibold text-foreground tracking-tight">Back to Haven</span>
          </Link>
          <div className="text-right">
            <h1 className="font-serif text-lg md:text-xl font-semibold text-foreground">Screenshot Analysis</h1>
            <p className="text-xs text-muted-foreground">Private reflection for your conversations</p>
          </div>
        </div>

        <ScreenshotAnalysis />
      </motion.div>

      <HavenFlowNav currentTool="analyze" />
    </div>
  )
}
