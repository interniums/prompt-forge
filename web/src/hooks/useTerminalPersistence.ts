'use client'

import { useEffect, useMemo } from 'react'
import { useDraftPersistence, loadDraft, type DraftState } from '@/hooks/useDraftPersistence'
import type {
  ClarifyingAnswer,
  ClarifyingQuestion,
  GenerationMode,
  TerminalLine,
  TaskActivity,
  Preferences,
} from '@/lib/types'
import type { TerminalRole } from '@/lib/constants'
import type { PreferenceKey } from '@/features/terminal/terminalState'

type RestoreDeps = {
  sessionId: string | null
  userId: string | null
  draftRestoredShown: boolean
  setDraftRestoredShown: (value: boolean) => void
  setEditablePrompt: (value: string | null) => void
  setPromptEditDiff: (value: { previous: string; current: string } | null) => void
  setPendingTask: (value: string | null) => void
  setClarifyingQuestions: (value: ClarifyingQuestion[] | null) => void
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  setClarifyingAnswers: (value: ClarifyingAnswer[], currentIndex: number) => void
  setAnsweringQuestions: (value: boolean) => void
  setHasRunInitialTask: (value: boolean) => void
  setAwaitingQuestionConsent: (value: boolean) => void
  setConsentSelectedIndex: (value: number | null) => void
  setClarifyingSelectedOptionIndex: (value: number | null) => void
  setGenerationMode: (value: GenerationMode) => void
  setPromptEditable: (value: boolean) => void
  setPromptFinalized: (value: boolean) => void
  setHeaderHelpShown: (value: boolean) => void
  setLastApprovedPrompt: (value: string | null) => void
  setLikeState: (value: 'none' | 'liked') => void
  setIsAskingPreferenceQuestions: (value: boolean) => void
  setCurrentPreferenceQuestionKey: (value: PreferenceKey | null) => void
  setPreferenceSelectedOptionIndex: (value: number | null) => void
  setPendingPreferenceUpdates: (value: Partial<Preferences>) => void
  replaceLines: (lines: TerminalLine[]) => void
  setPreferencesOpen: (value: boolean) => void
  setUserManagementOpen: (value: boolean) => void
  setLoginRequiredOpen: (value: boolean) => void
  setActivity: (value: TaskActivity | null) => void
}

type PersistenceDeps = {
  sessionId: string | null
  userId: string | null
  lines: TerminalLine[]
  pendingTask: string | null
  editablePrompt: string | null
  promptEditDiff: { previous: string; current: string } | null
  activity: TaskActivity | null
  clarifyingQuestions: ClarifyingQuestion[] | null
  clarifyingAnswers: ClarifyingAnswer[]
  currentQuestionIndex: number
  answeringQuestions: boolean
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  clarifyingSelectedOptionIndex: number | null
  generationMode: GenerationMode
  isPromptEditable: boolean
  isPromptFinalized: boolean
  headerHelpShown: boolean
  lastApprovedPrompt: string | null
  likeState: 'none' | 'liked'
  isAskingPreferenceQuestions: boolean
  currentPreferenceQuestionKey: PreferenceKey | null
  preferenceSelectedOptionIndex: number | null
  pendingPreferenceUpdates: Partial<Preferences>
  isPreferencesOpen: boolean
  isUserManagementOpen: boolean
  isLoginRequiredOpen: boolean
  restoreDeps: RestoreDeps
}

export function useTerminalPersistence({
  sessionId,
  userId,
  lines,
  pendingTask,
  editablePrompt,
  promptEditDiff,
  activity,
  clarifyingQuestions,
  clarifyingAnswers,
  currentQuestionIndex,
  answeringQuestions,
  awaitingQuestionConsent,
  consentSelectedIndex,
  clarifyingSelectedOptionIndex,
  generationMode,
  isPromptEditable,
  isPromptFinalized,
  headerHelpShown,
  lastApprovedPrompt,
  likeState,
  isAskingPreferenceQuestions,
  currentPreferenceQuestionKey,
  preferenceSelectedOptionIndex,
  pendingPreferenceUpdates,
  isPreferencesOpen,
  isUserManagementOpen,
  isLoginRequiredOpen,
  restoreDeps,
}: PersistenceDeps) {
  const currentDraft: DraftState = useMemo(
    () => ({
      sessionId,
      userId,
      task: pendingTask,
      editablePrompt: editablePrompt,
      promptEditDiff,
      clarifyingQuestions: clarifyingQuestions,
      clarifyingAnswers: clarifyingAnswers.length > 0 ? [...clarifyingAnswers] : null,
      currentQuestionIndex,
      wasAnsweringQuestions: answeringQuestions,
      lines,
      awaitingQuestionConsent,
      consentSelectedIndex,
      clarifyingSelectedOptionIndex,
      generationMode,
      isPromptEditable,
      isPromptFinalized,
      headerHelpShown,
      lastApprovedPrompt,
      likeState,
      isAskingPreferenceQuestions,
      currentPreferenceQuestionKey,
      preferenceSelectedOptionIndex,
      pendingPreferenceUpdates,
      isPreferencesOpen,
      isUserManagementOpen,
      isLoginRequiredOpen,
      activity,
    }),
    [
      sessionId,
      userId,
      activity,
      answeringQuestions,
      awaitingQuestionConsent,
      clarifyingAnswers,
      clarifyingQuestions,
      promptEditDiff,
      clarifyingSelectedOptionIndex,
      consentSelectedIndex,
      currentQuestionIndex,
      editablePrompt,
      headerHelpShown,
      generationMode,
      isPromptEditable,
      isPromptFinalized,
      lastApprovedPrompt,
      likeState,
      lines,
      pendingTask,
      isAskingPreferenceQuestions,
      currentPreferenceQuestionKey,
      preferenceSelectedOptionIndex,
      pendingPreferenceUpdates,
      isPreferencesOpen,
      isUserManagementOpen,
      isLoginRequiredOpen,
    ]
  )

  // Persist even while generating to avoid losing activity/status on reload.
  useDraftPersistence(currentDraft, true)

  useEffect(() => {
    const {
      sessionId: scopeSessionId,
      userId: scopeUserId,
      draftRestoredShown,
      setDraftRestoredShown,
      setEditablePrompt,
      setPromptEditDiff,
      setPendingTask,
      setClarifyingQuestions,
      clarifyingAnswersRef,
      setClarifyingAnswers,
      setAnsweringQuestions,
      setHasRunInitialTask,
      setAwaitingQuestionConsent,
      setConsentSelectedIndex,
      setClarifyingSelectedOptionIndex,
      setGenerationMode,
      setPromptEditable,
      setPromptFinalized,
      setHeaderHelpShown,
      setLastApprovedPrompt,
      setLikeState,
      setIsAskingPreferenceQuestions,
      setCurrentPreferenceQuestionKey,
      setPreferenceSelectedOptionIndex,
      setPendingPreferenceUpdates,
      replaceLines,
      setPreferencesOpen,
      setUserManagementOpen,
      setLoginRequiredOpen,
      setActivity,
    } = restoreDeps

    if (draftRestoredShown) return
    if (typeof window === 'undefined') return

    const draft = loadDraft(scopeSessionId, scopeUserId)
    setDraftRestoredShown(true)
    if (!draft) return

    // Ensure the draft matches the active scope
    if (draft.sessionId && scopeSessionId && draft.sessionId !== scopeSessionId) return
    if (draft.userId && scopeUserId && draft.userId !== scopeUserId) return

    // Sync scope into state for future saves
    setPendingTask(draft.task ?? null)
    setEditablePrompt(draft.editablePrompt ?? null)
    setPromptEditDiff(draft.promptEditDiff ?? null)
    setClarifyingQuestions(draft.clarifyingQuestions ?? null)
    clarifyingAnswersRef.current = draft.clarifyingAnswers ?? []
    setClarifyingAnswers(clarifyingAnswersRef.current, draft.currentQuestionIndex ?? 0)
    setAnsweringQuestions(Boolean(draft.wasAnsweringQuestions))
    setHasRunInitialTask(Boolean(draft.task || draft.editablePrompt))
    setAwaitingQuestionConsent(draft.awaitingQuestionConsent ?? false)
    setConsentSelectedIndex(draft.consentSelectedIndex ?? null)
    setClarifyingSelectedOptionIndex(draft.clarifyingSelectedOptionIndex ?? null)
    if (draft.generationMode === 'quick' || draft.generationMode === 'guided') {
      setGenerationMode(draft.generationMode)
    }
    setPromptEditable(draft.isPromptEditable ?? false)
    setPromptFinalized(draft.isPromptFinalized ?? false)
    setHeaderHelpShown(draft.headerHelpShown ?? false)
    setLastApprovedPrompt(draft.lastApprovedPrompt ?? null)
    setLikeState(draft.likeState ?? 'none')
    if (draft.isPreferencesOpen) {
      setPreferencesOpen(true)
    }
    if (draft.isUserManagementOpen) {
      setUserManagementOpen(true)
    }
    if (draft.isLoginRequiredOpen) {
      setLoginRequiredOpen(true)
    }
    setIsAskingPreferenceQuestions(Boolean(draft.isAskingPreferenceQuestions))
    setCurrentPreferenceQuestionKey(draft.currentPreferenceQuestionKey ?? null)
    setPreferenceSelectedOptionIndex(draft.preferenceSelectedOptionIndex ?? null)
    setPendingPreferenceUpdates(draft.pendingPreferenceUpdates ?? {})
    setActivity(draft.activity ?? null)

    if (draft.lines && draft.lines.length) {
      replaceLines(
        draft.lines.map((line, idx) => ({
          id: idx,
          role: line.role as TerminalRole,
          text: line.text,
        }))
      )
    }
  }, [restoreDeps])

  return { currentDraft }
}
