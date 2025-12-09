'use client'

import { ROLE } from '@/lib/constants'
import type { Preferences, GenerationMode } from '@/lib/types'

export type ModeControllerDeps = {
  generationMode: GenerationMode
  preferences: Preferences
  updatePreferencesLocally: (next: Preferences) => void
  resetClarifyingFlowState: () => void
  resetPreferenceFlowState: () => void
  setAwaitingQuestionConsent: (value: boolean) => void
  setGenerationMode: (mode: GenerationMode) => void
  appendLine: (role: (typeof ROLE)[keyof typeof ROLE], text: string | { title: string; description: string }) => void
}

export function createModeController({
  generationMode,
  preferences,
  updatePreferencesLocally,
  resetClarifyingFlowState,
  resetPreferenceFlowState,
  setAwaitingQuestionConsent,
  setGenerationMode,
  appendLine,
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
    if (!options?.silent) {
      appendLine(
        ROLE.APP,
        mode === 'quick'
          ? 'Switched to Quick Start. I will generate without clarifying or preference questions.'
          : 'Switched to Guided Build. I will ask a few clarifying and preference questions before generating.'
      )
    }
  }

  return { handleModeChange }
}
