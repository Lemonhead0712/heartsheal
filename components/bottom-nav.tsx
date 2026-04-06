"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookHeart, Wind, TrendingUp, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHapticContext } from "@/contexts/haptic-context"
import { motion } from "framer-motion"

const navItems = [
  { name: "Haven",    href: "/",          icon: Sparkles },
  { name: "Breathe",  href: "/breathe",   icon: Wind },
  { name: "Thoughts", href: "/thoughts",  icon: BookHeart },
  { name: "Insights", href: "/insights",  icon: TrendingUp },
]

export function BottomNav() {
  const pathname = usePathname()
  const { haptic, settings } = useHapticContext()

  const handleClick = (href: string, e: React.MouseEvent) => {
    if (settings.enabled) haptic("light")
    if (pathname === href) e.preventDefault()
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="Mobile bottom navigation"
    >
      {/* Subtle top separator glow */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      <div
        className="glass-nav"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4 max-w-lg mx-auto h-[68px]">
          {navItems.map(({ name, href, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={name}
                href={href}
                onClick={(e) => handleClick(href, e)}
                aria-label={name}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 touch-manipulation select-none",
                  "transition-colors duration-200",
                  active
                    ? "text-primary"
                    : "text-muted-foreground/70 hover:text-muted-foreground",
                )}
              >
                {/* Active background pill */}
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-x-2 top-1.5 bottom-1 rounded-2xl bg-primary/10"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                  />
                )}

                {/* Icon */}
                <div className="relative z-10 flex items-center justify-center w-7 h-7">
                  <Icon
                    className={cn(
                      "transition-all duration-200",
                      active
                        ? "w-6 h-6 stroke-[2]"
                        : "w-[22px] h-[22px] stroke-[1.5]",
                    )}
                    aria-hidden="true"
                  />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "relative z-10 text-[11px] font-medium leading-none tracking-wide",
                    active ? "text-primary" : "",
                  )}
                >
                  {name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
