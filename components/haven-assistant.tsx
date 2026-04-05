"use client"

import { useState, useCallback } from "react"
import { HavenOrb } from "@/components/haven-orb"
import { HavenChat } from "@/components/haven-chat"
import { useGuidedSession } from "@/contexts/guided-session-context"

/**
 * HavenAssistant — always-on companion layer.
 *
 * Orb is visible when:
 *   - The guided session is minimized  →  clicking restores the overlay
 *   - The guided session has completed →  clicking opens the floating chat
 *
 * Chat is a persistent mini-panel available on every page once the session
 * has been triggered (even if still in-progress or complete).
 */
export function HavenAssistant() {
  const { isMinimized, restore, hasTriggered, isComplete } = useGuidedSession()
  const [chatOpen, setChatOpen] = useState(false)

  // Orb should be visible when minimized OR when the session is done (ambient mode)
  const orbVisible = isMinimized || (hasTriggered && isComplete)

  const handleOrbClick = useCallback(() => {
    if (isMinimized) {
      // Restore the guided overlay back to the guided step
      restore()
    } else {
      // Session is complete — toggle the floating chat
      setChatOpen((prev) => !prev)
    }
  }, [isMinimized, restore])

  const handleChatClose = useCallback(() => {
    setChatOpen(false)
  }, [])

  return (
    <>
      <HavenOrb
        visible={orbVisible}
        onClick={handleOrbClick}
        label={isMinimized ? "Return to Haven guide" : "Ask Haven"}
      />
      <HavenChat open={chatOpen} onClose={handleChatClose} />
    </>
  )
}
