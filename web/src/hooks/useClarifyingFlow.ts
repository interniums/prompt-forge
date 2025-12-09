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
  appendLine: (role: TerminalRole, text: string | TerminalStatus) => void
  setActivity: (activity: TaskActivity | null) => void
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
  appendLine,
  setActivity,
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
      selectForQuestion(questions[0], false)
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      setAnsweringQuestions(true)
      setActivity({
        task: pendingTask ?? '',
        stage: 'clarifying',
        status: 'loading',
        message: `Clarifying ${1}/${questions.length}`,
        detail: questions[0]?.question ?? undefined,
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
        setActivity({
          task: pendingTask,
          stage: 'clarifying',
          status: 'loading',
          message: `Clarifying ${nextIndex + 1}/${clarifyingQuestions.length}`,
          detail: nextQuestion?.question ?? undefined,
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
      const firstQuestion = clarifyingQuestions[0] ?? null
      setAnsweringQuestions(Boolean(firstQuestion))
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      setClarifyingSelectedOptionIndex(null)
      setCurrentQuestionIndex(0)
      if (firstQuestion) {
        selectForQuestion(firstQuestion, false)
        appendClarifyingQuestion(firstQuestion, 0, clarifyingQuestions.length)
      }
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
    logFlow('clarifying:undo', { prevIndex, questionId: prevQuestion?.id })
    focusInputToEnd()
  }, [
    appendClarifyingQuestion,
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
