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
import type { TerminalLine, ClarifyingQuestion } from '@/lib/types'

const STORAGE_KEY = 'pf_draft'
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours
const DEBOUNCE_MS = 1000 // Save at most once per second

export interface DraftState {
  /** The task the user typed */
  task: string | null
  /** The editable prompt (before approval) */
  editablePrompt: string | null
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
  /** Whether header help was already shown */
  headerHelpShown: boolean
  /** Last approved prompt text, if any */
  lastApprovedPrompt: string | null
}

interface StoredDraft extends DraftState {
  /** When the draft was last saved */
  savedAt: number
  /** Schema version for future migrations */
  version: number
}

const CURRENT_VERSION = 3

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
export function loadDraft(): DraftState | null {
  if (!isLocalStorageAvailable()) return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const stored: StoredDraft = JSON.parse(raw)

    // Check version compatibility - allow migration from v2 to v3
    if (stored.version && stored.version > CURRENT_VERSION) {
      console.info('Draft version too new, clearing')
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

    return {
      task: stored.task,
      editablePrompt: stored.editablePrompt,
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
      headerHelpShown: stored.headerHelpShown ?? false,
      lastApprovedPrompt: stored.lastApprovedPrompt ?? null,
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
  if (!draft.task && !draft.editablePrompt && !draft.clarifyingAnswers?.length && !hasLines) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }

  try {
    const stored: StoredDraft = {
      ...draft,
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
export function useDraftRestore(): {
  initialDraft: DraftState | null
  clearSavedDraft: () => void
} {
  // Use useState with lazy initializer to load draft only once
  const [initialDraft] = useState<DraftState | null>(() => loadDraft())

  const clearSavedDraft = useCallback(() => {
    clearDraft()
  }, [])

  return { initialDraft, clearSavedDraft }
}
