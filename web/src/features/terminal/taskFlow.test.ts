'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/services/eventsService', () => ({
  recordEvent: vi.fn(),
}))

vi.mock('@/services/sessionService', () => ({
  getOrCreateActionSessionId: vi.fn().mockResolvedValue('test-session'),
  ensureSessionExists: vi.fn(),
}))

import { createTaskFlowHandlers, type TaskFlowDeps } from './taskFlow'
import { ROLE, MAX_TASK_LENGTH } from '@/lib/constants'

function makeDeps(overrides?: Partial<TaskFlowDeps['state']>): TaskFlowDeps {
  const appendLine = vi.fn()
  const setValue = vi.fn()
  const advancePreferences = vi.fn()
  const handleCommand = vi.fn()
  const handleQuestionConsent = vi.fn()
  const handleClarifyingAnswer = vi.fn()
  const handlePreferenceAnswer = vi.fn()
  const runEditPrompt = vi.fn()
  const setHasRunInitialTask = vi.fn()
  const setPendingTask = vi.fn()
  const resetClarifyingFlowState = vi.fn()
  const resetPreferenceFlowState = vi.fn()
  const setEditablePrompt = vi.fn()
  const setIsPromptEditable = vi.fn()
  const setIsPromptFinalized = vi.fn()
  const setLikeState = vi.fn()
  const setAwaitingQuestionConsent = vi.fn()
  const setConsentSelectedIndex = vi.fn()
  const startClarifyingQuestions = vi.fn()
  const setAnsweringQuestions = vi.fn()
  const setCurrentQuestionIndex = vi.fn()
  const selectForQuestion = vi.fn()
  const appendClarifyingQuestion = vi.fn()
  const focusInputToEnd = vi.fn()
  const guardedGenerateFinalPromptForTask = vi.fn()
  const setIsRevising = vi.fn()
  const setClarifyingSelectedOptionIndex = vi.fn()
  const setLastApprovedPrompt = vi.fn()

  const state: TaskFlowDeps['state'] = {
    isGenerating: false,
    value: '',
    lines: [{ id: 0, role: ROLE.SYSTEM, text: 'hi' }],
    preferencesStep: null,
    awaitingQuestionConsent: false,
    pendingTask: null,
    consentSelectedIndex: null,
    answeringQuestions: false,
    clarifyingQuestions: null,
    currentQuestionIndex: 0,
    isAskingPreferenceQuestions: false,
    currentPreferenceQuestionKey: null,
    hasRunInitialTask: false,
    isRevising: false,
    generationMode: 'guided',
    editablePrompt: null,
    ...overrides,
  }

  return {
    state,
    refs: { clarifyingAnswersRef: { current: [] } },
    actions: {
      setValue,
      appendLine,
      handleCommand,
      advancePreferences,
      handleQuestionConsent,
      handleClarifyingAnswer,
      handlePreferenceAnswer,
      runEditPrompt,
      setHasRunInitialTask,
      setPendingTask,
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
      setIsRevising,
      setClarifyingSelectedOptionIndex,
      setLastApprovedPrompt,
    },
  }
}

describe('createTaskFlowHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes consent input to handleQuestionConsent', async () => {
    const deps = makeDeps({
      awaitingQuestionConsent: true,
      pendingTask: 'task',
      consentSelectedIndex: 0,
      value: 'generate',
    })
    const { submitCurrent } = createTaskFlowHandlers(deps)
    submitCurrent()
    expect(deps.actions.handleQuestionConsent).toHaveBeenCalledWith('no')
  })

  it('routes preference answer to handlePreferenceAnswer', async () => {
    const deps = makeDeps({
      isAskingPreferenceQuestions: true,
      currentPreferenceQuestionKey: 'tone',
      value: 'formal',
    })
    const { submitCurrent } = createTaskFlowHandlers(deps)
    submitCurrent()
    expect(deps.actions.handlePreferenceAnswer).toHaveBeenCalledWith('formal')
  })

  it('rejects short tasks', async () => {
    const deps = makeDeps()
    const { handleTask } = createTaskFlowHandlers(deps)
    await handleTask('hi')
    expect(deps.actions.appendLine).toHaveBeenCalledWith(ROLE.APP, expect.stringContaining('detail'))
    expect(deps.actions.guardedGenerateFinalPromptForTask).not.toHaveBeenCalled()
  })

  it('rejects long tasks', async () => {
    const deps = makeDeps()
    const { handleTask } = createTaskFlowHandlers(deps)
    await handleTask('a'.repeat(MAX_TASK_LENGTH + 10))
    expect(deps.actions.appendLine).toHaveBeenCalledWith(ROLE.APP, expect.stringContaining('too long'))
    expect(deps.actions.guardedGenerateFinalPromptForTask).not.toHaveBeenCalled()
  })

  it('reuses clarifying flow when revising same task', async () => {
    const clarifyingQuestions = [
      { id: 'q1', question: 'Q1', options: [] },
      { id: 'q2', question: 'Q2', options: [] },
    ]
    const deps = makeDeps({
      isRevising: true,
      pendingTask: 'same task',
      clarifyingQuestions,
    })
    deps.refs.clarifyingAnswersRef.current = [{ questionId: 'q1', question: 'Q1', answer: 'A1' }]
    const { handleTask } = createTaskFlowHandlers(deps)

    await handleTask('same task')

    expect(deps.actions.setIsRevising).toHaveBeenCalledWith(false)
    expect(deps.actions.setAnsweringQuestions).toHaveBeenCalledWith(true)
    expect(deps.actions.setCurrentQuestionIndex).toHaveBeenCalledWith(1)
    expect(deps.actions.appendClarifyingQuestion).toHaveBeenCalledWith(clarifyingQuestions[1], 1, 2)
  })

  it('branches to quick generation without questions', async () => {
    const deps = makeDeps({ generationMode: 'quick' })
    const { handleTask } = createTaskFlowHandlers(deps)
    await handleTask('valid task text')

    expect(deps.actions.appendLine).toHaveBeenCalledWith(ROLE.APP, expect.objectContaining({ title: 'Quick Draft' }))
    expect(deps.actions.guardedGenerateFinalPromptForTask).toHaveBeenCalledWith('valid task text', [], {
      skipConsentCheck: true,
    })
    expect(deps.actions.startClarifyingQuestions).not.toHaveBeenCalled()
  })

  it('branches to guided questions when enabled', async () => {
    const deps = makeDeps({ generationMode: 'guided' })
    const { handleTask } = createTaskFlowHandlers(deps)
    await handleTask('valid guided task')

    expect(deps.actions.startClarifyingQuestions).toHaveBeenCalledWith('valid guided task')
    expect(deps.actions.guardedGenerateFinalPromptForTask).not.toHaveBeenCalled()
  })

  it('routes consent input to handleQuestionConsent', async () => {
    const deps = makeDeps({
      awaitingQuestionConsent: true,
      pendingTask: 'task',
      consentSelectedIndex: 0,
      value: 'generate',
    })
    const { submitCurrent } = createTaskFlowHandlers(deps)
    submitCurrent()
    expect(deps.actions.handleQuestionConsent).toHaveBeenCalledWith('no')
  })

  it('routes preference answer to handlePreferenceAnswer', async () => {
    const deps = makeDeps({
      isAskingPreferenceQuestions: true,
      currentPreferenceQuestionKey: 'tone',
      value: 'formal',
    })
    const { submitCurrent } = createTaskFlowHandlers(deps)
    submitCurrent()
    expect(deps.actions.handlePreferenceAnswer).toHaveBeenCalledWith('formal')
  })

  it('routes slash command to command handler', () => {
    const deps = makeDeps({
      value: '/help',
      lines: [
        {
          id: 0,
          role: ROLE.SYSTEM,
          text: 'hello',
        },
      ],
    })
    const { submitCurrent } = createTaskFlowHandlers(deps)
    submitCurrent()
    expect(deps.actions.handleCommand).toHaveBeenCalledWith('/help')
  })

  it('runs consent -> clarifying -> preference happy path', () => {
    const deps = makeDeps({
      awaitingQuestionConsent: true,
      pendingTask: 'task',
      consentSelectedIndex: 1, // "yes"
      value: 'yes',
    })
    const { submitCurrent, handleTask } = createTaskFlowHandlers(deps)

    submitCurrent()
    expect(deps.actions.handleQuestionConsent).toHaveBeenCalledWith('yes')

    deps.state.awaitingQuestionConsent = false
    deps.state.answeringQuestions = true
    deps.state.clarifyingQuestions = [{ id: 'q1', question: 'Q1', options: [] }]
    deps.state.currentQuestionIndex = 0
    deps.state.value = 'answer'
    deps.state.pendingTask = 'task'

    submitCurrent()
    expect(deps.actions.handleClarifyingAnswer).toHaveBeenCalledWith('answer')

    deps.state.answeringQuestions = false
    deps.state.isAskingPreferenceQuestions = true
    deps.state.currentPreferenceQuestionKey = 'tone'
    deps.state.value = 'formal'

    submitCurrent()
    expect(deps.actions.handlePreferenceAnswer).toHaveBeenCalledWith('formal')

    deps.state.isAskingPreferenceQuestions = false
    deps.state.currentPreferenceQuestionKey = null
    deps.state.value = 'final task'
    deps.state.hasRunInitialTask = false
    deps.state.pendingTask = null
    deps.state.generationMode = 'quick'

    void handleTask('final task')
    expect(deps.actions.guardedGenerateFinalPromptForTask).toHaveBeenCalledWith('final task', [], {
      skipConsentCheck: true,
    })
  })
})
