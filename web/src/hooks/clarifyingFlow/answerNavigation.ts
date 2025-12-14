import type React from 'react'
import { recordEvent } from '@/services/eventsService'
import type { ClarifyingAnswer, ClarifyingQuestion, TaskActivity } from '@/lib/types'
import type { PreferenceKey } from '@/features/terminal/terminalState'
import type { SelectForQuestion } from './selectForQuestion'

type BaseDeps = {
  clarifyingQuestions: ClarifyingQuestion[] | null
  pendingTask: string | null
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  currentQuestionIndex: number
  setAnsweringQuestions: (value: boolean) => void
  setClarifyingAnswers: (value: ClarifyingAnswer[], currentIndex: number) => void
  setCurrentQuestionIndex: (value: number) => void
  setClarifyingSelectedOptionIndex: (value: number | null) => void
  setActivity: (activity: TaskActivity | null) => void
  setValue: (value: string) => void
  selectForQuestion: SelectForQuestion
  appendClarifyingQuestion: (question: ClarifyingQuestion, index: number, total: number) => void
  blurInput: () => void
  focusInputToEnd: () => void
}

type CompletionDeps = {
  getPreferencesToAsk: () => PreferenceKey[]
  startPreferenceQuestions: () => Promise<void> | void
  generateFinalPromptForTask: (
    task: string,
    answers: ClarifyingAnswer[],
    options?: { skipConsentCheck?: boolean; allowUnclear?: boolean }
  ) => Promise<void>
}

type UndoDeps = {
  setAwaitingQuestionConsent: (value: boolean) => void
  setLastRemovedClarifyingAnswer: (value: { questionId: string | null; answer: string | null }) => void
}

function advanceToQuestion(params: {
  deps: BaseDeps
  updatedAnswers: ClarifyingAnswer[]
  nextIndex: number
  allowFocusOnOwnAnswer: boolean
  blurAfterAdvance: boolean
}) {
  const { deps, updatedAnswers, nextIndex, allowFocusOnOwnAnswer, blurAfterAdvance } = params
  const nextQuestion = deps.clarifyingQuestions![nextIndex]
  const nextAnswer = updatedAnswers[nextIndex]
  if (nextAnswer) {
    const nextAnswerText = (nextAnswer.answer ?? '').trim()
    const isNextOwnAnswer =
      nextQuestion.options.length > 0
        ? !nextQuestion.options.some((opt) => opt.label.trim().toLowerCase() === nextAnswerText.toLowerCase())
        : true
    if (isNextOwnAnswer && nextAnswerText) {
      deps.setValue(nextAnswerText)
      deps.setClarifyingSelectedOptionIndex(-2)
      if (allowFocusOnOwnAnswer) {
        deps.focusInputToEnd()
      }
    } else if (nextQuestion.options.length > 0 && nextAnswerText) {
      const matchingOptionIndex = nextQuestion.options.findIndex(
        (opt) => opt.label.trim().toLowerCase() === nextAnswerText.toLowerCase()
      )
      if (matchingOptionIndex >= 0) {
        deps.setClarifyingSelectedOptionIndex(matchingOptionIndex)
      } else {
        deps.selectForQuestion(nextQuestion, true)
      }
    } else {
      deps.selectForQuestion(nextQuestion, true)
    }
  } else {
    deps.selectForQuestion(nextQuestion, true)
  }

  deps.setCurrentQuestionIndex(nextIndex)
  const remaining = Math.max(0, deps.clarifyingQuestions!.length - (nextIndex + 1))
  deps.setActivity({
    task: deps.pendingTask ?? '',
    stage: 'clarifying',
    status: 'loading',
    message: `Clarifying ${nextIndex + 1}/${deps.clarifyingQuestions!.length}${
      remaining ? ` · ${remaining} left` : ''
    }`,
    detail: 'Answering these questions improves the quality of your prompt.',
  })
  deps.appendClarifyingQuestion(nextQuestion, nextIndex, deps.clarifyingQuestions!.length)
  if (blurAfterAdvance) {
    deps.blurInput()
  }
}

function completeFlow(deps: BaseDeps & CompletionDeps, updatedAnswers: ClarifyingAnswer[]) {
  deps.setClarifyingSelectedOptionIndex(null)
  deps.setAnsweringQuestions(false)
  deps.blurInput()
  const prefsToAsk = deps.getPreferencesToAsk()
  if (prefsToAsk.length > 0) {
    void deps.startPreferenceQuestions()
    return
  }
  void deps.generateFinalPromptForTask(deps.pendingTask ?? '', updatedAnswers)
}

export function createHandleClarifyingAnswer(deps: BaseDeps & CompletionDeps): (answer: string) => Promise<void> {
  return async (answer: string) => {
    if (!deps.clarifyingQuestions || !deps.pendingTask) {
      deps.setAnsweringQuestions(false)
      return
    }

    const index = deps.currentQuestionIndex
    if (index < 0 || index >= deps.clarifyingQuestions.length) {
      deps.setAnsweringQuestions(false)
      return
    }

    const question = deps.clarifyingQuestions[index]
    const trimmedAnswer = answer.trim()
    const currentAnswers = deps.clarifyingAnswersRef.current
    const hasExistingAnswer = index < currentAnswers.length
    const updated: ClarifyingAnswer[] = hasExistingAnswer
      ? currentAnswers.map((ans, idx) =>
          idx === index
            ? {
                questionId: question.id,
                question: question.question,
                answer: trimmedAnswer,
              }
            : ans
        )
      : [
          ...currentAnswers,
          {
            questionId: question.id,
            question: question.question,
            answer: trimmedAnswer,
          },
        ]

    deps.clarifyingAnswersRef.current = updated
    deps.setClarifyingAnswers(updated, updated.length)
    void recordEvent('clarifying_answer', {
      task: deps.pendingTask,
      questionId: question.id,
      question: question.question,
      answer: trimmedAnswer,
    })

    const nextIndex = index + 1
    if (nextIndex < deps.clarifyingQuestions.length) {
      advanceToQuestion({
        deps,
        updatedAnswers: updated,
        nextIndex,
        allowFocusOnOwnAnswer: true,
        blurAfterAdvance: true,
      })
      return
    }

    completeFlow(deps, updated)
  }
}

export function createHandleClarifyingSkip(deps: BaseDeps & CompletionDeps): () => Promise<void> | void {
  return () => {
    if (!deps.clarifyingQuestions || !deps.pendingTask) return
    const index = deps.currentQuestionIndex
    if (index < 0 || index >= deps.clarifyingQuestions.length) return

    const question = deps.clarifyingQuestions[index]
    const currentAnswers = deps.clarifyingAnswersRef.current
    const hasExistingAnswer = index < currentAnswers.length
    const updated: ClarifyingAnswer[] = hasExistingAnswer
      ? currentAnswers.map((ans, idx) =>
          idx === index ? { questionId: question.id, question: question.question, answer: '' } : ans
        )
      : [...currentAnswers, { questionId: question.id, question: question.question, answer: '' }]

    deps.clarifyingAnswersRef.current = updated
    deps.setClarifyingAnswers(updated, updated.length)

    const nextIndex = index + 1
    if (nextIndex < deps.clarifyingQuestions.length) {
      advanceToQuestion({
        deps,
        updatedAnswers: updated,
        nextIndex,
        allowFocusOnOwnAnswer: false,
        blurAfterAdvance: false,
      })
      return
    }

    deps.setClarifyingSelectedOptionIndex(null)
    deps.setAnsweringQuestions(false)
    const prefsToAsk = deps.getPreferencesToAsk()
    if (prefsToAsk.length > 0) {
      void deps.startPreferenceQuestions()
      return
    }
    void deps.generateFinalPromptForTask(deps.pendingTask ?? '', updated)
  }
}

export function createHandleClarifyingOptionClick(
  deps: BaseDeps & CompletionDeps,
  handleClarifyingAnswer: (answer: string) => Promise<void>
): (idx: number) => void {
  return (index: number) => {
    if (!deps.clarifyingQuestions || !deps.pendingTask) return
    const current = deps.clarifyingQuestions[deps.currentQuestionIndex]
    if (!current || !current.options || index < 0 || index >= current.options.length) return
    const chosen = current.options[index]
    deps.setClarifyingSelectedOptionIndex(index)
    deps.blurInput()
    void handleClarifyingAnswer(chosen.label)
  }
}

export function createHandleUndoAnswer(deps: BaseDeps & CompletionDeps & UndoDeps): () => void {
  return () => {
    if (!deps.clarifyingQuestions || !deps.pendingTask) return
    const answers = deps.clarifyingAnswersRef.current
    if (deps.currentQuestionIndex === 0) return
    if (!answers.length) return

    const targetIndex = Math.max(0, deps.currentQuestionIndex - 1)
    const targetQuestion = deps.clarifyingQuestions[targetIndex] ?? null
    const targetAnswer = answers[targetIndex] ?? null
    const answerText = (targetAnswer?.answer ?? '').trim()
    deps.setLastRemovedClarifyingAnswer({
      questionId: targetQuestion?.id ?? null,
      answer: targetAnswer?.answer ?? null,
    })

    const isOwnAnswer =
      targetQuestion && targetQuestion.options.length > 0
        ? !targetQuestion.options.some((opt) => opt.label.trim().toLowerCase() === answerText.toLowerCase())
        : true

    deps.setClarifyingAnswers(answers, targetIndex)
    deps.setCurrentQuestionIndex(targetIndex)
    deps.setAnsweringQuestions(true)
    deps.setAwaitingQuestionConsent(false)

    if (isOwnAnswer && answerText) {
      deps.setValue(answerText)
      deps.setClarifyingSelectedOptionIndex(-2)
      deps.focusInputToEnd()
    } else {
      deps.setValue('')
      deps.blurInput()
      if (targetQuestion && targetQuestion.options.length > 0 && answerText) {
        const matchingOptionIndex = targetQuestion.options.findIndex(
          (opt) => opt.label.trim().toLowerCase() === answerText.toLowerCase()
        )
        if (matchingOptionIndex >= 0) {
          deps.setClarifyingSelectedOptionIndex(matchingOptionIndex)
        } else {
          deps.setClarifyingSelectedOptionIndex(null)
        }
      } else {
        deps.setClarifyingSelectedOptionIndex(null)
      }
    }

    if (targetQuestion) {
      const remaining = Math.max(0, deps.clarifyingQuestions.length - (targetIndex + 1))
      deps.setActivity({
        task: deps.pendingTask ?? '',
        stage: 'clarifying',
        status: 'loading',
        message: `Clarifying ${targetIndex + 1}/${deps.clarifyingQuestions.length}${
          remaining ? ` · ${remaining} left` : ''
        }`,
        detail: 'Answer a few quick questions to sharpen your prompt.',
      })
    } else {
      deps.setActivity(null)
    }
  }
}
