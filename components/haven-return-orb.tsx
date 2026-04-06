"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"

export function HavenReturnOrb() {
  const path = usePathname()
  if (path === "/") return null

  return (
    <Link href="/" aria-label="Return to Haven">
      <motion.div
        className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-[51]
                   w-12 h-12 rounded-full
                   bg-gradient-to-br from-rose-400 to-primary
                   flex items-center justify-center shadow-lg cursor-pointer"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
      >
        <span
          className="absolute inset-0 rounded-full bg-primary/30 animate-ping"
          style={{ animationDuration: "2.4s" }}
        />
        <span className="text-white text-lg relative z-10 select-none">✦</span>
      </motion.div>
    </Link>
  )
}
