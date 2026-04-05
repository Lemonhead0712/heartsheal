import type React from "react"
import type { Metadata, Viewport } from "next"
import { DM_Sans, Playfair_Display } from "next/font/google"
import "./globals.css"
import { ThemeProviderFixed as ThemeProvider } from "@/components/theme-provider-fixed"
import { BottomNav } from "@/components/bottom-nav"
import { Toaster } from "@/components/ui/toaster"
import { HapticProvider } from "@/contexts/haptic-context"
import { AuthProvider } from "@/contexts/auth-context"
import { DesktopNav } from "@/components/desktop-nav"
import { Footer } from "@/components/footer"
import { GuidedSessionProvider } from "@/contexts/guided-session-context"
import { GuidedSessionOverlay }  from "@/components/guided-session-overlay"
import { HavenOrb }              from "@/components/haven-orb"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: {
    default: "HeartsHeal — Your Space for Healing",
    template: "%s | HeartsHeal",
  },
  description:
    "A safe, calming space for emotional healing, guided breathing, reflective journaling, and personal growth.",
  keywords: ["mental health", "emotional wellness", "journaling", "meditation", "grief", "healing"],
  metadataBase: new URL("https://heartsheal.netlify.app"),
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/icon.png",
  },
  openGraph: {
    title: "HeartsHeal — Your Space for Healing",
    description: "A safe, calming space for emotional healing and personal growth.",
    url: "https://heartsheal.netlify.app",
    siteName: "HeartsHeal",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "HeartsHeal — Your Space for Healing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HeartsHeal — Your Space for Healing",
    description: "A safe, calming space for emotional healing, guided breathing, and reflective journaling.",
    images: ["/og-image.png"],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f5" },
    { media: "(prefers-color-scheme: dark)",  color: "#0f1117" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`h-full ${dmSans.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="font-sans flex min-h-full flex-col antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
          <HapticProvider>
            <GuidedSessionProvider>
              <div className="flex flex-1 flex-col">
                <DesktopNav />
                <main className="flex-1 pb-[84px] md:pb-0">{children}</main>
                <Footer />
              </div>
              <BottomNav />
              <Toaster />
              <GuidedSessionOverlay />
              <HavenOrb />
            </GuidedSessionProvider>
          </HapticProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
