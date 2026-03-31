"use client"

import { useState, useCallback } from "react"

type QuizType = "emotional-awareness" | "self-compassion"

interface UseQuizRotationReturn {
  currentQuizType: QuizType
  nextQuiz: () => void
  quizCount: number
}

const QUIZ_TYPES: QuizType[] = ["emotional-awareness", "self-compassion"]

export function useQuizRotation(): UseQuizRotationReturn {
  const [index, setIndex] = useState(0)
  const [quizCount, setQuizCount] = useState(0)

  const nextQuiz = useCallback(() => {
    setIndex((prev) => (prev + 1) % QUIZ_TYPES.length)
    setQuizCount((prev) => prev + 1)
  }, [])

  return {
    currentQuizType: QUIZ_TYPES[index],
    nextQuiz,
    quizCount,
  }
}
