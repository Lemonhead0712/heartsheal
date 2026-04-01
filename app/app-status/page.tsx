"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs"
import { ChevronLeft } from "lucide-react"
import { motion, type Variants } from "framer-motion"
import { Logo } from "@/components/logo"
import { AppStatusDashboard } from "@/components/app-status-dashboard"
import { HapticSettings } from "@/components/haptic-settings"
import { PageContainer } from "@/components/page-container"
import { HapticTabsTrigger } from "@/components/ui/haptic-tabs"
import { useHaptic } from "@/hooks/use-haptic"

export default function AppStatusPage() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const { triggerHaptic: haptic } = useHaptic()

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  }
  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  }

  return (
    <PageContainer>
      <div className="min-h-screen bg-page-gradient">
        <motion.div
          className="container mx-auto px-4 py-8 max-w-4xl"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.div className="flex flex-col items-center mb-6" variants={item}>
            <Logo size="medium" />
          </motion.div>

          <motion.div className="mb-8" variants={item}>
            <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Dashboard
            </Link>
            <h1 className="font-serif text-3xl font-semibold text-foreground mt-4 mb-2">App Status</h1>
            <p className="text-muted-foreground">Monitor app performance and your usage</p>
          </motion.div>

          <motion.div variants={item}>
            <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <HapticTabsTrigger value="dashboard" >
                  Dashboard
                </HapticTabsTrigger>
                <HapticTabsTrigger value="settings" >
                  Settings
                </HapticTabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6">
                <AppStatusDashboard />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <HapticSettings />

                <Card className="border-border/40">
                  <CardHeader>
                    <CardTitle>App Version</CardTitle>
                    <CardDescription>Current version and build information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Version</span>
                        <span className="text-sm text-muted-foreground">1.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Environment</span>
                        <span className="text-sm text-muted-foreground">Production</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Plan</span>
                        <span className="text-sm text-emerald-600 font-semibold">Free Forever ✓</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40">
                  <CardHeader>
                    <CardTitle>Reset Application</CardTitle>
                    <CardDescription>Clear all local data and reset to defaults</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      This will clear all your saved preferences, entries, and local data. This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        haptic(15)
                        if (confirm("Are you sure? This will delete all your data and cannot be undone.")) {
                          localStorage.clear()
                          window.location.href = "/"
                        }
                      }}
                    >
                      Reset Application
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </PageContainer>
  )
}
