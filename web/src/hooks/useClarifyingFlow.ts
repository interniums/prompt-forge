'use client'

import { useCallback } from 'react'
import { generateClarifyingQuestions } from '@/services/promptService'
import { recordEvent } from '@/services/eventsService'
import { ROLE } from '@/lib/constants'
import type { TerminalRole } from '@/lib/constants'
import type { ClarifyingAnswer, ClarifyingQuestion, Preferences, TerminalStatus, TaskActivity } from '@/lib/types'
import type { PreferenceKey } from '@/features/terminal/terminalState'

const debugFlow = process.env.NEXT_PUBLIC_DEBUG_FLOW === 'true'
const logFlow = (...args: unknown[]) => {
  if (!debugFlow) return
  console.info('[pf:flow]', ...args)
}

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
  setHasRunInitialTask: (value: boolean) => void
  setValue: (value: string) => void
  appendLine: (role: TerminalRole, text: string | TerminalStatus) => void
  setActivity: (activity: TaskActivity | null) => void
  showToast: (msg: string) => void
  focusInputToEnd: () => void
  getPreferencesToAsk: () => PreferenceKey[]
  startPreferenceQuestions: () => Promise<void>
  generateFinalPromptForTask: (
    task: string,
    answers: ClarifyingAnswer[],
    options?: { skipConsentCheck?: boolean }
  ) => Promise<void>
}

const FALLBACK_QUESTIONS: ClarifyingQuestion[] = [
  {
    id: 'fallback_outcome',
    question: 'What outcome do you want?',
    options: [],
  },
  {
    id: 'fallback_audience',
    question: 'Who is this for?',
    options: [
      { id: 'a', label: 'Customers' },
      { id: 'b', label: 'Internal team' },
      { id: 'c', label: 'Just me' },
      { id: 'd', label: 'Not sure' },
    ],
  },
  {
    id: 'fallback_style',
    question: 'How should it be written?',
    options: [
      { id: 'a', label: 'Concise bullets' },
      { id: 'b', label: 'Narrative' },
      { id: 'c', label: 'Steps' },
      { id: 'd', label: 'No preference' },
    ],
  },
]

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
  setHasRunInitialTask,
  setValue,
  appendLine,
  setActivity,
  showToast,
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
        setClarifyingSelectedOptionIndex(null)
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

  // Do not log clarifying questions into the transcript; UI handles display.
  const appendClarifyingQuestion = useCallback((_question?: ClarifyingQuestion, _index?: number, _total?: number) => {
    void _question
    void _index
    void _total
  }, [])

  const beginQuestionFlow = useCallback(
    (questions: ClarifyingQuestion[]) => {
      if (!questions.length) return
      logFlow('clarifying:begin', { count: questions.length, firstId: questions[0]?.id })
      setClarifyingQuestions(questions)
      clarifyingAnswersRef.current = []
      setClarifyingAnswers([], 0)
      selectForQuestion(questions[0], true)
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      setAnsweringQuestions(true)
      const remaining = Math.max(0, questions.length - 1)
      setActivity({
        task: pendingTask ?? '',
        stage: 'clarifying',
        status: 'loading',
        message: `Clarifying ${1}/${questions.length}${remaining ? ` · ${remaining} left` : ''}`,
        detail: 'Answering these questions improves the quality of your prompt.',
      })
      appendClarifyingQuestion(questions[0], 0, questions.length)
      focusInputToEnd()
    },
    [
      appendClarifyingQuestion,
      clarifyingAnswersRef,
      focusInputToEnd,
      pendingTask,
      selectForQuestion,
      setAnsweringQuestions,
      setActivity,
      setAwaitingQuestionConsent,
      setClarifyingAnswers,
      setClarifyingQuestions,
      setConsentSelectedIndex,
    ]
  )

  const startClarifyingQuestions = useCallback(
    async (task: string) => {
      const runId = (generationRunIdRef.current += 1)
      logFlow('clarifying:start', { task, runId })
      setIsGenerating(true)
      setActivity({
        task,
        stage: 'clarifying',
        status: 'loading',
        message: 'Preparing clarifying questions',
        detail: 'Finding the quickest questions to sharpen your task.',
      })

      try {
        const questions = await generateClarifyingQuestions({ task, preferences })
        logFlow('clarifying:received', { runId, count: questions.length })

        if (runId !== generationRunIdRef.current) {
          logFlow('clarifying:stale_run', { runId, current: generationRunIdRef.current })
          return
        }

        setIsGenerating(false)
        setActivity({
          task,
          stage: 'clarifying',
          status: 'success',
          message: 'Clarifying ready',
          detail: 'Answer a few quick questions to tailor the prompt.',
        })

        beginQuestionFlow(questions.length ? questions : FALLBACK_QUESTIONS)
      } catch (err) {
        logFlow('clarifying:error', { runId, error: err instanceof Error ? err.message : String(err) })
        if (runId === generationRunIdRef.current) {
          console.error('Failed to generate clarifying questions', err)
          const code = (err as { code?: string }).code
          if (code === 'QUOTA_EXCEEDED') {
            showToast('Plan limit reached. Quota resets next cycle.')
            setActivity({
              task,
              stage: 'clarifying',
              status: 'error',
              message: 'Plan limit reached',
              detail: 'You have reached your plan quota. Upgrade or wait for the next cycle.',
            })
            setIsGenerating(false)
            return
          }
          if (code === 'RATE_LIMITED') {
            showToast('Too many requests. Please wait and try again.')
            setActivity({
              task,
              stage: 'clarifying',
              status: 'error',
              message: 'Too many requests',
              detail: 'You are sending requests too quickly. Please wait and try again.',
            })
            setIsGenerating(false)
            return
          }

          showToast('System error. Please try again soon.')

          setActivity({
            task,
            stage: 'clarifying',
            status: 'error',
            message: 'Questions unavailable',
            detail: 'Could not generate clarifying questions. Using fallback instead.',
          })
          setIsGenerating(false)
          beginQuestionFlow(FALLBACK_QUESTIONS)
        }
      }
    },
    [beginQuestionFlow, generationRunIdRef, preferences, setIsGenerating, setActivity]
  )

  const handleQuestionConsent = useCallback(
    async (answer: string) => {
      const raw = answer.trim().toLowerCase()
      const normalized = raw === 'generate' || raw === 'gen' || raw === 'now' ? 'no' : raw === 'sharpen' ? 'yes' : raw

      logFlow('clarifying:consent', { raw, normalized, pendingTask })
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
        setActivity({
          task: pendingTask,
          stage: 'generating',
          status: 'loading',
          message: 'Generating without questions',
          detail: 'Skipping clarifying; creating your prompt now.',
        })
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
      setActivity,
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
        logFlow('clarifying:answer_out_of_bounds', { index, total: clarifyingQuestions.length })
        setAnsweringQuestions(false)
        return
      }

      const question = clarifyingQuestions[index]
      const trimmedAnswer = answer.trim()

      logFlow('clarifying:answer', { questionId: question.id, index, trimmedAnswer })

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
        const remaining = Math.max(0, clarifyingQuestions.length - (nextIndex + 1))
        setActivity({
          task: pendingTask,
          stage: 'clarifying',
          status: 'loading',
          message: `Clarifying ${nextIndex + 1}/${clarifyingQuestions.length}${
            remaining ? ` · ${remaining} left` : ''
          }`,
          detail: 'Answering these questions improves the quality of your prompt.',
        })
        appendClarifyingQuestion(nextQuestion, nextIndex, clarifyingQuestions.length)
        focusInputToEnd()
      } else {
        logFlow('clarifying:complete', { answers: updated.length })
        setClarifyingSelectedOptionIndex(null)
        setAnsweringQuestions(false)
        const prefsToAsk = getPreferencesToAsk()
        if (prefsToAsk.length > 0) {
          logFlow('preferences:start_after_clarifying', { prefsToAsk })
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
      setActivity,
      startPreferenceQuestions,
    ]
  )

  const handleClarifyingOptionClick = useCallback(
    (index: number) => {
      if (!clarifyingQuestions || !pendingTask) return
      const current = clarifyingQuestions[currentQuestionIndex]
      if (!current || !current.options || index < 0 || index >= current.options.length) return
      const chosen = current.options[index]
      logFlow('clarifying:option', { questionId: current.id, option: chosen.label, index })
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
      return
    }
    const answers = clarifyingAnswersRef.current
    if (!answers.length) {
      logFlow('clarifying:undo_empty')
      // Return to mode selection while keeping the typed task.
      setAnsweringQuestions(false)
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      setClarifyingSelectedOptionIndex(null)
      setClarifyingQuestions(null)
      clarifyingAnswersRef.current = []
      setClarifyingAnswers([], 0)
      setCurrentQuestionIndex(0)
      setHasRunInitialTask(false)
      setValue(pendingTask ?? '')
      setActivity(null)
      setTimeout(() => focusInputToEnd(), 0)
      return
    }
    const lastAnswer = answers[answers.length - 1]
    const nextAnswers = answers.slice(0, -1)
    clarifyingAnswersRef.current = nextAnswers

    // Return to the just-removed question for editing, showing the saved answer.
    const targetIndex = Math.max(0, answers.length - 1)
    const targetQuestion = clarifyingQuestions[targetIndex] ?? null

    let resolvedSelection: number | null = null
    if (targetQuestion && lastAnswer?.answer) {
      const trimmed = lastAnswer.answer.trim()
      if (trimmed) {
        if (targetQuestion.options.length > 0) {
          const optIndex = targetQuestion.options.findIndex((opt) => opt.label === trimmed)
          resolvedSelection = optIndex >= 0 ? optIndex : -2 // typed custom answer
        } else {
          resolvedSelection = -2
        }
      }
    }

    setClarifyingSelectedOptionIndex(resolvedSelection)
    setClarifyingAnswers(nextAnswers, targetIndex)
    setCurrentQuestionIndex(targetIndex)
    setAnsweringQuestions(true)
    setAwaitingQuestionConsent(false)
    setValue(lastAnswer?.answer ?? '')

    if (targetQuestion) {
      const remaining = Math.max(0, clarifyingQuestions.length - (targetIndex + 1))
      setActivity({
        task: pendingTask ?? '',
        stage: 'clarifying',
        status: 'loading',
        message: `Clarifying ${targetIndex + 1}/${clarifyingQuestions.length}${
          remaining ? ` · ${remaining} left` : ''
        }`,
        detail: 'Answer a few quick questions to sharpen your prompt.',
      })
    } else {
      setActivity(null)
    }

    logFlow('clarifying:undo', { targetIndex, questionId: targetQuestion?.id })
    focusInputToEnd()
  }, [
    clarifyingAnswersRef,
    clarifyingQuestions,
    focusInputToEnd,
    setValue,
    pendingTask,
    setAnsweringQuestions,
    setAwaitingQuestionConsent,
    setClarifyingAnswers,
    setClarifyingSelectedOptionIndex,
    setConsentSelectedIndex,
    setCurrentQuestionIndex,
    setClarifyingQuestions,
    setHasRunInitialTask,
    setActivity,
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
