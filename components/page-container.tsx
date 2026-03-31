import type React from "react"
import { cn } from "@/lib/utils"
import { DesktopNav } from "@/components/desktop-nav"
import { BottomNav } from "@/components/bottom-nav"
import { Footer } from "@/components/footer"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  /** Pass true to skip the nav/footer wrappers (e.g. for modal-like pages) */
  bare?: boolean
}

export function PageContainer({ children, className, bare = false }: PageContainerProps) {
  if (bare) {
    return (
      <div className={cn("min-h-screen bg-page-gradient", className)}>
        <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>
      </div>
    )
  }

  return (
    <>
      <DesktopNav />
      <div className={cn("min-h-screen bg-page-gradient pb-[76px] md:pb-0", className)}>
        <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>
        <Footer />
      </div>
      <BottomNav />
    </>
  )
}
