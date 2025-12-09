'use client'

import { useEffect, useMemo } from 'react'
import { useDraftPersistence, loadDraft, type DraftState } from '@/hooks/useDraftPersistence'
import type { ClarifyingAnswer, ClarifyingQuestion, GenerationMode, TerminalLine, TaskActivity } from '@/lib/types'
import type { TerminalRole } from '@/lib/constants'

type RestoreDeps = {
  draftRestoredShown: boolean
  setDraftRestoredShown: (value: boolean) => void
  setEditablePrompt: (value: string | null) => void
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
  setLikeState: (value: 'none' | 'liked' | 'disliked') => void
  replaceLines: (lines: TerminalLine[]) => void
  setPreferencesOpen: (value: boolean) => void
  setUserManagementOpen: (value: boolean) => void
  setLoginRequiredOpen: (value: boolean) => void
  setActivity: (value: TaskActivity | null) => void
}

type PersistenceDeps = {
  lines: TerminalLine[]
  pendingTask: string | null
  editablePrompt: string | null
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
  likeState: 'none' | 'liked' | 'disliked'
  isGenerating: boolean
  isPreferencesOpen: boolean
  isUserManagementOpen: boolean
  isLoginRequiredOpen: boolean
  restoreDeps: RestoreDeps
}

export function useTerminalPersistence({
  lines,
  pendingTask,
  editablePrompt,
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
  isGenerating,
  isPreferencesOpen,
  isUserManagementOpen,
  isLoginRequiredOpen,
  restoreDeps,
}: PersistenceDeps) {
  const currentDraft: DraftState = useMemo(
    () => ({
      task: pendingTask,
      editablePrompt: editablePrompt,
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
      isPreferencesOpen,
      isUserManagementOpen,
      isLoginRequiredOpen,
      activity,
    }),
    [
      activity,
      answeringQuestions,
      awaitingQuestionConsent,
      clarifyingAnswers,
      clarifyingQuestions,
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
      isPreferencesOpen,
      isUserManagementOpen,
      isLoginRequiredOpen,
    ]
  )

  useDraftPersistence(currentDraft, !isGenerating)

  useEffect(() => {
    const {
      draftRestoredShown,
      setDraftRestoredShown,
      setEditablePrompt,
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
      replaceLines,
      setPreferencesOpen,
      setUserManagementOpen,
      setLoginRequiredOpen,
      setActivity,
    } = restoreDeps

    if (draftRestoredShown) return
    if (typeof window === 'undefined') return

    const draft = loadDraft()
    setDraftRestoredShown(true)
    if (!draft) return

    setEditablePrompt(draft.editablePrompt ?? null)
    setPendingTask(draft.task ?? null)
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
