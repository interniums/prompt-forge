import type { TerminalLine, ClarifyingQuestion, ClarifyingAnswer, Preferences } from '@/lib/types'
import type { TerminalAction, LikeState, PreferenceKey, SessionSnapshot } from './terminalState'
import type { HistoryItem } from '@/lib/types'

export const setInput = (value: string): TerminalAction => ({ type: 'set_input', value })
export const appendLines = (lines: TerminalLine[]): TerminalAction => ({ type: 'append_lines', lines })
export const replaceLines = (lines: TerminalLine[]): TerminalAction => ({ type: 'replace_lines', lines })
export const setGenerating = (value: boolean): TerminalAction => ({ type: 'set_generating', value })
export const setPendingTask = (value: string | null): TerminalAction => ({ type: 'set_pending_task', value })
export const setEditablePrompt = (value: string | null): TerminalAction => ({ type: 'set_editable_prompt', value })
export const setQuestionConsent = (awaiting: boolean, selectedIndex: number | null): TerminalAction => ({
  type: 'set_question_consent',
  awaiting,
  selectedIndex,
})
export const setConsentSelectedIndex = (value: number | null): TerminalAction => ({
  type: 'set_consent_selected_index',
  value,
})
export const setClarifyingQuestions = (questions: ClarifyingQuestion[] | null): TerminalAction => ({
  type: 'set_clarifying_questions',
  questions,
})
export const setClarifyingAnswers = (answers: ClarifyingAnswer[], currentIndex: number): TerminalAction => ({
  type: 'set_clarifying_answers',
  answers,
  currentIndex,
})
export const setCurrentQuestionIndex = (value: number): TerminalAction => ({
  type: 'set_current_question_index',
  value,
})
export const setAnsweringQuestions = (value: boolean): TerminalAction => ({ type: 'set_answering_questions', value })
export const setClarifyingSelectedOption = (value: number | null): TerminalAction => ({
  type: 'set_clarifying_selected_option',
  value,
})
export const setPromptEditable = (value: boolean): TerminalAction => ({ type: 'set_prompt_editable', value })
export const setPromptFinalized = (value: boolean): TerminalAction => ({ type: 'set_prompt_finalized', value })
export const setLikeState = (value: LikeState): TerminalAction => ({ type: 'set_like_state', value })
export const setHasRunInitialTask = (value: boolean): TerminalAction => ({ type: 'set_has_run_initial_task', value })
export const setHeaderHelpShown = (value: boolean): TerminalAction => ({ type: 'set_header_help_shown', value })
export const setLastApprovedPrompt = (value: string | null): TerminalAction => ({
  type: 'set_last_approved_prompt',
  value,
})
export const setIsAskingPreferences = (value: boolean): TerminalAction => ({
  type: 'set_is_asking_preferences',
  value,
})
export const setCurrentPreferenceQuestion = (value: PreferenceKey | null): TerminalAction => ({
  type: 'set_current_preference_question',
  value,
})
export const setPreferenceSelectedOptionIndex = (value: number | null): TerminalAction => ({
  type: 'set_preference_selected_option_index',
  value,
})
export const setPendingPreferenceUpdates = (value: Partial<Preferences>): TerminalAction => ({
  type: 'set_pending_preference_updates',
  value,
})
export const setPreferencesOpen = (value: boolean): TerminalAction => ({ type: 'set_preferences_open', value })
export const setUserManagementOpen = (value: boolean): TerminalAction => ({ type: 'set_user_management_open', value })
export const setLoginRequiredOpen = (value: boolean): TerminalAction => ({ type: 'set_login_required_open', value })
export const setDraftRestoredShown = (value: boolean): TerminalAction => ({ type: 'set_draft_restored_shown', value })
export const setEmptySubmitWarned = (value: boolean): TerminalAction => ({ type: 'set_empty_submit_warned', value })
export const setLastHistory = (value: HistoryItem[] | null): TerminalAction => ({ type: 'set_last_history', value })
export const setLastSnapshot = (value: SessionSnapshot | null): TerminalAction => ({ type: 'set_last_snapshot', value })
