'use client'

import { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react'
import {
  generateClarifyingQuestions,
  generateFinalPrompt,
  editPrompt,
  savePreferences,
  recordGeneration,
  listHistory,
  recordEvent,
  loadUserPreferences,
  type SavePreferencesResult,
} from '@/app/terminalActions'
import { TerminalHeader } from './terminal/TerminalHeader'
import { TerminalOutputArea } from './terminal/TerminalOutputArea'
import { TerminalInputBar } from './terminal/TerminalInputBar'
import { TerminalChromeButtons } from './terminal/TerminalChromeButtons'
import { PreferencesPanel } from '@/components/PreferencesPanel'
import { UserManagementModal } from '@/components/UserManagementModal'
import { LoginRequiredModal } from '@/components/LoginRequiredModal'
import { useToast } from '@/hooks/useToast'
import { useDraftPersistence, loadDraft, clearDraft, type DraftState } from '@/hooks/useDraftPersistence'
import {
  ROLE,
  COMMAND,
  MESSAGE,
  SHORTCUT,
  EMPTY_SUBMIT_COOLDOWN_MS,
  TONE_OPTIONS,
  AUDIENCE_OPTIONS,
  DEPTH_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  CITATION_OPTIONS,
  LANGUAGE_OPTIONS,
  MODEL_OPTIONS,
  type TerminalRole,
} from '@/lib/constants'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { TerminalShellView } from '@/features/terminal/TerminalShellView'
import {
  TerminalStateProvider,
  useTerminalState,
  createInitialTerminalState,
  type PreferenceKey,
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

type FastEasyShellProps = {
  initialLines?: TerminalLine[]
  initialPreferences?: Preferences
  initialUser?: UserIdentity | null
  initialPreferenceSource?: PreferenceSource
  isFirstLogin?: boolean
}

export function FastEasyShell(props: FastEasyShellProps) {
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
      <FastEasyShellInner {...props} />
    </TerminalStateProvider>
  )
}

function FastEasyShellInner({
  initialPreferences,
  initialUser = null,
  initialPreferenceSource = 'none',
  isFirstLogin = false,
}: FastEasyShellProps) {
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
  } = state
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(window.navigator.userAgent)
  const { message: toastMessage, showToast } = useToast()
  // Initialize clarifying answers from saved draft if available
  const clarifyingAnswersRef = useRef<ClarifyingAnswer[]>([])
  const generationRunIdRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const editablePromptRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences ?? {})
  const [preferenceSource, setPreferenceSource] = useState<PreferenceSource>(initialPreferenceSource ?? 'none')
  const [user, setUser] = useState<UserIdentity | null>(initialUser ?? null)
  const [preferencesStep, setPreferencesStep] = useState<PreferencesStep>(null)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  type SessionSnapshot = {
    lines: TerminalLine[]
    editablePrompt: string | null
    pendingTask: string | null
    clarifyingQuestions: ClarifyingQuestion[] | null
    clarifyingAnswers: ClarifyingAnswer[]
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
    currentPreferenceQuestionKey: keyof Preferences | null
    preferenceSelectedOptionIndex: number | null
    pendingPreferenceUpdates: Partial<Preferences>
  }

  const [lastSnapshot, setLastSnapshot] = useState<SessionSnapshot | null>(null)
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
  const setLikeState = useCallback(
    (value: 'none' | 'liked' | 'disliked') => dispatch(setLikeStateAction(value)),
    [dispatch]
  )
  const setHasRunInitialTask = useCallback((value: boolean) => dispatch(setHasRunInitialTaskAction(value)), [dispatch])
  const setHeaderHelpShown = useCallback((value: boolean) => dispatch(setHeaderHelpShownAction(value)), [dispatch])
  const setLastApprovedPrompt = useCallback(
    (value: string | null) => dispatch(setLastApprovedPromptAction(value)),
    [dispatch]
  )

  // Default-select the first consent option so keyboard users see focus immediately
  useEffect(() => {
    if (awaitingQuestionConsent && consentSelectedIndex === null) {
      setConsentSelectedIndex(0)
    }
  }, [awaitingQuestionConsent, consentSelectedIndex, setConsentSelectedIndex])

  // Build current draft state for auto-persistence
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
      isPromptEditable,
      isPromptFinalized,
      headerHelpShown,
      lastApprovedPrompt,
    }),
    [
      pendingTask,
      editablePrompt,
      clarifyingAnswers,
      clarifyingQuestions,
      currentQuestionIndex,
      answeringQuestions,
      lines,
      awaitingQuestionConsent,
      consentSelectedIndex,
      clarifyingSelectedOptionIndex,
      isPromptEditable,
      isPromptFinalized,
      headerHelpShown,
      lastApprovedPrompt,
    ]
  )

  // Auto-save draft to localStorage (debounced, disabled while generating)
  useDraftPersistence(currentDraft, !isGenerating)

  // Restore draft after mount to avoid SSR/CSR mismatch
  useEffect(() => {
    if (typeof window === 'undefined') return
    const draft = loadDraft()
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
    setIsPromptEditable(draft.isPromptEditable ?? false)
    setIsPromptFinalized(draft.isPromptFinalized ?? false)
    setHeaderHelpShown(draft.headerHelpShown ?? false)
    setLastApprovedPrompt(draft.lastApprovedPrompt ?? null)
    if (draft.lines && draft.lines.length) {
      setLines(
        draft.lines.map((line) => ({
          id: line.id,
          role: line.role as TerminalRole,
          text: line.text,
        }))
      )
    }

    if (!draftRestoredShown && (draft.task || draft.editablePrompt || draft.lines?.length)) {
      setDraftRestoredShown(true)
    }
  }, [
    draftRestoredShown,
    setAnsweringQuestions,
    setAwaitingQuestionConsent,
    setClarifyingAnswers,
    setClarifyingQuestions,
    setClarifyingSelectedOptionIndex,
    setConsentSelectedIndex,
    setDraftRestoredShown,
    setEditablePrompt,
    setHasRunInitialTask,
    setHeaderHelpShown,
    setIsPromptEditable,
    setIsPromptFinalized,
    setLastApprovedPrompt,
    setLines,
    setPendingTask,
  ])

  const inputDisabled = isGenerating

  const applyPreferencesFromServer = useCallback((next: Preferences, source: PreferenceSource) => {
    setPreferences(next)
    setPreferenceSource(source)
  }, [])

  const refreshUserPreferences = useCallback(async () => {
    try {
      const result = await loadUserPreferences()
      applyPreferencesFromServer(result.preferences, result.source)
    } catch (err) {
      console.error('Failed to load user preferences', err)
    }
  }, [applyPreferencesFromServer])

  // Removed circular state/URL sync - modals are now controlled by state only
  // This eliminates the performance issues caused by router operations

  useEffect(() => {
    let isMounted = true
    try {
      const supabase = getSupabaseBrowserClient()
      supabase.auth.getSession().then(({ data }) => {
        if (!isMounted) return
        const sessionUser = data.session?.user
        if (sessionUser) {
          setUser({ id: sessionUser.id, email: sessionUser.email })
          void refreshUserPreferences()
        }
      })

      const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const sessionUser = session?.user
          if (sessionUser) {
            setUser({ id: sessionUser.id, email: sessionUser.email })
            void refreshUserPreferences()
          }
        }
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setPreferenceSource('local')
        }
      })

      return () => {
        isMounted = false
        subscription?.subscription.unsubscribe()
      }
    } catch (err) {
      console.error('Supabase auth setup failed', err)
    }
  }, [refreshUserPreferences])

  const updatePreferencesLocally = useCallback(
    (next: Preferences) => {
      setPreferences(next)
      setPreferenceSource((prev) => {
        if (prev === 'user' || prev === 'session') return 'local'
        return prev ?? 'local'
      })
      // Save to localStorage for non-authenticated users
      if (!user && typeof window !== 'undefined') {
        localStorage.setItem('pf_local_preferences', JSON.stringify(next))
      }
    },
    [user]
  )

  // Load preferences from localStorage for non-authenticated users on mount
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      const stored = localStorage.getItem('pf_local_preferences')
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Preferences
          setPreferences(parsed)
          setPreferenceSource('local')
        } catch (e) {
          console.error('Failed to parse stored preferences', e)
        }
      }
    }
  }, [user])

  function focusInputToEnd() {
    if (!inputRef.current) return
    const el = inputRef.current
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }

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
    // Keep the input focused when the yes/no consent prompt is active so arrows/Enter work immediately.
    if (awaitingQuestionConsent && !isGenerating) {
      focusInputToEnd()
    }
  }, [awaitingQuestionConsent, isGenerating])

  useEffect(() => {
    if (inputDisabled && inputRef.current) {
      inputRef.current.blur()
    }
  }, [inputDisabled])

  function selectForQuestion(question: ClarifyingQuestion | null, hasBack: boolean) {
    if (!question) {
      setClarifyingSelectedOptionIndex(null)
      return
    }
    if (question.options.length > 0) {
      setClarifyingSelectedOptionIndex(0)
      return
    }
    if (hasBack) {
      setClarifyingSelectedOptionIndex(-1)
      return
    }
    setClarifyingSelectedOptionIndex(null)
  }

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

  function formatPreferencesSummary(next?: Preferences) {
    const prefs = next ?? preferences
    const parts: string[] = []
    if (prefs.tone) parts.push(`tone=${prefs.tone}`)
    if (prefs.audience) parts.push(`audience=${prefs.audience}`)
    if (prefs.domain) parts.push(`domain=${prefs.domain}`)
    if (prefs.defaultModel) parts.push(`model=${prefs.defaultModel}`)
    if (prefs.outputFormat) parts.push(`format=${prefs.outputFormat}`)
    if (prefs.language) parts.push(`lang=${prefs.language}`)
    if (prefs.depth) parts.push(`depth=${prefs.depth}`)
    if (typeof prefs.temperature === 'number') parts.push(`temp=${prefs.temperature}`)
    if (parts.length === 0) return MESSAGE.NO_PREFERENCES
    return parts.join(', ')
  }

  function startPreferencesFlow() {
    // Clear any active task state to avoid conflicts
    setPendingTask(null)
    resetClarifyingFlowState()
    setPreferencesStep(null)

    // Open modals with state only - no URL changes
    setUserManagementOpen(true)
    setPreferencesOpen(true)

    appendLine(
      ROLE.APP,
      `Opening preferences (${user ? 'signed in' : 'local mode'}). Current settings: ${formatPreferencesSummary()}.`
    )
    focusInputToEnd()
  }

  const handlePreferencesChange = useCallback(
    (next: Preferences) => {
      updatePreferencesLocally(next)
    },
    [updatePreferencesLocally]
  )

  const handleSavePreferences = useCallback(async () => {
    setIsSavingPreferences(true)
    try {
      const result: SavePreferencesResult = await savePreferences(preferences)
      if (result.success) {
        setPreferenceSource(result.scope)
        showToast(result.scope === 'user' ? 'Preferences saved to your account' : 'Preferences saved for this session')
        // Refresh preferences to ensure sync with server
        if (result.scope === 'user') {
          void refreshUserPreferences()
        }
      }
    } catch (err) {
      console.error('Failed to save preferences', err)
    } finally {
      setIsSavingPreferences(false)
    }
  }, [preferences, showToast, refreshUserPreferences])

  const handleSignIn = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const next = typeof window !== 'undefined' ? window.location.href : '/'
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: origin ? `${origin}/auth/callback?next=${encodeURIComponent(next)}` : undefined,
          scopes: 'email',
        },
      })
      if (error) {
        console.error('Supabase OAuth sign-in failed', error)
      }
    } catch (err) {
      console.error('Supabase OAuth sign-in failed', err)
    }
  }, [])

  const generateFinalPromptForTask = useCallback(
    async (task: string, answers: ClarifyingAnswer[]) => {
      // Check if user is authenticated before generating
      if (!user) {
        setLoginRequiredOpen(true)
        setPendingTask(task)
        clarifyingAnswersRef.current = answers
        setClarifyingAnswers(answers, answers.length)
        return
      }

      const runId = (generationRunIdRef.current += 1)
      setIsGenerating(true)
      setAnsweringQuestions(false)
      appendLine(ROLE.APP, MESSAGE.CREATING_PROMPT)

      try {
        const prompt = await generateFinalPrompt({ task, preferences, answers })

        if (runId !== generationRunIdRef.current) {
          return
        }

        const finalPrompt = prompt.trim() || task
        setEditablePrompt(finalPrompt)
        setIsPromptEditable(true)
        setIsPromptFinalized(false)
        setLastApprovedPrompt(null)
        void recordEvent('prompt_vote', { vote: 'none', prompt: finalPrompt, runId })
        // Auto-copy the final prompt when it arrives
        try {
          if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(finalPrompt)
            showToast('Prompt copied')
          }
        } catch (err) {
          console.error('Auto-copy failed', err)
        }

        void recordGeneration({
          task,
          prompt: {
            id: 'final',
            label: 'Final prompt',
            body: finalPrompt,
          },
        })

        appendLine(ROLE.APP, MESSAGE.PROMPT_READY)
        setIsGenerating(false)

        // After first generation, prompt user to fill preferences if they haven't yet
        // Check if user has any preferences configured
        const hasAnyPreference =
          preferences.tone ||
          preferences.audience ||
          preferences.domain ||
          preferences.defaultModel ||
          preferences.outputFormat ||
          preferences.language ||
          preferences.depth

        if (!hasAnyPreference && preferenceSource !== 'user') {
          appendLine(
            ROLE.APP,
            'Would you like to set your preferences now? This will help us generate better prompts in the future. Type /preferences to open settings.'
          )
        }
      } catch (err) {
        if (runId === generationRunIdRef.current) {
          console.error('Failed to generate final prompt', err)
          appendLine(ROLE.APP, 'Something went wrong while generating the prompt. Try again in a moment.')
          setIsGenerating(false)
        }
      }
    },
    [
      appendLine,
      preferenceSource,
      preferences,
      setAnsweringQuestions,
      setClarifyingAnswers,
      setEditablePrompt,
      setIsGenerating,
      setIsPromptEditable,
      setIsPromptFinalized,
      setLastApprovedPrompt,
      setLoginRequiredOpen,
      setPendingTask,
      showToast,
      user,
    ]
  )

  // When user becomes authenticated, continue with pending prompt generation
  useEffect(() => {
    if (user && isLoginRequiredOpen && pendingTask) {
      setLoginRequiredOpen(false)
      const answers = clarifyingAnswersRef.current
      void generateFinalPromptForTask(pendingTask, answers)
    }
  }, [user, isLoginRequiredOpen, pendingTask, generateFinalPromptForTask, setLoginRequiredOpen])

  const handleSignOut = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
      setUser(null)
      setPreferenceSource('local')
    } catch (err) {
      console.error('Failed to sign out', err)
    }
  }, [])

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
      void savePreferences(next)
    }
  }

  function handleHelpCommand() {
    appendLine(ROLE.APP, 'Available commands:')
    appendLine(ROLE.APP, `${COMMAND.HELP}        Show this help.`)
    appendLine(ROLE.APP, `${COMMAND.PREFERENCES} Update your preferences (tone, audience, domain).`)
    appendLine(ROLE.APP, `${COMMAND.CLEAR}       Clear terminal history (can be restored once).`)
    appendLine(ROLE.APP, `${COMMAND.RESTORE}     Restore the last cleared history snapshot.`)
    appendLine(ROLE.APP, `${COMMAND.DISCARD}     Discard the current prompt and flow, start fresh.`)
    appendLine(ROLE.APP, `${COMMAND.HISTORY}     Show recent tasks and prompts from this session.`)
    appendLine(ROLE.APP, `${COMMAND.USE} <n>     Load task #n from the last history listing into the input.`)
    appendLine(
      ROLE.APP,
      'Anything else is treated as a task description. The app will use your preferences to shape prompts.'
    )
    scrollToBottom()
  }

  function handleClear() {
    // Check if terminal is already empty (only has welcome or history cleared message)
    const isEmpty =
      lines.length === 1 &&
      lines[0]?.role === ROLE.SYSTEM &&
      (lines[0]?.text === MESSAGE.WELCOME ||
        lines[0]?.text === MESSAGE.WELCOME_FRESH ||
        lines[0]?.text === MESSAGE.HISTORY_CLEARED)

    if (isEmpty) {
      // Terminal is already empty, do nothing
      return
    }

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
    setHeaderHelpShown(false)
    setLines([
      {
        id: 0,
        role: ROLE.SYSTEM,
        text: MESSAGE.HISTORY_CLEARED,
      },
    ])
    // Keep the current editable prompt so the user doesn't lose their work.
    setPendingTask(null)
    resetClarifyingFlowState()
  }

  function handleDiscard() {
    // Hard reset of the interactive flow and editable prompt.
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
    // Clear persisted draft since user explicitly discarded
    clearDraft()
  }

  function handleStartNewConversation() {
    // Save snapshot for potential restore, then reset to a fresh session
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
  }

  const handleLikePrompt = useCallback(() => {
    if (!editablePrompt) {
      appendLine(ROLE.APP, 'There is no prompt to like yet.')
      return
    }
    void recordEvent('prompt_vote', { vote: 'like', prompt: editablePrompt })
    appendLine(ROLE.APP, 'Feedback recorded. 👍')
    setLikeState('liked')
  }, [appendLine, editablePrompt, setLikeState])

  const handleDislikePrompt = useCallback(() => {
    if (!editablePrompt) {
      appendLine(ROLE.APP, 'There is no prompt to dislike yet.')
      return
    }
    void recordEvent('prompt_vote', { vote: 'dislike', prompt: editablePrompt })
    appendLine(ROLE.APP, 'Feedback recorded. 👎')
    setLikeState('disliked')
  }, [appendLine, editablePrompt, setLikeState])

  function handleRestore() {
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
    setLikeState('none')

    // Allow single restore; clear snapshot
    setLastSnapshot(null)
  }

  async function handleHistory() {
    try {
      const items = await listHistory(10)
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
    } catch (err) {
      console.error('Failed to load history', err)
      appendLine(ROLE.APP, 'Something went wrong while loading history.')
    }
  }

  async function handleUseFromHistory(index: number) {
    let history = lastHistory

    if (!history || history.length === 0) {
      try {
        const items = await listHistory(10)
        setLastHistory(items)
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

    const selected = history[index - 1]
    setValue(selected.task)
    setEditablePrompt(selected.body)
    setIsPromptEditable(false)
    setIsPromptFinalized(false)
    setLastApprovedPrompt(null)
    setPendingTask(selected.task)
    setHasRunInitialTask(true)
    resetClarifyingFlowState()

    appendLine(ROLE.APP, `Loaded task #${index} from history into the input.`)
    appendLine(ROLE.USER, selected.task)
    appendLine(ROLE.APP, `Restored prompt (${selected.label}):\n\n${selected.body}`)

    void recordEvent('history_use', {
      index,
      historyId: selected.id,
      task: selected.task,
      label: selected.label,
    })
  }

  function handleCommand(raw: string) {
    const normalized = raw.trim()
    const [command, ...rest] = normalized.split(/\s+/)
    void recordEvent('command', { command: normalized })

    switch (command) {
      case COMMAND.HELP: {
        if (headerHelpShown) {
          appendLine(ROLE.APP, `Help is already shown. Use ${COMMAND.CLEAR} to reset the terminal.`)
          return
        }
        handleHelpCommand()
        setHeaderHelpShown(true)
        return
      }
      case COMMAND.PREFERENCES: {
        startPreferencesFlow()
        return
      }
      case COMMAND.CLEAR: {
        handleClear()
        return
      }
      case COMMAND.BACK: {
        handleUndoAnswer()
        return
      }
      case COMMAND.REVISE: {
        handleReviseFlow()
        return
      }
      case COMMAND.RESTORE: {
        handleRestore()
        return
      }
      case COMMAND.DISCARD: {
        handleDiscard()
        return
      }
      case COMMAND.HISTORY: {
        void handleHistory()
        return
      }
      case COMMAND.USE: {
        const arg = rest[0]
        const index = Number(arg)
        if (!arg || Number.isNaN(index)) {
          appendLine(ROLE.APP, `Usage: ${COMMAND.USE} <number>. Use ${COMMAND.HISTORY} to see entries.`)
          return
        }
        handleUseFromHistory(index)
        return
      }
      case COMMAND.EDIT: {
        const instructions = rest.join(' ')
        if (!instructions.trim()) {
          appendLine(
            ROLE.APP,
            `Usage: ${COMMAND.EDIT} <how you want the current prompt changed> (for example: "shorter", "for a CTO").`
          )
          return
        }
        if (!editablePrompt) {
          appendLine(ROLE.APP, 'There is no prompt to edit yet. Generate one first.')
          return
        }
        void handleEditPrompt(instructions.trim())
        return
      }
      default: {
        appendLine(ROLE.APP, `Unknown command: ${command}. Type ${COMMAND.HELP} to see what you can do.`)
      }
    }
  }

  async function startClarifyingQuestions(task: string) {
    const runId = (generationRunIdRef.current += 1)
    setIsGenerating(true)
    appendLine(ROLE.APP, MESSAGE.ASKING_QUESTIONS)

    try {
      const questions = await generateClarifyingQuestions({ task, preferences })

      if (runId !== generationRunIdRef.current) {
        return
      }

      setIsGenerating(false)

      if (!questions.length) {
        // If no questions were produced, fall back to generating the final prompt directly.
        await generateFinalPromptForTask(task, [])
        return
      }

      setClarifyingQuestions(questions)
      clarifyingAnswersRef.current = []
      setClarifyingAnswers([], 0)
      selectForQuestion(questions[0], false)
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      setAnsweringQuestions(true)

      appendClarifyingQuestion(questions[0], 0, questions.length)
      focusInputToEnd()
    } catch (err) {
      if (runId === generationRunIdRef.current) {
        console.error('Failed to generate clarifying questions', err)
        appendLine(
          ROLE.APP,
          'Something went wrong while generating questions. I will try to create a prompt from your task directly.'
        )
        setIsGenerating(false)
        await generateFinalPromptForTask(task, [])
      }
    }
  }

  function appendClarifyingQuestion(question: ClarifyingQuestion, index: number, total: number) {
    appendLine(ROLE.APP, `Question ${index + 1}/${total}: ${question.question}`)
  }

  // Get list of preference keys that should be asked about (where "Ask every time" is enabled)
  function getPreferencesToAsk(): PreferenceKey[] {
    const doNotAskAgain = preferences.doNotAskAgain ?? {}

    // List of preference keys that can be asked about (excluding nested objects)
    const askablePreferenceKeys: PreferenceKey[] = [
      'tone',
      'audience',
      'domain',
      'defaultModel',
      'temperature',
      'outputFormat',
      'language',
      'depth',
      'citationPreference',
      'styleGuidelines',
      'personaHints',
    ]

    // Ask about preferences where doNotAskAgain is explicitly false (meaning "Ask every time" is checked)
    return askablePreferenceKeys.filter((key) => {
      const doNotAskKey = key as keyof NonNullable<Preferences['doNotAskAgain']>
      return doNotAskAgain[doNotAskKey] === false
    })
  }

  function getPreferenceQuestionText(key: keyof Preferences): string {
    switch (key) {
      case 'tone':
        return 'What tone would you like for this prompt? (e.g., professional, casual, technical)'
      case 'audience':
        return 'Who is the target audience? (e.g., developers, managers, general audience)'
      case 'domain':
        return 'What domain is this for? (e.g., marketing, engineering, product)'
      case 'defaultModel':
        return 'Which AI model are you targeting? (e.g., gpt-4, claude, gemini)'
      case 'temperature':
        return 'What temperature/creativity level? (0.0-1.0, e.g., 0.7 for balanced, 0.9 for creative)'
      case 'outputFormat':
        return 'What output format do you prefer? (e.g., markdown, plain text, code)'
      case 'language':
        return 'What language should the output be in? (e.g., English, Spanish, French)'
      case 'depth':
        return 'How detailed should the output be? (e.g., concise, detailed, comprehensive)'
      case 'citationPreference':
        return 'How should citations be handled? (e.g., include sources, no citations, inline references)'
      case 'styleGuidelines':
        return 'Any specific style guidelines? (e.g., use bullet points, keep paragraphs short, active voice)'
      case 'personaHints':
        return 'Any persona or voice hints? (e.g., write as a senior engineer, be helpful but concise)'
      default:
        return 'Please provide your preference:'
    }
  }

  function getPreferenceOptions(key: keyof Preferences): Array<{ id: string; label: string }> {
    switch (key) {
      case 'tone':
        return TONE_OPTIONS.map((opt, idx) => ({ id: String.fromCharCode('a'.charCodeAt(0) + idx), label: opt }))
      case 'audience':
        return AUDIENCE_OPTIONS.map((opt, idx) => ({ id: String.fromCharCode('a'.charCodeAt(0) + idx), label: opt }))
      case 'domain':
        return ['product', 'marketing', 'engineering'].map((opt, idx) => ({
          id: String.fromCharCode('a'.charCodeAt(0) + idx),
          label: opt,
        }))
      case 'depth':
        return DEPTH_OPTIONS.map((opt, idx) => ({ id: String.fromCharCode('a'.charCodeAt(0) + idx), label: opt.label }))
      case 'outputFormat':
        return OUTPUT_FORMAT_OPTIONS.map((opt, idx) => ({
          id: String.fromCharCode('a'.charCodeAt(0) + idx),
          label: opt.label,
        }))
      case 'citationPreference':
        return CITATION_OPTIONS.map((opt, idx) => ({
          id: String.fromCharCode('a'.charCodeAt(0) + idx),
          label: opt.label,
        }))
      case 'language':
        return LANGUAGE_OPTIONS.map((opt, idx) => ({ id: String.fromCharCode('a'.charCodeAt(0) + idx), label: opt }))
      case 'defaultModel':
        return MODEL_OPTIONS.map((opt, idx) => ({
          id: String.fromCharCode('a'.charCodeAt(0) + idx),
          label: opt.label,
        }))
      case 'temperature':
        return ['0.3 (focused)', '0.7 (balanced)', '0.9 (creative)'].map((opt, idx) => ({
          id: String.fromCharCode('a'.charCodeAt(0) + idx),
          label: opt,
        }))
      default:
        return []
    }
  }

  async function startPreferenceQuestions() {
    const prefsToAsk = getPreferencesToAsk()
    if (prefsToAsk.length === 0) {
      // No preferences to ask about, proceed to generate
      if (pendingTask) {
        await generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current)
      }
      return
    }

    setIsAskingPreferenceQuestions(true)
    setCurrentPreferenceQuestionKey(prefsToAsk[0])
    setPendingPreferenceUpdates({})
    const firstKeyOptions = getPreferenceOptions(prefsToAsk[0])
    setPreferenceSelectedOptionIndex(firstKeyOptions.length > 0 ? 0 : null)

    if (prefsToAsk.length > 1) {
      appendLine(ROLE.APP, `Now let's set some preferences for this prompt (${prefsToAsk.length} questions):`)
    } else {
      appendLine(ROLE.APP, "Now let's set a preference for this prompt:")
    }
    appendLine(ROLE.APP, `Preference 1/${prefsToAsk.length}: ${getPreferenceQuestionText(prefsToAsk[0])}`)
    focusInputToEnd()
  }

  function handlePreferenceAnswer(answer: string) {
    if (!currentPreferenceQuestionKey) return

    const trimmedAnswer = answer.trim()

    // Display the user's answer
    appendLine(ROLE.USER, trimmedAnswer)

    // Handle temperature as a number
    let value: string | number | undefined = trimmedAnswer
    if (currentPreferenceQuestionKey === 'temperature') {
      const numValue = parseFloat(trimmedAnswer)
      value = isNaN(numValue) ? undefined : Math.max(0, Math.min(1, numValue))
    }

    const updates = { ...pendingPreferenceUpdates, [currentPreferenceQuestionKey]: value }
    setPendingPreferenceUpdates(updates)

    const prefsToAsk = getPreferencesToAsk()
    const currentIndex = prefsToAsk.indexOf(currentPreferenceQuestionKey)
    const nextIndex = currentIndex + 1

    if (nextIndex < prefsToAsk.length) {
      // Ask next preference question
      const nextKey = prefsToAsk[nextIndex]
      setCurrentPreferenceQuestionKey(nextKey)
      const nextKeyOptions = getPreferenceOptions(nextKey)
      setPreferenceSelectedOptionIndex(nextKeyOptions.length > 0 ? 0 : null)
      appendLine(ROLE.APP, `Preference ${nextIndex + 1}/${prefsToAsk.length}: ${getPreferenceQuestionText(nextKey)}`)
      focusInputToEnd()
    } else {
      // All preference questions answered, update preferences and generate
      setIsAskingPreferenceQuestions(false)
      setCurrentPreferenceQuestionKey(null)
      setPreferenceSelectedOptionIndex(null)
      const updatedPrefs = { ...preferences, ...updates }
      updatePreferencesLocally(updatedPrefs)
      setPendingPreferenceUpdates({})

      if (pendingTask) {
        void generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current)
      }
    }
  }

  async function handleEditPrompt(editRequest: string) {
    if (!editablePrompt) return

    const previousPrompt = editablePrompt
    const runId = (generationRunIdRef.current += 1)
    setIsGenerating(true)
    appendLine(ROLE.APP, MESSAGE.EDITING_PROMPT)

    try {
      const updated = await editPrompt({ currentPrompt: editablePrompt, editRequest, preferences })

      if (runId !== generationRunIdRef.current) {
        return
      }

      const finalPrompt = updated.trim() || editablePrompt
      setEditablePrompt(finalPrompt)
      setIsPromptEditable(true)
      setIsPromptFinalized(false)
      setLastApprovedPrompt(null)

      // Surface when the AI returns nothing new so the user knows to try again or edit manually.
      if (finalPrompt === previousPrompt) {
        appendLine(ROLE.APP, 'The AI could not apply your edit; the prompt is unchanged. Try again or edit manually.')
      }

      void recordGeneration({
        task: pendingTask ?? 'Edited prompt',
        prompt: {
          id: 'final',
          label: 'Final prompt',
          body: finalPrompt,
        },
      })

      setIsGenerating(false)
    } catch (err) {
      if (runId === generationRunIdRef.current) {
        console.error('Failed to edit prompt', err)
        appendLine(ROLE.APP, 'Something went wrong while editing the prompt. Try again in a moment.')
        setIsGenerating(false)
      }
    }
  }

  async function handleTask(line: string) {
    const task = line.trim()
    if (!task) return

    void recordEvent('task_submitted', { task })

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
        await generateFinalPromptForTask(task, clarifyingAnswersRef.current)
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
        void handleEditPrompt(task)
        return
      }

      // If for some reason we don't have a prompt yet, just try to generate one directly
      // without re-asking questions.
      await generateFinalPromptForTask(task, [])
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
      await generateFinalPromptForTask(task, [])
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

  function handleStopClick() {
    if (!isGenerating) return
    generationRunIdRef.current += 1
    setIsGenerating(false)
    appendLine(ROLE.APP, MESSAGE.AI_STOPPED)
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    submitCurrent()
  }

  async function handleQuestionConsent(answer: string) {
    const normalized = answer.trim().toLowerCase()

    if (!pendingTask) {
      appendLine(ROLE.APP, 'No task in memory. Describe a task first.')
      setAwaitingQuestionConsent(false)
      return
    }

    void recordEvent('question_consent', { task: pendingTask, answer: normalized })

    if (normalized === 'yes' || normalized === 'y') {
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      if (clarifyingQuestions && clarifyingQuestions.length > 0) {
        const answered = clarifyingAnswersRef.current.length
        setAnsweringQuestions(true)
        setCurrentQuestionIndex(answered)
        const nextQuestion = clarifyingQuestions[Math.min(answered, clarifyingQuestions.length - 1)]
        selectForQuestion(nextQuestion ?? null, true)
        appendClarifyingQuestion(nextQuestion, answered, clarifyingQuestions.length)
        focusInputToEnd()
      } else {
        await startClarifyingQuestions(pendingTask)
      }
      return
    }

    if (normalized === 'no' || normalized === 'n') {
      setAwaitingQuestionConsent(false)
      setConsentSelectedIndex(null)
      // User chose to skip clarifying questions; optionally ask preferences based on setting
      const wantsPreferencesOnSkip = preferences.uiDefaults?.askPreferencesOnSkip === true
      const prefsToAsk = wantsPreferencesOnSkip ? getPreferencesToAsk() : []

      if (wantsPreferencesOnSkip && prefsToAsk.length > 0) {
        appendLine(ROLE.APP, 'Skipping clarifying questions, but asking preferences as configured.')
        setIsAskingPreferenceQuestions(true)
        void startPreferenceQuestions()
      } else {
        appendLine(ROLE.APP, 'Skipping clarifying and preference questions. Generating prompt directly.')
        await generateFinalPromptForTask(pendingTask, [])
      }
      return
    }

    appendLine(ROLE.APP, 'Please answer "yes" or "no".')
    focusInputToEnd()
  }

  function handleClarifyingOptionClick(index: number) {
    if (!clarifyingQuestions || !pendingTask) return
    const current = clarifyingQuestions[currentQuestionIndex]
    if (!current || !current.options || index < 0 || index >= current.options.length) return
    const chosen = current.options[index]
    setClarifyingSelectedOptionIndex(index)
    void handleClarifyingAnswer(chosen.label)
    focusInputToEnd()
  }

  function handlePreferenceOptionClick(index: number) {
    if (!currentPreferenceQuestionKey) return
    const options = getPreferenceOptions(currentPreferenceQuestionKey)
    if (index < 0 || index >= options.length) return
    const chosen = options[index]
    setPreferenceSelectedOptionIndex(index)
    handlePreferenceAnswer(chosen.label)
    focusInputToEnd()
  }

  async function handleClarifyingAnswer(answer: string) {
    if (!clarifyingQuestions || !pendingTask) {
      appendLine(ROLE.APP, 'No active questions. Describe a task first.')
      setAnsweringQuestions(false)
      return
    }

    const index = currentQuestionIndex
    if (index < 0 || index >= clarifyingQuestions.length) {
      setAnsweringQuestions(false)
      return
    }

    const question = clarifyingQuestions[index]
    const trimmedAnswer = answer.trim()

    // Display the user's answer
    appendLine(ROLE.USER, trimmedAnswer)

    const updated: ClarifyingAnswer[] = [
      ...clarifyingAnswersRef.current,
      {
        questionId: question.id,
        question: question.question,
        answer: trimmedAnswer,
      },
    ]
    clarifyingAnswersRef.current = updated
    setClarifyingAnswers(updated, updated.length)
    void recordEvent('clarifying_answer', {
      task: pendingTask,
      questionId: question.id,
      question: question.question,
      answer: trimmedAnswer,
    })

    const nextIndex = index + 1
    if (nextIndex < clarifyingQuestions.length) {
      setCurrentQuestionIndex(nextIndex)
      const nextQuestion = clarifyingQuestions[nextIndex]
      selectForQuestion(nextQuestion, true)
      appendClarifyingQuestion(nextQuestion, nextIndex, clarifyingQuestions.length)
      focusInputToEnd()
    } else {
      setClarifyingSelectedOptionIndex(null)
      setAnsweringQuestions(false)
      // After clarifying questions, check if we need to ask about preferences
      const prefsToAsk = getPreferencesToAsk()
      if (prefsToAsk.length > 0) {
        void startPreferenceQuestions()
      } else {
        void generateFinalPromptForTask(pendingTask, updated)
      }
    }
  }

  function handleUndoAnswer() {
    if (!clarifyingQuestions || !pendingTask) {
      appendLine(ROLE.APP, 'No clarifying flow active.')
      return
    }
    const answers = clarifyingAnswersRef.current
    if (!answers.length) {
      // Go back to consent (yes/no) when on the first question with no answers.
      setAnsweringQuestions(false)
      setAwaitingQuestionConsent(true)
      setConsentSelectedIndex(0) // Keep visual focus on the first option for clarity
      setClarifyingSelectedOptionIndex(null)
      setCurrentQuestionIndex(0)
      appendLine(ROLE.APP, 'Do you want to answer the clarifying questions? (yes/no)')
      setTimeout(() => focusInputToEnd(), 0)
      return
    }
    const nextAnswers = answers.slice(0, -1)
    clarifyingAnswersRef.current = nextAnswers
    const prevIndex = Math.max(0, nextAnswers.length)
    setClarifyingAnswers(nextAnswers, prevIndex)
    setCurrentQuestionIndex(prevIndex)
    const prevQuestion = clarifyingQuestions[prevIndex]
    selectForQuestion(prevQuestion ?? null, true)
    setAnsweringQuestions(true)
    setAwaitingQuestionConsent(false)
    appendLine(ROLE.APP, `Revisit question ${prevIndex + 1}: ${prevQuestion?.question ?? ''}`)
    focusInputToEnd()
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement> | KeyboardEvent) {
    // Prevent double-handling: called both from input onKeyDown and global listener
    if (e.defaultPrevented) return

    const key = e.key
    const metaKey = 'metaKey' in e ? e.metaKey : false
    const ctrlKey = 'ctrlKey' in e ? e.ctrlKey : false
    const preventDefault = () => e.preventDefault()

    // Consent yes/no option navigation
    if (awaitingQuestionConsent) {
      const options = ['yes', 'no']
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
        preventDefault()
        const isForward = e.key === 'ArrowDown' || e.key === 'ArrowRight'
        const current = consentSelectedIndex
        const nextIndex =
          current === null
            ? isForward
              ? 0
              : options.length - 1
            : (current + (isForward ? 1 : -1) + options.length) % options.length
        setConsentSelectedIndex(nextIndex)
        return
      }

      if (key === 'Enter' && !metaKey && !ctrlKey && !value.trim() && consentSelectedIndex !== null) {
        preventDefault()
        const chosen = options[consentSelectedIndex]
        void handleQuestionConsent(chosen)
        return
      }
    }

    // Clarifying-question option navigation
    if (
      answeringQuestions &&
      clarifyingQuestions &&
      clarifyingQuestions.length > 0 &&
      currentQuestionIndex < clarifyingQuestions.length
    ) {
      const current = clarifyingQuestions[currentQuestionIndex]
      const options = current.options ?? []
      const hasBack = true
      const totalSlots = options.length + 1

      if (totalSlots > 0) {
        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
          preventDefault()
          const isForward = e.key === 'ArrowDown' || e.key === 'ArrowRight'
          const prev = clarifyingSelectedOptionIndex ?? (hasBack ? -1 : 0)
          const toPos = (idx: number) => (idx === -1 ? 0 : hasBack ? idx + 1 : idx)
          const fromPos = (pos: number) => (hasBack ? (pos === 0 ? -1 : pos - 1) : pos)
          const prevPos = Math.max(0, Math.min(totalSlots - 1, toPos(prev)))
          const delta = isForward ? 1 : -1
          const nextPos = (prevPos + delta + totalSlots) % totalSlots
          const nextIndex = fromPos(nextPos)
          setClarifyingSelectedOptionIndex(nextIndex)
          return
        }

        if (key === 'Enter' && !metaKey && !ctrlKey && !value.trim()) {
          preventDefault()
          const sel = clarifyingSelectedOptionIndex ?? (hasBack ? -1 : 0)
          if (sel === -1 && hasBack) {
            handleUndoAnswer()
            return
          }
          if (sel !== null && sel >= 0 && sel < options.length) {
            void handleClarifyingOptionClick(sel)
            return
          }
        }
      }
    }

    // Preference question option navigation
    if (isAskingPreferenceQuestions && currentPreferenceQuestionKey) {
      const options = getPreferenceOptions(currentPreferenceQuestionKey)
      if (options.length > 0) {
        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
          preventDefault()
          const isForward = e.key === 'ArrowDown' || e.key === 'ArrowRight'
          const current = preferenceSelectedOptionIndex
          const nextIndex =
            current === null
              ? isForward
                ? 0
                : options.length - 1
              : (current + (isForward ? 1 : -1) + options.length) % options.length
          setPreferenceSelectedOptionIndex(nextIndex)
          return
        }

        if (key === 'Enter' && !metaKey && !ctrlKey && !value.trim() && preferenceSelectedOptionIndex !== null) {
          preventDefault()
          handlePreferenceOptionClick(preferenceSelectedOptionIndex)
          return
        }
      }
    }

    if (key === 'Enter' && !metaKey && !ctrlKey) {
      // Plain Enter submits instead of inserting a newline
      preventDefault()
      submitCurrent()
    }
    // Cmd/Ctrl+Enter: allow default newline behavior
  }

  useEffect(() => {
    if (!answeringQuestions && !awaitingQuestionConsent && !isAskingPreferenceQuestions) return
    const handler = (ev: KeyboardEvent) => {
      handleKeyDown(ev)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    answeringQuestions,
    awaitingQuestionConsent,
    isAskingPreferenceQuestions,
    consentSelectedIndex,
    clarifyingSelectedOptionIndex,
    preferenceSelectedOptionIndex,
    clarifyingQuestions,
    clarifyingAnswers.length,
    currentQuestionIndex,
    currentPreferenceQuestionKey,
    value,
  ])

  const inputPlaceholder = answeringQuestions
    ? 'Type your own answer here or use arrows to select'
    : awaitingQuestionConsent
    ? 'Use arrows to select yes/no'
    : isAskingPreferenceQuestions
    ? 'Type your preference answer (you can provide a custom value)'
    : editablePrompt !== null
    ? `Provide feedback about the generated prompt or press ${isMac ? SHORTCUT.COPY_MAC : SHORTCUT.COPY_WIN} to copy`
    : 'Give us context to create an effective prompt'

  const headerNode = (
    <TerminalHeader
      onProfileClick={() => {
        setUserManagementOpen(true)
      }}
    />
  )

  const panelsNode = (
    <>
      <PreferencesPanel
        open={isPreferencesOpen}
        values={preferences}
        source={preferenceSource}
        user={user}
        saving={isSavingPreferences}
        canSave={Boolean(user)}
        onClose={() => setPreferencesOpen(false)}
        onChange={handlePreferencesChange}
        onSave={handleSavePreferences}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <UserManagementModal
        open={isUserManagementOpen}
        user={user}
        onClose={() => {
          setUserManagementOpen(false)
          setPreferencesOpen(false)
        }}
        onOpenPreferences={() => {
          setPreferencesOpen(true)
        }}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <LoginRequiredModal
        open={isLoginRequiredOpen}
        onClose={() => {
          setLoginRequiredOpen(false)
          appendLine(ROLE.APP, 'Sign in required to generate prompts. Try again when you are ready.')
        }}
        onSignIn={handleSignIn}
      />
    </>
  )

  const mainNode = (
    <form onSubmit={handleFormSubmit} className="relative flex-1 text-sm">
      <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden border-t border-slate-800 bg-[#050608]">
        <TerminalOutputArea
          lines={lines}
          editablePrompt={editablePrompt}
          promptForLinks={editablePrompt ?? lastApprovedPrompt}
          awaitingQuestionConsent={awaitingQuestionConsent}
          consentSelectedIndex={consentSelectedIndex}
          answeringQuestions={answeringQuestions}
          clarifyingAnswersCount={clarifyingAnswers.length}
          currentClarifyingQuestion={
            answeringQuestions &&
            clarifyingQuestions &&
            clarifyingQuestions.length > 0 &&
            currentQuestionIndex < clarifyingQuestions.length
              ? clarifyingQuestions[currentQuestionIndex]
              : null
          }
          clarifyingSelectedOptionIndex={clarifyingSelectedOptionIndex}
          editablePromptRef={editablePromptRef}
          scrollRef={scrollRef}
          inputRef={inputRef}
          onHelpCommandClick={(cmd) => {
            setValue(cmd)
            if (inputRef.current) inputRef.current.focus()
          }}
          onConsentOptionClick={(index) => {
            const v = index === 0 ? 'yes' : 'no'
            setConsentSelectedIndex(index)
            void handleQuestionConsent(v)
          }}
          onClarifyingOptionClick={handleClarifyingOptionClick}
          onUndoAnswer={handleUndoAnswer}
          onRevise={handleReviseFlow}
          onEditableChange={handleEditableChange}
          onCopyEditable={() => void copyEditablePrompt()}
          onStartNewConversation={handleStartNewConversation}
          onLike={handleLikePrompt}
          onDislike={handleDislikePrompt}
          likeState={likeState}
          isAskingPreferenceQuestions={isAskingPreferenceQuestions}
          currentPreferenceQuestionKey={currentPreferenceQuestionKey}
          preferenceSelectedOptionIndex={preferenceSelectedOptionIndex}
          onPreferenceOptionClick={handlePreferenceOptionClick}
          getPreferenceOptions={getPreferenceOptions}
          getPreferenceQuestionText={getPreferenceQuestionText}
          getPreferencesToAsk={getPreferencesToAsk}
        />

        <TerminalInputBar
          value={value}
          onChange={setValue}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          inputRef={inputRef}
          disabled={inputDisabled}
        />
      </div>

      <TerminalChromeButtons
        isGenerating={isGenerating}
        onStop={handleStopClick}
        onSubmit={() => {
          submitCurrent()
          if (inputRef.current) inputRef.current.focus()
        }}
      />
    </form>
  )

  return <TerminalShellView toastMessage={toastMessage} header={headerNode} panels={panelsNode} main={mainNode} />
}
