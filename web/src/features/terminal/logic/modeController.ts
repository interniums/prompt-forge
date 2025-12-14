'use client'

import type { Preferences, GenerationMode } from '@/lib/types'

export type ModeControllerDeps = {
  generationMode: GenerationMode
  preferences: Preferences
  updatePreferencesLocally: (next: Preferences) => void
  resetClarifyingFlowState: () => void
  resetPreferenceFlowState: () => void
  setAwaitingQuestionConsent: (value: boolean) => void
  setGenerationMode: (mode: GenerationMode) => void
}

export function createModeController({
  generationMode,
  preferences,
  updatePreferencesLocally,
  resetClarifyingFlowState,
  resetPreferenceFlowState,
  setAwaitingQuestionConsent,
  setGenerationMode,
}: ModeControllerDeps) {
  function handleModeChange(mode: GenerationMode, options?: { silent?: boolean }) {
    if (mode === generationMode) return
    setGenerationMode(mode)
    updatePreferencesLocally({
      ...preferences,
      uiDefaults: {
        ...(preferences.uiDefaults ?? {}),
        generationMode: mode,
        // Keep showClarifying aligned with the chosen mode so future restores do not override the selection.
        showClarifying: mode === 'guided',
      },
    })
    if (mode === 'quick') {
      resetClarifyingFlowState()
      resetPreferenceFlowState()
      setAwaitingQuestionConsent(false)
    }
  }

  return { handleModeChange }
}
