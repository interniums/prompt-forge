'use client'

import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react'
import { listHistory } from '@/services/historyService'
import { recordEvent } from '@/services/eventsService'
import { TerminalHeader } from './terminal/TerminalHeader'
import { useToast } from '@/hooks/useToast'
import { clearDraft } from '@/hooks/useDraftPersistence'
import { ROLE, COMMAND, MESSAGE, SHORTCUT, EMPTY_SUBMIT_COOLDOWN_MS, type TerminalRole } from '@/lib/constants'
import { TerminalShellView } from '@/features/terminal/TerminalShellView'
import { TerminalPanels } from '@/features/terminal/TerminalPanels'
import { TerminalMain } from '@/features/terminal/TerminalMain'
import { appendHelpText, formatPreferencesSummary } from '@/features/terminal/terminalText'
import { buildInputProps } from '@/features/terminal/terminalViewModel'
import { useTerminalSnapshotsController } from '@/hooks/useTerminalSnapshotsController'
import { usePreferencesController } from '@/hooks/usePreferencesController'
import { useClarifyingFlow } from '@/hooks/useClarifyingFlow'
import { usePreferenceQuestions } from '@/hooks/usePreferenceQuestions'
import { useTerminalPersistence } from '@/hooks/useTerminalPersistence'
import { useTerminalHotkeys } from '@/hooks/useTerminalHotkeys'
import { useTerminalFocus } from '@/hooks/useTerminalFocus'
import { useGenerationController } from '@/hooks/useGenerationController'
import { useCommandRouter } from '@/hooks/useCommandRouter'
import {
  TerminalStateProvider,
  useTerminalState,
  createInitialTerminalState,
  type PreferenceKey,
  type SessionSnapshot,
} from '@/features/terminal/terminalState'
import {
  setInput,
  appendLines,
  replaceLines,
  setGenerating as setGeneratingAction,
  setPendingTask as setPendingTaskAction,
  setEditablePrompt as setEditablePromptAction,
  setQuestionConsent,
  setClarifyingQuestions as setClarifyingQuestionsAction,
  setClarifyingAnswers as setClarifyingAnswersAction,
  setCurrentQuestionIndex as setCurrentQuestionIndexAction,
  setAnsweringQuestions as setAnsweringQuestionsAction,
  setConsentSelectedIndex as setConsentSelectedIndexAction,
  setClarifyingSelectedOption as setClarifyingSelectedOptionAction,
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
  setEmptySubmitWarned as setEmptySubmitWarnedAction,
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
} from '@/lib/types'

// Re-export types for external consumers
export type { TerminalLine, Preferences }

type PromptTerminalProps = {
  initialLines?: TerminalLine[]
  initialPreferences?: Preferences
  initialUser?: UserIdentity | null
  initialPreferenceSource?: PreferenceSource
  isFirstLogin?: boolean
}

export function PromptTerminal(props: PromptTerminalProps) {
  const initialState = useMemo(() => {
    const initialLines =
      props.initialLines && props.initialLines.length
        ? props.initialLines
        : [
            {
              id: 0,
              role: ROLE.SYSTEM,
              text: MESSAGE.WELCOME,
            },
          ]
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
}: PromptTerminalProps) {
  const { state, dispatch } = useTerminalState()
  const {
    inputValue: value,
    isGenerating,
    pendingTask,
    editablePrompt,
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
    isPreferencesOpen,
    isUserManagementOpen,
    isLoginRequiredOpen,
    draftRestoredShown,
    emptySubmitWarned,
    lastHistory,
    lastSnapshot,
  } = state
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(window.navigator.userAgent)
  const { message: toastMessage, showToast } = useToast()
  // Initialize clarifying answers from saved draft if available
  const clarifyingAnswersRef = useRef<ClarifyingAnswer[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const editablePromptRef = useRef<HTMLTextAreaElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [hasConsent, setHasConsent] = useState(false)
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
  const setEmptySubmitWarned = useCallback((value: boolean) => dispatch(setEmptySubmitWarnedAction(value)), [dispatch])
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
  const setValue = useCallback((next: string) => dispatch(setInput(next)), [dispatch])
  const setLines = useCallback(
    (next: TerminalLine[] | ((prev: TerminalLine[]) => TerminalLine[])) => {
      const resolved = typeof next === 'function' ? (next as (prev: TerminalLine[]) => TerminalLine[])(lines) : next
      dispatch(replaceLines(resolved))
    },
    [dispatch, lines]
  )
  const appendLine = useCallback(
    (role: TerminalRole, text: string) => {
      const nextId = lines.length ? lines[lines.length - 1].id + 1 : 0
      dispatch(appendLines([{ id: nextId, role, text }]))
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
    lines,
    pendingTask,
    editablePrompt,
    clarifyingQuestions,
    clarifyingAnswers,
    currentQuestionIndex,
    answeringQuestions,
    awaitingQuestionConsent,
    consentSelectedIndex,
    clarifyingSelectedOptionIndex,
    isPromptEditable,
    isPromptFinalized,
    headerHelpShown,
    lastApprovedPrompt,
    likeState,
    isGenerating,
    isPreferencesOpen,
    isUserManagementOpen,
    isLoginRequiredOpen,
    restoreDeps: {
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
      setPromptEditable: (v) => dispatch(setPromptEditableAction(v)),
      setPromptFinalized: (v) => dispatch(setPromptFinalizedAction(v)),
      setHeaderHelpShown,
      setLastApprovedPrompt,
      setLikeState,
      replaceLines: (lines) => dispatch(replaceLines(lines)),
      setPreferencesOpen,
      setUserManagementOpen,
      setLoginRequiredOpen,
    },
  })

  const inputDisabled = isGenerating

  const copyEditablePrompt = useCallback(async () => {
    if (!editablePrompt) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(editablePrompt)
        showToast(MESSAGE.PROMPT_COPIED)
        void recordEvent('prompt_copied', { prompt: editablePrompt })
      } else {
        appendLine(ROLE.APP, 'Clipboard is not available in this environment.')
      }
    } catch (err) {
      console.error('Failed to copy editable prompt', err)
      appendLine(ROLE.APP, 'Could not copy to clipboard. You can still select and copy manually.')
    }
  }, [appendLine, editablePrompt, showToast])

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
    clarifyingAnswersRef.current = []
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
    },
    {
      appendLine,
      setLines: (next) => setLines(next),
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
    if (editablePrompt !== null) {
      if (editablePromptRef.current) {
        const el = editablePromptRef.current
        // Autosize to content so the terminal scroll container, not the textarea, handles overflow.
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
        el.focus()
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
      if (scrollRef.current) {
        const el = scrollRef.current
        el.scrollTop = el.scrollHeight
      }
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
      if (key === 'e' && editablePrompt) {
        e.preventDefault()
        setIsPromptEditable(true)
        setIsPromptFinalized(false)
        if (editablePromptRef.current) {
          const el = editablePromptRef.current
          el.focus()
          const len = el.value.length
          el.setSelectionRange(len, len)
        }
        return
      }
    }
    window.addEventListener('keydown', handleFocusShortcut)
    return () => window.removeEventListener('keydown', handleFocusShortcut)
  }, [editablePrompt, setIsPromptEditable, setIsPromptFinalized])

  function autosizeEditablePrompt() {
    if (!editablePromptRef.current) return
    const el = editablePromptRef.current
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => {
    if (!isPromptEditable || !editablePromptRef.current) return
    const el = editablePromptRef.current
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [isPromptEditable])

  // Approve flow removed per new requirements

  function handleEditableChange(text: string) {
    setEditablePrompt(text)
    autosizeEditablePrompt()
    if (isPromptFinalized && text !== lastApprovedPrompt) {
      setIsPromptFinalized(false)
      setLastApprovedPrompt(null)
    }
  }

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
  }, [appendLine, editablePrompt, setLikeState])

  const handleDislikePrompt = useCallback(() => {
    if (!editablePrompt) {
      appendLine(ROLE.APP, 'There is no prompt to dislike yet.')
      return
    }
    void recordEvent('prompt_vote', { vote: 'dislike', prompt: editablePrompt })
    setLikeState('disliked')
  }, [appendLine, editablePrompt, setLikeState])

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

  // Get list of preference keys that should be asked about (where "Ask every time" is enabled)
  const hasAnyPreference =
    preferences.tone ||
    preferences.audience ||
    preferences.domain ||
    preferences.defaultModel ||
    preferences.outputFormat ||
    preferences.language ||
    preferences.depth

  const { generateFinalPromptForTask, handleEditPrompt, handleStop, generationRunIdRef } = useGenerationController({
    preferences,
    pendingTask,
    clarifyingAnswersRef,
    setIsGenerating,
    setAnsweringQuestions,
    setEditablePrompt,
    setIsPromptEditable,
    setIsPromptFinalized,
    setLastApprovedPrompt,
    setPendingTask,
    setLoginRequiredOpen,
    appendLine,
    showToast,
    user,
    preferenceSource,
    hasAnyPreference: Boolean(hasAnyPreference),
    awaitingQuestionConsent,
    consentRequired: preferences.uiDefaults?.showClarifying !== false,
    hasConsent,
  })

  const guardedGenerateFinalPromptForTask = useCallback(
    async (task: string, answers: ClarifyingAnswer[], options?: { skipConsentCheck?: boolean }) => {
      if (!options?.skipConsentCheck && (awaitingQuestionConsent || !hasConsent)) {
        return
      }
      await generateFinalPromptForTask(task, answers, options)
    },
    [awaitingQuestionConsent, generateFinalPromptForTask, hasConsent]
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
      const answers = clarifyingAnswersRef.current
      void guardedGenerateFinalPromptForTask(pendingTask, answers)
    }
  }, [user, isLoginRequiredOpen, pendingTask, guardedGenerateFinalPromptForTask, setLoginRequiredOpen])

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
    handlePreferenceKey,
    getPreferenceOptions,
    getPreferenceQuestionText,
  } = usePreferenceQuestions({
    preferences,
    pendingTask,
    currentPreferenceQuestionKey,
    isAskingPreferenceQuestions,
    preferenceSelectedOptionIndex,
    pendingPreferenceUpdates,
    setIsAskingPreferenceQuestions,
    setCurrentPreferenceQuestionKey,
    setPreferenceSelectedOptionIndex,
    setPendingPreferenceUpdates,
    updatePreferencesLocally,
    appendLine,
    focusInputToEnd,
    clarifyingAnswersRef,
    generateFinalPromptForTask: guardedGenerateFinalPromptForTask,
  })

  const {
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
    focusInputToEnd,
    getPreferencesToAsk,
    startPreferenceQuestions: () => startPreferenceQuestions(),
    generateFinalPromptForTask: guardedGenerateFinalPromptForTask,
  })

  const consentNav = {
    active: awaitingQuestionConsent,
    value,
    selected: consentSelectedIndex,
    setSelected: setConsentSelectedIndex,
    onAnswer: (answer: string) => {
      setHasConsent(true)
      return handleQuestionConsent(answer)
    },
  }

  const clarifyingNav = {
    active: answeringQuestions,
    questions: clarifyingQuestions,
    currentIndex: currentQuestionIndex,
    selectedIndex: clarifyingSelectedOptionIndex,
    setSelectedIndex: setClarifyingSelectedOptionIndex,
    onSelectOption: handleClarifyingOptionClick,
    onUndo: handleUndoAnswer,
  }

  const preferenceNav = {
    active: isAskingPreferenceQuestions,
    onKey: handlePreferenceKey,
  }

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

  async function handleTask(line: string) {
    const task = line.trim()
    if (!task) return

    void recordEvent('task_submitted', { task })
    setHasConsent(false)

    // If revising and task is unchanged, reuse previous clarifying questions/answers.
    if (isRevising && pendingTask && task === pendingTask && clarifyingQuestions && clarifyingQuestions.length > 0) {
      setIsRevising(false)
      setHasRunInitialTask(true)
      setAwaitingQuestionConsent(false)
      const answered = clarifyingAnswersRef.current.length
      if (answered < clarifyingQuestions.length) {
        setAnsweringQuestions(true)
        setCurrentQuestionIndex(answered)
        const nextQuestion = clarifyingQuestions[answered]
        selectForQuestion(nextQuestion ?? null, answered > 0)
        appendClarifyingQuestion(nextQuestion, answered, clarifyingQuestions.length)
        focusInputToEnd()
      } else {
        await guardedGenerateFinalPromptForTask(task, clarifyingAnswersRef.current)
      }
      setValue('')
      return
    }

    setIsRevising(false)

    // After the first full task, treat further free-text inputs as edits to the existing prompt
    // instead of restarting the clarifying-question flow, unless the user has started a new
    // conversation via /discard.
    if (hasRunInitialTask) {
      if (editablePrompt) {
        void runEditPrompt(task)
        return
      }

      // If for some reason we don't have a prompt yet, just try to generate one directly
      // without re-asking questions.
      await guardedGenerateFinalPromptForTask(task, [])
      return
    }

    setHasRunInitialTask(true)
    setPendingTask(task)
    resetClarifyingFlowState()
    setEditablePrompt(null)
    setIsPromptEditable(false)
    setIsPromptFinalized(false)

    const wantsClarifying = preferences.uiDefaults?.showClarifying !== false

    if (!wantsClarifying) {
      await guardedGenerateFinalPromptForTask(task, [])
      return
    }

    appendLine(ROLE.APP, MESSAGE.QUESTION_CONSENT)
    setAwaitingQuestionConsent(true)
    setConsentSelectedIndex(0) // Highlight first option so arrow navigation is obvious
    // Ensure input is focused for arrow navigation
    setTimeout(() => focusInputToEnd(), 0)
  }

  function submitCurrent() {
    if (isGenerating) {
      return
    }

    const raw = value
    const line = raw.trim()
    if (!line) {
      if (!emptySubmitWarned) {
        appendLine(ROLE.APP, MESSAGE.EMPTY_SUBMIT_WARNING)
        setEmptySubmitWarned(true)
        window.setTimeout(() => setEmptySubmitWarned(false), EMPTY_SUBMIT_COOLDOWN_MS)
      }
      return
    }

    // Check if this is a clear command on an already empty terminal
    if (line.startsWith('/')) {
      const [command] = line.trim().split(/\s+/)
      if (command === COMMAND.CLEAR) {
        const isEmpty =
          lines.length === 1 &&
          lines[0]?.role === ROLE.SYSTEM &&
          (lines[0]?.text === MESSAGE.WELCOME ||
            lines[0]?.text === MESSAGE.WELCOME_FRESH ||
            lines[0]?.text === MESSAGE.HISTORY_CLEARED)
        if (isEmpty) {
          // Terminal is already empty, don't append the command and do nothing
          setValue('')
          return
        }
      }
    }

    if (line.startsWith('/')) {
      appendLine(ROLE.USER, raw)
      handleCommand(line)
      setValue('')
      return
    }

    if (preferencesStep) {
      appendLine(ROLE.USER, raw)
      advancePreferences(line)
      setValue('')
      return
    }

    if (awaitingQuestionConsent && pendingTask) {
      appendLine(ROLE.USER, raw)
      setHasConsent(true)
      void handleQuestionConsent(line)
      setValue('')
      return
    }

    if (
      answeringQuestions &&
      clarifyingQuestions &&
      clarifyingQuestions.length > 0 &&
      currentQuestionIndex < clarifyingQuestions.length &&
      pendingTask
    ) {
      // Don't append here - handleClarifyingAnswer will append the answer
      void handleClarifyingAnswer(line)
      setValue('')
      return
    }

    if (isAskingPreferenceQuestions && currentPreferenceQuestionKey) {
      // Don't append here - handlePreferenceAnswer will append the answer
      handlePreferenceAnswer(line)
      setValue('')
      return
    }

    // For regular tasks, append the user input
    appendLine(ROLE.USER, raw)
    void handleTask(line)
    setValue('')
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitCurrent()
  }

  function handleReviseFlow() {
    // Allow editing task and clarifying answers even after prompt generation.
    setIsRevising(true)
    setHasRunInitialTask(false)
    setAwaitingQuestionConsent(false)
    setAnsweringQuestions(false)
    // Preserve clarifyingQuestions and answers; user can reuse them if task stays same.
    setCurrentQuestionIndex(clarifyingAnswersRef.current.length)
    setClarifyingSelectedOptionIndex(null)
    setConsentSelectedIndex(null)
    setEditablePrompt(null)
    setIsPromptEditable(false)
    setIsPromptFinalized(false)
    setLastApprovedPrompt(null)
    setValue(pendingTask ?? '')
    appendLine(ROLE.APP, 'Revise the task or clarifying answers. Update the task and press Enter to continue.')
    focusInputToEnd()
  }

  const starterExamples = [
    'Write a landing page headline + 3 variants for a prompt generator app.',
    'Refactor this React component for readability and performance. (Paste code)',
  ]

  const starterMessages: string[] = [MESSAGE.WELCOME, MESSAGE.WELCOME_FRESH, MESSAGE.HISTORY_CLEARED]

  const isFreshSession =
    lines.length === 1 &&
    lines[0]?.role === ROLE.SYSTEM &&
    starterMessages.includes(lines[0]?.text ?? '') &&
    !editablePrompt &&
    !pendingTask &&
    !isGenerating &&
    !answeringQuestions &&
    !awaitingQuestionConsent

  const inputPlaceholder = answeringQuestions
    ? 'Type your own answer here or use arrows to select'
    : awaitingQuestionConsent
    ? 'Generate now or sharpen first (select an option)'
    : isAskingPreferenceQuestions
    ? 'Choose a preference or skip to generate now'
    : editablePrompt !== null
    ? `Provide feedback about the generated prompt or press ${isMac ? SHORTCUT.COPY_MAC : SHORTCUT.COPY_WIN} to copy`
    : 'What are you trying to achieve?'

  const headerNode = (
    <TerminalHeader
      onProfileClick={() => {
        setUserManagementOpen(true)
      }}
    />
  )

  const handleExampleInsert = useCallback(
    (text: string) => {
      setValue(text)
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const len = text.length
          inputRef.current.focus()
          inputRef.current.setSelectionRange(len, len)
        }
      })
    },
    [setValue]
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

  const outputPropsWithRefs = {
    lines,
    editablePrompt,
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
    clarifyingSelectedOptionIndex,
    editablePromptRef,
    scrollRef,
    inputRef,
    onHelpCommandClick: (cmd: string) => {
      setValue(cmd)
      focusInputToEnd()
    },
    onConsentOptionClick: (index: number) => {
      const v = index === 0 ? 'yes' : 'no'
      setConsentSelectedIndex(index)
      void handleQuestionConsent(v)
    },
    onClarifyingOptionClick: handleClarifyingOptionClick,
    onUndoAnswer: handleUndoAnswer,
    onRevise: handleReviseFlow,
    onEditableChange: handleEditableChange,
    onCopyEditable: () => void copyEditablePrompt(),
    onStartNewConversation: handleStartNewConversation,
    onLike: handleLikePrompt,
    onDislike: handleDislikePrompt,
    likeState,
    isAskingPreferenceQuestions,
    currentPreferenceQuestionKey,
    preferenceSelectedOptionIndex,
    onPreferenceOptionClick: handlePreferenceOptionClick,
    getPreferenceOptions,
    getPreferenceQuestionText,
    getPreferencesToAsk,
    showStarter: isFreshSession,
    starterExamples,
    starterTitle: 'No history yet. Generate your first prompt to get started.',
    starterSubtitle: "You'll get 1–3 prompt options plus quick refinements.",
    onExampleInsert: handleExampleInsert,
  }

  const mainNode = (
    <TerminalMain
      onFormSubmit={handleFormSubmit}
      outputProps={outputPropsWithRefs}
      inputProps={{
        ...buildInputProps({
          value,
          onChange: setValue,
          onKeyDown: handleKeyDown,
          placeholder: inputPlaceholder,
          disabled: inputDisabled,
        }),
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
