import { cn } from "@/lib/utils"

type LogoSize = "small" | "medium" | "large"

interface LogoProps {
  size?: LogoSize
  className?: string
}

// small = nav bars. Responsive: larger on mobile (h-14 bar), tighter on desktop (h-[60px] bar)
// medium = page section headers
// large = hero / splash screens
const sizeConfig: Record<LogoSize, { img: string; text: string }> = {
  small:  { img: "w-8 h-8 md:w-7 md:h-7",   text: "text-base md:text-sm font-semibold" },
  medium: { img: "w-10 h-10",                text: "text-xl font-semibold" },
  large:  { img: "w-14 h-14",                text: "text-3xl font-bold" },
}

export function Logo({ size = "medium", className }: LogoProps) {
  const { img, text } = sizeConfig[size]

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/icon.png"
        alt="HeartsHeal logo"
        className={cn(img, "flex-shrink-0 object-contain")}
        aria-hidden="true"
      />
      <span className={cn("font-serif text-foreground", text)}>HeartsHeal</span>
    </div>
  )
}
