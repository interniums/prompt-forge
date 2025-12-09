'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { useTerminalSnapshots } from '@/hooks/useTerminalSnapshots'
import { ROLE, MESSAGE } from '@/lib/constants'
import { renderHook, act } from '@testing-library/react'

type Mutable<T> = {
  [K in keyof T]: T[K]
}

function createState() {
  return {
    lines: [
      { id: 0, role: ROLE.SYSTEM, text: MESSAGE.WELCOME },
      { id: 1, role: ROLE.USER, text: 'Task' },
    ],
    editablePrompt: 'prompt',
    pendingTask: 'task',
    clarifyingQuestions: null,
    clarifyingAnswersRef: { current: [] as any[] },
    currentQuestionIndex: 0,
    answeringQuestions: false,
    awaitingQuestionConsent: false,
    consentSelectedIndex: null as number | null,
    clarifyingSelectedOptionIndex: null as number | null,
    generationMode: 'guided' as const,
    isPromptEditable: true,
    isPromptFinalized: false,
    lastApprovedPrompt: null as string | null,
    headerHelpShown: true,
    hasRunInitialTask: true,
    isAskingPreferenceQuestions: false,
    currentPreferenceQuestionKey: null,
    preferenceSelectedOptionIndex: null,
    pendingPreferenceUpdates: {},
    lastSnapshot: null as any,
  }
}

function createActions(state: Mutable<ReturnType<typeof createState>>) {
  return {
    setLines: vi.fn((next) => {
      state.lines = typeof next === 'function' ? next(state.lines) : next
    }),
    setEditablePrompt: vi.fn((val) => {
      state.editablePrompt = val
    }),
    setPendingTask: vi.fn((val) => {
      state.pendingTask = val
    }),
    setClarifyingQuestions: vi.fn(),
    setClarifyingAnswers: vi.fn(),
    setCurrentQuestionIndex: vi.fn(),
    setAnsweringQuestions: vi.fn(),
    setAwaitingQuestionConsent: vi.fn(),
    setConsentSelectedIndex: vi.fn(),
    setClarifyingSelectedOptionIndex: vi.fn(),
    setGenerationMode: vi.fn(),
    setIsPromptEditable: vi.fn((val) => {
      state.isPromptEditable = val
    }),
    setIsPromptFinalized: vi.fn((val) => {
      state.isPromptFinalized = val
    }),
    setLastApprovedPrompt: vi.fn((val) => {
      state.lastApprovedPrompt = val
    }),
    setHeaderHelpShown: vi.fn((val) => {
      state.headerHelpShown = val
    }),
    setHasRunInitialTask: vi.fn((val) => {
      state.hasRunInitialTask = val
    }),
    setIsAskingPreferenceQuestions: vi.fn(),
    setCurrentPreferenceQuestionKey: vi.fn(),
    setPreferenceSelectedOptionIndex: vi.fn(),
    setPendingPreferenceUpdates: vi.fn(),
    setLikeState: vi.fn(),
    setLastHistory: vi.fn(),
    setLastSnapshot: vi.fn((val) => {
      state.lastSnapshot = val
    }),
    setValue: vi.fn(),
    clearDraft: vi.fn(),
    resetClarifyingFlowState: vi.fn(),
    appendLine: vi.fn(),
  }
}

describe('useTerminalSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears the log and saves snapshot', () => {
    const state = createState()
    const actions = createActions(state)
    const { result } = renderHook(() => useTerminalSnapshots({ ...state, ...actions }))

    act(() => {
      result.current.handleClear()
    })

    expect(state.lines).toEqual([{ id: 0, role: ROLE.SYSTEM, text: MESSAGE.HISTORY_CLEARED }])
    expect(actions.setLastSnapshot).toHaveBeenCalled()
    expect(actions.resetClarifyingFlowState).toHaveBeenCalled()
  })

  it('discard resets conversation state', () => {
    const state = createState()
    const actions = createActions(state)
    const { result } = renderHook(() => useTerminalSnapshots({ ...state, ...actions }))

    act(() => {
      result.current.handleDiscard()
    })

    expect(state.lines).toEqual([{ id: 0, role: ROLE.SYSTEM, text: MESSAGE.WELCOME_FRESH }])
    expect(state.pendingTask).toBeNull()
    expect(state.editablePrompt).toBeNull()
    expect(state.isPromptEditable).toBe(true)
    expect(state.isPromptFinalized).toBe(false)
    expect(state.hasRunInitialTask).toBe(false)
    expect(actions.clearDraft).toHaveBeenCalled()
  })

  it('restores from snapshot when present', () => {
    const state = createState()
    state.lastSnapshot = {
      ...state,
      lines: [{ id: 0, role: ROLE.SYSTEM, text: 'restored' }],
      clarifyingAnswers: [],
      currentQuestionIndex: 0,
    }
    const actions = createActions(state)
    const { result } = renderHook(() => useTerminalSnapshots({ ...state, ...actions }))

    act(() => {
      result.current.handleRestore()
    })

    expect(state.lines).toEqual([{ id: 0, role: ROLE.SYSTEM, text: 'restored' }])
  })
})
