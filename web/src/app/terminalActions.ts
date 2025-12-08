'use server'

// Re-export service utilities for backward compatibility
export { recordEvent } from '@/services/eventsService'
export { recordGeneration, listHistory } from '@/services/historyService'
export {
  getCurrentUser,
  loadUserPreferences,
  savePreferences,
  type SavePreferencesResult,
} from '@/services/preferencesServer'
export {
  generateClarifyingQuestions,
  generateFinalPrompt,
  editPrompt,
  type PreferencesInput,
} from '@/services/promptService'
import type { Preferences, GeneratedPrompt, ClarifyingQuestion, ClarifyingAnswer, ClarifyingOption } from '@/lib/types'

// Re-export types for consumers that import from this module
export type { Preferences, GeneratedPrompt, ClarifyingQuestion, ClarifyingAnswer, ClarifyingOption }
