"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, X } from "lucide-react"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "heartsheal_welcome_dismissed"

interface WelcomeBannerProps {
  className?: string
}

export function WelcomeBanner({ className }: WelcomeBannerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true")
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "relative flex items-center gap-3 rounded-2xl px-4 py-3 pr-10 mb-6 md:mb-8",
            "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20",
            className,
          )}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary fill-primary/40" />
          </div>
          <p className="text-sm text-foreground/80">
            <span className="font-semibold text-foreground">Welcome to HeartsHeal</span>
            {" — "}your safe space for healing. You are not alone on this journey.
          </p>
          <button
            onClick={dismiss}
            aria-label="Dismiss welcome banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
