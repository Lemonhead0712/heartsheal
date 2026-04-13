"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LoadingScreenProps {
  className?: string
}

export function LoadingScreen({ className }: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background",
        className,
      )}
    >
      {/* Logo */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="mb-6"
      >
        <img src="/havenlogo.png" alt="Haven" className="w-16 h-16 object-cover" style={{ objectPosition: "50% 35%" }} aria-hidden="true" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="font-serif text-2xl font-semibold text-foreground"
      >
        Haven
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-2 text-sm text-muted-foreground"
      >
        Your space for healing...
      </motion.p>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-8">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-primary/50"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  )
}
