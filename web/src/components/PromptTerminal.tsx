'use client'

import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react'
import { recordEvent } from '@/services/eventsService'
import { useToast } from '@/hooks/useToast'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { clearDraft } from '@/hooks/useDraftPersistence'
import { MESSAGE } from '@/lib/constants'
import { DEFAULT_THEME } from '@/lib/constants'

import { usePreferencesController } from '@/hooks/usePreferencesController'
import { useTerminalPersistence } from '@/hooks/useTerminalPersistence'
import { useTerminalHotkeys } from '@/hooks/useTerminalHotkeys'
import { useUnclearTask } from '@/features/terminal/hooks/useUnclearTask'
import { useTerminalFocus } from '@/hooks/useTerminalFocus'
import { useGenerationController } from '@/hooks/useGenerationController'
import { useCommandRouter } from '@/hooks/useCommandRouter'
import { UnclearTaskModal } from '@/features/terminal/UnclearTaskModal'
import { VoiceLanguageModal, resolveVoiceLanguage } from '@/features/terminal/VoiceLanguageModal'
import { useTaskFlowHandlers } from '@/features/terminal/hooks/useTaskFlowHandlers'
import { useTerminalNav } from '@/features/terminal/hooks/useTerminalNav'
import { usePromptControls } from '@/features/terminal/hooks/usePromptControls'
import { useClarifyingPreferenceFlows } from '@/features/terminal/hooks/useClarifyingPreferenceFlows'
import { useClarifyingHistory } from '@/features/terminal/hooks/useClarifyingHistory'
import { useTerminalChrome } from '@/features/terminal/hooks/useTerminalChrome'
import { useTerminalLayout } from '@/features/terminal/hooks/useTerminalLayout'
import { useTerminalHistory } from '@/features/terminal/hooks/useTerminalHistory'
import { useTerminalOutputProps } from '@/features/terminal/hooks/useTerminalOutputProps'
import { usePromptHistoryPanel } from '@/features/terminal/hooks/usePromptHistoryPanel'
import { PromptHistoryPanel } from '@/features/terminal/PromptHistoryPanel'
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
  TaskActivity,
  ThemeName,
} from '@/lib/types'
import { createModeController } from '@/features/terminal/modeController'

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

  const { toast, showToast, showTypedToast, hideToast } = useToast()
  const toastMessage = toast?.text ?? null
  const toastType = toast?.type
  // Initialize clarifying answers from saved draft if available
  const clarifyingAnswersRef = useRef<ClarifyingAnswer[]>([])
  // Track the last removed answer for display when backing to a question
  const [lastRemovedClarifyingAnswer, setLastRemovedClarifyingAnswer] = useState<{
    questionId: string | null
    answer: string | null
  }>({ questionId: null, answer: null })
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [restoredFromHistory, setRestoredFromHistory] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const editablePromptRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const startClarifyingQuestionsRef = useRef<
    ((task: string, options?: { allowUnclear?: boolean }) => Promise<void>) | null
  >(null)
  const guardedGenerateFinalPromptForTaskRef = useRef<
    | ((
        task: string,
        answers: ClarifyingAnswer[],
        options?: { skipConsentCheck?: boolean; allowUnclear?: boolean }
      ) => Promise<void>)
    | null
  >(null)
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
  const { clarifyingAnswerHistory } = useClarifyingHistory(clarifyingAnswers)
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

  // Voice language modal state - shown on first mic use if language not configured
  const [isVoiceLanguageModalOpen, setIsVoiceLanguageModalOpen] = useState(false)

  // Get voice language from preferences (or 'auto' as default)
  const configuredVoiceLanguage = preferences.uiDefaults?.voiceLanguage ?? 'auto'
  const resolvedVoiceLanguage = resolveVoiceLanguage(configuredVoiceLanguage)

  // Voice recognition integration - appends transcribed text to input
  const handleVoiceResult = useCallback(
    (transcript: string) => {
      // Append the voice transcript to current input value
      const currentValue = state.inputValue
      const separator = currentValue.trim() ? ' ' : ''
      setValue(currentValue + separator + transcript)
      // Focus input after voice result
      inputRef.current?.focus()
    },
    [setValue, state.inputValue]
  )

  const handleVoiceError = useCallback(
    (error: string, message?: string) => {
      if (error === 'permission-denied') {
        showTypedToast(message ?? 'Microphone access denied', 'error')
      } else if (error === 'not-supported') {
        showTypedToast('Voice input not supported in this browser', 'error')
      } else if (error !== 'aborted' && error !== 'no-speech') {
        // Don't show toast for user-aborted or no-speech (silent failures)
        showTypedToast(message ?? 'Voice input error', 'error')
      }
    },
    [showTypedToast]
  )

  const {
    isSupported: voiceSupported,
    isListening: isVoiceListening,
    startListening: rawStartVoiceListening,
    stopListening: stopVoiceListening,
  } = useVoiceRecognition({
    language: resolvedVoiceLanguage,
    onResult: handleVoiceResult,
    onError: handleVoiceError,
  })

  // Check if we should show language modal on first mic use
  const hasAskedVoiceLanguage = useCallback(() => {
    if (typeof window === 'undefined') return true
    // If user has explicitly set a language in preferences, don't ask
    if (configuredVoiceLanguage !== 'auto') return true
    // Check localStorage flag
    return localStorage.getItem('pf_voice_language_asked') === 'true'
  }, [configuredVoiceLanguage])

  // Wrapped start listening that shows modal on first use
  const startVoiceListening = useCallback(() => {
    if (!hasAskedVoiceLanguage()) {
      setIsVoiceLanguageModalOpen(true)
      return
    }
    rawStartVoiceListening()
  }, [hasAskedVoiceLanguage, rawStartVoiceListening])

  // Handle voice language modal confirm
  const handleVoiceLanguageConfirm = useCallback(
    (language: string) => {
      // Save to localStorage so we don't ask again
      if (typeof window !== 'undefined') {
        localStorage.setItem('pf_voice_language_asked', 'true')
      }
      // Update preferences with the selected language
      if (language !== 'auto') {
        updatePreferencesLocally({
          ...preferences,
          uiDefaults: { ...preferences.uiDefaults, voiceLanguage: language },
        })
      }
      setIsVoiceLanguageModalOpen(false)
      // Start listening immediately - must be in user gesture context (click handler)
      // Chrome requires Speech Recognition to start directly from user interaction
      rawStartVoiceListening()
    },
    [preferences, rawStartVoiceListening, updatePreferencesLocally]
  )

  // Handle voice language modal dismiss
  const handleVoiceLanguageDismiss = useCallback(() => {
    setIsVoiceLanguageModalOpen(false)
  }, [])

  const setLines = useCallback(
    (next: TerminalLine[] | ((prev: TerminalLine[]) => TerminalLine[])) => {
      const resolved = typeof next === 'function' ? (next as (prev: TerminalLine[]) => TerminalLine[])(lines) : next
      dispatch(replaceLines(resolved))
    },
    [dispatch, lines]
  )

  const setActivity = useCallback((next: TaskActivity | null) => dispatch(setActivityAction(next)), [dispatch])

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
  const setLikeState = useCallback((value: 'none' | 'liked') => dispatch(setLikeStateAction(value)), [dispatch])

  // Default-select the preferred mode (quick = 0, guided = 1) so keyboard users see focus immediately
  useEffect(() => {
    if (awaitingQuestionConsent && consentSelectedIndex === null) {
      // Index 0 = 'Generate now' (quick mode)
      // Index 1 = 'Sharpen first (quick questions)' (guided mode)
      const preferredIndex = generationMode === 'quick' ? 0 : 1
      setConsentSelectedIndex(preferredIndex)
    }
  }, [awaitingQuestionConsent, consentSelectedIndex, setConsentSelectedIndex, generationMode])

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
        }
      } catch (err) {
        console.error('Failed to copy editable prompt', err)
      }
    },
    [editablePrompt, showToast]
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

  const { focusInputToEnd, blurInput } = useTerminalFocus({
    editablePrompt,
    inputRef,
    copyEditablePrompt: () => void copyEditablePrompt(),
  })

  const {
    allowUnclearFlag,
    unclearTaskModal,
    setEditButtonRef,
    setContinueButtonRef,
    clearUnclearButtonRefs,
    shouldAllowUnclearForTask,
    ensureAllowUnclearForTask,
    handleGeneratingUnclear,
    handleClarifyingUnclear,
    handleUnclearDismiss,
    handleUnclearKeyDown,
    handleUnclearEdit,
    handleUnclearContinue,
    resetAllowUnclear,
  } = useUnclearTask({
    clarifyingAnswersRef,
    focusInputToEnd,
    setValue,
    setActivity,
    startClarifyingQuestionsRef,
    guardedGenerateFinalPromptForTaskRef,
  })

  useEffect(() => {
    if (!unclearTaskModal) {
      clearUnclearButtonRefs()
    }
  }, [clearUnclearButtonRefs, unclearTaskModal])

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
    // Also reset the last removed answer state
    setLastRemovedClarifyingAnswer({ questionId: null, answer: null })
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

  const { handleDiscard, handleStartNewConversation, handleHistory, handleUseFromHistory } = useTerminalHistory(
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
      lastHistory,
    },
    {
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

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    // Wait for React to paint new lines before scrolling.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [])

  useEffect(() => {
    if (editablePrompt !== null && scrollRef.current) {
      const el = scrollRef.current
      el.scrollTop = el.scrollHeight
    }
  }, [editablePrompt])

  useEffect(() => {
    scrollToBottom()
  }, [lines, scrollToBottom])

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

  // Blur input in quick mode after final prompt is generated, or when entering unclear flow
  const blurredForPromptRef = useRef<string | null>(null)
  useEffect(() => {
    // Blur in quick mode after final prompt
    if (
      editablePrompt &&
      generationMode === 'quick' &&
      !isGenerating &&
      blurredForPromptRef.current !== editablePrompt
    ) {
      blurredForPromptRef.current = editablePrompt
      blurInput()
    }
    // Blur when unclear modal is shown
    if (unclearTaskModal) {
      blurInput()
    }
    // Reset when prompt is cleared
    if (!editablePrompt) {
      blurredForPromptRef.current = null
    }
  }, [editablePrompt, generationMode, isGenerating, blurInput, unclearTaskModal])

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

  const handlePreferencesChange = useCallback(
    (next: Preferences) => {
      updatePreferencesLocally(next)
    },
    [updatePreferencesLocally]
  )

  const advancePreferences = useCallback(
    (answer: string) => {
      if (!preferencesStep) return

      if (preferencesStep === 'tone') {
        const next = { ...preferences, tone: answer }
        updatePreferencesLocally(next)
        setPreferencesStep('audience')
        return
      }

      if (preferencesStep === 'audience') {
        const next = { ...preferences, audience: answer }
        updatePreferencesLocally(next)
        setPreferencesStep('domain')
        return
      }

      if (preferencesStep === 'domain') {
        const next = { ...preferences, domain: answer }
        updatePreferencesLocally(next)
        setPreferencesStep(null)
        void handleSavePreferences(next)
      }
    },
    [handleSavePreferences, preferences, preferencesStep, setPreferencesStep, updatePreferencesLocally]
  )

  // Snapshot, history, and reset handlers moved to useTerminalSnapshots

  const handleLikePrompt = useCallback(() => {
    if (!editablePrompt) {
      return
    }
    void recordEvent('prompt_vote', { vote: 'like', prompt: editablePrompt })
    setLikeState('liked')
    showToast('Thanks for the feedback!')
  }, [editablePrompt, setLikeState, showToast])

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
    showToast,
    user,
    awaitingQuestionConsent,
    consentRequired: true,
    onUnclearTask: handleGeneratingUnclear,
  })

  const guardedGenerateFinalPromptForTask = useCallback(
    async (
      task: string,
      answers: ClarifyingAnswer[],
      options?: { skipConsentCheck?: boolean; allowUnclear?: boolean }
    ) => {
      if (!options?.skipConsentCheck && awaitingQuestionConsent) {
        return
      }
      const filteredAnswers = (answers ?? []).filter((ans) => Boolean(ans.answer && ans.answer.trim()))
      await generateFinalPromptForTask(task, filteredAnswers, options)
    },
    [awaitingQuestionConsent, generateFinalPromptForTask]
  )

  const runEditPrompt = useCallback(
    (instructions: string) => {
      if (!editablePrompt) {
        return
      }
      void handleEditPrompt(editablePrompt, instructions.trim(), pendingTask)
    },
    [editablePrompt, handleEditPrompt, pendingTask]
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

  // Wrap handleDiscard to also reset the unclear flag (same as starting a new conversation)
  const handleDiscardWithReset = useCallback(() => {
    resetAllowUnclear()
    handleDiscard()
  }, [handleDiscard, resetAllowUnclear])

  const { handleCommand } = useCommandRouter({
    handleDiscard: handleDiscardWithReset,
  })

  const backToClarifyingFromPreferencesRef = useRef<(() => void) | null>(null)

  const backToClarifyingFromPreferences = useCallback(() => {
    handleUnclearDismiss()
    setIsAskingPreferenceQuestions(false)
    setCurrentPreferenceQuestionKey(null)
    setPreferenceSelectedOptionIndex(null)

    // When backing from preferences to clarifying, we need to go back to the last
    // clarifying question. If there's only 1 clarifying question (index 0) and we
    // try to call handleUndoAnswer, it will return early. So we need to handle this
    // case by re-showing the last clarifying question without calling handleUndoAnswer.
    const answers = clarifyingAnswersRef.current
    if (answers.length > 0 && clarifyingQuestions && clarifyingQuestions.length > 0) {
      const lastIdx = answers.length - 1
      const lastAnswer = answers[lastIdx]
      const lastQuestion = clarifyingQuestions[lastIdx]

      // Don't remove the answer - keep it so user can see/edit it
      setClarifyingAnswers(answers, lastIdx)
      setCurrentQuestionIndex(lastIdx)
      setAnsweringQuestions(true)
      // Check if the answer was a custom "own answer"
      const answerText = (lastAnswer?.answer ?? '').trim()
      const isOwnAnswer =
        lastQuestion && lastQuestion.options.length > 0
          ? !lastQuestion.options.some((opt) => opt.label.trim().toLowerCase() === answerText.toLowerCase())
          : true

      if (isOwnAnswer && answerText) {
        setValue(answerText)
        setClarifyingSelectedOptionIndex(-2)
        focusInputToEnd()
      } else {
        setValue('')
        // Restore the previously selected option index when backing
        if (lastQuestion && lastQuestion.options.length > 0 && answerText) {
          const matchingOptionIndex = lastQuestion.options.findIndex(
            (opt) => opt.label.trim().toLowerCase() === answerText.toLowerCase()
          )
          if (matchingOptionIndex >= 0) {
            setClarifyingSelectedOptionIndex(matchingOptionIndex)
          } else {
            // If no match found, select first option as fallback
            setClarifyingSelectedOptionIndex(0)
          }
        } else {
          // No options or no answer - select first option if available, otherwise null
          setClarifyingSelectedOptionIndex(lastQuestion && lastQuestion.options.length > 0 ? 0 : null)
        }
      }

      // Store the removed answer for display
      setLastRemovedClarifyingAnswer({
        questionId: lastQuestion?.id ?? null,
        answer: lastAnswer?.answer ?? null,
      })

      setActivity({
        task: pendingTask ?? '',
        stage: 'clarifying',
        status: 'loading',
        message: `Clarifying ${lastIdx + 1}/${clarifyingQuestions.length}`,
        detail: 'Answer a few quick questions to sharpen your prompt.',
      })
    }
  }, [
    clarifyingAnswersRef,
    clarifyingQuestions,
    focusInputToEnd,
    handleUnclearDismiss,
    pendingTask,
    setActivity,
    setAnsweringQuestions,
    setClarifyingAnswers,
    setClarifyingSelectedOptionIndex,
    setCurrentPreferenceQuestionKey,
    setCurrentQuestionIndex,
    setIsAskingPreferenceQuestions,
    setLastRemovedClarifyingAnswer,
    setPreferenceSelectedOptionIndex,
    setValue,
  ])

  const { preference, clarifying } = useClarifyingPreferenceFlows({
    pendingTask,
    preferences,
    focusInputToEnd,
    blurInput,
    setValue,
    setActivity,
    clarifyingAnswersRef,
    guardedGenerateFinalPromptForTask,
    onBackToClarifying: backToClarifyingFromPreferences,
    allowUnclearFlag,
    handleClarifyingUnclear,
    clarifyingQuestions,
    clarifyingAnswers,
    currentQuestionIndex,
    consentSelectedIndex,
    answeringQuestions,
    generationMode,
    setIsGenerating,
    setClarifyingQuestions,
    setClarifyingAnswers,
    setCurrentQuestionIndex,
    setAnsweringQuestions,
    setAwaitingQuestionConsent,
    setConsentSelectedIndex,
    setClarifyingSelectedOptionIndex,
    setLastRemovedClarifyingAnswer,
    setHasRunInitialTask,
    showToast,
    getPreferencesToAsk: () => preference.getPreferencesToAsk(),
    startPreferenceQuestions: () => preference.startPreferenceQuestions(),
    currentPreferenceQuestionKey,
    isAskingPreferenceQuestions,
    preferenceSelectedOptionIndex,
    pendingPreferenceUpdates,
    preferencesStep,
    setIsAskingPreferenceQuestions,
    setCurrentPreferenceQuestionKey,
    setPreferenceSelectedOptionIndex,
    setPendingPreferenceUpdates,
  })

  const {
    getPreferencesToAsk,
    getPreferenceOrder,
    getResumePreferenceIndex,
    getPreferenceLastAnswer,
    startPreferenceQuestions,
    handlePreferenceAnswer,
    handlePreferenceOptionClick,
    getPreferenceOptions,
    getPreferenceQuestionText,
  } = preference

  const {
    startClarifyingQuestions,
    handleQuestionConsent,
    handleClarifyingOptionClick,
    handleClarifyingAnswer,
    handleClarifyingSkip: skipClarifyingQuestion,
    handleUndoAnswer,
    appendClarifyingQuestion,
    selectForQuestion,
  } = clarifying

  useEffect(() => {
    backToClarifyingFromPreferencesRef.current = handleUndoAnswer
  }, [handleUndoAnswer])

  useEffect(() => {
    startClarifyingQuestionsRef.current = startClarifyingQuestions
  }, [startClarifyingQuestions])

  useEffect(() => {
    guardedGenerateFinalPromptForTaskRef.current = guardedGenerateFinalPromptForTask
  }, [guardedGenerateFinalPromptForTask])

  const handleClarifyingSkip = useCallback(() => {
    setLastRemovedClarifyingAnswer({ questionId: null, answer: null })
    skipClarifyingQuestion()
  }, [skipClarifyingQuestion])

  const handleStartNewConversationAndClear = useCallback(() => {
    setRestoredFromHistory(false)
    setValue('')
    resetAllowUnclear()
    handleStartNewConversation()
  }, [handleStartNewConversation, resetAllowUnclear, setValue])

  const handleClarifyingNext = useCallback(
    (forcedIndex?: number | null) => {
      const trimmed = value.trim()
      if (trimmed) {
        setLastRemovedClarifyingAnswer({ questionId: null, answer: null })
        void handleClarifyingAnswer(trimmed)
        setValue('')
        return
      }

      const selection = typeof forcedIndex === 'number' ? forcedIndex : clarifyingSelectedOptionIndex ?? null
      if (selection === -1) {
        // Prevent going back from question 1 (index 0) - user should start new conversation instead
        // Allow going back from question 2+ (index 1+) to previous questions
        if (currentQuestionIndex === 0) {
          return
        }
        // Allow going back if we have at least one answer
        // We're on question N (index N-1), so we need at least one answer to go back
        if (clarifyingAnswers.length === 0) {
          return
        }
        // handleUndoAnswer will set lastRemovedClarifyingAnswer correctly
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
        setLastRemovedClarifyingAnswer({ questionId: null, answer: null })
        void handleClarifyingOptionClick(selection)
        return
      }

      focusInputToEnd()
    },
    [
      clarifyingAnswers,
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

  const clarifyingLastAnswerForDisplay =
    answeringQuestions &&
    clarifyingQuestions &&
    clarifyingQuestions.length > 0 &&
    currentQuestionIndex !== null &&
    currentQuestionIndex >= 0 &&
    currentQuestionIndex < clarifyingQuestions.length
      ? (() => {
          const qid = clarifyingQuestions[currentQuestionIndex]?.id
          if (!qid) return null
          // Check if we just backed to this question - use the removed answer for display
          if (lastRemovedClarifyingAnswer.questionId === qid && lastRemovedClarifyingAnswer.answer) {
            const trimmed = lastRemovedClarifyingAnswer.answer.trim()
            if (trimmed.length) return trimmed
          }
          const fromHistory = clarifyingAnswerHistory[qid]
          if (fromHistory !== undefined && fromHistory !== null) {
            const trimmed = String(fromHistory).trim()
            if (trimmed.length) return trimmed
          }
          const live = clarifyingAnswers[currentQuestionIndex]?.answer
          if (live !== undefined && live !== null) {
            const trimmed = String(live).trim()
            return trimmed.length ? trimmed : null
          }
          return null
        })()
      : null

  const preferenceLastAnswerForDisplay =
    currentPreferenceQuestionKey !== null
      ? (() => {
          const raw = getPreferenceLastAnswer
            ? getPreferenceLastAnswer(currentPreferenceQuestionKey as PreferenceKey)
            : null
          if (raw === undefined || raw === null) return null
          const trimmed = String(raw).trim()
          return trimmed.length > 0 ? trimmed : null
        })()
      : null

  const handlePreferenceBackNav = useCallback(() => {
    // Allow going back from any preference question (including first one)
    handlePreferenceAnswer('back')
  }, [handlePreferenceAnswer])

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
        handlePreferenceBackNav()
        return
      }

      if (selection === -3) {
        handlePreferenceOptionClick(-3)
        return
      }

      if (selection !== null && selection >= 0 && currentPreferenceQuestionKey) {
        handlePreferenceOptionClick(selection)
        return
      }

      focusInputToEnd()
    },
    [
      currentPreferenceQuestionKey,
      handlePreferenceAnswer,
      handlePreferenceOptionClick,
      focusInputToEnd,
      handlePreferenceBackNav,
      preferenceSelectedOptionIndex,
      setValue,
      value,
    ]
  )

  const handleClarifyingOptionSelect = useCallback(
    (index: number) => {
      setClarifyingSelectedOptionIndex(index)
      // Only focus input when user selects "my own answer" (-2)
      if (index === -2) {
        focusInputToEnd()
      }
      // Clicking a predefined option submits it immediately
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
      // Only focus input when user selects "my own answer" (-2)
      if (index === -2) {
        focusInputToEnd()
      }
      // Clicking a predefined option submits it immediately
      if (index >= 0) {
        handlePreferenceNext(index)
      }
    },
    [focusInputToEnd, handlePreferenceNext, setPreferenceSelectedOptionIndex]
  )

  const handleGlobalBack = useCallback(() => {
    // Quick mode: drop the final prompt and return to mode selection with the task preserved.
    if (editablePrompt && generationMode === 'quick') {
      setEditablePrompt(null)
      setPromptEditDiff(null)
      setActivity(null)
      setHasRunInitialTask(false)
      setAnsweringQuestions(false)
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      setClarifyingQuestions(null)
      setClarifyingAnswers([], 0)
      setClarifyingSelectedOptionIndex(null)
      const restoredValue = pendingTask ?? value
      setValue(restoredValue)
      focusInputToEnd()
      return
    }
    // If a final prompt is rendered, drop it and reopen the most recent step.
    if (editablePrompt && clarifyingQuestions && clarifyingQuestions.length > 0 && clarifyingAnswers.length > 0) {
      const lastIdx = Math.min(clarifyingAnswers.length - 1, clarifyingQuestions.length - 1)
      const lastAnswer = clarifyingAnswers[lastIdx]
      const lastQuestion = clarifyingQuestions[lastIdx]
      setLastRemovedClarifyingAnswer({
        questionId: lastQuestion?.id ?? null,
        answer: lastAnswer?.answer ?? null,
      })
      const order = getPreferenceOrder ? getPreferenceOrder() : []
      const prefsToAsk = order.length ? order : getPreferencesToAsk ? getPreferencesToAsk() : []
      const resumeIndex = getResumePreferenceIndex ? getResumePreferenceIndex() : -1
      const targetIndex =
        resumeIndex >= 0 && resumeIndex < prefsToAsk.length
          ? resumeIndex
          : prefsToAsk.length > 0
          ? prefsToAsk.length - 1
          : -1
      setEditablePrompt(null)
      setPromptEditDiff(null)
      if (targetIndex >= 0) {
        void startPreferenceQuestions({ resumeIndex: targetIndex, preservePending: true })
        return
      }
      setActivity(null)
      handleUndoAnswer()
      return
    }

    if (isAskingPreferenceQuestions) {
      // Allow going back from any preference question (including first one)
      const order = getPreferenceOrder ? getPreferenceOrder() : getPreferencesToAsk ? getPreferencesToAsk() : []
      if (order.length === 0 && clarifyingQuestions && clarifyingAnswers.length > 0) {
        const lastIdx = Math.min(clarifyingAnswers.length - 1, clarifyingQuestions.length - 1)
        const lastAnswer = clarifyingAnswers[lastIdx]
        const lastQuestion = clarifyingQuestions[lastIdx]
        setLastRemovedClarifyingAnswer({
          questionId: lastQuestion?.id ?? null,
          answer: lastAnswer?.answer ?? null,
        })
      }
      handlePreferenceBackNav()
      return
    }
    if (answeringQuestions || (clarifyingQuestions && clarifyingQuestions.length > 0)) {
      // Prevent going back from question 1 (index 0) - user should start new conversation instead
      // Allow going back from question 2+ (index 1+) to previous questions
      if (currentQuestionIndex === 0) {
        return
      }
      // Also prevent if there are no answers (shouldn't happen, but safety check)
      if (clarifyingAnswers.length === 0) {
        return
      }
      // handleUndoAnswer will set lastRemovedClarifyingAnswer correctly
      handleUndoAnswer()
      return
    }
  }, [
    editablePrompt,
    generationMode,
    clarifyingQuestions,
    clarifyingAnswers,
    isAskingPreferenceQuestions,
    answeringQuestions,
    setEditablePrompt,
    setPromptEditDiff,
    setActivity,
    setHasRunInitialTask,
    setAnsweringQuestions,
    setAwaitingQuestionConsent,
    setConsentSelectedIndex,
    setClarifyingQuestions,
    setClarifyingAnswers,
    setClarifyingSelectedOptionIndex,
    pendingTask,
    value,
    setValue,
    focusInputToEnd,
    getPreferencesToAsk,
    getPreferenceOrder,
    getResumePreferenceIndex,
    handleUndoAnswer,
    handlePreferenceBackNav,
    startPreferenceQuestions,
    currentQuestionIndex,
  ])

  const { consentNav, clarifyingNav, preferenceNav } = useTerminalNav({
    value,
    awaitingQuestionConsent,
    consentSelectedIndex,
    setConsentSelectedIndex,
    handleQuestionConsent,
    answeringQuestions,
    clarifyingQuestions,
    currentQuestionIndex,
    clarifyingSelectedOptionIndex,
    setClarifyingSelectedOptionIndex,
    handleClarifyingNext,
    handleUndoAnswer,
    handleClarifyingSkip,
    focusInputToEnd,
    isAskingPreferenceQuestions,
    currentPreferenceQuestionKey,
    preferenceSelectedOptionIndex,
    setPreferenceSelectedOptionIndex,
    handlePreferenceNext,
    handlePreferenceBackNav,
    handlePreferenceOptionClick,
    getPreferenceOptions: getPreferenceOptions ?? null,
  })

  const { submitCurrent, handleFormSubmit } = useTaskFlowHandlers({
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
      ensureAllowUnclearForTask,
      shouldAllowUnclearForTask,
      resetAllowUnclear,
      setIsRevising,
      setClarifyingSelectedOptionIndex,
      setLastApprovedPrompt,
    },
  })

  const promptControls = usePromptControls({
    value,
    submit: submitCurrent,
    editablePrompt,
    setIsPromptEditable,
    setIsPromptFinalized,
    editablePromptRef,
    inputRef,
    copyEditablePrompt,
  })

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
  })

  const isFreshSession = !hasRunInitialTask

  const {
    items: historyItems,
    status: historyStatus,
    error: historyError,
    isLoading: historyLoading,
    loadingMore: historyLoadingMore,
    hasMore: historyHasMore,
    refresh: refreshHistory,
    loadMore: loadMoreHistory,
  } = usePromptHistoryPanel({
    open: isHistoryOpen,
    onItems: handleHistory,
  })

  const handleHistorySelect = useCallback(
    (index: number) => {
      setRestoredFromHistory(true)
      handleUseFromHistory(index, historyItems)
      setIsHistoryOpen(false)
      scrollToBottom()
    },
    [handleUseFromHistory, historyItems, scrollToBottom, setRestoredFromHistory]
  )

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

  const { headerNode, panelsNode } = useTerminalChrome({
    preferences,
    preferenceSource,
    isPreferencesOpen,
    isSavingPreferences,
    isUserManagementOpen,
    isLoginRequiredOpen,
    setPreferencesOpen,
    setUserManagementOpen,
    setLoginRequiredOpen,
    handlePreferencesChange,
    handleSavePreferences,
    handleSignIn,
    handleSignOut,
    updatePreferencesLocally,
    user,
    theme: (preferences.uiDefaults?.theme as ThemeName | undefined) ?? DEFAULT_THEME,
    onHistoryClick: () => setIsHistoryOpen((prev) => !prev),
    historyOpen: isHistoryOpen,
  })

  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [])

  const outputPropsWithRefs = useTerminalOutputProps({
    lines,
    activity,
    editablePrompt,
    promptEditDiff,
    promptForLinks: editablePrompt ?? lastApprovedPrompt,
    awaitingQuestionConsent,
    consentSelectedIndex,
    answeringQuestions,
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
    clarifyingLastAnswer: clarifyingLastAnswerForDisplay,
    editablePromptRef,
    scrollRef,
    inputRef,
    onHelpCommandClick: (cmd: string) => {
      setValue(cmd)
      focusInputToEnd()
    },
    onConsentOptionClick: (index: number) => {
      const v = index === 0 ? 'no' : 'yes'
      setConsentSelectedIndex(index)
      void handleQuestionConsent(v)
    },
    onClarifyingOptionClick: handleClarifyingOptionSelect,
    onFocusInputSelectFree: handleClarifyingFree,
    onUndoAnswer: handleUndoAnswer,
    onClarifyingSkip: handleClarifyingSkip,
    onCopyEditable: (text?: string) => void copyEditablePrompt(text),
    onUpdateEditablePrompt: handleManualPromptUpdate,
    onStartNewConversation: handleStartNewConversationAndClear,
    onFocusInput: focusInputToEnd,
    onLike: handleLikePrompt,
    likeState,
    clarifyingCanSubmit,
    isAskingPreferenceQuestions,
    currentPreferenceQuestionKey,
    preferenceSelectedOptionIndex,
    preferenceLastAnswer: preferenceLastAnswerForDisplay,
    onPreferenceFocusInputSelectFree: handlePreferenceFree,
    onPreferenceOptionClick: handlePreferenceOptionSelect,
    onPreferenceBack: handlePreferenceBackNav,
    onPreferenceYourAnswer: focusInputToEnd,
    onPreferenceSkip: () => handlePreferenceOptionClick(-3),
    getPreferenceOptions,
    getPreferenceQuestionText,
    getPreferenceOrder,
    getPreferencesToAsk,
    showStarter: isFreshSession,
    generationMode,
    onModeChange: (mode: GenerationMode, opts?: { silent?: boolean }) => {
      focusInput()
      handleModeChange(mode, opts ?? { silent: isFreshSession })
    },
    onFinalBack: editablePrompt && !restoredFromHistory ? handleGlobalBack : undefined,
  })

  const handleSubmitWithFocus = useCallback(() => {
    setRestoredFromHistory(false)
    submitCurrent()
    if (inputRef.current) {
      inputRef.current.focus()
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [inputRef, submitCurrent])

  // When user manually focuses input during questions flow, select "my own answer"
  const handleInputFocus = useCallback(() => {
    if (answeringQuestions && clarifyingQuestions && clarifyingQuestions.length > 0) {
      setClarifyingSelectedOptionIndex(-2)
    } else if (isAskingPreferenceQuestions && currentPreferenceQuestionKey) {
      setPreferenceSelectedOptionIndex(-2)
    }
  }, [
    answeringQuestions,
    clarifyingQuestions,
    currentPreferenceQuestionKey,
    isAskingPreferenceQuestions,
    setClarifyingSelectedOptionIndex,
    setPreferenceSelectedOptionIndex,
  ])

  const historyPanelNode = (
    <PromptHistoryPanel
      open={isHistoryOpen}
      items={historyItems}
      status={historyStatus}
      error={historyError}
      isLoading={historyLoading}
      loadingMore={historyLoadingMore}
      hasMore={historyHasMore}
      onClose={() => setIsHistoryOpen(false)}
      onSelect={handleHistorySelect}
      onRefresh={refreshHistory}
      onLoadMore={loadMoreHistory}
    />
  )

  const panelsWithHistory = (
    <>
      {historyPanelNode}
      {panelsNode}
    </>
  )

  const layoutNode = useTerminalLayout({
    toastMessage,
    toastType,
    onToastClose: hideToast,
    header: headerNode,
    panels: panelsWithHistory,
    outputProps: outputPropsWithRefs,
    inputProps: {
      value,
      onChange: setValue,
      onKeyDown: handleKeyDown,
      onFocus: handleInputFocus,
      placeholder: inputPlaceholder,
      disabled: inputDisabled,
      inputRef,
    },
    onFormSubmit: handleFormSubmit,
    onSubmit: handleSubmitWithFocus,
    onStop: handleStop,
    isGenerating,
    onVoiceStart: startVoiceListening,
    onVoiceStop: stopVoiceListening,
    isVoiceListening,
    voiceSupported,
  })

  return (
    <>
      {layoutNode}
      <UnclearTaskModal
        open={Boolean(unclearTaskModal)}
        reason={unclearTaskModal?.reason ?? ''}
        onEditButtonRef={setEditButtonRef}
        onContinueButtonRef={setContinueButtonRef}
        onDismiss={handleUnclearDismiss}
        onEdit={handleUnclearEdit}
        onContinue={handleUnclearContinue}
        onKeyDown={handleUnclearKeyDown}
      />
      <VoiceLanguageModal
        open={isVoiceLanguageModalOpen}
        onConfirm={handleVoiceLanguageConfirm}
        onDismiss={handleVoiceLanguageDismiss}
      />
    </>
  )
}
