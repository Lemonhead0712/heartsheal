"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, TrendingUp, Menu, X, Sparkles, Settings, Cloud, LogOut, User } from "lucide-react"
import { Logo } from "./logo"
import { cn } from "@/lib/utils"
import { useHapticContext } from "@/contexts/haptic-context"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "@/components/auth-modal"

const navItems = [
  { name: "Haven",    href: "/",               icon: Sparkles },
  { name: "History",  href: "/emotional-log",  icon: Clock },
  { name: "Insights", href: "/insights",       icon: TrendingUp },
  { name: "Settings", href: "/settings",       icon: Settings },
]

export function DesktopNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled]         = useState(false)
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [authOpen, setAuthOpen]         = useState(false)
  const [authMode, setAuthMode]         = useState<"signin" | "signup">("signup")
  const { haptic, settings }            = useHapticContext()
  const { user, signOut }               = useAuth()

  const openAuth = (mode: "signin" | "signup") => { setAuthMode(mode); setAuthOpen(true); setMobileOpen(false) }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const click = (intensity: "light" | "medium" = "light") => {
    if (settings.enabled) haptic(intensity)
  }

  return (
    <>
      {/* ── Fixed top bar (desktop only) ── */}
      <header
        className={cn(
          "hidden md:flex fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "glass-nav border-b" : "bg-transparent border-transparent",
        )}
      >
        <div className="max-w-5xl mx-auto w-full px-6 h-[60px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" onClick={() => click()} aria-label="HeartsHeal home">
            <Logo size="small" />
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-0.5" aria-label="Primary navigation">
            {navItems.map(({ name, href, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => click()}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-200",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/70",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="w-[15px] h-[15px] shrink-0" />
                  <span>{name}</span>
                  {active && (
                    <motion.span
                      layoutId="desktop-nav-indicator"
                      className="absolute inset-0 rounded-xl bg-primary/8"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Auth button — desktop */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden lg:block truncate max-w-[140px]">{user.email}</span>
                <button
                  onClick={() => signOut()}
                  title="Sign out"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth("signin")}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-white text-xs font-semibold transition-all shadow-sm"
                  style={{ background: "linear-gradient(135deg, #9b6fdf, #d472b0)" }}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  Save Data
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Spacer for fixed header on desktop */}
      <div className="hidden md:block h-[60px]" aria-hidden="true" />

      {/* ── Mobile top bar ── */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden glass-nav border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" onClick={() => { click(); setMobileOpen(false) }} aria-label="HeartsHeal home">
            <Logo size="small" />
          </Link>
          <button
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => { setMobileOpen((o) => !o); click() }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile top spacer */}
      <div className="h-14 md:hidden" aria-hidden="true" />

      {/* ── Mobile menu overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <motion.nav
              key="drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed top-14 left-0 right-0 z-50 md:hidden bg-card/96 backdrop-blur-xl border-b border-border/40 shadow-lg"
              aria-label="Mobile navigation"
            >
              <div className="flex flex-col gap-0.5 p-3">
                {navItems.map(({ name, href, icon: Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => click()}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/70",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {name}
                    </Link>
                  )
                })}

                {/* Auth row in mobile menu */}
                <div className="mt-2 pt-2 border-t border-border/40">
                  {user ? (
                    <div className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                      </div>
                      <button
                        onClick={() => { signOut(); setMobileOpen(false) }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium shrink-0 ml-2"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 px-1">
                      <button
                        onClick={() => openAuth("signin")}
                        className="flex-1 py-2.5 rounded-xl border border-border/60 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors"
                      >
                        Sign In
                      </button>
                      <button
                        onClick={() => openAuth("signup")}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Create Account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
    </>
  )
}
