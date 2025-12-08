'use client'

import type { TerminalOutputAreaProps } from '@/components/terminal/TerminalOutputArea'
import type { ClarifyingQuestion, Preferences, TerminalLine } from '@/lib/types'

type OutputViewModelArgs = {
  lines: TerminalLine[]
  editablePrompt: string | null
  lastApprovedPrompt: string | null
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  answeringQuestions: boolean
  clarifyingAnswersCount: number
  clarifyingQuestions: ClarifyingQuestion[] | null
  currentQuestionIndex: number
  clarifyingSelectedOptionIndex: number | null
  onHelpCommandClick: (cmd: string) => void
  onConsentOptionClick: (index: number) => void
  onClarifyingOptionClick: (index: number) => void
  onUndoAnswer: () => void
  onRevise: () => void
  onEditableChange: (text: string) => void
  onCopyEditable: () => void
  onStartNewConversation: () => void
  onLike?: () => void
  onDislike?: () => void
  likeState?: 'none' | 'liked' | 'disliked'
  isAskingPreferenceQuestions?: boolean
  currentPreferenceQuestionKey?: keyof Preferences | null
  preferenceSelectedOptionIndex?: number | null
  onPreferenceOptionClick?: (index: number) => void
  getPreferenceOptions?: (key: keyof Preferences) => Array<{ id: string; label: string }>
  getPreferenceQuestionText?: (key: keyof Preferences) => string
  getPreferencesToAsk?: () => Array<keyof Preferences>
  showStarter?: boolean
  starterExamples?: string[]
  starterTitle?: string
  starterSubtitle?: string
  onExampleInsert?: (text: string) => void
}

type InputViewModelArgs = {
  value: string
  onChange: (value: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement> | KeyboardEvent) => void
  placeholder: string
  disabled: boolean
}

type OutputViewModel = Omit<TerminalOutputAreaProps, 'editablePromptRef' | 'scrollRef' | 'inputRef'>

export function buildOutputProps({
  lines,
  editablePrompt,
  lastApprovedPrompt,
  awaitingQuestionConsent,
  consentSelectedIndex,
  answeringQuestions,
  clarifyingAnswersCount,
  clarifyingQuestions,
  currentQuestionIndex,
  clarifyingSelectedOptionIndex,
  onHelpCommandClick,
  onConsentOptionClick,
  onClarifyingOptionClick,
  onUndoAnswer,
  onRevise,
  onEditableChange,
  onCopyEditable,
  onStartNewConversation,
  onLike,
  onDislike,
  likeState,
  isAskingPreferenceQuestions,
  currentPreferenceQuestionKey,
  preferenceSelectedOptionIndex,
  onPreferenceOptionClick,
  getPreferenceOptions,
  getPreferenceQuestionText,
  getPreferencesToAsk,
  showStarter,
  starterExamples,
  starterTitle,
  starterSubtitle,
  onExampleInsert,
}: OutputViewModelArgs): OutputViewModel {
  const currentClarifyingQuestion =
    answeringQuestions &&
    clarifyingQuestions &&
    clarifyingQuestions.length > 0 &&
    currentQuestionIndex < clarifyingQuestions.length
      ? clarifyingQuestions[currentQuestionIndex]
      : null

  return {
    lines,
    editablePrompt,
    promptForLinks: editablePrompt ?? lastApprovedPrompt,
    awaitingQuestionConsent,
    consentSelectedIndex,
    answeringQuestions,
    clarifyingAnswersCount,
    currentClarifyingQuestion,
    clarifyingSelectedOptionIndex,
    onHelpCommandClick,
    onConsentOptionClick,
    onClarifyingOptionClick,
    onUndoAnswer,
    onRevise,
    onEditableChange,
    onCopyEditable,
    onStartNewConversation,
    onLike,
    onDislike,
    likeState,
    isAskingPreferenceQuestions,
    currentPreferenceQuestionKey,
    preferenceSelectedOptionIndex,
    onPreferenceOptionClick,
    getPreferenceOptions,
    getPreferenceQuestionText,
    getPreferencesToAsk,
    showStarter,
    starterExamples,
    starterTitle,
    starterSubtitle,
    onExampleInsert,
  }
}

type InputViewModel = Omit<
  {
    value: string
    onChange: (value: string) => void
    onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement> | KeyboardEvent) => void
    placeholder: string
    inputRef: React.RefObject<HTMLTextAreaElement | null>
    disabled: boolean
  },
  'inputRef'
>

export function buildInputProps({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
}: InputViewModelArgs): InputViewModel {
  return {
    value,
    onChange,
    onKeyDown,
    placeholder,
    disabled,
  }
}
