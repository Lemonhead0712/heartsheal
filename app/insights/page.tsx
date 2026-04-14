"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { InsightsDashboard } from "@/components/insights-dashboard"
import { clearHavenFlow } from "@/lib/haven-flow"

function FlowCompleteBanner() {
  const searchParams = useSearchParams()
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (searchParams.get("flow") === "done") {
      clearHavenFlow()
      setShowBanner(true)
      const t = setTimeout(() => setShowBanner(false), 4500)
      return () => clearTimeout(t)
    }
  }, [searchParams])

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          key="flow-complete-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-0 inset-x-0 z-50 flex justify-center pt-3 px-4 pointer-events-none"
        >
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 text-sm font-semibold">
            <span className="text-base">🌿</span>
            You&apos;ve completed your Haven session — beautifully done.
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function InsightsPage() {
  return (
    <>
      <Suspense fallback={null}>
        <FlowCompleteBanner />
      </Suspense>
      <InsightsDashboard />
    </>
  )
}
