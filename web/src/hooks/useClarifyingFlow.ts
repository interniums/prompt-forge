'use client'

import { useReducer, useCallback, useRef } from 'react'
import type { ClarifyingQuestion, ClarifyingAnswer } from '@/lib/types'

/**
 * Flow states for the clarifying question process
 */
export type FlowPhase =
  | 'idle' // No active flow
  | 'awaiting_consent' // Waiting for yes/no to questions
  | 'generating_questions' // AI generating clarifying questions
  | 'answering_questions' // User answering questions
  | 'generating_prompt' // AI generating final prompt
  | 'prompt_ready' // Prompt ready for review
  | 'editing_prompt' // AI editing prompt
  | 'revising' // User revising task/answers

export type FlowState = {
  phase: FlowPhase
  task: string | null
  questions: ClarifyingQuestion[] | null
  currentQuestionIndex: number
  selectedOptionIndex: number | null
  consentSelectedIndex: number | null
  hasRunInitialTask: boolean
  generationRunId: number
}

export type FlowAction =
  | { type: 'START_TASK'; task: string }
  | { type: 'CONSENT_YES' }
  | { type: 'CONSENT_NO' }
  | { type: 'START_GENERATING_QUESTIONS' }
  | { type: 'QUESTIONS_READY'; questions: ClarifyingQuestion[] }
  | { type: 'QUESTIONS_FAILED' }
  | { type: 'ANSWER_QUESTION'; questionIndex: number }
  | { type: 'NEXT_QUESTION' }
  | { type: 'UNDO_ANSWER'; prevIndex: number }
  | { type: 'START_GENERATING_PROMPT' }
  | { type: 'PROMPT_READY' }
  | { type: 'PROMPT_FAILED' }
  | { type: 'START_EDITING_PROMPT' }
  | { type: 'EDIT_COMPLETE' }
  | { type: 'START_REVISING' }
  | { type: 'SELECT_OPTION'; index: number | null }
  | { type: 'SELECT_CONSENT'; index: number | null }
  | { type: 'CANCEL_GENERATION' }
  | { type: 'RESET' }

const initialState: FlowState = {
  phase: 'idle',
  task: null,
  questions: null,
  currentQuestionIndex: 0,
  selectedOptionIndex: null,
  consentSelectedIndex: null,
  hasRunInitialTask: false,
  generationRunId: 0,
}

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'START_TASK':
      return {
        ...state,
        phase: 'awaiting_consent',
        task: action.task,
        hasRunInitialTask: true,
        questions: null,
        currentQuestionIndex: 0,
        selectedOptionIndex: null,
        consentSelectedIndex: null,
      }

    case 'CONSENT_YES':
      return {
        ...state,
        phase: state.questions ? 'answering_questions' : 'generating_questions',
        consentSelectedIndex: null,
      }

    case 'CONSENT_NO':
      return {
        ...state,
        phase: 'generating_prompt',
        consentSelectedIndex: null,
      }

    case 'START_GENERATING_QUESTIONS':
      return {
        ...state,
        phase: 'generating_questions',
        generationRunId: state.generationRunId + 1,
      }

    case 'QUESTIONS_READY':
      return {
        ...state,
        phase: action.questions.length > 0 ? 'answering_questions' : 'generating_prompt',
        questions: action.questions,
        currentQuestionIndex: 0,
        selectedOptionIndex: action.questions[0]?.options?.length > 0 ? 0 : null,
      }

    case 'QUESTIONS_FAILED':
      return {
        ...state,
        phase: 'generating_prompt',
      }

    case 'ANSWER_QUESTION':
      return {
        ...state,
        currentQuestionIndex: action.questionIndex,
      }

    case 'NEXT_QUESTION': {
      const nextIndex = state.currentQuestionIndex + 1
      const isLastQuestion = state.questions && nextIndex >= state.questions.length

      if (isLastQuestion) {
        return {
          ...state,
          phase: 'generating_prompt',
          selectedOptionIndex: null,
        }
      }

      const nextQuestion = state.questions?.[nextIndex]
      return {
        ...state,
        currentQuestionIndex: nextIndex,
        selectedOptionIndex: nextQuestion?.options?.length ? 0 : null,
      }
    }

    case 'UNDO_ANSWER': {
      if (action.prevIndex < 0) {
        // Go back to consent
        return {
          ...state,
          phase: 'awaiting_consent',
          currentQuestionIndex: 0,
          selectedOptionIndex: null,
          consentSelectedIndex: null,
        }
      }
      const prevQuestion = state.questions?.[action.prevIndex]
      return {
        ...state,
        currentQuestionIndex: action.prevIndex,
        selectedOptionIndex: prevQuestion?.options?.length ? 0 : null,
      }
    }

    case 'START_GENERATING_PROMPT':
      return {
        ...state,
        phase: 'generating_prompt',
        generationRunId: state.generationRunId + 1,
      }

    case 'PROMPT_READY':
      return {
        ...state,
        phase: 'prompt_ready',
      }

    case 'PROMPT_FAILED':
      return {
        ...state,
        phase: 'prompt_ready', // Still show what we have
      }

    case 'START_EDITING_PROMPT':
      return {
        ...state,
        phase: 'editing_prompt',
        generationRunId: state.generationRunId + 1,
      }

    case 'EDIT_COMPLETE':
      return {
        ...state,
        phase: 'prompt_ready',
      }

    case 'START_REVISING':
      return {
        ...state,
        phase: 'revising',
        hasRunInitialTask: false,
      }

    case 'SELECT_OPTION':
      return {
        ...state,
        selectedOptionIndex: action.index,
      }

    case 'SELECT_CONSENT':
      return {
        ...state,
        consentSelectedIndex: action.index,
      }

    case 'CANCEL_GENERATION':
      return {
        ...state,
        phase: state.phase === 'generating_questions' ? 'idle' : 'prompt_ready',
        generationRunId: state.generationRunId + 1,
      }

    case 'RESET':
      return {
        ...initialState,
        generationRunId: state.generationRunId,
      }

    default:
      return state
  }
}

/**
 * Hook for managing the clarifying question flow state machine.
 * Provides a cleaner API than multiple useState calls.
 */
export function useClarifyingFlow() {
  const [state, dispatch] = useReducer(flowReducer, initialState)
  const answersRef = useRef<ClarifyingAnswer[]>([])

  // Helper to check if we're in a generating state
  const isGenerating =
    state.phase === 'generating_questions' || state.phase === 'generating_prompt' || state.phase === 'editing_prompt'

  // Helper to check if we're awaiting user input for questions
  const isAwaitingQuestionInput = state.phase === 'awaiting_consent' || state.phase === 'answering_questions'

  // Actions with memoized callbacks
  const startTask = useCallback((task: string) => {
    answersRef.current = []
    dispatch({ type: 'START_TASK', task })
  }, [])

  const consentYes = useCallback(() => dispatch({ type: 'CONSENT_YES' }), [])
  const consentNo = useCallback(() => dispatch({ type: 'CONSENT_NO' }), [])

  const questionsReady = useCallback((questions: ClarifyingQuestion[]) => {
    dispatch({ type: 'QUESTIONS_READY', questions })
  }, [])

  const questionsFailed = useCallback(() => dispatch({ type: 'QUESTIONS_FAILED' }), [])

  const addAnswer = useCallback((answer: ClarifyingAnswer) => {
    answersRef.current = [...answersRef.current, answer]
    dispatch({ type: 'NEXT_QUESTION' })
  }, [])

  const undoAnswer = useCallback(() => {
    const prevIndex = answersRef.current.length - 1
    if (prevIndex >= 0) {
      answersRef.current = answersRef.current.slice(0, -1)
    }
    dispatch({ type: 'UNDO_ANSWER', prevIndex })
  }, [])

  const promptReady = useCallback(() => dispatch({ type: 'PROMPT_READY' }), [])
  const promptFailed = useCallback(() => dispatch({ type: 'PROMPT_FAILED' }), [])

  const startEditing = useCallback(() => dispatch({ type: 'START_EDITING_PROMPT' }), [])
  const editComplete = useCallback(() => dispatch({ type: 'EDIT_COMPLETE' }), [])

  const startRevising = useCallback(() => dispatch({ type: 'START_REVISING' }), [])

  const selectOption = useCallback((index: number | null) => {
    dispatch({ type: 'SELECT_OPTION', index })
  }, [])

  const selectConsent = useCallback((index: number | null) => {
    dispatch({ type: 'SELECT_CONSENT', index })
  }, [])

  const cancelGeneration = useCallback(() => dispatch({ type: 'CANCEL_GENERATION' }), [])

  const reset = useCallback(() => {
    answersRef.current = []
    dispatch({ type: 'RESET' })
  }, [])

  const getAnswers = useCallback(() => answersRef.current, [])
  const getAnswerCount = useCallback(() => answersRef.current.length, [])

  return {
    // State
    phase: state.phase,
    task: state.task,
    questions: state.questions,
    currentQuestionIndex: state.currentQuestionIndex,
    selectedOptionIndex: state.selectedOptionIndex,
    consentSelectedIndex: state.consentSelectedIndex,
    hasRunInitialTask: state.hasRunInitialTask,
    generationRunId: state.generationRunId,

    // Computed
    isGenerating,
    isAwaitingQuestionInput,
    currentQuestion:
      state.questions && state.currentQuestionIndex < state.questions.length
        ? state.questions[state.currentQuestionIndex]
        : null,

    // Actions
    startTask,
    consentYes,
    consentNo,
    questionsReady,
    questionsFailed,
    addAnswer,
    undoAnswer,
    promptReady,
    promptFailed,
    startEditing,
    editComplete,
    startRevising,
    selectOption,
    selectConsent,
    cancelGeneration,
    reset,
    getAnswers,
    getAnswerCount,
  }
}
