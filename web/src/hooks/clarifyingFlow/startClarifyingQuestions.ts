import type React from 'react'
import { generateClarifyingQuestions } from '@/services/promptService'
import type { ClarifyingQuestion, Preferences, TaskActivity } from '@/lib/types'
import { FALLBACK_QUESTIONS } from './constants'
import { detectUnclearTaskClient } from './unclearGuard'

type StartClarifyingQuestionsDeps = {
  preferences: Preferences
  generationRunIdRef: React.MutableRefObject<number>
  setIsGenerating: (value: boolean) => void
  setActivity: (activity: TaskActivity | null) => void
  setAwaitingQuestionConsent: (value: boolean) => void
  setAnsweringQuestions: (value: boolean) => void
  beginQuestionFlow: (questions: ClarifyingQuestion[]) => void
  showToast: (msg: string) => void
  onUnclearTask?: (info: { reason: string; stage: 'clarifying'; task: string }) => void
}

export function createStartClarifyingQuestions(deps: StartClarifyingQuestionsDeps) {
  return async (task: string, options?: { allowUnclear?: boolean }) => {
    if (!options?.allowUnclear) {
      const unclear = detectUnclearTaskClient(task)
      if (unclear) {
        if (typeof deps.onUnclearTask === 'function') {
          deps.onUnclearTask({ reason: unclear, stage: 'clarifying', task })
        }
        deps.setIsGenerating(false)
        deps.setAwaitingQuestionConsent(false)
        deps.setAnsweringQuestions(false)
        return
      }
    }

    const runId = (deps.generationRunIdRef.current += 1)
    deps.setIsGenerating(true)
    deps.setActivity({
      task,
      stage: 'clarifying',
      status: 'loading',
      message: 'Preparing clarifying questions',
      detail: 'Finding the quickest questions to sharpen your task.',
    })

    try {
      const questions = await generateClarifyingQuestions({
        task,
        preferences: deps.preferences,
        allowUnclear: options?.allowUnclear,
      })

      if (runId !== deps.generationRunIdRef.current) return

      deps.setIsGenerating(false)
      deps.setActivity({
        task,
        stage: 'clarifying',
        status: 'success',
        message: 'Clarifying ready',
        detail: 'Answer a few quick questions to tailor the prompt.',
      })

      deps.beginQuestionFlow(questions.length ? questions : FALLBACK_QUESTIONS)
    } catch (err) {
      if (runId !== deps.generationRunIdRef.current) return
      console.error('Failed to generate clarifying questions', err)
      const code = (err as { code?: string }).code
      if (code === 'UNCLEAR_TASK') {
        const detail =
          (err as { reason?: string }).reason ??
          'We could not understand the task. Please describe what you need in plain language.'
        if (typeof deps.onUnclearTask === 'function') {
          deps.onUnclearTask({ reason: detail, stage: 'clarifying', task })
        }
        deps.setIsGenerating(false)
        deps.setAwaitingQuestionConsent(false)
        deps.setAnsweringQuestions(false)
        return
      }

      if (code === 'QUOTA_EXCEEDED') {
        deps.showToast('Plan limit reached. Quota resets next cycle.')
        deps.setActivity({
          task,
          stage: 'clarifying',
          status: 'error',
          message: 'Plan limit reached',
          detail: 'You have reached your plan quota. Upgrade or wait for the next cycle.',
        })
        deps.setIsGenerating(false)
        return
      }

      if (code === 'RATE_LIMITED') {
        deps.showToast('Too many requests. Please wait and try again.')
        deps.setActivity({
          task,
          stage: 'clarifying',
          status: 'error',
          message: 'Too many requests',
          detail: 'You are sending requests too quickly. Please wait and try again.',
        })
        deps.setIsGenerating(false)
        return
      }

      deps.showToast('System error. Please try again soon.')
      deps.setActivity({
        task,
        stage: 'clarifying',
        status: 'error',
        message: 'Questions unavailable',
        detail: 'Could not generate clarifying questions. Using fallback instead.',
      })
      deps.setIsGenerating(false)
      deps.beginQuestionFlow(FALLBACK_QUESTIONS)
    }
  }
}
