'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { PreferencesStep, ClarifyingAnswer, ClarifyingQuestion, TerminalLine } from '@/lib/types'
import type { GenerationMode } from '@/lib/types'
import type { PreferenceKey } from '@/features/terminal/terminalState'
import type { LikeState } from '@/features/terminal/state/terminalStore'
import type { TaskFlowDeps } from '@/features/terminal/logic/taskFlow'
import { createTaskFlowHandlers } from '@/features/terminal/logic/taskFlow'

type TaskFlowHandlers = {
  submitCurrent: () => void
  handleFormSubmit: (e: React.FormEvent) => void
}

export type TaskFlowStateSlice = {
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

export type TaskFlowActionsSlice = TaskFlowDeps['actions'] & {
  setLikeState: (value: LikeState) => void
  resetAllowUnclear: () => void
  setClarifyingSelectedOptionIndex: (value: number | null) => void
  setLastApprovedPrompt: (value: string | null) => void
}

export function useTaskFlowHandlers({
  state,
  actions,
}: {
  state: TaskFlowStateSlice
  actions: TaskFlowActionsSlice
}): TaskFlowHandlers {
  const taskFlowHandlersRef = useRef<TaskFlowHandlers | null>(null)

  useEffect(() => {
    taskFlowHandlersRef.current = createTaskFlowHandlers({ state, actions })
  }, [actions, state])

  const submitCurrent = useCallback(() => taskFlowHandlersRef.current?.submitCurrent(), [])
  const handleFormSubmit = useCallback((e: React.FormEvent) => taskFlowHandlersRef.current?.handleFormSubmit(e), [])

  return { submitCurrent, handleFormSubmit }
}
