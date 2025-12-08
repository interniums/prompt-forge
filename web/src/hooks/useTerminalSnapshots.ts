'use client'

import { useCallback } from 'react'
import type React from 'react'
import type { ClarifyingAnswer, ClarifyingQuestion, HistoryItem, Preferences, TerminalLine } from '@/lib/types'
import type { PreferenceKey, SessionSnapshot } from '@/features/terminal/terminalState'
import { ROLE, MESSAGE, type TerminalRole } from '@/lib/constants'

type SnapshotDeps = {
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
  lastSnapshot: SessionSnapshot | null
  appendLine: (role: TerminalRole, text: string) => void
  setLines: (next: TerminalLine[]) => void
  setEditablePrompt: (value: string | null) => void
  setPendingTask: (value: string | null) => void
  setClarifyingQuestions: (questions: ClarifyingQuestion[] | null) => void
  setClarifyingAnswers: (answers: ClarifyingAnswer[], currentIndex: number) => void
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
  setLikeState: (value: 'none' | 'liked' | 'disliked') => void
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
    pendingTask,
    clarifyingQuestions,
    clarifyingAnswersRef,
    currentQuestionIndex,
    answeringQuestions,
    awaitingQuestionConsent,
    consentSelectedIndex,
    clarifyingSelectedOptionIndex,
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
    appendLine,
    setLines,
    setEditablePrompt,
    setPendingTask,
    setClarifyingQuestions,
    setClarifyingAnswers,
    setCurrentQuestionIndex,
    setAnsweringQuestions,
    setAwaitingQuestionConsent,
    setConsentSelectedIndex,
    setClarifyingSelectedOptionIndex,
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
      pendingTask,
      clarifyingQuestions,
      clarifyingAnswers: [...clarifyingAnswersRef.current],
      currentQuestionIndex,
      answeringQuestions,
      awaitingQuestionConsent,
      consentSelectedIndex,
      clarifyingSelectedOptionIndex,
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
    setLines([
      {
        id: 0,
        role: ROLE.SYSTEM,
        text: MESSAGE.HISTORY_CLEARED,
      },
    ])
    setPendingTask(null)
    resetClarifyingFlowState()
  }, [lines, resetClarifyingFlowState, saveSnapshot, setHeaderHelpShown, setLines, setPendingTask])

  const handleDiscard = useCallback(() => {
    setHeaderHelpShown(false)
    setLastSnapshot(null)
    setLines([
      {
        id: 0,
        role: ROLE.SYSTEM,
        text: MESSAGE.WELCOME_FRESH,
      },
    ])
    setEditablePrompt(null)
    setIsPromptEditable(true)
    setIsPromptFinalized(false)
    setPendingTask(null)
    setHasRunInitialTask(false)
    resetClarifyingFlowState()
    setLastHistory(null)
    setLastApprovedPrompt(null)
    setPreferenceSelectedOptionIndex(null)
    setPendingPreferenceUpdates({})
    setIsAskingPreferenceQuestions(false)
    setCurrentPreferenceQuestionKey(null)
    clearDraft()
  }, [
    clearDraft,
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
    setLines,
    setPendingPreferenceUpdates,
    setPendingTask,
    setPreferenceSelectedOptionIndex,
    setHeaderHelpShown,
  ])

  const handleStartNewConversation = useCallback(() => {
    saveSnapshot()
    setLines([
      {
        id: 0,
        role: ROLE.SYSTEM,
        text: MESSAGE.WELCOME_FRESH,
      },
    ])
    setEditablePrompt(null)
    setIsPromptEditable(true)
    setIsPromptFinalized(false)
    setPendingTask(null)
    setHasRunInitialTask(false)
    resetClarifyingFlowState()
    setLastHistory(null)
    setLastApprovedPrompt(null)
    setLikeState('none')
  }, [
    resetClarifyingFlowState,
    saveSnapshot,
    setEditablePrompt,
    setHasRunInitialTask,
    setIsPromptEditable,
    setIsPromptFinalized,
    setLastApprovedPrompt,
    setLastHistory,
    setLines,
    setPendingTask,
    setLikeState,
  ])

  const handleRestore = useCallback(() => {
    if (!lastSnapshot) {
      appendLine(ROLE.APP, 'Nothing to restore yet.')
      return
    }

    setLines(lastSnapshot.lines)
    setEditablePrompt(lastSnapshot.editablePrompt)
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
    setLastSnapshot(null)
  }, [
    appendLine,
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

      if (!items.length) {
        appendLine(ROLE.APP, 'No history yet for this session.')
        return
      }

      appendLine(ROLE.APP, 'History (most recent first):')
      items.forEach((item, index) => {
        const shortTask = item.task.length > 80 ? `${item.task.slice(0, 77)}...` : item.task
        appendLine(ROLE.APP, `#${index + 1} — ${item.label} — ${shortTask}`)
      })
    },
    [appendLine, setLastHistory]
  )

  const handleUseFromHistory = useCallback(
    (index: number, items: HistoryItem[]) => {
      const item = items[index]
      if (!item) {
        appendLine(ROLE.APP, `No history item found for #${index + 1}.`)
        return
      }
      setPendingTask(item.task)
      setEditablePrompt(item.body)
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
      appendLine(ROLE.APP, `Loaded task #${index + 1} from history into the input.`)
      appendLine(ROLE.USER, item.task)
      appendLine(ROLE.APP, `Restored prompt (${item.label}):\n\n${item.body}`)
    },
    [
      appendLine,
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
