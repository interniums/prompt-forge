import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useClarifyingFlow } from './useClarifyingFlow'
import type { ClarifyingQuestion, Preferences } from '@/lib/types'

vi.mock('@/services/promptService', () => ({
  generateClarifyingQuestions: vi.fn(),
}))

const mockGenerateClarifyingQuestions = vi.mocked(
  await import('@/services/promptService').then((m) => m.generateClarifyingQuestions)
)

function createDeps() {
  const preferences: Preferences = { uiDefaults: {} }
  return {
    pendingTask: '???', // intentionally unclear
    preferences,
    clarifyingQuestions: null,
    currentQuestionIndex: 0,
    generationRunIdRef: { current: 0 },
    clarifyingAnswersRef: { current: [] },
    setIsGenerating: vi.fn(),
    setClarifyingQuestions: vi.fn(),
    setClarifyingAnswers: vi.fn(),
    setCurrentQuestionIndex: vi.fn(),
    setAnsweringQuestions: vi.fn(),
    setAwaitingQuestionConsent: vi.fn(),
    setConsentSelectedIndex: vi.fn(),
    setClarifyingSelectedOptionIndex: vi.fn(),
    setHasRunInitialTask: vi.fn(),
    setValue: vi.fn(),
    appendLine: vi.fn(),
    setActivity: vi.fn(),
    showToast: vi.fn(),
    focusInputToEnd: vi.fn(),
    getPreferencesToAsk: vi.fn(() => []),
    startPreferenceQuestions: vi.fn(),
    generateFinalPromptForTask: vi.fn(),
    onUnclearTask: vi.fn(),
  }
}

describe('useClarifyingFlow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls onUnclearTask and aborts when task is unclear', async () => {
    const deps = createDeps()
    const { result } = renderHook(() => useClarifyingFlow(deps))

    await act(async () => {
      await result.current.startClarifyingQuestions('???')
    })

    expect(deps.onUnclearTask).toHaveBeenCalledWith({
      reason: expect.stringContaining('Please describe'),
      stage: 'clarifying',
      task: '???',
    })
    expect(mockGenerateClarifyingQuestions).not.toHaveBeenCalled()
    expect(deps.setIsGenerating).toHaveBeenCalledWith(false)
    expect(deps.setAwaitingQuestionConsent).toHaveBeenCalledWith(false)
    expect(deps.setAnsweringQuestions).toHaveBeenCalledWith(false)
  })

  it('skips unclear guard when allowUnclear is true', async () => {
    const deps = createDeps()
    deps.pendingTask = 'unclear'
    const question: ClarifyingQuestion = { id: 'q1', question: 'What?', options: [] }
    mockGenerateClarifyingQuestions.mockResolvedValue([question])

    const { result } = renderHook(() => useClarifyingFlow(deps))

    await act(async () => {
      await result.current.startClarifyingQuestions('unclear', { allowUnclear: true })
    })

    expect(mockGenerateClarifyingQuestions).toHaveBeenCalledWith({
      task: 'unclear',
      preferences: deps.preferences,
      allowUnclear: true,
    })
    expect(deps.onUnclearTask).not.toHaveBeenCalled()
    expect(deps.setClarifyingQuestions).toHaveBeenCalledWith([question])
  })
})
