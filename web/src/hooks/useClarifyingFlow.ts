'use client'

import { useCallback } from 'react'
import { generateClarifyingQuestions } from '@/services/promptService'
import { recordEvent } from '@/services/eventsService'
import { MESSAGE, ROLE } from '@/lib/constants'
import type { TerminalRole } from '@/lib/constants'
import type { ClarifyingAnswer, ClarifyingQuestion, Preferences } from '@/lib/types'
import type { PreferenceKey } from '@/features/terminal/terminalState'

export type ClarifyingFlowDeps = {
  pendingTask: string | null
  preferences: Preferences
  clarifyingQuestions: ClarifyingQuestion[] | null
  currentQuestionIndex: number
  generationRunIdRef: React.MutableRefObject<number>
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  setIsGenerating: (value: boolean) => void
  setClarifyingQuestions: (value: ClarifyingQuestion[] | null) => void
  setClarifyingAnswers: (value: ClarifyingAnswer[], currentIndex: number) => void
  setCurrentQuestionIndex: (value: number) => void
  setAnsweringQuestions: (value: boolean) => void
  setAwaitingQuestionConsent: (value: boolean) => void
  setConsentSelectedIndex: (value: number | null) => void
  setClarifyingSelectedOptionIndex: (value: number | null) => void
  appendLine: (role: TerminalRole, text: string) => void
  focusInputToEnd: () => void
  getPreferencesToAsk: () => PreferenceKey[]
  startPreferenceQuestions: () => Promise<void>
  generateFinalPromptForTask: (
    task: string,
    answers: ClarifyingAnswer[],
    options?: { skipConsentCheck?: boolean }
  ) => Promise<void>
}

export function useClarifyingFlow({
  pendingTask,
  preferences,
  clarifyingQuestions,
  currentQuestionIndex,
  generationRunIdRef,
  clarifyingAnswersRef,
  setIsGenerating,
  setClarifyingQuestions,
  setClarifyingAnswers,
  setCurrentQuestionIndex,
  setAnsweringQuestions,
  setAwaitingQuestionConsent,
  setConsentSelectedIndex,
  setClarifyingSelectedOptionIndex,
  appendLine,
  focusInputToEnd,
  getPreferencesToAsk,
  startPreferenceQuestions,
  generateFinalPromptForTask,
}: ClarifyingFlowDeps) {
  const selectForQuestion = useCallback(
    (question: ClarifyingQuestion | null, hasBack: boolean) => {
      if (!question) {
        setClarifyingSelectedOptionIndex(null)
        return
      }
      if (question.options.length > 0) {
        setClarifyingSelectedOptionIndex(0)
        return
      }
      if (hasBack) {
        setClarifyingSelectedOptionIndex(-1)
        return
      }
      setClarifyingSelectedOptionIndex(null)
    },
    [setClarifyingSelectedOptionIndex]
  )

  const appendClarifyingQuestion = useCallback(
    (question: ClarifyingQuestion, index: number, total: number) => {
      appendLine(ROLE.APP, `Question ${index + 1}/${total}: ${question.question}`)
    },
    [appendLine]
  )

  const startClarifyingQuestions = useCallback(
    async (task: string) => {
      const runId = (generationRunIdRef.current += 1)
      setIsGenerating(true)
      appendLine(ROLE.APP, MESSAGE.ASKING_QUESTIONS)

      try {
        const questions = await generateClarifyingQuestions({ task, preferences })

        if (runId !== generationRunIdRef.current) {
          return
        }

        setIsGenerating(false)

        if (!questions.length) {
          setAwaitingQuestionConsent(false)
          setConsentSelectedIndex(null)
          setAnsweringQuestions(false)

          const prefsToAsk = getPreferencesToAsk()
          if (prefsToAsk.length > 0) {
            appendLine(
              ROLE.APP,
              'No clarifying questions needed. Asking your preferences, then I will generate the prompt.'
            )
            await startPreferenceQuestions()
          } else {
            appendLine(ROLE.APP, 'No clarifying questions needed. Generating your prompt now.')
            await generateFinalPromptForTask(task, [], { skipConsentCheck: true })
          }
          return
        }

        setClarifyingQuestions(questions)
        clarifyingAnswersRef.current = []
        setClarifyingAnswers([], 0)
        selectForQuestion(questions[0], false)
        setAwaitingQuestionConsent(false)
        setConsentSelectedIndex(null)
        setAnsweringQuestions(true)

        appendClarifyingQuestion(questions[0], 0, questions.length)
        focusInputToEnd()
      } catch (err) {
        if (runId === generationRunIdRef.current) {
          console.error('Failed to generate clarifying questions', err)
          appendLine(
            ROLE.APP,
            'Something went wrong while generating questions. I will try to create a prompt from your task directly.'
          )
          setIsGenerating(false)
          await generateFinalPromptForTask(task, [], { skipConsentCheck: true })
        }
      }
    },
    [
      appendClarifyingQuestion,
      appendLine,
      clarifyingAnswersRef,
      generateFinalPromptForTask,
      generationRunIdRef,
      getPreferencesToAsk,
      preferences,
      selectForQuestion,
      setAnsweringQuestions,
      setAwaitingQuestionConsent,
      setClarifyingAnswers,
      setClarifyingQuestions,
      setConsentSelectedIndex,
      setIsGenerating,
      focusInputToEnd,
      startPreferenceQuestions,
    ]
  )

  const handleQuestionConsent = useCallback(
    async (answer: string) => {
      const normalized = answer.trim().toLowerCase()

      if (!pendingTask) {
        appendLine(ROLE.APP, 'No task in memory. Describe a task first.')
        setAwaitingQuestionConsent(false)
        return
      }

      void recordEvent('question_consent', { task: pendingTask, answer: normalized })

      if (normalized === 'yes' || normalized === 'y') {
        setAwaitingQuestionConsent(false)
        setConsentSelectedIndex(null)
        if (clarifyingQuestions && clarifyingQuestions.length > 0) {
          const answered = clarifyingAnswersRef.current.length
          setAnsweringQuestions(true)
          setCurrentQuestionIndex(answered)
          const nextQuestion = clarifyingQuestions[Math.min(answered, clarifyingQuestions.length - 1)]
          selectForQuestion(nextQuestion ?? null, true)
          appendClarifyingQuestion(nextQuestion!, answered, clarifyingQuestions.length)
          focusInputToEnd()
        } else {
          await startClarifyingQuestions(pendingTask)
        }
        return
      }

      if (normalized === 'no' || normalized === 'n') {
        setAwaitingQuestionConsent(false)
        setConsentSelectedIndex(null)
        setAnsweringQuestions(false)
        appendLine(ROLE.APP, 'Skipping questions. Generating your prompt now.')
        await generateFinalPromptForTask(pendingTask, [], { skipConsentCheck: true })
        return
      }

      appendLine(ROLE.APP, 'Please answer "yes" or "no".')
      focusInputToEnd()
    },
    [
      appendClarifyingQuestion,
      appendLine,
      clarifyingAnswersRef,
      clarifyingQuestions,
      focusInputToEnd,
      generateFinalPromptForTask,
      pendingTask,
      selectForQuestion,
      setAnsweringQuestions,
      setAwaitingQuestionConsent,
      setConsentSelectedIndex,
      setCurrentQuestionIndex,
      startClarifyingQuestions,
    ]
  )

  const handleClarifyingAnswer = useCallback(
    async (answer: string) => {
      if (!clarifyingQuestions || !pendingTask) {
        appendLine(ROLE.APP, 'No active questions. Describe a task first.')
        setAnsweringQuestions(false)
        return
      }

      const index = currentQuestionIndex
      if (index < 0 || index >= clarifyingQuestions.length) {
        setAnsweringQuestions(false)
        return
      }

      const question = clarifyingQuestions[index]
      const trimmedAnswer = answer.trim()

      appendLine(ROLE.USER, trimmedAnswer)

      const updated: ClarifyingAnswer[] = [
        ...clarifyingAnswersRef.current,
        {
          questionId: question.id,
          question: question.question,
          answer: trimmedAnswer,
        },
      ]
      clarifyingAnswersRef.current = updated
      setClarifyingAnswers(updated, updated.length)
      void recordEvent('clarifying_answer', {
        task: pendingTask,
        questionId: question.id,
        question: question.question,
        answer: trimmedAnswer,
      })

      const nextIndex = index + 1
      if (nextIndex < clarifyingQuestions.length) {
        setCurrentQuestionIndex(nextIndex)
        const nextQuestion = clarifyingQuestions[nextIndex]
        selectForQuestion(nextQuestion, true)
        appendClarifyingQuestion(nextQuestion, nextIndex, clarifyingQuestions.length)
        focusInputToEnd()
      } else {
        setClarifyingSelectedOptionIndex(null)
        setAnsweringQuestions(false)
        const prefsToAsk = getPreferencesToAsk()
        if (prefsToAsk.length > 0) {
          void startPreferenceQuestions()
        } else {
          void generateFinalPromptForTask(pendingTask, updated)
        }
      }
    },
    [
      appendClarifyingQuestion,
      appendLine,
      clarifyingAnswersRef,
      clarifyingQuestions,
      currentQuestionIndex,
      focusInputToEnd,
      generateFinalPromptForTask,
      getPreferencesToAsk,
      pendingTask,
      selectForQuestion,
      setAnsweringQuestions,
      setClarifyingAnswers,
      setClarifyingSelectedOptionIndex,
      setCurrentQuestionIndex,
      startPreferenceQuestions,
    ]
  )

  const handleClarifyingOptionClick = useCallback(
    (index: number) => {
      if (!clarifyingQuestions || !pendingTask) return
      const current = clarifyingQuestions[currentQuestionIndex]
      if (!current || !current.options || index < 0 || index >= current.options.length) return
      const chosen = current.options[index]
      setClarifyingSelectedOptionIndex(index)
      void handleClarifyingAnswer(chosen.label)
      focusInputToEnd()
    },
    [
      clarifyingQuestions,
      currentQuestionIndex,
      focusInputToEnd,
      handleClarifyingAnswer,
      pendingTask,
      setClarifyingSelectedOptionIndex,
    ]
  )

  const handleUndoAnswer = useCallback(() => {
    if (!clarifyingQuestions || !pendingTask) {
      appendLine(ROLE.APP, 'No clarifying flow active.')
      return
    }
    const answers = clarifyingAnswersRef.current
    if (!answers.length) {
      setAnsweringQuestions(false)
      setAwaitingQuestionConsent(true)
      setConsentSelectedIndex(0)
      setClarifyingSelectedOptionIndex(null)
      setCurrentQuestionIndex(0)
      appendLine(ROLE.APP, 'Do you want to answer the clarifying questions? (yes/no)')
      setTimeout(() => focusInputToEnd(), 0)
      return
    }
    const nextAnswers = answers.slice(0, -1)
    clarifyingAnswersRef.current = nextAnswers
    const prevIndex = Math.max(0, nextAnswers.length)
    setClarifyingAnswers(nextAnswers, prevIndex)
    setCurrentQuestionIndex(prevIndex)
    const prevQuestion = clarifyingQuestions[prevIndex]
    selectForQuestion(prevQuestion ?? null, true)
    setAnsweringQuestions(true)
    setAwaitingQuestionConsent(false)
    appendLine(ROLE.APP, `Revisit question ${prevIndex + 1}: ${prevQuestion?.question ?? ''}`)
    focusInputToEnd()
  }, [
    appendLine,
    clarifyingAnswersRef,
    clarifyingQuestions,
    focusInputToEnd,
    pendingTask,
    selectForQuestion,
    setAnsweringQuestions,
    setAwaitingQuestionConsent,
    setClarifyingAnswers,
    setClarifyingSelectedOptionIndex,
    setConsentSelectedIndex,
    setCurrentQuestionIndex,
  ])

  return {
    startClarifyingQuestions,
    handleQuestionConsent,
    handleClarifyingOptionClick,
    handleClarifyingAnswer,
    handleUndoAnswer,
    selectForQuestion,
    appendClarifyingQuestion,
  }
}
