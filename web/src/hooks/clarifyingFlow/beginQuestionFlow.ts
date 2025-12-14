import type React from 'react'
import type { ClarifyingAnswer, ClarifyingQuestion, TaskActivity } from '@/lib/types'
import type { SelectForQuestion } from './selectForQuestion'

type BeginQuestionFlowDeps = {
  pendingTask: string | null
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  setClarifyingQuestions: (value: ClarifyingQuestion[] | null) => void
  setClarifyingAnswers: (value: ClarifyingAnswer[], currentIndex: number) => void
  setAwaitingQuestionConsent: (value: boolean) => void
  setConsentSelectedIndex: (value: number | null) => void
  setAnsweringQuestions: (value: boolean) => void
  setActivity: (activity: TaskActivity | null) => void
  selectForQuestion: SelectForQuestion
  appendClarifyingQuestion: (question: ClarifyingQuestion, index: number, total: number) => void
}

export function createBeginQuestionFlow(deps: BeginQuestionFlowDeps) {
  return (questions: ClarifyingQuestion[]) => {
    if (!questions.length) return
    deps.setClarifyingQuestions(questions)
    deps.clarifyingAnswersRef.current = []
    deps.setClarifyingAnswers([], 0)
    deps.selectForQuestion(questions[0], true)
    deps.setAwaitingQuestionConsent(false)
    deps.setConsentSelectedIndex(null)
    deps.setAnsweringQuestions(true)
    const remaining = Math.max(0, questions.length - 1)
    deps.setActivity({
      task: deps.pendingTask ?? '',
      stage: 'clarifying',
      status: 'loading',
      message: `Clarifying ${1}/${questions.length}${remaining ? ` · ${remaining} left` : ''}`,
      detail: 'Answering these questions improves the quality of your prompt.',
    })
    deps.appendClarifyingQuestion(questions[0], 0, questions.length)
  }
}
