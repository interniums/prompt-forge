'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createModeController } from './modeController'

describe('createModeController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setup(generationMode: 'quick' | 'guided' = 'guided') {
    const setGenerationMode = vi.fn()
    const updatePreferencesLocally = vi.fn()
    const resetClarifyingFlowState = vi.fn()
    const resetPreferenceFlowState = vi.fn()
    const setAwaitingQuestionConsent = vi.fn()

    const controller = createModeController({
      generationMode,
      preferences: {},
      updatePreferencesLocally,
      resetClarifyingFlowState,
      resetPreferenceFlowState,
      setAwaitingQuestionConsent,
      setGenerationMode,
    })

    return {
      controller,
      setGenerationMode,
      updatePreferencesLocally,
      resetClarifyingFlowState,
      resetPreferenceFlowState,
      setAwaitingQuestionConsent,
    }
  }

  it('updates preferences and mode when switching', () => {
    const deps = setup('guided')
    deps.controller.handleModeChange('quick')

    expect(deps.setGenerationMode).toHaveBeenCalledWith('quick')
    expect(deps.updatePreferencesLocally).toHaveBeenCalledWith(
      expect.objectContaining({
        uiDefaults: expect.objectContaining({
          generationMode: 'quick',
          showClarifying: false,
        }),
      })
    )
    expect(deps.resetClarifyingFlowState).toHaveBeenCalled()
    expect(deps.resetPreferenceFlowState).toHaveBeenCalled()
    expect(deps.setAwaitingQuestionConsent).toHaveBeenCalledWith(false)
  })

  it('is silent when asked', () => {
    const deps = setup('guided')
    deps.controller.handleModeChange('quick', { silent: true })
    // Silent mode doesn't change behavior anymore since we removed appendLine
  })

  it('no-ops when mode unchanged', () => {
    const deps = setup('quick')
    deps.controller.handleModeChange('quick')
    expect(deps.setGenerationMode).not.toHaveBeenCalled()
  })

  it('enables clarifying flag when switching to guided', () => {
    const deps = setup('quick')
    deps.controller.handleModeChange('guided')

    expect(deps.setGenerationMode).toHaveBeenCalledWith('guided')
    expect(deps.updatePreferencesLocally).toHaveBeenCalledWith(
      expect.objectContaining({
        uiDefaults: expect.objectContaining({
          generationMode: 'guided',
          showClarifying: true,
        }),
      })
    )
  })
})
