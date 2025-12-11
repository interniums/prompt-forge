'use client'

import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react'
import { listHistory } from '@/services/historyService'
import { recordEvent } from '@/services/eventsService'
import { TerminalHeader } from './terminal/TerminalHeader'
import { useToast } from '@/hooks/useToast'
import { clearDraft } from '@/hooks/useDraftPersistence'
import { ROLE, COMMAND, MESSAGE, type TerminalRole } from '@/lib/constants'
import { DEFAULT_THEME } from '@/lib/constants'
import { TerminalShellView } from '@/features/terminal/TerminalShellView'
import { TerminalPanels } from '@/features/terminal/TerminalPanels'
import { TerminalMain } from '@/features/terminal/TerminalMain'
import { appendHelpText, formatPreferencesSummary } from '@/features/terminal/terminalText'
import { useTerminalSnapshotsController } from '@/hooks/useTerminalSnapshotsController'
import { usePreferencesController } from '@/hooks/usePreferencesController'
import { useClarifyingFlow } from '@/hooks/useClarifyingFlow'
import { usePreferenceQuestions } from '@/hooks/usePreferenceQuestions'
import { useTerminalPersistence } from '@/hooks/useTerminalPersistence'
import { useTerminalHotkeys } from '@/hooks/useTerminalHotkeys'
import { useTerminalFocus } from '@/hooks/useTerminalFocus'
import { useGenerationController } from '@/hooks/useGenerationController'
import { useCommandRouter } from '@/hooks/useCommandRouter'
import { createTaskFlowHandlers } from '@/features/terminal/taskFlow'
import { createModeController } from '@/features/terminal/modeController'
import {
  TerminalStateProvider,
  useTerminalState,
  createInitialTerminalState,
  type PreferenceKey,
  type PromptEditDiff,
  type SessionSnapshot,
} from '@/features/terminal/terminalState'
import {
  setInput,
  appendLines,
  replaceLines,
  setGenerating as setGeneratingAction,
  setPendingTask as setPendingTaskAction,
  setEditablePrompt as setEditablePromptAction,
  setPromptEditDiff as setPromptEditDiffAction,
  setActivity as setActivityAction,
  setQuestionConsent,
  setClarifyingQuestions as setClarifyingQuestionsAction,
  setClarifyingAnswers as setClarifyingAnswersAction,
  setCurrentQuestionIndex as setCurrentQuestionIndexAction,
  setAnsweringQuestions as setAnsweringQuestionsAction,
  setConsentSelectedIndex as setConsentSelectedIndexAction,
  setClarifyingSelectedOption as setClarifyingSelectedOptionAction,
  setGenerationMode as setGenerationModeAction,
  setPromptEditable as setPromptEditableAction,
  setPromptFinalized as setPromptFinalizedAction,
  setLikeState as setLikeStateAction,
  setHasRunInitialTask as setHasRunInitialTaskAction,
  setHeaderHelpShown as setHeaderHelpShownAction,
  setLastApprovedPrompt as setLastApprovedPromptAction,
  setIsAskingPreferences as setIsAskingPreferencesAction,
  setCurrentPreferenceQuestion as setCurrentPreferenceQuestionAction,
  setPreferenceSelectedOptionIndex as setPreferenceSelectedOptionIndexAction,
  setPendingPreferenceUpdates as setPendingPreferenceUpdatesAction,
  setPreferencesOpen as setPreferencesOpenAction,
  setUserManagementOpen as setUserManagementOpenAction,
  setLoginRequiredOpen as setLoginRequiredOpenAction,
  setDraftRestoredShown as setDraftRestoredShownAction,
  setLastHistory as setLastHistoryAction,
  setLastSnapshot as setLastSnapshotAction,
} from '@/features/terminal/stateActions'
import type {
  TerminalLine,
  Preferences,
  PreferencesStep,
  ClarifyingQuestion,
  ClarifyingAnswer,
  PreferenceSource,
  UserIdentity,
  GenerationMode,
  TerminalStatus,
  TaskActivity,
  ThemeName,
} from '@/lib/types'

// Re-export types for external consumers
export type { TerminalLine, Preferences }

type PromptTerminalProps = {
  initialLines?: TerminalLine[]
  initialPreferences?: Preferences
  initialUser?: UserIdentity | null
  initialPreferenceSource?: PreferenceSource
  isFirstLogin?: boolean
  sessionId?: string | null
}

function resolveGenerationMode(preferences: Preferences): GenerationMode {
  const mode = preferences.uiDefaults?.generationMode
  // Honor only explicit mode selection; default to guided to ensure questions run.
  if (mode === 'quick' || mode === 'guided') return mode
  return 'guided'
}

export function PromptTerminal(props: PromptTerminalProps) {
  const initialState = useMemo(() => {
    const initialLines = props.initialLines && props.initialLines.length ? props.initialLines : []
    return createInitialTerminalState(initialLines)
  }, [props.initialLines])

  return (
    <TerminalStateProvider initialState={initialState}>
      <PromptTerminalInner {...props} />
    </TerminalStateProvider>
  )
}

function PromptTerminalInner({
  initialPreferences,
  initialUser = null,
  initialPreferenceSource = 'none',
  isFirstLogin = false,
  sessionId: initialSessionId = null,
}: PromptTerminalProps) {
  const { state, dispatch } = useTerminalState()
  const {
    inputValue: value,
    isGenerating,
    activity,
    pendingTask,
    editablePrompt,
    promptEditDiff,
    awaitingQuestionConsent,
    consentSelectedIndex,
    clarifyingQuestions,
    currentQuestionIndex,
    answeringQuestions,
    clarifyingSelectedOptionIndex,
    clarifyingAnswers,
    isPromptEditable,
    isPromptFinalized,
    likeState,
    hasRunInitialTask,
    headerHelpShown,
    lastApprovedPrompt,
    lines,
    isAskingPreferenceQuestions,
    currentPreferenceQuestionKey,
    preferenceSelectedOptionIndex,
    pendingPreferenceUpdates,
    generationMode,
    isPreferencesOpen,
    isUserManagementOpen,
    isLoginRequiredOpen,
    draftRestoredShown,
    lastHistory,
    lastSnapshot,
  } = state

  const { message: toastMessage, showToast } = useToast()
  // Initialize clarifying answers from saved draft if available
  const clarifyingAnswersRef = useRef<ClarifyingAnswer[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const editablePromptRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const clarifyingRunIdRef = useRef(0)
  const {
    preferences,
    preferenceSource,
    user,
    isSavingPreferences,
    updatePreferencesLocally,
    handleSavePreferences,
    handleSignIn,
    handleSignOut,
  } = usePreferencesController({
    initialPreferences,
    initialUser,
    initialPreferenceSource,
    onToast: showToast,
  })
  const [preferencesStep, setPreferencesStep] = useState<PreferencesStep>(null)
  const [isRevising, setIsRevising] = useState(false)
  const activeSessionId = initialSessionId ?? null
  const activeUserId = user?.id ?? null
  const setIsAskingPreferenceQuestions = useCallback(
    (value: boolean) => dispatch(setIsAskingPreferencesAction(value)),
    [dispatch]
  )
  const setCurrentPreferenceQuestionKey = useCallback(
    (value: PreferenceKey | null) => dispatch(setCurrentPreferenceQuestionAction(value)),
    [dispatch]
  )
  const setPendingPreferenceUpdates = useCallback(
    (value: Partial<Preferences>) => dispatch(setPendingPreferenceUpdatesAction(value)),
    [dispatch]
  )
  const setPreferenceSelectedOptionIndex = useCallback(
    (value: number | null) => dispatch(setPreferenceSelectedOptionIndexAction(value)),
    [dispatch]
  )
  const setGenerationMode = useCallback((value: GenerationMode) => dispatch(setGenerationModeAction(value)), [dispatch])
  const setPreferencesOpen = useCallback((value: boolean) => dispatch(setPreferencesOpenAction(value)), [dispatch])
  const setUserManagementOpen = useCallback(
    (value: boolean) => dispatch(setUserManagementOpenAction(value)),
    [dispatch]
  )
  const setLoginRequiredOpen = useCallback((value: boolean) => dispatch(setLoginRequiredOpenAction(value)), [dispatch])
  const setDraftRestoredShown = useCallback(
    (value: boolean) => dispatch(setDraftRestoredShownAction(value)),
    [dispatch]
  )
  const setLastHistory = useCallback(
    (value: Array<{ id: string; task: string; label: string; body: string; created_at: string }> | null) =>
      dispatch(setLastHistoryAction(value)),
    [dispatch]
  )
  const setLastSnapshot = useCallback(
    (value: SessionSnapshot | null) => dispatch(setLastSnapshotAction(value)),
    [dispatch]
  )

  useEffect(() => {
    if (isFirstLogin) {
      setPreferencesOpen(true)
    }
  }, [isFirstLogin, setPreferencesOpen])

  useEffect(() => {
    const nextMode = resolveGenerationMode(preferences)
    if (nextMode !== generationMode) {
      setGenerationMode(nextMode)
    }
  }, [generationMode, preferences, setGenerationMode])

  useEffect(() => {
    clarifyingAnswersRef.current = clarifyingAnswers
  }, [clarifyingAnswers])

  const setValue = useCallback((next: string) => dispatch(setInput(next)), [dispatch])

  const setLines = useCallback(
    (next: TerminalLine[] | ((prev: TerminalLine[]) => TerminalLine[])) => {
      const resolved = typeof next === 'function' ? (next as (prev: TerminalLine[]) => TerminalLine[])(lines) : next
      dispatch(replaceLines(resolved))
    },
    [dispatch, lines]
  )

  const setActivity = useCallback((next: TaskActivity | null) => dispatch(setActivityAction(next)), [dispatch])

  const appendLine = useCallback(
    (role: TerminalRole, content: string | TerminalStatus) => {
      const currentLines = lines
      const nextId = currentLines.length ? currentLines[currentLines.length - 1].id + 1 : 0
      if (typeof content === 'string') {
        dispatch(appendLines([{ id: nextId, role, text: content }]))
        return
      }

      const fallbackText = `${content.title} — ${content.description}`
      const last = currentLines[currentLines.length - 1]
      if (last?.status && last.status.title === content.title) {
        const updatedLines = [...currentLines.slice(0, -1), { ...last, text: fallbackText, status: content }]
        dispatch(replaceLines(updatedLines))
        return
      }

      // Replace the most recent matching status (same title) to avoid duplicates mid-stream
      const lastMatchIndex = [...currentLines].reverse().findIndex((l) => l.status?.title === content.title)
      if (lastMatchIndex >= 0) {
        const idx = currentLines.length - 1 - lastMatchIndex
        const updated = [...currentLines]
        updated[idx] = { ...updated[idx], text: fallbackText, status: content }
        dispatch(replaceLines(updated))
        return
      }

      // If we are moving to success/error, replace the most recent loading status to avoid stale spinners.
      if (content.state && content.state !== 'loading') {
        const lastLoadingIndex = [...currentLines].reverse().findIndex((l) => l.status?.state === 'loading')
        if (lastLoadingIndex >= 0) {
          const idx = currentLines.length - 1 - lastLoadingIndex
          const updated = [...currentLines]
          updated[idx] = { ...updated[idx], text: fallbackText, status: content }
          dispatch(replaceLines(updated))
          return
        }
      }

      dispatch(appendLines([{ id: nextId, role, text: fallbackText, status: content }]))
    },
    [dispatch, lines]
  )

  const setIsGenerating = useCallback((value: boolean) => dispatch(setGeneratingAction(value)), [dispatch])

  const setPendingTask = useCallback((value: string | null) => dispatch(setPendingTaskAction(value)), [dispatch])

  const setEditablePrompt = useCallback((value: string | null) => dispatch(setEditablePromptAction(value)), [dispatch])

  const setAwaitingQuestionConsent = useCallback(
    (awaiting: boolean) => dispatch(setQuestionConsent(awaiting, awaiting ? consentSelectedIndex : null)),
    [consentSelectedIndex, dispatch]
  )

  const setConsentSelectedIndex = useCallback(
    (value: number | null) => dispatch(setConsentSelectedIndexAction(value)),
    [dispatch]
  )

  const setClarifyingQuestions = useCallback(
    (questions: ClarifyingQuestion[] | null) => dispatch(setClarifyingQuestionsAction(questions)),
    [dispatch]
  )

  const setClarifyingAnswers = useCallback(
    (answers: ClarifyingAnswer[], currentIndex: number) => dispatch(setClarifyingAnswersAction(answers, currentIndex)),
    [dispatch]
  )

  const setCurrentQuestionIndex = useCallback(
    (value: number) => dispatch(setCurrentQuestionIndexAction(value)),
    [dispatch]
  )
  const setAnsweringQuestions = useCallback(
    (value: boolean) => dispatch(setAnsweringQuestionsAction(value)),
    [dispatch]
  )

  const setClarifyingSelectedOptionIndex = useCallback(
    (value: number | null) => dispatch(setClarifyingSelectedOptionAction(value)),
    [dispatch]
  )

  const setIsPromptEditable = useCallback((value: boolean) => dispatch(setPromptEditableAction(value)), [dispatch])
  const setIsPromptFinalized = useCallback((value: boolean) => dispatch(setPromptFinalizedAction(value)), [dispatch])
  const setHasRunInitialTask = useCallback((value: boolean) => dispatch(setHasRunInitialTaskAction(value)), [dispatch])
  const setHeaderHelpShown = useCallback((value: boolean) => dispatch(setHeaderHelpShownAction(value)), [dispatch])
  const setLastApprovedPrompt = useCallback(
    (value: string | null) => dispatch(setLastApprovedPromptAction(value)),
    [dispatch]
  )
  const setPromptEditDiff = useCallback(
    (value: PromptEditDiff | null) => dispatch(setPromptEditDiffAction(value)),
    [dispatch]
  )
  const setLikeState = useCallback(
    (value: 'none' | 'liked' | 'disliked') => dispatch(setLikeStateAction(value)),
    [dispatch]
  )

  // Default-select the first consent option so keyboard users see focus immediately
  useEffect(() => {
    if (awaitingQuestionConsent && consentSelectedIndex === null) {
      setConsentSelectedIndex(0)
    }
  }, [awaitingQuestionConsent, consentSelectedIndex, setConsentSelectedIndex])

  useTerminalPersistence({
    sessionId: activeSessionId,
    userId: activeUserId,
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
    isGenerating,
    isAskingPreferenceQuestions,
    currentPreferenceQuestionKey,
    preferenceSelectedOptionIndex,
    pendingPreferenceUpdates,
    isPreferencesOpen,
    isUserManagementOpen,
    isLoginRequiredOpen,
    restoreDeps: {
      sessionId: activeSessionId,
      userId: activeUserId,
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
      setPromptEditable: (v) => dispatch(setPromptEditableAction(v)),
      setPromptFinalized: (v) => dispatch(setPromptFinalizedAction(v)),
      setHeaderHelpShown,
      setLastApprovedPrompt,
      setLikeState,
      setIsAskingPreferenceQuestions: (v) => dispatch(setIsAskingPreferencesAction(v)),
      setCurrentPreferenceQuestionKey: (v) => dispatch(setCurrentPreferenceQuestionAction(v as PreferenceKey | null)),
      setPreferenceSelectedOptionIndex: (v) => dispatch(setPreferenceSelectedOptionIndexAction(v)),
      setPendingPreferenceUpdates: (v) => dispatch(setPendingPreferenceUpdatesAction(v)),
      replaceLines: (lines) => dispatch(replaceLines(lines)),
      setPreferencesOpen,
      setUserManagementOpen,
      setLoginRequiredOpen,
      setGenerationMode,
      setActivity,
    },
  })

  const inputDisabled = isGenerating

  const copyEditablePrompt = useCallback(
    async (textOverride?: string) => {
      const promptToCopy = typeof textOverride === 'string' ? textOverride : editablePrompt
      if (!promptToCopy) return
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(promptToCopy)
          showToast(MESSAGE.PROMPT_COPIED)
          void recordEvent('prompt_copied', { prompt: promptToCopy })
        } else {
          appendLine(ROLE.APP, 'Clipboard is not available in this environment.')
        }
      } catch (err) {
        console.error('Failed to copy editable prompt', err)
        appendLine(ROLE.APP, 'Could not copy to clipboard. You can still select and copy manually.')
      }
    },
    [appendLine, editablePrompt, showToast]
  )

  const handleManualPromptUpdate = useCallback(
    (nextPrompt: string, previousPrompt: string) => {
      const trimmed = nextPrompt.trim()
      const finalPrompt = trimmed.length > 0 ? nextPrompt : previousPrompt
      setEditablePrompt(finalPrompt)
      setPromptEditDiff(null)
      setIsPromptEditable(true)
      setIsPromptFinalized(false)
      setLastApprovedPrompt(null)
      showToast('Prompt updated')
    },
    [setEditablePrompt, setIsPromptEditable, setIsPromptFinalized, setLastApprovedPrompt, setPromptEditDiff, showToast]
  )

  const { focusInputToEnd } = useTerminalFocus({
    editablePrompt,
    inputRef,
    copyEditablePrompt: () => void copyEditablePrompt(),
  })

  // Clarifying flow hook is instantiated after dependent callbacks are defined (see below).

  /**
   * Reset all clarifying question flow state to initial values.
   * Used when starting a new task, clearing, or discarding the current flow.
   */
  const resetClarifyingFlowState = useCallback(() => {
    setClarifyingQuestions(null)
    setClarifyingAnswers([], 0)
    setCurrentQuestionIndex(0)
    setClarifyingSelectedOptionIndex(null)
    setAnsweringQuestions(false)
    setAwaitingQuestionConsent(false)
    setConsentSelectedIndex(null)
  }, [
    setAnsweringQuestions,
    setAwaitingQuestionConsent,
    setClarifyingAnswers,
    setClarifyingQuestions,
    setClarifyingSelectedOptionIndex,
    setConsentSelectedIndex,
    setCurrentQuestionIndex,
  ])

  const resetPreferenceFlowState = useCallback(() => {
    setIsAskingPreferenceQuestions(false)
    setCurrentPreferenceQuestionKey(null)
    setPreferenceSelectedOptionIndex(null)
    setPendingPreferenceUpdates({})
  }, [
    setCurrentPreferenceQuestionKey,
    setIsAskingPreferenceQuestions,
    setPendingPreferenceUpdates,
    setPreferenceSelectedOptionIndex,
  ])

  const {
    handleClear,
    handleDiscard,
    handleStartNewConversation,
    handleRestore,
    handleHistory: renderHistoryItems,
    handleUseFromHistory: applyHistoryItem,
  } = useTerminalSnapshotsController(
    {
      lines,
      activity,
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
    },
    {
      appendLine,
      setLines: (next) => setLines(next),
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
      setLastHistory,
      setLastSnapshot: (value) => setLastSnapshot(value as SessionSnapshot | null),
      setLikeState,
      setValue,
      clearDraft,
      resetClarifyingFlowState,
    }
  )

  function scrollToBottom() {
    if (!scrollRef.current) return
    const el = scrollRef.current
    // Wait for React to paint new lines before scrolling.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }

  useEffect(() => {
    if (editablePrompt !== null && scrollRef.current) {
      const el = scrollRef.current
      el.scrollTop = el.scrollHeight
    }
  }, [editablePrompt])

  useEffect(() => {
    scrollToBottom()
  }, [lines])

  useLayoutEffect(() => {
    if (awaitingQuestionConsent && !isGenerating) {
      focusInputToEnd()
    }
  }, [awaitingQuestionConsent, focusInputToEnd, isGenerating])

  useEffect(() => {
    if (inputDisabled && inputRef.current) {
      inputRef.current.blur()
    }
  }, [inputDisabled])

  // Do not auto-clear selection on question change; selections are restored from saved answers.

  useEffect(() => {
    function handleFocusShortcut(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return
      const key = e.key.toLowerCase()
      if (key === 'j') {
        e.preventDefault()
        if (inputRef.current) {
          inputRef.current.focus()
          const len = inputRef.current.value.length
          inputRef.current.setSelectionRange(len, len)
        }
        return
      }
    }
    window.addEventListener('keydown', handleFocusShortcut)
    return () => window.removeEventListener('keydown', handleFocusShortcut)
  }, [editablePrompt, setIsPromptEditable, setIsPromptFinalized])

  // Approve flow removed per new requirements

  useEffect(() => {
    if (!editablePrompt) return
    function handleGlobalCopy(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void copyEditablePrompt()
      }
    }
    window.addEventListener('keydown', handleGlobalCopy)
    return () => window.removeEventListener('keydown', handleGlobalCopy)
  }, [copyEditablePrompt, editablePrompt])

  function startPreferencesFlow() {
    setPendingTask(null)
    resetClarifyingFlowState()
    setPreferencesStep(null)
    setUserManagementOpen(true)
    setPreferencesOpen(true)
    appendLine(
      ROLE.APP,
      `Opening preferences (${user ? 'signed in' : 'local mode'}). Current settings: ${formatPreferencesSummary(
        preferences
      )}.`
    )
    focusInputToEnd()
  }

  const handlePreferencesChange = useCallback(
    (next: Preferences) => {
      updatePreferencesLocally(next)
    },
    [updatePreferencesLocally]
  )

  function advancePreferences(answer: string) {
    if (!preferencesStep) return

    if (preferencesStep === 'tone') {
      const next = { ...preferences, tone: answer }
      updatePreferencesLocally(next)
      appendLine(ROLE.APP, 'Got it. Who are you usually writing for? (for example: founders, devs, general audience?)')
      setPreferencesStep('audience')
      return
    }

    if (preferencesStep === 'audience') {
      const next = { ...preferences, audience: answer }
      updatePreferencesLocally(next)
      appendLine(ROLE.APP, 'What domains do you mostly work in? (for example: product, marketing, engineering?)')
      setPreferencesStep('domain')
      return
    }

    if (preferencesStep === 'domain') {
      const next = { ...preferences, domain: answer }
      updatePreferencesLocally(next)
      appendLine(ROLE.APP, `Updated preferences: ${formatPreferencesSummary(next)}`)
      appendLine(ROLE.APP, 'These will be used to steer how prompts are shaped for you.')
      setPreferencesStep(null)
      void handleSavePreferences(next)
    }
  }

  function handleHelpCommand() {
    appendHelpText((role, text) => appendLine(role as TerminalRole, text))
    scrollToBottom()
  }

  // Snapshot, history, and reset handlers moved to useTerminalSnapshots

  const handleLikePrompt = useCallback(() => {
    if (!editablePrompt) {
      appendLine(ROLE.APP, 'There is no prompt to like yet.')
      return
    }
    void recordEvent('prompt_vote', { vote: 'like', prompt: editablePrompt })
    setLikeState('liked')
    showToast('Thanks for the feedback!')
  }, [appendLine, editablePrompt, setLikeState, showToast])

  const handleDislikePrompt = useCallback(() => {
    if (!editablePrompt) {
      appendLine(ROLE.APP, 'There is no prompt to dislike yet.')
      return
    }
    void recordEvent('prompt_vote', { vote: 'dislike', prompt: editablePrompt })
    setLikeState('disliked')
    showToast('Thanks for the feedback!')
  }, [appendLine, editablePrompt, setLikeState, showToast])

  const handleHistory = useCallback(async () => {
    try {
      const items = await listHistory(10)
      renderHistoryItems(items)
    } catch (err) {
      console.error('Failed to load history', err)
      appendLine(ROLE.APP, 'Something went wrong while loading history.')
    }
  }, [appendLine, renderHistoryItems])

  const handleUseFromHistory = useCallback(
    async (index: number) => {
      let history = lastHistory

      if (!history || history.length === 0) {
        try {
          const items = await listHistory(10)
          renderHistoryItems(items)
          history = items
        } catch (err) {
          console.error('Failed to load history for /use', err)
          appendLine(ROLE.APP, `Could not load history. Try ${COMMAND.HISTORY} first.`)
          return
        }
      }

      if (!history || history.length === 0) {
        appendLine(ROLE.APP, 'No history yet for this session.')
        return
      }
      if (index < 1 || index > history.length) {
        appendLine(ROLE.APP, `No such history entry. Use ${COMMAND.HISTORY} to see entries.`)
        return
      }

      applyHistoryItem(index - 1, history)
    },
    [appendLine, applyHistoryItem, lastHistory, renderHistoryItems]
  )

  const { generateFinalPromptForTask, handleEditPrompt, handleStop } = useGenerationController({
    preferences,
    pendingTask,
    clarifyingAnswersRef,
    setIsGenerating,
    setAnsweringQuestions,
    setEditablePrompt,
    setPromptEditDiff,
    setIsPromptEditable,
    setIsPromptFinalized,
    setLastApprovedPrompt,
    setPendingTask,
    setLoginRequiredOpen,
    setActivity,
    appendLine,
    showToast,
    user,
    awaitingQuestionConsent,
    consentRequired: true,
  })

  const guardedGenerateFinalPromptForTask = useCallback(
    async (task: string, answers: ClarifyingAnswer[], options?: { skipConsentCheck?: boolean }) => {
      if (!options?.skipConsentCheck && awaitingQuestionConsent) {
        return
      }
      await generateFinalPromptForTask(task, answers, options)
    },
    [awaitingQuestionConsent, generateFinalPromptForTask]
  )

  const runEditPrompt = useCallback(
    (instructions: string) => {
      if (!editablePrompt) {
        appendLine(ROLE.APP, 'There is no prompt to edit yet. Generate one first.')
        return
      }
      void handleEditPrompt(editablePrompt, instructions.trim(), pendingTask)
    },
    [appendLine, editablePrompt, handleEditPrompt, pendingTask]
  )

  useEffect(() => {
    if (user && isLoginRequiredOpen && pendingTask) {
      setLoginRequiredOpen(false)
      void guardedGenerateFinalPromptForTask(pendingTask, clarifyingAnswers)
    }
  }, [
    user,
    isLoginRequiredOpen,
    pendingTask,
    guardedGenerateFinalPromptForTask,
    setLoginRequiredOpen,
    clarifyingAnswers,
  ])

  const { handleCommand } = useCommandRouter({
    editablePrompt,
    handleHelpCommand: () => {
      if (headerHelpShown) {
        appendLine(ROLE.APP, `Help is already shown. Use ${COMMAND.CLEAR} to reset the terminal.`)
        return
      }
      handleHelpCommand()
      setHeaderHelpShown(true)
    },
    handleClear,
    handleRestore,
    handleDiscard,
    handleHistory: () => handleHistory(),
    handleUseFromHistory: (index: number) => handleUseFromHistory(index),
    handleEditPrompt: runEditPrompt,
    startPreferencesFlow,
    appendLine: (role, text) => appendLine(role, text),
  })

  const {
    getPreferencesToAsk,
    startPreferenceQuestions,
    handlePreferenceAnswer,
    handlePreferenceOptionClick,
    getPreferenceOptions,
    getPreferenceQuestionText,
  } = usePreferenceQuestions({
    preferences,
    pendingTask,
    currentPreferenceQuestionKey,
    isAskingPreferenceQuestions,
    preferenceSelectedOptionIndex,
    pendingPreferenceUpdates,
    preferenceQuestionsEnabled: preferences.uiDefaults?.askPreferencesInGuided !== false,
    setIsAskingPreferenceQuestions,
    setCurrentPreferenceQuestionKey,
    setPreferenceSelectedOptionIndex,
    setPendingPreferenceUpdates,
    setActivity,
    focusInputToEnd,
    setValue,
    clarifyingAnswersRef,
    generateFinalPromptForTask: guardedGenerateFinalPromptForTask,
  })

  const {
    startClarifyingQuestions,
    handleQuestionConsent,
    handleClarifyingOptionClick,
    handleClarifyingAnswer,
    handleUndoAnswer,
    appendClarifyingQuestion,
    selectForQuestion,
  } = useClarifyingFlow({
    pendingTask,
    preferences,
    clarifyingQuestions,
    currentQuestionIndex,
    generationRunIdRef: clarifyingRunIdRef,
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
    startPreferenceQuestions: () => startPreferenceQuestions(),
    generateFinalPromptForTask: guardedGenerateFinalPromptForTask,
  })

  const handleClarifyingSkip = useCallback(() => {
    void handleClarifyingAnswer('')
  }, [handleClarifyingAnswer])

  const handleClarifyingNext = useCallback(
    (forcedIndex?: number | null) => {
      const trimmed = value.trim()
      if (trimmed) {
        void handleClarifyingAnswer(trimmed)
        setValue('')
        return
      }

      const selection = typeof forcedIndex === 'number' ? forcedIndex : clarifyingSelectedOptionIndex ?? null
      if (selection === -1) {
        handleUndoAnswer()
        return
      }
      if (selection === -2) {
        focusInputToEnd()
        return
      }
      if (selection === -3) {
        handleClarifyingSkip()
        return
      }

      if (
        selection !== null &&
        selection >= 0 &&
        clarifyingQuestions &&
        clarifyingQuestions.length > 0 &&
        currentQuestionIndex < clarifyingQuestions.length
      ) {
        void handleClarifyingOptionClick(selection)
        return
      }

      appendLine(ROLE.APP, 'Pick an option or type an answer to continue.')
      focusInputToEnd()
    },
    [
      appendLine,
      clarifyingQuestions,
      clarifyingSelectedOptionIndex,
      currentQuestionIndex,
      focusInputToEnd,
      handleClarifyingAnswer,
      handleClarifyingOptionClick,
      handleClarifyingSkip,
      handleUndoAnswer,
      setValue,
      value,
    ]
  )

  const clarifyingCanSubmit =
    Boolean(value.trim()) || (clarifyingSelectedOptionIndex !== null && clarifyingSelectedOptionIndex >= 0)

  const handlePreferenceNext = useCallback(
    (forcedIndex?: number | null) => {
      const trimmed = value.trim()
      if (trimmed) {
        handlePreferenceAnswer(trimmed)
        setValue('')
        return
      }

      const selection = typeof forcedIndex === 'number' ? forcedIndex : preferenceSelectedOptionIndex ?? null

      if (selection === -1) {
        handlePreferenceOptionClick(-1)
        return
      }

      if (selection !== null && selection >= 0 && currentPreferenceQuestionKey) {
        handlePreferenceOptionClick(selection)
        return
      }

      appendLine(ROLE.APP, 'Pick an option or type an answer to continue.')
      focusInputToEnd()
    },
    [
      appendLine,
      currentPreferenceQuestionKey,
      handlePreferenceAnswer,
      handlePreferenceOptionClick,
      focusInputToEnd,
      preferenceSelectedOptionIndex,
      setValue,
      value,
    ]
  )

  const preferenceCanSubmit =
    Boolean(value.trim()) || (preferenceSelectedOptionIndex !== null && preferenceSelectedOptionIndex >= 0)

  const handleClarifyingOptionSelect = useCallback(
    (index: number) => {
      setClarifyingSelectedOptionIndex(index)
      focusInputToEnd()
      if (index >= 0) {
        handleClarifyingNext(index)
      }
    },
    [focusInputToEnd, handleClarifyingNext, setClarifyingSelectedOptionIndex]
  )

  const focusInputWithPulse = useCallback(() => {
    focusInputToEnd()
    const el = inputRef.current
    if (!el) return
    el.classList.add('ring-2', 'ring-slate-500', 'ring-offset-1', 'ring-offset-slate-950', 'animate-pulse')
    setTimeout(() => {
      el.classList.remove('ring-2', 'ring-slate-500', 'ring-offset-1', 'ring-offset-slate-950', 'animate-pulse')
    }, 220)
  }, [focusInputToEnd, inputRef])

  const handleClarifyingFree = useCallback(() => {
    setClarifyingSelectedOptionIndex(-2)
    focusInputWithPulse()
  }, [focusInputWithPulse, setClarifyingSelectedOptionIndex])

  const handlePreferenceFree = useCallback(() => {
    setPreferenceSelectedOptionIndex(-2)
    focusInputWithPulse()
  }, [focusInputWithPulse, setPreferenceSelectedOptionIndex])

  const handlePreferenceOptionSelect = useCallback(
    (index: number) => {
      setPreferenceSelectedOptionIndex(index)
      focusInputToEnd()
      if (index >= 0) {
        handlePreferenceNext(index)
      }
    },
    [focusInputToEnd, handlePreferenceNext, setPreferenceSelectedOptionIndex]
  )

  const handlePreferenceBackNav = useCallback(() => {
    if (!currentPreferenceQuestionKey || !getPreferencesToAsk) {
      handlePreferenceAnswer('back')
      return
    }

    const prefsToAsk = getPreferencesToAsk()
    const currentIndex = prefsToAsk.indexOf(currentPreferenceQuestionKey as PreferenceKey)

    if (currentIndex <= 0) {
      // Exit preference flow and return to the last clarifying question
      setIsAskingPreferenceQuestions(false)
      setCurrentPreferenceQuestionKey(null)
      setPreferenceSelectedOptionIndex(null)
      setPendingPreferenceUpdates({})
      handleUndoAnswer()
      return
    }

    handlePreferenceAnswer('back')
  }, [
    currentPreferenceQuestionKey,
    getPreferencesToAsk,
    handlePreferenceAnswer,
    handleUndoAnswer,
    setCurrentPreferenceQuestionKey,
    setIsAskingPreferenceQuestions,
    setPendingPreferenceUpdates,
    setPreferenceSelectedOptionIndex,
  ])

  const handleGlobalBack = useCallback(() => {
    // If a final prompt is rendered, drop it and reopen the most recent step.
    if (editablePrompt && clarifyingQuestions && clarifyingQuestions.length > 0 && clarifyingAnswers.length > 0) {
      const prefKeys = Object.keys(pendingPreferenceUpdates ?? {})
      if (prefKeys.length > 0 && getPreferenceOptions) {
        const lastKey = prefKeys[prefKeys.length - 1] as PreferenceKey
        const saved = pendingPreferenceUpdates[lastKey] ?? preferences[lastKey]
        const opts = getPreferenceOptions(lastKey) ?? []
        const trimmed = saved !== undefined && saved !== null ? String(saved).trim() : ''
        let sel: number | null = null
        if (trimmed) {
          if (opts.length > 0) {
            const idx = opts.findIndex((o) => o.label === trimmed)
            sel = idx >= 0 ? idx : -2
          } else {
            sel = -2
          }
        }
        setEditablePrompt(null)
        setPromptEditDiff(null)
        setActivity({
          task: pendingTask ?? '',
          stage: 'preferences',
          status: 'loading',
          message: 'Preferences',
          detail: 'Answering these questions improves the quality of your prompt.',
        })
        setIsAskingPreferenceQuestions(true)
        setCurrentPreferenceQuestionKey(lastKey)
        setPreferenceSelectedOptionIndex(sel)
        setValue(trimmed)
        return
      }
      setEditablePrompt(null)
      setPromptEditDiff(null)
      setActivity(null)
      handleUndoAnswer()
      return
    }

    if (isAskingPreferenceQuestions) {
      handlePreferenceBackNav()
      return
    }
    if (answeringQuestions || (clarifyingQuestions && clarifyingQuestions.length > 0)) {
      handleUndoAnswer()
      return
    }
  }, [
    answeringQuestions,
    clarifyingAnswers.length,
    clarifyingQuestions,
    editablePrompt,
    getPreferenceOptions,
    handlePreferenceBackNav,
    handleUndoAnswer,
    isAskingPreferenceQuestions,
    pendingPreferenceUpdates,
    preferences,
    pendingTask,
    setActivity,
    setCurrentPreferenceQuestionKey,
    setEditablePrompt,
    setIsAskingPreferenceQuestions,
    setPreferenceSelectedOptionIndex,
    setPromptEditDiff,
    setValue,
  ])

  const consentNav = {
    active: awaitingQuestionConsent,
    value,
    selected: consentSelectedIndex,
    setSelected: setConsentSelectedIndex,
    onAnswer: (answer: string) => {
      return handleQuestionConsent(answer)
    },
  }

  const clarifyingNav = {
    active: answeringQuestions,
    questions: clarifyingQuestions,
    currentIndex: currentQuestionIndex,
    selectedIndex: clarifyingSelectedOptionIndex,
    setSelectedIndex: setClarifyingSelectedOptionIndex,
    onSelectOption: (index: number) => handleClarifyingNext(index),
    onUndo: handleUndoAnswer,
    onSkip: handleClarifyingSkip,
    onFreeAnswer: focusInputToEnd,
  }

  const preferenceNav = {
    active: isAskingPreferenceQuestions,
    options:
      currentPreferenceQuestionKey && getPreferenceOptions ? getPreferenceOptions(currentPreferenceQuestionKey) : [],
    selectedIndex: preferenceSelectedOptionIndex,
    setSelectedIndex: setPreferenceSelectedOptionIndex,
    onSelectOption: (index: number) => handlePreferenceNext(index),
    onBack: handlePreferenceBackNav,
    onSkip: () => handlePreferenceOptionClick(-1),
    onFreeAnswer: focusInputToEnd,
  }

  const { submitCurrent, handleFormSubmit } = createTaskFlowHandlers({
    state: {
      isGenerating,
      value,
      lines,
      preferencesStep,
      awaitingQuestionConsent,
      pendingTask,
      consentSelectedIndex,
      answeringQuestions,
      clarifyingQuestions,
      clarifyingAnswers,
      currentQuestionIndex,
      isAskingPreferenceQuestions,
      currentPreferenceQuestionKey,
      hasRunInitialTask,
      isRevising,
      generationMode,
      editablePrompt,
    },
    actions: {
      setValue,
      appendLine,
      handleCommand,
      advancePreferences,
      handleQuestionConsent,
      handleClarifyingAnswer,
      handlePreferenceAnswer,
      runEditPrompt,
      setHasRunInitialTask,
      setPendingTask,
      setActivity,
      resetClarifyingFlowState,
      resetPreferenceFlowState,
      setEditablePrompt,
      setIsPromptEditable,
      setIsPromptFinalized,
      setLikeState,
      setAwaitingQuestionConsent,
      setConsentSelectedIndex,
      startClarifyingQuestions,
      setAnsweringQuestions,
      setCurrentQuestionIndex,
      selectForQuestion,
      appendClarifyingQuestion,
      focusInputToEnd,
      guardedGenerateFinalPromptForTask,
      setIsRevising,
      setClarifyingSelectedOptionIndex,
      setLastApprovedPrompt,
    },
  })

  const promptControls = {
    value,
    submit: submitCurrent,
    editablePrompt,
    setIsPromptEditable,
    setIsPromptFinalized,
    editablePromptRef,
    inputRef,
    onCopyEditablePrompt: () => void copyEditablePrompt(),
  }

  const { handleKeyDown } = useTerminalHotkeys({
    consent: consentNav,
    clarifying: clarifyingNav,
    preference: preferenceNav,
    prompt: promptControls,
  })

  const { handleModeChange } = createModeController({
    generationMode,
    preferences,
    updatePreferencesLocally,
    resetClarifyingFlowState,
    resetPreferenceFlowState,
    setAwaitingQuestionConsent,
    setGenerationMode,
    appendLine,
  })

  const isFreshSession = !hasRunInitialTask

  const inputPlaceholder = answeringQuestions
    ? 'Type an answer or pick an option • Enter/Next to continue'
    : awaitingQuestionConsent
    ? 'Generate now or sharpen first (click or use ↑↓)'
    : isAskingPreferenceQuestions
    ? 'Choose a preference or skip to generate now'
    : editablePrompt !== null
    ? 'Type how you want the prompt updated (e.g., "make it shorter")'
    : generationMode === 'quick'
    ? 'Quick Start selected. Type your task to generate immediately.'
    : generationMode === 'guided'
    ? 'Guided Build selected. Type your task to start clarifying.'
    : 'What are you trying to achieve?'

  const headerNode = (
    <TerminalHeader
      onProfileClick={() => {
        setUserManagementOpen(true)
      }}
      onSettingsClick={() => {
        setPreferencesOpen(true)
      }}
      theme={(preferences.uiDefaults?.theme as ThemeName | undefined) ?? DEFAULT_THEME}
      onThemeChange={(nextTheme) => {
        const updated = {
          ...preferences,
          uiDefaults: { ...(preferences.uiDefaults ?? {}), theme: nextTheme },
        }
        updatePreferencesLocally(updated)
      }}
    />
  )

  const panelsNode = (
    <TerminalPanels
      preferences={{
        open: isPreferencesOpen,
        values: preferences,
        source: preferenceSource,
        user,
        saving: isSavingPreferences,
        canSave: Boolean(user),
        onClose: () => setPreferencesOpen(false),
        onChange: handlePreferencesChange,
        onSave: handleSavePreferences,
        onSignIn: handleSignIn,
        onSignOut: handleSignOut,
      }}
      userManagement={{
        open: isUserManagementOpen,
        user,
        onClose: () => {
          setUserManagementOpen(false)
          setPreferencesOpen(false)
        },
        onOpenPreferences: () => {
          setPreferencesOpen(true)
        },
        onSignIn: handleSignIn,
        onSignOut: handleSignOut,
      }}
      loginRequired={{
        open: isLoginRequiredOpen,
        onClose: () => {
          setLoginRequiredOpen(false)
          appendLine(ROLE.APP, 'Sign in required to generate prompts. Try again when you are ready.')
        },
        onSignIn: handleSignIn,
      }}
    />
  )

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [])

  const outputPropsWithRefs = {
    lines,
    activity,
    editablePrompt,
    promptEditDiff,
    promptForLinks: editablePrompt ?? lastApprovedPrompt,
    awaitingQuestionConsent,
    consentSelectedIndex,
    answeringQuestions,
    clarifyingAnswersCount: clarifyingAnswers.length,
    currentClarifyingQuestion:
      answeringQuestions &&
      clarifyingQuestions &&
      clarifyingQuestions.length > 0 &&
      currentQuestionIndex < clarifyingQuestions.length
        ? clarifyingQuestions[currentQuestionIndex]
        : null,
    currentClarifyingQuestionIndex: answeringQuestions ? currentQuestionIndex : null,
    clarifyingTotalCount: clarifyingQuestions?.length ?? 0,
    clarifyingSelectedOptionIndex,
    editablePromptRef,
    scrollRef,
    inputRef,
    onHelpCommandClick: (cmd: string) => {
      setValue(cmd)
      focusInputToEnd()
    },
    onConsentOptionClick: (index: number) => {
      // Option order: 0 = Generate now (skip questions), 1 = Sharpen first (ask questions)
      const v = index === 0 ? 'no' : 'yes'
      setConsentSelectedIndex(index)
      void handleQuestionConsent(v)
    },
    onClarifyingOptionClick: handleClarifyingOptionSelect,
    onClarifyingNext: () => handleClarifyingNext(),
    onFocusInputSelectFree: handleClarifyingFree,
    onUndoAnswer: handleUndoAnswer,
    onClarifyingSkip: handleClarifyingSkip,
    onCopyEditable: (text?: string) => void copyEditablePrompt(text),
    onUpdateEditablePrompt: handleManualPromptUpdate,
    onStartNewConversation: handleStartNewConversation,
    onFocusInput: focusInputToEnd,
    onLike: handleLikePrompt,
    onDislike: handleDislikePrompt,
    likeState,
    clarifyingCanSubmit,
    isAskingPreferenceQuestions,
    currentPreferenceQuestionKey,
    preferenceSelectedOptionIndex,
    onPreferenceFocusInputSelectFree: handlePreferenceFree,
    preferenceCanSubmit,
    onPreferenceOptionClick: handlePreferenceOptionSelect,
    onPreferenceNext: () => handlePreferenceNext(),
    onPreferenceBack: handlePreferenceBackNav,
    onPreferenceYourAnswer: focusInputToEnd,
    onPreferenceSkip: () => handlePreferenceOptionClick(-1),
    getPreferenceOptions,
    getPreferenceQuestionText,
    getPreferencesToAsk,
    showStarter: isFreshSession,
    generationMode,
    onModeChange: (mode: GenerationMode, opts?: { silent?: boolean }) => {
      focusInput()
      handleModeChange(mode, opts ?? { silent: isFreshSession })
    },
    onFinalBack: editablePrompt ? handleGlobalBack : undefined,
  }

  const mainNode = (
    <TerminalMain
      onFormSubmit={handleFormSubmit}
      outputProps={outputPropsWithRefs}
      inputProps={{
        value,
        onChange: setValue,
        onKeyDown: handleKeyDown,
        placeholder: inputPlaceholder,
        disabled: inputDisabled,
        inputRef,
      }}
      onSubmit={() => {
        submitCurrent()
        if (inputRef.current) inputRef.current.focus()
      }}
      onStop={handleStop}
      isGenerating={isGenerating}
      onVoiceClick={undefined}
      voiceAvailable={true}
    />
  )

  return <TerminalShellView toastMessage={toastMessage} header={headerNode} panels={panelsNode} main={mainNode} />
}
