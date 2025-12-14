'use client'

import { useCallback } from 'react'
import type React from 'react'
import type {
  ClarifyingAnswer,
  ClarifyingQuestion,
  GenerationMode,
  HistoryItem,
  Preferences,
  TerminalLine,
  TaskActivity,
} from '@/lib/types'
import type { PreferenceKey, SessionSnapshot } from '@/features/terminal/terminalState'
import { ROLE, MESSAGE } from '@/lib/constants'

type SnapshotDeps = {
  lines: TerminalLine[]
  activity: TaskActivity | null
  editablePrompt: string | null
  promptEditDiff: { previous: string; current: string } | null
  pendingTask: string | null
  clarifyingQuestions: ClarifyingQuestion[] | null
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  currentQuestionIndex: number
  answeringQuestions: boolean
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  clarifyingSelectedOptionIndex: number | null
  generationMode: GenerationMode
  isPromptEditable: boolean
  isPromptFinalized: boolean
  lastApprovedPrompt: string | null
  headerHelpShown: boolean
  hasRunInitialTask: boolean
  isAskingPreferenceQuestions: boolean
  currentPreferenceQuestionKey: PreferenceKey | null
  preferenceSelectedOptionIndex: number | null
  pendingPreferenceUpdates: Partial<Preferences>
  lastSnapshot: SessionSnapshot | null
  setLines: (next: TerminalLine[]) => void
  setActivity: (value: TaskActivity | null) => void
  setEditablePrompt: (value: string | null) => void
  setPromptEditDiff: (value: { previous: string; current: string } | null) => void
  setPendingTask: (value: string | null) => void
  setClarifyingQuestions: (questions: ClarifyingQuestion[] | null) => void
  setClarifyingAnswers: (answers: ClarifyingAnswer[], currentIndex: number) => void
  setCurrentQuestionIndex: (value: number) => void
  setAnsweringQuestions: (value: boolean) => void
  setAwaitingQuestionConsent: (value: boolean) => void
  setConsentSelectedIndex: (value: number | null) => void
  setClarifyingSelectedOptionIndex: (value: number | null) => void
  setGenerationMode: (value: GenerationMode) => void
  setIsPromptEditable: (value: boolean) => void
  setIsPromptFinalized: (value: boolean) => void
  setLastApprovedPrompt: (value: string | null) => void
  setHeaderHelpShown: (value: boolean) => void
  setHasRunInitialTask: (value: boolean) => void
  setIsAskingPreferenceQuestions: (value: boolean) => void
  setCurrentPreferenceQuestionKey: (value: PreferenceKey | null) => void
  setPreferenceSelectedOptionIndex: (value: number | null) => void
  setPendingPreferenceUpdates: (value: Partial<Preferences>) => void
  setLikeState: (value: 'none' | 'liked') => void
  setLastHistory: (value: HistoryItem[] | null) => void
  setLastSnapshot: (value: SessionSnapshot | null) => void
  setValue: (value: string) => void
  clearDraft: () => void
  resetClarifyingFlowState: () => void
}

export function useTerminalSnapshots(deps: SnapshotDeps) {
  const {
    lines,
    editablePrompt,
    promptEditDiff,
    pendingTask,
    clarifyingQuestions,
    clarifyingAnswersRef,
    currentQuestionIndex,
    answeringQuestions,
    awaitingQuestionConsent,
    consentSelectedIndex,
    clarifyingSelectedOptionIndex,
    generationMode,
    isPromptEditable,
    isPromptFinalized,
    lastApprovedPrompt,
    headerHelpShown,
    hasRunInitialTask,
    isAskingPreferenceQuestions,
    currentPreferenceQuestionKey,
    preferenceSelectedOptionIndex,
    pendingPreferenceUpdates,
    lastSnapshot,
    setLines,
    setActivity,
    setEditablePrompt,
    setPromptEditDiff,
    setPendingTask,
    setClarifyingQuestions,
    setClarifyingAnswers,
    setCurrentQuestionIndex,
    setAnsweringQuestions,
    setAwaitingQuestionConsent,
    setConsentSelectedIndex,
    setClarifyingSelectedOptionIndex,
    setGenerationMode,
    setIsPromptEditable,
    setIsPromptFinalized,
    setLastApprovedPrompt,
    setHeaderHelpShown,
    setHasRunInitialTask,
    setIsAskingPreferenceQuestions,
    setCurrentPreferenceQuestionKey,
    setPreferenceSelectedOptionIndex,
    setPendingPreferenceUpdates,
    setLikeState,
    setLastHistory,
    setLastSnapshot,
    setValue,
    clearDraft,
    resetClarifyingFlowState,
  } = deps

  const saveSnapshot = useCallback(() => {
    setLastSnapshot({
      lines,
      editablePrompt,
      promptEditDiff,
      pendingTask,
      clarifyingQuestions,
      clarifyingAnswers: [...clarifyingAnswersRef.current],
      currentQuestionIndex,
      answeringQuestions,
      awaitingQuestionConsent,
      consentSelectedIndex,
      clarifyingSelectedOptionIndex,
      generationMode,
      isPromptEditable,
      isPromptFinalized,
      lastApprovedPrompt,
      headerHelpShown,
      hasRunInitialTask,
      isAskingPreferenceQuestions,
      currentPreferenceQuestionKey,
      preferenceSelectedOptionIndex,
      pendingPreferenceUpdates,
    })
  }, [
    answeringQuestions,
    awaitingQuestionConsent,
    clarifyingAnswersRef,
    clarifyingQuestions,
    clarifyingSelectedOptionIndex,
    consentSelectedIndex,
    generationMode,
    currentPreferenceQuestionKey,
    currentQuestionIndex,
    editablePrompt,
    hasRunInitialTask,
    headerHelpShown,
    isAskingPreferenceQuestions,
    isPromptEditable,
    isPromptFinalized,
    lastApprovedPrompt,
    lines,
    promptEditDiff,
    pendingPreferenceUpdates,
    pendingTask,
    preferenceSelectedOptionIndex,
    setLastSnapshot,
  ])

  const handleClear = useCallback(() => {
    const isEmpty =
      lines.length === 1 &&
      lines[0]?.role === ROLE.SYSTEM &&
      (lines[0]?.text === MESSAGE.WELCOME ||
        lines[0]?.text === MESSAGE.WELCOME_FRESH ||
        lines[0]?.text === MESSAGE.HISTORY_CLEARED)

    if (isEmpty) {
      return
    }

    saveSnapshot()
    setHeaderHelpShown(false)
    setActivity(null)
    setLines([])
    setPendingTask(null)
    setPromptEditDiff(null)
    resetClarifyingFlowState()
  }, [
    lines,
    resetClarifyingFlowState,
    saveSnapshot,
    setActivity,
    setHeaderHelpShown,
    setLines,
    setPendingTask,
    setPromptEditDiff,
  ])

  const handleDiscard = useCallback(() => {
    setHeaderHelpShown(false)
    setLastSnapshot(null)
    setActivity(null)
    setLines([])
    setEditablePrompt(null)
    setPromptEditDiff(null)
    setIsPromptEditable(true)
    setIsPromptFinalized(false)
    setPendingTask(null)
    setHasRunInitialTask(false)
    resetClarifyingFlowState()
    clarifyingAnswersRef.current = [] // Clear the ref as well
    setLastHistory(null)
    setLastApprovedPrompt(null)
    setPreferenceSelectedOptionIndex(null)
    setPendingPreferenceUpdates({})
    setIsAskingPreferenceQuestions(false)
    setCurrentPreferenceQuestionKey(null)
    setLikeState('none')
    setValue('') // Clear input value
    clearDraft()
  }, [
    clarifyingAnswersRef,
    clearDraft,
    setPromptEditDiff,
    setActivity,
    resetClarifyingFlowState,
    setCurrentPreferenceQuestionKey,
    setEditablePrompt,
    setHasRunInitialTask,
    setIsAskingPreferenceQuestions,
    setIsPromptEditable,
    setIsPromptFinalized,
    setLastApprovedPrompt,
    setLastHistory,
    setLastSnapshot,
    setLikeState,
    setLines,
    setPendingPreferenceUpdates,
    setPendingTask,
    setPreferenceSelectedOptionIndex,
    setHeaderHelpShown,
    setValue,
  ])

  const handleStartNewConversation = useCallback(() => {
    saveSnapshot()
    setHeaderHelpShown(false)
    setActivity(null)
    setLines([])
    setEditablePrompt(null)
    setPromptEditDiff(null)
    setIsPromptEditable(true)
    setIsPromptFinalized(false)
    setPendingTask(null)
    setHasRunInitialTask(false)
    resetClarifyingFlowState()
    clarifyingAnswersRef.current = [] // Clear the ref as well
    setLastHistory(null)
    setLastApprovedPrompt(null)
    setLikeState('none')
    // Reset preference flow state
    setPreferenceSelectedOptionIndex(null)
    setPendingPreferenceUpdates({})
    setIsAskingPreferenceQuestions(false)
    setCurrentPreferenceQuestionKey(null)
    setValue('') // Clear input value
  }, [
    clarifyingAnswersRef,
    resetClarifyingFlowState,
    saveSnapshot,
    setActivity,
    setCurrentPreferenceQuestionKey,
    setEditablePrompt,
    setPromptEditDiff,
    setHasRunInitialTask,
    setHeaderHelpShown,
    setIsAskingPreferenceQuestions,
    setIsPromptEditable,
    setIsPromptFinalized,
    setLastApprovedPrompt,
    setLastHistory,
    setLines,
    setPendingPreferenceUpdates,
    setPendingTask,
    setPreferenceSelectedOptionIndex,
    setLikeState,
    setValue,
  ])

  const handleRestore = useCallback(() => {
    if (!lastSnapshot) {
      return
    }

    setLines(lastSnapshot.lines)
    setEditablePrompt(lastSnapshot.editablePrompt)
    setPromptEditDiff(lastSnapshot.promptEditDiff ?? null)
    setPendingTask(lastSnapshot.pendingTask)
    setClarifyingQuestions(lastSnapshot.clarifyingQuestions)
    clarifyingAnswersRef.current = [...lastSnapshot.clarifyingAnswers]
    setClarifyingAnswers(clarifyingAnswersRef.current, lastSnapshot.currentQuestionIndex)
    setAnsweringQuestions(lastSnapshot.answeringQuestions)
    setAwaitingQuestionConsent(lastSnapshot.awaitingQuestionConsent)
    setConsentSelectedIndex(lastSnapshot.consentSelectedIndex)
    setClarifyingSelectedOptionIndex(lastSnapshot.clarifyingSelectedOptionIndex)
    setIsPromptEditable(lastSnapshot.isPromptEditable)
    setIsPromptFinalized(lastSnapshot.isPromptFinalized)
    setLastApprovedPrompt(lastSnapshot.lastApprovedPrompt)
    setHeaderHelpShown(lastSnapshot.headerHelpShown)
    setHasRunInitialTask(lastSnapshot.hasRunInitialTask)
    setIsAskingPreferenceQuestions(lastSnapshot.isAskingPreferenceQuestions)
    setCurrentPreferenceQuestionKey(lastSnapshot.currentPreferenceQuestionKey)
    setPreferenceSelectedOptionIndex(lastSnapshot.preferenceSelectedOptionIndex)
    setPendingPreferenceUpdates(lastSnapshot.pendingPreferenceUpdates)
    if (lastSnapshot.generationMode === 'quick' || lastSnapshot.generationMode === 'guided') {
      setGenerationMode(lastSnapshot.generationMode)
    }
    setLastSnapshot(null)
  }, [
    clarifyingAnswersRef,
    lastSnapshot,
    setAnsweringQuestions,
    setAwaitingQuestionConsent,
    setClarifyingAnswers,
    setClarifyingQuestions,
    setClarifyingSelectedOptionIndex,
    setConsentSelectedIndex,
    setCurrentPreferenceQuestionKey,
    setEditablePrompt,
    setPromptEditDiff,
    setGenerationMode,
    setHasRunInitialTask,
    setHeaderHelpShown,
    setIsAskingPreferenceQuestions,
    setIsPromptEditable,
    setIsPromptFinalized,
    setLastApprovedPrompt,
    setLastSnapshot,
    setLines,
    setPendingPreferenceUpdates,
    setPendingTask,
    setPreferenceSelectedOptionIndex,
  ])

  const handleHistory = useCallback(
    (items: HistoryItem[]) => {
      setLastHistory(items)
    },
    [setLastHistory]
  )

  const handleUseFromHistory = useCallback(
    (index: number, items: HistoryItem[]) => {
      const item = items[index]
      if (!item) {
        return
      }
      setPendingTask(item.task)
      setEditablePrompt(item.body)
      setPromptEditDiff(null)
      setIsPromptEditable(false)
      setIsPromptFinalized(false)
      setLastApprovedPrompt(null)
      setHasRunInitialTask(true)
      setAwaitingQuestionConsent(false)
      setAnsweringQuestions(false)
      setConsentSelectedIndex(null)
      setClarifyingSelectedOptionIndex(null)
      setCurrentQuestionIndex(0)
      setClarifyingQuestions(null)
      clarifyingAnswersRef.current = []
      setClarifyingAnswers([], 0)
      setValue(item.task)
    },
    [
      clarifyingAnswersRef,
      setAnsweringQuestions,
      setAwaitingQuestionConsent,
      setClarifyingAnswers,
      setClarifyingQuestions,
      setClarifyingSelectedOptionIndex,
      setConsentSelectedIndex,
      setCurrentQuestionIndex,
      setEditablePrompt,
      setHasRunInitialTask,
      setIsPromptEditable,
      setIsPromptFinalized,
      setPromptEditDiff,
      setLastApprovedPrompt,
      setPendingTask,
      setValue,
    ]
  )

  return {
    handleClear,
    handleDiscard,
    handleStartNewConversation,
    handleRestore,
    handleHistory,
    handleUseFromHistory,
    saveSnapshot,
  }
}
