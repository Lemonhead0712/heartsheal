import { cn } from "@/lib/utils"

type LogoSize = "small" | "medium" | "large"

interface LogoProps {
  size?: LogoSize
  className?: string
}

const sizeConfig: Record<LogoSize, { img: string; text: string }> = {
  small:  { img: "w-9 h-9",   text: "text-base md:text-sm font-semibold" },
  medium: { img: "w-10 h-10",                text: "text-xl font-semibold" },
  large:  { img: "w-14 h-14",                text: "text-3xl font-bold" },
}

export function Logo({ size = "medium", className }: LogoProps) {
  const { img, text } = sizeConfig[size]

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/havenlogo.png"
        alt="Haven logo"
        className={cn(img, "flex-shrink-0 object-contain")}
        aria-hidden="true"
      />
      <span className={cn("font-serif text-foreground", text)}>Haven</span>
    </div>
  )
}
