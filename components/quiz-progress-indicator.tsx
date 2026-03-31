import { cn } from "@/lib/utils"

interface QuizProgressIndicatorProps {
  current: number
  total: number
  className?: string
}

export function QuizProgressIndicator({
  current,
  total,
  className,
}: QuizProgressIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i < current
                ? "bg-primary w-4"
                : i === current - 1
                  ? "bg-primary w-4"
                  : "bg-border w-2",
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground ml-1">
        {current}/{total}
      </span>
    </div>
  )
}
