'use client'

import React from 'react'
import { COMMAND, MESSAGE, MIN_TASK_LENGTH, MAX_TASK_LENGTH, ROLE, type TerminalRole } from '@/lib/constants'
import type {
  ClarifyingAnswer,
  ClarifyingQuestion,
  GenerationMode,
  PreferencesStep,
  TerminalLine,
  TerminalStatus,
} from '@/lib/types'
import type { TaskActivity } from '@/lib/types'
import type { PreferenceKey } from '@/features/terminal/terminalState'
import { recordEvent } from '@/services/eventsService'

const debugFlow = process.env.NEXT_PUBLIC_DEBUG_FLOW === 'true'
const logFlow = (...args: unknown[]) => {
  if (!debugFlow) return
  console.info('[pf:flow]', ...args)
}

type TaskFlowState = {
  isGenerating: boolean
  value: string
  lines: TerminalLine[]
  preferencesStep: PreferencesStep
  awaitingQuestionConsent: boolean
  pendingTask: string | null
  consentSelectedIndex: number | null
  answeringQuestions: boolean
  clarifyingQuestions: ClarifyingQuestion[] | null
  clarifyingAnswers: ClarifyingAnswer[]
  currentQuestionIndex: number
  isAskingPreferenceQuestions: boolean
  currentPreferenceQuestionKey: PreferenceKey | null
  hasRunInitialTask: boolean
  isRevising: boolean
  generationMode: GenerationMode
  editablePrompt: string | null
}

type TaskFlowActions = {
  setValue: (next: string) => void
  appendLine: (role: TerminalRole, text: string | TerminalStatus) => void
  setActivity: (activity: TaskActivity | null) => void
  handleCommand: (line: string) => void
  advancePreferences: (answer: string) => void
  handleQuestionConsent: (answer: string) => Promise<void>
  handleClarifyingAnswer: (answer: string) => Promise<void>
  handlePreferenceAnswer: (answer: string) => void
  runEditPrompt: (instructions: string) => void
  setHasRunInitialTask: (value: boolean) => void
  setPendingTask: (value: string | null) => void
  resetClarifyingFlowState: () => void
  resetPreferenceFlowState: () => void
  setEditablePrompt: (value: string | null) => void
  setIsPromptEditable: (value: boolean) => void
  setIsPromptFinalized: (value: boolean) => void
  setLikeState: (value: 'none' | 'liked' | 'disliked') => void
  setAwaitingQuestionConsent: (value: boolean) => void
  setConsentSelectedIndex: (value: number | null) => void
  startClarifyingQuestions: (task: string, options?: { allowUnclear?: boolean }) => Promise<void>
  setAnsweringQuestions: (value: boolean) => void
  setCurrentQuestionIndex: (value: number) => void
  selectForQuestion: (question: ClarifyingQuestion | null, hasBack: boolean) => void
  appendClarifyingQuestion: (question: ClarifyingQuestion, index: number, total: number) => void
  focusInputToEnd: () => void
  guardedGenerateFinalPromptForTask: (
    task: string,
    answers: ClarifyingAnswer[],
    options?: { skipConsentCheck?: boolean; allowUnclear?: boolean }
  ) => Promise<void>
  setIsRevising: (value: boolean) => void
  setClarifyingSelectedOptionIndex: (value: number | null) => void
  setLastApprovedPrompt: (value: string | null) => void
  ensureAllowUnclearForTask?: (task: string) => void
  shouldAllowUnclearForTask?: (task: string) => boolean
  resetAllowUnclear?: () => void
}

export type TaskFlowDeps = {
  state: TaskFlowState
  actions: TaskFlowActions
}

export function createTaskFlowHandlers({ state, actions }: TaskFlowDeps) {
  async function handleTask(line: string, options?: { allowUnclear?: boolean }) {
    const task = line.trim()
    if (!task) return
    actions.ensureAllowUnclearForTask?.(task)

    const isEditingExisting = state.hasRunInitialTask && Boolean(state.editablePrompt)
    const minLength = isEditingExisting ? 2 : MIN_TASK_LENGTH

    logFlow('handleTask:start', { generationMode: state.generationMode, taskLength: task.length })
    void recordEvent('task_submitted', { task })
    actions.setActivity({
      task,
      stage: 'collecting',
      status: 'loading',
      message: 'Received your task',
      detail: 'Preparing the best path to generate your prompt.',
    })
    if (task.length < minLength) {
      logFlow('handleTask:reject_short', { taskLength: task.length })
      actions.appendLine(ROLE.APP, `Please enter at least ${minLength} characters.`)
      return
    }
    if (task.length > MAX_TASK_LENGTH) {
      logFlow('handleTask:reject_long', { taskLength: task.length })
      actions.appendLine(ROLE.APP, 'Task is too long (max ~4000 characters). Trim it down and try again.')
      return
    }

    if (
      state.isRevising &&
      state.pendingTask &&
      task === state.pendingTask &&
      state.clarifyingQuestions &&
      state.clarifyingQuestions.length > 0
    ) {
      logFlow('handleTask:reuse_clarifying', {
        pendingTask: state.pendingTask,
        answered: state.clarifyingAnswers.length,
        totalQuestions: state.clarifyingQuestions.length,
      })
      actions.setIsRevising(false)
      actions.setHasRunInitialTask(true)
      actions.setAwaitingQuestionConsent(false)
      const answered = state.clarifyingAnswers.length
      if (answered < state.clarifyingQuestions.length) {
        actions.setAnsweringQuestions(true)
        actions.setCurrentQuestionIndex(answered)
        const nextQuestion = state.clarifyingQuestions[answered]
        if (!nextQuestion) {
          return
        }
        actions.selectForQuestion(nextQuestion ?? null, answered > 0)
        actions.appendClarifyingQuestion(nextQuestion, answered, state.clarifyingQuestions.length)
        actions.focusInputToEnd()
      } else {
        await actions.guardedGenerateFinalPromptForTask(task, state.clarifyingAnswers)
      }
      actions.setValue('')
      return
    }

    actions.setIsRevising(false)
    const isGuided = state.generationMode === 'guided'

    if (state.hasRunInitialTask && state.editablePrompt) {
      actions.runEditPrompt(task)
      return
    }

    actions.resetAllowUnclear?.()
    actions.setHasRunInitialTask(true)
    actions.setPendingTask(task)
    actions.resetClarifyingFlowState()
    actions.resetPreferenceFlowState()
    actions.setEditablePrompt(null)
    actions.setIsPromptEditable(false)
    actions.setIsPromptFinalized(false)
    actions.setLikeState('none')
    actions.setAwaitingQuestionConsent(false)
    actions.setConsentSelectedIndex(null)

    const allowUnclear = options?.allowUnclear ?? actions.shouldAllowUnclearForTask?.(task)

    if (!isGuided) {
      logFlow('handleTask:quick_mode', { pendingTask: task })
      await actions.guardedGenerateFinalPromptForTask(task, [], { skipConsentCheck: true, allowUnclear })
      return
    }

    logFlow('handleTask:guided_mode_start_clarifying', { pendingTask: task })
    actions.setActivity({
      task,
      stage: 'clarifying',
      status: 'loading',
      message: 'Guided Build is on',
      detail: 'Answering these questions improves the quality of your prompt.',
    })
    await actions.startClarifyingQuestions(task, {
      allowUnclear,
    })
  }

  function submitCurrent() {
    if (state.isGenerating) {
      return
    }

    const raw = state.value
    const line = raw.trim()
    if (!line) {
      return
    }

    if (line.startsWith('/')) {
      const [command] = line.trim().split(/\s+/)
      if (command === COMMAND.CLEAR) {
        const isEmpty =
          state.lines.length === 1 &&
          state.lines[0]?.role === ROLE.SYSTEM &&
          (state.lines[0]?.text === MESSAGE.WELCOME ||
            state.lines[0]?.text === MESSAGE.WELCOME_FRESH ||
            state.lines[0]?.text === MESSAGE.HISTORY_CLEARED)
        if (isEmpty) {
          actions.setValue('')
          return
        }
      }
    }

    if (line.startsWith('/')) {
      actions.appendLine(ROLE.USER, raw)
      actions.handleCommand(line)
      actions.setValue('')
      return
    }

    if (state.preferencesStep) {
      actions.appendLine(ROLE.USER, raw)
      actions.advancePreferences(line)
      actions.setValue('')
      return
    }

    if (state.awaitingQuestionConsent && state.pendingTask) {
      const mapIndexToAnswer = (idx: number | null): string | null => {
        if (idx === 0) return 'no'
        if (idx === 1) return 'yes'
        return null
      }

      const mapped =
        mapIndexToAnswer(state.consentSelectedIndex) ??
        (line.toLowerCase() === 'generate' || line.toLowerCase() === 'gen' || line.toLowerCase() === 'now'
          ? 'no'
          : line.toLowerCase() === 'sharpen'
          ? 'yes'
          : null)

      if (!mapped) {
        actions.appendLine(ROLE.APP, 'Choose an option below to continue.')
        actions.setValue('')
        return
      }

      actions.appendLine(ROLE.USER, mapped === 'yes' ? 'Sharpen first' : 'Generate now')
      void actions.handleQuestionConsent(mapped)
      actions.setValue('')
      return
    }

    if (
      state.answeringQuestions &&
      state.clarifyingQuestions &&
      state.clarifyingQuestions.length > 0 &&
      state.currentQuestionIndex < state.clarifyingQuestions.length &&
      state.pendingTask
    ) {
      void actions.handleClarifyingAnswer(line)
      actions.setValue('')
      return
    }

    if (state.isAskingPreferenceQuestions && state.currentPreferenceQuestionKey) {
      actions.handlePreferenceAnswer(line)
      actions.setValue('')
      return
    }

    void handleTask(line)
    actions.setValue('')
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitCurrent()
  }

  return { handleTask, submitCurrent, handleFormSubmit }
}
