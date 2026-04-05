"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Heart } from "lucide-react"

interface HavenOrbProps {
  visible: boolean
  onClick: () => void
  label?: string
}

export function HavenOrb({ visible, onClick, label = "Open Haven guide" }: HavenOrbProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="haven-orb"
          onClick={onClick}
          className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-[51]
                     w-11 h-11 rounded-full shadow-lg overflow-visible
                     bg-gradient-to-br from-rose-400 to-primary
                     flex items-center justify-center
                     cursor-pointer select-none touch-manipulation focus:outline-none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: 1,
            scale: 1,
            transition: { type: "spring", stiffness: 300, damping: 20 },
          }}
          exit={{
            opacity: 0,
            scale: 0.4,
            transition: { duration: 0.2 },
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          aria-label={label}
        >
          {/* Pulsing ring */}
          <span
            className="absolute inset-0 rounded-full bg-primary/30 animate-ping"
            style={{ animationDuration: "2.4s" }}
          />
          <Heart className="w-5 h-5 text-white relative z-10 shrink-0" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
