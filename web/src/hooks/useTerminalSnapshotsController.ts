'use client'

import { useMemo } from 'react'
import { useTerminalSnapshots } from '@/hooks/useTerminalSnapshots'
import type { ClarifyingAnswer, ClarifyingQuestion, TerminalLine, Preferences } from '@/lib/types'
import type { PreferenceKey } from '@/features/terminal/terminalState'

export type TerminalSnapshotState = {
  lines: TerminalLine[]
  editablePrompt: string | null
  pendingTask: string | null
  clarifyingQuestions: ClarifyingQuestion[] | null
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  currentQuestionIndex: number
  answeringQuestions: boolean
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  clarifyingSelectedOptionIndex: number | null
  isPromptEditable: boolean
  isPromptFinalized: boolean
  lastApprovedPrompt: string | null
  headerHelpShown: boolean
  hasRunInitialTask: boolean
  isAskingPreferenceQuestions: boolean
  currentPreferenceQuestionKey: PreferenceKey | null
  preferenceSelectedOptionIndex: number | null
  pendingPreferenceUpdates: Partial<Preferences>
  lastSnapshot: unknown
}

export type TerminalSnapshotActions = {
  appendLine: (role: 'system' | 'user' | 'app', text: string) => void
  setLines: (next: TerminalLine[] | ((prev: TerminalLine[]) => TerminalLine[])) => void
  setEditablePrompt: (value: string | null) => void
  setPendingTask: (value: string | null) => void
  setClarifyingQuestions: (value: ClarifyingQuestion[] | null) => void
  setClarifyingAnswers: (value: ClarifyingAnswer[], currentIndex: number) => void
  setCurrentQuestionIndex: (value: number) => void
  setAnsweringQuestions: (value: boolean) => void
  setAwaitingQuestionConsent: (value: boolean) => void
  setConsentSelectedIndex: (value: number | null) => void
  setClarifyingSelectedOptionIndex: (value: number | null) => void
  setIsPromptEditable: (value: boolean) => void
  setIsPromptFinalized: (value: boolean) => void
  setLastApprovedPrompt: (value: string | null) => void
  setHeaderHelpShown: (value: boolean) => void
  setHasRunInitialTask: (value: boolean) => void
  setIsAskingPreferenceQuestions: (value: boolean) => void
  setCurrentPreferenceQuestionKey: (value: PreferenceKey | null) => void
  setPreferenceSelectedOptionIndex: (value: number | null) => void
  setPendingPreferenceUpdates: (value: Partial<Preferences>) => void
  setLastHistory: (
    value: Array<{ id: string; task: string; label: string; body: string; created_at: string }> | null
  ) => void
  setLastSnapshot: (value: TerminalSnapshotState['lastSnapshot']) => void
  setLikeState: (value: 'none' | 'liked' | 'disliked') => void
  setValue: (next: string) => void
  clearDraft: () => void
  resetClarifyingFlowState: () => void
}

export function useTerminalSnapshotsController(state: TerminalSnapshotState, actions: TerminalSnapshotActions) {
  const snapshots = useTerminalSnapshots({
    ...state,
    ...actions,
  })

  return useMemo(
    () => ({
      handleClear: snapshots.handleClear,
      handleDiscard: snapshots.handleDiscard,
      handleStartNewConversation: snapshots.handleStartNewConversation,
      handleRestore: snapshots.handleRestore,
      handleHistory: snapshots.handleHistory,
      handleUseFromHistory: snapshots.handleUseFromHistory,
    }),
    [
      snapshots.handleClear,
      snapshots.handleDiscard,
      snapshots.handleHistory,
      snapshots.handleRestore,
      snapshots.handleStartNewConversation,
      snapshots.handleUseFromHistory,
    ]
  )
}
