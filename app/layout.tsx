import type React from "react"
import type { Metadata, Viewport } from "next"
import { DM_Sans, Cormorant_Garamond } from "next/font/google"
import "./globals.css"
import { ThemeProviderFixed as ThemeProvider } from "@/components/theme-provider-fixed"
import { ColorThemeProvider } from "@/contexts/color-theme-context"
import { BottomNav } from "@/components/bottom-nav"
import { Toaster } from "@/components/ui/toaster"
import { HapticProvider } from "@/contexts/haptic-context"
import { AuthProvider } from "@/contexts/auth-context"
import { DesktopNav } from "@/components/desktop-nav"
import { Footer } from "@/components/footer"
import { GuidedSessionProvider } from "@/contexts/guided-session-context"
import { HavenReturnOrb } from "@/components/haven-return-orb"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: {
    default: "Haven — Your Space for Healing",
    template: "%s | Haven",
  },
  description:
    "A safe, calming space for emotional healing, guided breathing, reflective journaling, and personal growth.",
  keywords: ["mental health", "emotional wellness", "journaling", "meditation", "grief", "healing"],
  metadataBase: new URL("https://heartsheal.netlify.app"),
  icons: {
    icon: [{ url: "/havenlogo.png", type: "image/png" }],
    apple: "/havenlogo.png",
    shortcut: "/havenlogo.png",
  },
  openGraph: {
    title: "Haven — Your Space for Healing",
    description: "A safe, calming space for emotional healing and personal growth.",
    url: "https://heartsheal.netlify.app",
    siteName: "Haven",
    type: "website",
    images: [
      {
        url: "/havenlogo.png",
        width: 1200,
        height: 630,
        alt: "Haven — Your Space for Healing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Haven — Your Space for Healing",
    description: "A safe, calming space for emotional healing, guided breathing, and reflective journaling.",
    images: ["/havenlogo.png"],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d0b12" },
    { media: "(prefers-color-scheme: dark)",  color: "#0d0b12" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`h-full ${dmSans.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <body className="font-sans flex min-h-full flex-col antialiased" suppressHydrationWarning>
        <ColorThemeProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
          <HapticProvider>
            <GuidedSessionProvider>
              <div className="flex flex-1 flex-col">
                <DesktopNav />
                <main className="flex-1 pb-[84px] md:pb-0">{children}</main>
                <Footer />
              </div>
              <BottomNav />
              <HavenReturnOrb />
              <Toaster />
            </GuidedSessionProvider>
          </HapticProvider>
          </AuthProvider>
        </ThemeProvider>
        </ColorThemeProvider>
      </body>
    </html>
  )
}
