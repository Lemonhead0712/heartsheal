import { cn } from "@/lib/utils"

type LogoSize = "small" | "medium" | "large"

interface LogoProps {
  size?: LogoSize
  className?: string
}

const sizeConfig: Record<LogoSize, { img: string; text: string }> = {
  small:  { img: "w-6 h-6",   text: "text-sm font-semibold" },
  medium: { img: "w-8 h-8",   text: "text-lg font-semibold" },
  large:  { img: "w-11 h-11", text: "text-2xl font-bold" },
}

export function Logo({ size = "medium", className }: LogoProps) {
  const { img, text } = sizeConfig[size]

  return (
    <div className={cn("flex items-center gap-2", className)}>
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
