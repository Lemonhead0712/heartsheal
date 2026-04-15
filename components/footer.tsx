import Link from "next/link"

export function Footer() {
  return (
    <footer className="w-full border-t border-border/30 relative z-10">
      <div
        className="max-w-5xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-1.5"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <p className="text-xs text-muted-foreground/60 leading-relaxed text-center sm:text-left">
          <span className="font-medium text-foreground/50">Disclaimer:</span> Haven is a wellness app and is not a substitute for professional mental health care.{" "}
          In crisis, call or text{" "}
          <a href="tel:988" className="text-primary/70 font-semibold hover:text-primary transition-colors">988</a>.
        </p>
        <p className="text-xs text-muted-foreground/40 shrink-0">
          &copy; {new Date().getFullYear()} Haven
        </p>
      </div>
    </footer>
  )
}
