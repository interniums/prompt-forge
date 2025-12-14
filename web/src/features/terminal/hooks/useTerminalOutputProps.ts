'use client'

import type { ComponentProps, RefObject } from 'react'
import { TerminalMain } from '@/features/terminal/TerminalMain'
import type { ClarifyingQuestion, GenerationMode, TaskActivity, TerminalLine } from '@/lib/types'
import type { PreferenceKey, PromptEditDiff } from '@/features/terminal/terminalState'

type OutputProps = ComponentProps<typeof TerminalMain>['outputProps']

type UseTerminalOutputPropsDeps = {
  lines: TerminalLine[]
  activity: TaskActivity | null
  editablePrompt: string | null
  promptEditDiff: PromptEditDiff | null
  promptForLinks: string | null
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  answeringQuestions: boolean
  currentClarifyingQuestion: ClarifyingQuestion | null
  currentClarifyingQuestionIndex: number | null
  clarifyingTotalCount: number
  clarifyingSelectedOptionIndex: number | null
  clarifyingLastAnswer: string | null
  editablePromptRef: RefObject<HTMLDivElement | null>
  scrollRef: RefObject<HTMLDivElement | null>
  inputRef: RefObject<HTMLTextAreaElement | null>
  onHelpCommandClick: (cmd: string) => void
  onConsentOptionClick: (index: number) => void
  onClarifyingOptionClick: (index: number) => void
  onFocusInputSelectFree: () => void
  onUndoAnswer: () => void
  onClarifyingSkip: () => void
  onCopyEditable: (text?: string) => void
  onUpdateEditablePrompt: (nextPrompt: string, previousPrompt: string) => void
  onStartNewConversation: () => void
  onFocusInput: () => void
  onLike: () => void
  likeState: 'none' | 'liked'
  clarifyingCanSubmit: boolean
  isAskingPreferenceQuestions: boolean
  currentPreferenceQuestionKey: PreferenceKey | null
  preferenceSelectedOptionIndex: number | null
  preferenceLastAnswer: string | null
  onPreferenceFocusInputSelectFree: () => void
  onPreferenceOptionClick: (index: number) => void
  onPreferenceBack: () => void
  onPreferenceYourAnswer: () => void
  onPreferenceSkip: () => void
  getPreferenceOptions: (key: PreferenceKey) => Array<{ id: string; label: string }>
  getPreferenceQuestionText: (key: PreferenceKey) => string
  getPreferenceOrder: () => PreferenceKey[]
  getPreferencesToAsk: () => PreferenceKey[]
  showStarter: boolean
  generationMode: GenerationMode
  onModeChange: (mode: GenerationMode, opts?: { silent?: boolean }) => void
  onFinalBack?: () => void
}

export function useTerminalOutputProps(deps: UseTerminalOutputPropsDeps): OutputProps {
  return {
    lines: deps.lines,
    activity: deps.activity,
    editablePrompt: deps.editablePrompt,
    promptEditDiff: deps.promptEditDiff,
    promptForLinks: deps.promptForLinks ?? undefined,
    awaitingQuestionConsent: deps.awaitingQuestionConsent,
    consentSelectedIndex: deps.consentSelectedIndex,
    answeringQuestions: deps.answeringQuestions,
    currentClarifyingQuestion: deps.currentClarifyingQuestion,
    currentClarifyingQuestionIndex: deps.currentClarifyingQuestionIndex,
    clarifyingTotalCount: deps.clarifyingTotalCount,
    clarifyingSelectedOptionIndex: deps.clarifyingSelectedOptionIndex,
    clarifyingLastAnswer: deps.clarifyingLastAnswer,
    editablePromptRef: deps.editablePromptRef,
    scrollRef: deps.scrollRef,
    inputRef: deps.inputRef,
    onHelpCommandClick: deps.onHelpCommandClick,
    onConsentOptionClick: deps.onConsentOptionClick,
    onClarifyingOptionClick: deps.onClarifyingOptionClick,
    onFocusInputSelectFree: deps.onFocusInputSelectFree,
    onUndoAnswer: deps.onUndoAnswer,
    onClarifyingSkip: deps.onClarifyingSkip,
    onCopyEditable: deps.onCopyEditable,
    onUpdateEditablePrompt: deps.onUpdateEditablePrompt,
    onStartNewConversation: deps.onStartNewConversation,
    onFocusInput: deps.onFocusInput,
    onLike: deps.onLike,
    likeState: deps.likeState,
    clarifyingCanSubmit: deps.clarifyingCanSubmit,
    isAskingPreferenceQuestions: deps.isAskingPreferenceQuestions,
    currentPreferenceQuestionKey: deps.currentPreferenceQuestionKey,
    preferenceSelectedOptionIndex: deps.preferenceSelectedOptionIndex,
    preferenceLastAnswer: deps.preferenceLastAnswer,
    onPreferenceFocusInputSelectFree: deps.onPreferenceFocusInputSelectFree,
    onPreferenceOptionClick: deps.onPreferenceOptionClick,
    onPreferenceBack: deps.onPreferenceBack,
    onPreferenceYourAnswer: deps.onPreferenceYourAnswer,
    onPreferenceSkip: deps.onPreferenceSkip,
    getPreferenceOptions: deps.getPreferenceOptions,
    getPreferenceQuestionText: deps.getPreferenceQuestionText,
    getPreferenceOrder: deps.getPreferenceOrder,
    getPreferencesToAsk: deps.getPreferencesToAsk,
    showStarter: deps.showStarter,
    generationMode: deps.generationMode,
    onModeChange: deps.onModeChange,
    onFinalBack: deps.onFinalBack,
  }
}
