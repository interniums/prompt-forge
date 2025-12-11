'use client'

import React, { createContext, JSX, useContext, useReducer, type Dispatch, type ReactNode } from 'react'
import type {
  TerminalLine,
  ClarifyingQuestion,
  ClarifyingAnswer,
  Preferences,
  HistoryItem,
  GenerationMode,
  TaskActivity,
} from '@/lib/types'

export type LikeState = 'none' | 'liked' | 'disliked'
export type PreferenceKey = Extract<keyof Preferences, string>
export type PromptEditDiff = {
  previous: string
  current: string
}

export type SessionSnapshot = {
  lines: TerminalLine[]
  editablePrompt: string | null
  promptEditDiff: PromptEditDiff | null
  pendingTask: string | null
  clarifyingQuestions: ClarifyingQuestion[] | null
  clarifyingAnswers: ClarifyingAnswer[]
  currentQuestionIndex: number
  answeringQuestions: boolean
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  clarifyingSelectedOptionIndex: number | null
  generationMode: GenerationMode
  isPromptEditable: boolean
  isPromptFinalized: boolean
  lastApprovedPrompt: string | null
  headerHelpShown: boolean
  hasRunInitialTask: boolean
  isAskingPreferenceQuestions: boolean
  currentPreferenceQuestionKey: PreferenceKey | null
  preferenceSelectedOptionIndex: number | null
  pendingPreferenceUpdates: Partial<Preferences>
}

export type TerminalState = {
  inputValue: string
  lines: TerminalLine[]
  activity: TaskActivity | null
  isGenerating: boolean
  pendingTask: string | null
  editablePrompt: string | null
  promptEditDiff: PromptEditDiff | null
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  clarifyingQuestions: ClarifyingQuestion[] | null
  clarifyingAnswers: ClarifyingAnswer[]
  currentQuestionIndex: number
  answeringQuestions: boolean
  clarifyingSelectedOptionIndex: number | null
  generationMode: GenerationMode
  isPromptEditable: boolean
  isPromptFinalized: boolean
  likeState: LikeState
  hasRunInitialTask: boolean
  headerHelpShown: boolean
  lastApprovedPrompt: string | null
  isAskingPreferenceQuestions: boolean
  currentPreferenceQuestionKey: PreferenceKey | null
  preferenceSelectedOptionIndex: number | null
  pendingPreferenceUpdates: Partial<Preferences>
  isPreferencesOpen: boolean
  isUserManagementOpen: boolean
  isLoginRequiredOpen: boolean
  draftRestoredShown: boolean
  emptySubmitWarned: boolean
  lastHistory: HistoryItem[] | null
  lastSnapshot: SessionSnapshot | null
}

export const createInitialTerminalState = (initialLines: TerminalLine[]): TerminalState => ({
  inputValue: '',
  lines: initialLines,
  activity: null,
  isGenerating: false,
  pendingTask: null,
  editablePrompt: null,
  promptEditDiff: null,
  awaitingQuestionConsent: false,
  consentSelectedIndex: null,
  clarifyingQuestions: null,
  clarifyingAnswers: [],
  currentQuestionIndex: 0,
  answeringQuestions: false,
  clarifyingSelectedOptionIndex: null,
  generationMode: 'guided',
  isPromptEditable: true,
  isPromptFinalized: false,
  likeState: 'none',
  hasRunInitialTask: initialLines.length > 1,
  headerHelpShown: false,
  lastApprovedPrompt: null,
  isAskingPreferenceQuestions: false,
  currentPreferenceQuestionKey: null,
  preferenceSelectedOptionIndex: null,
  pendingPreferenceUpdates: {},
  isPreferencesOpen: false,
  isUserManagementOpen: false,
  isLoginRequiredOpen: false,
  draftRestoredShown: false,
  emptySubmitWarned: false,
  lastHistory: null,
  lastSnapshot: null,
})

export type TerminalAction =
  | { type: 'set_input'; value: string }
  | { type: 'append_lines'; lines: TerminalLine[] }
  | { type: 'replace_lines'; lines: TerminalLine[] }
  | { type: 'set_activity'; activity: TaskActivity | null }
  | { type: 'set_generating'; value: boolean }
  | { type: 'set_pending_task'; value: string | null }
  | { type: 'set_editable_prompt'; value: string | null }
  | { type: 'set_prompt_edit_diff'; value: PromptEditDiff | null }
  | { type: 'set_question_consent'; awaiting: boolean; selectedIndex: number | null }
  | { type: 'set_clarifying_questions'; questions: ClarifyingQuestion[] | null }
  | { type: 'set_clarifying_answers'; answers: ClarifyingAnswer[]; currentIndex: number }
  | { type: 'set_current_question_index'; value: number }
  | { type: 'set_answering_questions'; value: boolean }
  | { type: 'set_consent_selected_index'; value: number | null }
  | { type: 'set_clarifying_selected_option'; value: number | null }
  | { type: 'set_generation_mode'; value: GenerationMode }
  | { type: 'set_prompt_editable'; value: boolean }
  | { type: 'set_prompt_finalized'; value: boolean }
  | { type: 'set_like_state'; value: LikeState }
  | { type: 'set_has_run_initial_task'; value: boolean }
  | { type: 'set_header_help_shown'; value: boolean }
  | { type: 'set_last_approved_prompt'; value: string | null }
  | { type: 'set_is_asking_preferences'; value: boolean }
  | { type: 'set_current_preference_question'; value: PreferenceKey | null }
  | { type: 'set_preference_selected_option_index'; value: number | null }
  | { type: 'set_pending_preference_updates'; value: Partial<Preferences> }
  | { type: 'set_preferences_open'; value: boolean }
  | { type: 'set_user_management_open'; value: boolean }
  | { type: 'set_login_required_open'; value: boolean }
  | { type: 'set_draft_restored_shown'; value: boolean }
  | { type: 'set_empty_submit_warned'; value: boolean }
  | { type: 'set_last_history'; value: HistoryItem[] | null }
  | { type: 'set_last_snapshot'; value: SessionSnapshot | null }

function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case 'set_input':
      return { ...state, inputValue: action.value }
    case 'append_lines':
      return { ...state, lines: [...state.lines, ...action.lines] }
    case 'replace_lines':
      return { ...state, lines: action.lines }
    case 'set_activity':
      return { ...state, activity: action.activity }
    case 'set_generating':
      return { ...state, isGenerating: action.value }
    case 'set_pending_task':
      return { ...state, pendingTask: action.value }
    case 'set_editable_prompt':
      return { ...state, editablePrompt: action.value }
    case 'set_prompt_edit_diff':
      return { ...state, promptEditDiff: action.value }
    case 'set_question_consent':
      return { ...state, awaitingQuestionConsent: action.awaiting, consentSelectedIndex: action.selectedIndex }
    case 'set_consent_selected_index':
      return { ...state, consentSelectedIndex: action.value }
    case 'set_clarifying_questions':
      return { ...state, clarifyingQuestions: action.questions }
    case 'set_clarifying_answers':
      return {
        ...state,
        clarifyingAnswers: action.answers,
        currentQuestionIndex: action.currentIndex,
      }
    case 'set_current_question_index':
      return { ...state, currentQuestionIndex: action.value }
    case 'set_answering_questions':
      return { ...state, answeringQuestions: action.value }
    case 'set_clarifying_selected_option':
      return { ...state, clarifyingSelectedOptionIndex: action.value }
    case 'set_generation_mode':
      return { ...state, generationMode: action.value }
    case 'set_prompt_editable':
      return { ...state, isPromptEditable: action.value }
    case 'set_prompt_finalized':
      return { ...state, isPromptFinalized: action.value }
    case 'set_like_state':
      return { ...state, likeState: action.value }
    case 'set_has_run_initial_task':
      return { ...state, hasRunInitialTask: action.value }
    case 'set_header_help_shown':
      return { ...state, headerHelpShown: action.value }
    case 'set_last_approved_prompt':
      return { ...state, lastApprovedPrompt: action.value }
    case 'set_is_asking_preferences':
      return { ...state, isAskingPreferenceQuestions: action.value }
    case 'set_current_preference_question':
      return { ...state, currentPreferenceQuestionKey: action.value }
    case 'set_preference_selected_option_index':
      return { ...state, preferenceSelectedOptionIndex: action.value }
    case 'set_pending_preference_updates':
      return { ...state, pendingPreferenceUpdates: action.value }
    case 'set_preferences_open':
      return { ...state, isPreferencesOpen: action.value }
    case 'set_user_management_open':
      return { ...state, isUserManagementOpen: action.value }
    case 'set_login_required_open':
      return { ...state, isLoginRequiredOpen: action.value }
    case 'set_draft_restored_shown':
      return { ...state, draftRestoredShown: action.value }
    case 'set_empty_submit_warned':
      return { ...state, emptySubmitWarned: action.value }
    case 'set_last_history':
      return { ...state, lastHistory: action.value }
    case 'set_last_snapshot':
      return { ...state, lastSnapshot: action.value }
    default:
      return state
  }
}

const TerminalStateContext = createContext<{ state: TerminalState; dispatch: Dispatch<TerminalAction> } | undefined>(
  undefined
)

export function TerminalStateProvider({
  initialState,
  children,
}: {
  initialState: TerminalState
  children: ReactNode
}): JSX.Element {
  const [state, dispatch] = useReducer(terminalReducer, initialState)
  return <TerminalStateContext.Provider value={{ state, dispatch }}>{children}</TerminalStateContext.Provider>
}

export function useTerminalState(): { state: TerminalState; dispatch: Dispatch<TerminalAction> } {
  const ctx = useContext(TerminalStateContext)
  if (!ctx) {
    throw new Error('useTerminalState must be used within TerminalStateProvider')
  }
  return ctx
}
