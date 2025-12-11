/**
 * Hook for persisting draft state to localStorage.
 *
 * Best practices implemented:
 * 1. Debounced writes (don't save on every keystroke)
 * 2. Versioned data (detect stale drafts)
 * 3. Graceful degradation (works if localStorage unavailable)
 * 4. Auto-expiry (clear drafts older than 24 hours)
 * 5. Session-scoped (tied to session ID)
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import type { TerminalLine, ClarifyingQuestion, GenerationMode, TaskActivity, Preferences } from '@/lib/types'
import type { LikeState, PreferenceKey } from '@/features/terminal/terminalState'

const STORAGE_KEY = 'pf_draft'
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours
const DEBOUNCE_MS = 1000 // Save at most once per second

export interface DraftState {
  /** Session identifier this draft belongs to (guest or pending) */
  sessionId: string | null
  /** Authenticated user id if available */
  userId: string | null
  /** The task the user typed */
  task: string | null
  /** The editable prompt (before approval) */
  editablePrompt: string | null
  /** Diff between last AI edit and previous prompt, if available */
  promptEditDiff: { previous: string; current: string } | null
  /** Clarifying questions (if mid-flow) */
  clarifyingQuestions: ClarifyingQuestion[] | null
  /** Answers to clarifying questions (if mid-flow) */
  clarifyingAnswers: Array<{ questionId: string; question: string; answer: string }> | null
  /** Current question index (to restore position) */
  currentQuestionIndex: number
  /** Whether user was in the middle of answering questions */
  wasAnsweringQuestions: boolean
  /** Terminal lines to restore the on-screen conversation */
  lines: TerminalLine[] | null
  /** Whether the consent prompt was active */
  awaitingQuestionConsent: boolean
  /** Currently selected consent option (yes/no) */
  consentSelectedIndex: number | null
  /** Currently selected clarifying option index */
  clarifyingSelectedOptionIndex: number | null
  /** Whether the prompt was in editable mode */
  isPromptEditable: boolean
  /** Whether the prompt was marked as finalized */
  isPromptFinalized: boolean
  /** Generation mode toggle state */
  generationMode: GenerationMode
  /** Whether header help was already shown */
  headerHelpShown: boolean
  /** Last approved prompt text, if any */
  lastApprovedPrompt: string | null
  /** Whether the prompt was liked or disliked */
  likeState: LikeState
  /** Whether the preferences panel was open */
  isPreferencesOpen: boolean
  /** Whether the account/user management modal was open */
  isUserManagementOpen: boolean
  /** Whether the login-required modal was open */
  isLoginRequiredOpen: boolean
  /** Whether we are in the preference Q&A flow */
  isAskingPreferenceQuestions: boolean
  /** Current preference question key */
  currentPreferenceQuestionKey: PreferenceKey | null
  /** Currently selected preference option index */
  preferenceSelectedOptionIndex: number | null
  /** In-progress preference updates collected in the flow */
  pendingPreferenceUpdates: Partial<Preferences>
  /** Current activity card for the task (persisted to restore status bars) */
  activity: TaskActivity | null
}

interface StoredDraft extends DraftState {
  /** When the draft was last saved */
  savedAt: number
  /** Schema version for future migrations */
  version: number
}

const CURRENT_VERSION = 10
const VALID_PROMPT_EDIT_DIFF_SHAPE = (value: unknown): value is { previous: string; current: string } => {
  if (!value || typeof value !== 'object') return false
  const maybe = value as { previous?: unknown; current?: unknown }
  return typeof maybe.previous === 'string' && typeof maybe.current === 'string'
}

const VALID_ACTIVITY_STAGES = new Set<TaskActivity['stage']>([
  'collecting',
  'clarifying',
  'preferences',
  'generating',
  'ready',
  'error',
  'stopped',
])
const VALID_ACTIVITY_STATUSES = new Set<TaskActivity['status']>(['loading', 'success', 'error'])

function sanitizeActivity(activity: unknown): TaskActivity | null {
  if (!activity || typeof activity !== 'object') return null
  const maybe = activity as Partial<TaskActivity>
  const { task, stage, status, message, detail } = maybe
  if (typeof task !== 'string' || typeof message !== 'string') return null
  if (!VALID_ACTIVITY_STAGES.has(stage as TaskActivity['stage'])) return null
  if (!VALID_ACTIVITY_STATUSES.has(status as TaskActivity['status'])) return null

  const trimmedTask = task.trim()
  const trimmedMessage = message.trim()
  const trimmedDetail = typeof detail === 'string' ? detail.trim() : undefined

  if (!trimmedTask && !trimmedMessage) return null

  return {
    task: trimmedTask || task,
    stage: stage as TaskActivity['stage'],
    status: status as TaskActivity['status'],
    message: trimmedMessage || message,
    detail: trimmedDetail || undefined,
  }
}

/**
 * Check if localStorage is available (can be disabled or full).
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Load draft from localStorage, returns null if none exists or expired.
 */
export function loadDraft(currentSessionId?: string | null, currentUserId?: string | null): DraftState | null {
  if (!isLocalStorageAvailable()) return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const stored: StoredDraft = JSON.parse(raw)

    // Require exact version match; clear any older/newer drafts
    if (stored.version !== CURRENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    // Enforce scoping to the active user/session to avoid cross-leakage
    const storedUserId = stored.userId ?? null
    const storedSessionId = stored.sessionId ?? null
    let effectiveSessionId = storedSessionId

    if (currentUserId) {
      if (storedUserId && storedUserId !== currentUserId) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
    } else if (storedUserId) {
      // Logged out but draft was tied to a user; drop it to avoid mixing accounts
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    if (currentSessionId) {
      if (storedSessionId && storedSessionId !== currentSessionId) {
        // Allow upgrading a pending draft to the real session id
        if (storedSessionId === 'pending') {
          effectiveSessionId = currentSessionId
        } else {
          localStorage.removeItem(STORAGE_KEY)
          return null
        }
      } else if (!storedSessionId) {
        effectiveSessionId = currentSessionId
      }
    } else if (storedSessionId && storedSessionId !== 'pending') {
      // No active session but draft was session-scoped; treat as stale
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    // Check expiry
    const age = Date.now() - stored.savedAt
    if (age > DRAFT_EXPIRY_MS) {
      console.info('Draft expired, clearing')
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    const promptEditDiff = VALID_PROMPT_EDIT_DIFF_SHAPE(stored.promptEditDiff) ? stored.promptEditDiff : null

    return {
      sessionId: effectiveSessionId ?? null,
      userId: stored.userId ?? null,
      task: stored.task,
      editablePrompt: stored.editablePrompt,
      promptEditDiff,
      clarifyingQuestions: stored.clarifyingQuestions ?? null,
      clarifyingAnswers: stored.clarifyingAnswers,
      currentQuestionIndex: stored.currentQuestionIndex,
      wasAnsweringQuestions: stored.wasAnsweringQuestions,
      lines: stored.lines ?? null,
      awaitingQuestionConsent: stored.awaitingQuestionConsent ?? false,
      consentSelectedIndex:
        typeof stored.consentSelectedIndex === 'number' || stored.consentSelectedIndex === null
          ? stored.consentSelectedIndex
          : null,
      clarifyingSelectedOptionIndex:
        typeof stored.clarifyingSelectedOptionIndex === 'number' || stored.clarifyingSelectedOptionIndex === null
          ? stored.clarifyingSelectedOptionIndex
          : null,
      isPromptEditable: stored.isPromptEditable ?? false,
      isPromptFinalized: stored.isPromptFinalized ?? false,
      generationMode:
        stored.generationMode === 'quick' || stored.generationMode === 'guided' ? stored.generationMode : 'guided',
      headerHelpShown: stored.headerHelpShown ?? false,
      lastApprovedPrompt: stored.lastApprovedPrompt ?? null,
      likeState: stored.likeState ?? 'none',
      isPreferencesOpen: stored.isPreferencesOpen ?? false,
      isUserManagementOpen: stored.isUserManagementOpen ?? false,
      isLoginRequiredOpen: stored.isLoginRequiredOpen ?? false,
      isAskingPreferenceQuestions: stored.isAskingPreferenceQuestions ?? false,
      currentPreferenceQuestionKey: stored.currentPreferenceQuestionKey ?? null,
      preferenceSelectedOptionIndex: stored.preferenceSelectedOptionIndex ?? null,
      pendingPreferenceUpdates: stored.pendingPreferenceUpdates ?? {},
      activity: sanitizeActivity(stored.activity),
    }
  } catch (err) {
    console.warn('Failed to load draft', err)
    return null
  }
}

/**
 * Save draft to localStorage.
 */
function saveDraft(draft: DraftState): void {
  if (!isLocalStorageAvailable()) return

  // Don't save empty drafts
  const hasLines = draft.lines && draft.lines.length > 0
  const hasUiState =
    draft.isPreferencesOpen ||
    draft.isUserManagementOpen ||
    draft.isLoginRequiredOpen ||
    draft.isAskingPreferenceQuestions ||
    draft.currentPreferenceQuestionKey !== null ||
    (draft.pendingPreferenceUpdates && Object.keys(draft.pendingPreferenceUpdates).length > 0)
  const sanitizedActivity = sanitizeActivity(draft.activity)
  const hasActivity = Boolean(sanitizedActivity)
  if (
    !draft.sessionId &&
    !draft.userId &&
    !draft.task &&
    !draft.editablePrompt &&
    !draft.promptEditDiff &&
    !draft.clarifyingAnswers?.length &&
    !hasLines &&
    !hasUiState &&
    !hasActivity
  ) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }

  try {
    const stored: StoredDraft = {
      ...draft,
      activity: sanitizedActivity,
      savedAt: Date.now(),
      version: CURRENT_VERSION,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch (err) {
    // localStorage might be full
    console.warn('Failed to save draft', err)
  }
}

/**
 * Clear the stored draft (call after user approves/discards prompt).
 */
export function clearDraft(): void {
  if (!isLocalStorageAvailable()) return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Hook that manages draft persistence with debouncing.
 *
 * @param draft - Current draft state to persist
 * @param enabled - Whether persistence is enabled (disable during initial load)
 */
export function useDraftPersistence(draft: DraftState, enabled: boolean = true): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDraftRef = useRef<string>('')

  useEffect(() => {
    if (!enabled) return

    // Serialize for comparison
    const serialized = JSON.stringify(draft)

    // Skip if nothing changed
    if (serialized === lastDraftRef.current) return
    lastDraftRef.current = serialized

    // Debounce the save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      saveDraft(draft)
    }, DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [draft, enabled])

  // Save immediately on unmount (e.g., navigating away)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Final save with current draft
      const serialized = lastDraftRef.current
      if (serialized) {
        try {
          const finalDraft: DraftState = JSON.parse(serialized)
          saveDraft(finalDraft)
        } catch {
          // Ignore parse errors on cleanup
        }
      }
    }
  }, [])
}

/**
 * Hook to load draft on mount and provide clear function.
 * Returns the initial draft state (loaded once on first render).
 */
export function useDraftRestore(scope?: { sessionId?: string | null; userId?: string | null }): {
  initialDraft: DraftState | null
  clearSavedDraft: () => void
} {
  // Use useState with lazy initializer to load draft only once
  const [initialDraft] = useState<DraftState | null>(() => loadDraft(scope?.sessionId, scope?.userId))

  const clearSavedDraft = useCallback(() => {
    clearDraft()
  }, [])

  return { initialDraft, clearSavedDraft }
}
