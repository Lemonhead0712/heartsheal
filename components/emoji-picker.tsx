"use client"

import { cn } from "@/lib/utils"

const EMOTION_EMOJIS = [
  "😢", "😭", "😔", "😞", "😟",
  "😥", "😓", "😩", "😫", "😤",
  "😠", "😡", "😰", "😨", "😱",
  "😶", "😐", "😑", "😣", "😖",
  "🥺", "💔", "😮‍💨", "😌", "😊",
  "🙂", "😄", "😁", "🥰", "💙",
  "💚", "🌱", "✨", "🌸", "🕊️",
]

interface EmojiPickerProps {
  selectedEmoji: string
  onEmojiSelect: (emoji: string) => void
  className?: string
}

export function EmojiPicker({ selectedEmoji, onEmojiSelect, className }: EmojiPickerProps) {
  return (
    <div className={cn("", className)}>
      <div className="grid grid-cols-7 gap-1">
        {EMOTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onEmojiSelect(emoji)}
            aria-label={emoji}
            aria-pressed={selectedEmoji === emoji}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all duration-150",
              "hover:bg-accent hover:scale-110",
              selectedEmoji === emoji
                ? "bg-primary/15 ring-2 ring-primary/50 scale-110"
                : "bg-surface",
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
