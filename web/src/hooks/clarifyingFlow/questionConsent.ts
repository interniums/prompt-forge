import type React from 'react'
import { recordEvent } from '@/services/eventsService'
import type { ClarifyingQuestion, TaskActivity } from '@/lib/types'
import type { SelectForQuestion } from './selectForQuestion'

type ConsentDeps = {
  pendingTask: string | null
  clarifyingQuestions: ClarifyingQuestion[] | null
  clarifyingAnswersRef: React.MutableRefObject<{ questionId: string; question: string; answer: string }[]>
  setAwaitingQuestionConsent: (value: boolean) => void
  setConsentSelectedIndex: (value: number | null) => void
  setAnsweringQuestions: (value: boolean) => void
  setCurrentQuestionIndex: (value: number) => void
  selectForQuestion: SelectForQuestion
  appendClarifyingQuestion: (question: ClarifyingQuestion, index: number, total: number) => void
  startClarifyingQuestions: (task: string, options?: { allowUnclear?: boolean }) => Promise<void>
  generateFinalPromptForTask: (
    task: string,
    answers: { questionId: string; question: string; answer: string }[],
    options?: { skipConsentCheck?: boolean; allowUnclear?: boolean }
  ) => Promise<void>
  setActivity: (activity: TaskActivity | null) => void
  focusInputToEnd: () => void
}

export function createHandleQuestionConsent(deps: ConsentDeps) {
  return async (answer: string) => {
    const raw = answer.trim().toLowerCase()
    const normalized = raw === 'generate' || raw === 'gen' || raw === 'now' ? 'no' : raw === 'sharpen' ? 'yes' : raw

    if (!deps.pendingTask) {
      deps.setAwaitingQuestionConsent(false)
      return
    }

    void recordEvent('question_consent', { task: deps.pendingTask, answer: normalized })

    if (normalized === 'yes' || normalized === 'y') {
      deps.setAwaitingQuestionConsent(false)
      deps.setConsentSelectedIndex(null)
      if (deps.clarifyingQuestions && deps.clarifyingQuestions.length > 0) {
        const answered = deps.clarifyingAnswersRef.current.length
        deps.setAnsweringQuestions(true)
        deps.setCurrentQuestionIndex(answered)
        const nextQuestion = deps.clarifyingQuestions[Math.min(answered, deps.clarifyingQuestions.length - 1)]
        deps.selectForQuestion(nextQuestion ?? null, true)
        if (nextQuestion) {
          deps.appendClarifyingQuestion(nextQuestion, answered, deps.clarifyingQuestions.length)
        }
      } else {
        await deps.startClarifyingQuestions(deps.pendingTask)
      }
      return
    }

    if (normalized === 'no' || normalized === 'n') {
      deps.setAwaitingQuestionConsent(false)
      deps.setConsentSelectedIndex(null)
      deps.setAnsweringQuestions(false)
      deps.setActivity({
        task: deps.pendingTask,
        stage: 'generating',
        status: 'loading',
        message: 'Generating without questions',
        detail: 'Skipping clarifying; creating your prompt now.',
      })
      await deps.generateFinalPromptForTask(deps.pendingTask, [], { skipConsentCheck: true })
      return
    }

    deps.focusInputToEnd()
  }
}
