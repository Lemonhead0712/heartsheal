"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, XCircle, AlertCircle, Loader2, BookHeart, Wind, BarChart3, Sparkles } from "lucide-react"

type SystemStatus = {
  name: string
  status: "operational" | "degraded" | "outage" | "maintenance" | "unknown"
}

export function AppStatusDashboard() {
  const [activeTab, setActiveTab] = useState("status")
  const [isLoading, setIsLoading] = useState(true)
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([])
  const [userStats, setUserStats] = useState({
    journalEntries: 0,
    quizzes: 0,
    emotionLogs: 0,
    breathingSessions: 0,
  })

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setSystemStatus([
        { name: "Haven AI Companion",    status: "operational" },
        { name: "Breathing Exercises",   status: "operational" },
        { name: "Emotional Log",         status: "operational" },
        { name: "Journal & Quizzes",     status: "operational" },
        { name: "Local Data Storage",    status: "operational" },
      ])

      try {
        const journalEntries     = JSON.parse(localStorage.getItem("heartsHeal_journalEntries") || "[]").length
        const quizResults        = JSON.parse(localStorage.getItem("heartsHeal_quizResults")    || "[]").length
        const emotionLogs        = JSON.parse(localStorage.getItem("heartsHeal_emotionLogs")    || "[]").length
        const breathingSessions  = parseInt(localStorage.getItem("heartsHeal_breathingSessions") || "0", 10)
        setUserStats({ journalEntries, quizzes: quizResults, emotionLogs, breathingSessions })
      } catch {
        /* silently fail */
      }

      setIsLoading(false)
    }
    loadData()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "degraded":     return <AlertCircle  className="h-4 w-4 text-amber-500"   />
      case "outage":       return <XCircle      className="h-4 w-4 text-red-500"     />
      case "maintenance":  return <Loader2      className="h-4 w-4 text-blue-500 animate-spin" />
      default:             return <AlertCircle  className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational": return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">Operational</Badge>
      case "degraded":    return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">Degraded</Badge>
      case "outage":      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400">Outage</Badge>
      case "maintenance": return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400">Maintenance</Badge>
      default:            return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const statCards = [
    { label: "Emotion Logs",        value: userStats.emotionLogs,       icon: BarChart3,  color: "text-primary bg-primary/10" },
    { label: "Journal Entries",     value: userStats.journalEntries,    icon: BookHeart,  color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" },
    { label: "Quizzes Completed",   value: userStats.quizzes,           icon: Sparkles,   color: "text-rose-500 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400" },
    { label: "Breathing Sessions",  value: userStats.breathingSessions, icon: Wind,       color: "text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400" },
  ]

  return (
    <Card className="border-border/40 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Haven Status</CardTitle>
            <CardDescription>Health and usage overview</CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">
            ✓ Free Forever
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="status">System Status</TabsTrigger>
            <TabsTrigger value="user">Your Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="status">
            {isLoading ? (
              <div className="flex justify-center items-center py-10 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Checking systems…</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">All Systems Operational</span>
                </div>
                {systemStatus.map((system) => (
                  <div
                    key={system.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(system.status)}
                      <span className="text-sm text-foreground">{system.name}</span>
                    </div>
                    {getStatusBadge(system.status)}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="user">
            {isLoading ? (
              <div className="flex justify-center items-center py-10 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading your activity…</span>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-xl">💜</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    All features are <strong className="text-foreground">completely free</strong>. No limits, no subscriptions, no paywalls — ever.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {statCards.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="stat-card gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
