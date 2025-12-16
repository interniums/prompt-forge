'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { ClarifyingAnswer } from '@/lib/types'

export function useClarifyingHistory(clarifyingAnswers: ClarifyingAnswer[]) {
  const clarifyingAnswerHistoryRef = useRef<Record<string, string>>({})
  const persistentHistoryRef = useRef<Record<string, string>>({})
  const previousAnswersLengthRef = useRef<number>(0)
  const subscribersRef = useRef(new Set<() => void>())

  const emit = useCallback(() => {
    subscribersRef.current.forEach((callback) => callback())
  }, [])

  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback)
    return () => subscribersRef.current.delete(callback)
  }, [])

  const clarifyingAnswerHistory = useSyncExternalStore(
    subscribe,
    () => clarifyingAnswerHistoryRef.current,
    () => clarifyingAnswerHistoryRef.current
  )

  // Accumulate answers into persistent history - preserve answers even after removal
  useEffect(() => {
    // If answers array is completely empty and it wasn't empty before, clear persistent history (new conversation)
    if (clarifyingAnswers.length === 0 && previousAnswersLengthRef.current > 0) {
      persistentHistoryRef.current = {}
      clarifyingAnswerHistoryRef.current = {}
      previousAnswersLengthRef.current = 0
      emit()
      return
    }

    // Track previous length to detect when we're starting fresh
    const wasEmpty = previousAnswersLengthRef.current === 0
    previousAnswersLengthRef.current = clarifyingAnswers.length

    // If we're starting fresh (was empty, now has answers), clear history first
    if (wasEmpty && clarifyingAnswers.length > 0) {
      persistentHistoryRef.current = {}
    }

    // Accumulate all answers that are currently in the array
    // Once added to persistent history, they stay there even if removed later
    clarifyingAnswers.forEach((ans) => {
      if (ans.questionId && ans.answer !== undefined && ans.answer !== null) {
        persistentHistoryRef.current[ans.questionId] = ans.answer
      }
    })

    clarifyingAnswerHistoryRef.current = { ...persistentHistoryRef.current }
    emit()
  }, [clarifyingAnswers, emit])

  return { clarifyingAnswerHistoryRef, clarifyingAnswerHistory }
}
