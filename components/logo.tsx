import { cn } from "@/lib/utils"

type LogoSize = "small" | "medium" | "large"

interface LogoProps {
  size?: LogoSize
  className?: string
}

const sizeConfig: Record<LogoSize, { heart: string; text: string }> = {
  small: { heart: "w-4 h-4", text: "text-sm font-semibold" },
  medium: { heart: "w-6 h-6", text: "text-lg font-semibold" },
  large: { heart: "w-9 h-9", text: "text-2xl font-bold" },
}

export function Logo({ size = "medium", className }: LogoProps) {
  const { heart, text } = sizeConfig[size]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="hsl(var(--primary))"
        className={cn(heart, "flex-shrink-0")}
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className={cn("font-serif text-foreground", text)}>HeartsHeal</span>
    </div>
  )
}
