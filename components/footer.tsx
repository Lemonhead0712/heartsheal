import Link from "next/link"

const footerLinks = {
  Explore: [
    { label: "Home",          href: "/" },
    { label: "Haven Companion", href: "/companion" },
    { label: "Breathe",       href: "/breathe" },
    { label: "Thoughts",      href: "/thoughts" },
    { label: "Insights",      href: "/insights" },
  ],
  Support: [
    { label: "About",          href: "/about" },
    { label: "FAQ",            href: "/faq" },
    { label: "App Status",     href: "/app-status" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Use",   href: "/terms" },
  ],
}

const crisisLinks = [
  { label: "988 Suicide & Crisis Lifeline", href: "tel:988" },
  { label: "Crisis Text Line (text HOME to 741741)", href: "sms:741741" },
]

export function Footer() {
  return (
    <footer className="hidden md:block w-full border-t border-border/50 bg-card/40 backdrop-blur-sm relative z-10">
      <div
        className="max-w-5xl mx-auto px-6 py-10"
        style={{
          paddingLeft:   "max(1.5rem, env(safe-area-inset-left))",
          paddingRight:  "max(1.5rem, env(safe-area-inset-right))",
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* Top row */}
        <div className="flex flex-col md:flex-row md:items-start gap-10 md:gap-16 mb-8">
          {/* Brand */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <img src="/icon.png" alt="HeartsHeal logo" className="h-6 w-6 object-contain shrink-0 mix-blend-multiply dark:mix-blend-screen" />
              <span className="font-serif text-base font-semibold text-foreground">HeartsHeal</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-4">
              A free, calming space for emotional healing, guided breathing, reflective journaling, and personal growth.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              ✓ 100% Free, Always
            </div>
          </div>

          {/* Link columns */}
          <div className="flex gap-12 md:gap-16 shrink-0">
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section}>
                <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">
                  {section}
                </p>
                <ul className="flex flex-col gap-2">
                  {links.map(({ label, href }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Crisis resources */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">
                Crisis Support
              </p>
              <ul className="flex flex-col gap-2">
                {crisisLinks.map(({ label, href }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="text-sm text-primary/80 hover:text-primary transition-colors duration-150"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/50 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground/70">Disclaimer:</span> HeartsHeal is a wellness app and is not a substitute for professional mental health care.{" "}
            If you are in crisis, call or text <a href="tel:988" className="text-primary font-semibold">988</a>.
          </p>
          <p className="text-xs text-muted-foreground shrink-0">
            &copy; {new Date().getFullYear()} HeartsHeal. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
