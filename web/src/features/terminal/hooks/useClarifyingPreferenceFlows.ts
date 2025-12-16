'use client'

import { useRef } from 'react'
import { useClarifyingFlow, type ClarifyingFlowHandlers } from '@/hooks/useClarifyingFlow'
import { usePreferenceQuestions } from '@/hooks/usePreferenceQuestions'
import type { ClarifyingAnswer, ClarifyingQuestion, Preferences, PreferencesStep, TaskActivity } from '@/lib/types'
import type { PreferenceKey } from '@/features/terminal/terminalState'

type UseClarifyingPreferenceFlowsDeps = {
  // Shared
  pendingTask: string | null
  preferences: Preferences
  focusInputToEnd: () => void
  blurInput: () => void
  setValue: (next: string) => void
  setActivity: (activity: TaskActivity | null) => void
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  guardedGenerateFinalPromptForTask: (
    task: string,
    answers: ClarifyingAnswer[],
    options?: { skipConsentCheck?: boolean; allowUnclear?: boolean }
  ) => Promise<void>
  onBackToClarifying: () => void
  allowUnclearFlag: boolean
  handleClarifyingUnclear: (info: { reason: string; stage: 'clarifying'; task: string }) => void
  handleSubscriptionRequired: () => void

  // Clarifying state
  clarifyingQuestions: ClarifyingQuestion[] | null
  clarifyingAnswers: ClarifyingAnswer[]
  currentQuestionIndex: number
  consentSelectedIndex: number | null
  answeringQuestions: boolean
  generationMode: 'guided' | 'quick'
  setIsGenerating: (v: boolean) => void
  setClarifyingQuestions: (q: ClarifyingQuestion[] | null) => void
  setClarifyingAnswers: (answers: ClarifyingAnswer[], idx: number) => void
  setCurrentQuestionIndex: (idx: number) => void
  setAnsweringQuestions: (v: boolean) => void
  setAwaitingQuestionConsent: (v: boolean) => void
  setConsentSelectedIndex: (v: number | null) => void
  setClarifyingSelectedOptionIndex: (v: number | null) => void
  setLastRemovedClarifyingAnswer: (v: { questionId: string | null; answer: string | null }) => void
  setHasRunInitialTask: (v: boolean) => void
  showToast: (msg: string) => void
  getPreferencesToAsk: () => PreferenceKey[]
  startPreferenceQuestions: () => void

  // Preference state
  currentPreferenceQuestionKey: PreferenceKey | null
  isAskingPreferenceQuestions: boolean
  preferenceSelectedOptionIndex: number | null
  pendingPreferenceUpdates: Partial<Preferences>
  preferencesStep: PreferencesStep
  setIsAskingPreferenceQuestions: (v: boolean) => void
  setCurrentPreferenceQuestionKey: (v: PreferenceKey | null) => void
  setPreferenceSelectedOptionIndex: (v: number | null) => void
  setPendingPreferenceUpdates: (v: Partial<Preferences>) => void
}

export function useClarifyingPreferenceFlows(deps: UseClarifyingPreferenceFlowsDeps): {
  clarifyingRunIdRef: React.MutableRefObject<number>
  preference: ReturnType<typeof usePreferenceQuestions>
  clarifying: ClarifyingFlowHandlers
} {
  const clarifyingRunIdRef = useRef(0)

  const preference = usePreferenceQuestions({
    preferences: deps.preferences,
    pendingTask: deps.pendingTask,
    currentPreferenceQuestionKey: deps.currentPreferenceQuestionKey,
    isAskingPreferenceQuestions: deps.isAskingPreferenceQuestions,
    preferenceSelectedOptionIndex: deps.preferenceSelectedOptionIndex,
    pendingPreferenceUpdates: deps.pendingPreferenceUpdates,
    preferenceQuestionsEnabled: deps.preferences.uiDefaults?.askPreferencesInGuided !== false,
    setIsAskingPreferenceQuestions: deps.setIsAskingPreferenceQuestions,
    setCurrentPreferenceQuestionKey: deps.setCurrentPreferenceQuestionKey,
    setPreferenceSelectedOptionIndex: deps.setPreferenceSelectedOptionIndex,
    setPendingPreferenceUpdates: deps.setPendingPreferenceUpdates,
    setActivity: deps.setActivity,
    focusInputToEnd: deps.focusInputToEnd,
    blurInput: deps.blurInput,
    setValue: deps.setValue,
    clarifyingAnswersRef: deps.clarifyingAnswersRef,
    generateFinalPromptForTask: deps.guardedGenerateFinalPromptForTask,
    onBackToClarifying: deps.onBackToClarifying,
  })

  const clarifying = useClarifyingFlow({
    pendingTask: deps.pendingTask,
    preferences: deps.preferences,
    clarifyingQuestions: deps.clarifyingQuestions,
    currentQuestionIndex: deps.currentQuestionIndex,
    generationRunIdRef: clarifyingRunIdRef,
    clarifyingAnswersRef: deps.clarifyingAnswersRef,
    setIsGenerating: deps.setIsGenerating,
    setClarifyingQuestions: deps.setClarifyingQuestions,
    setClarifyingAnswers: deps.setClarifyingAnswers,
    setCurrentQuestionIndex: deps.setCurrentQuestionIndex,
    setAnsweringQuestions: deps.setAnsweringQuestions,
    setAwaitingQuestionConsent: deps.setAwaitingQuestionConsent,
    setConsentSelectedIndex: deps.setConsentSelectedIndex,
    setClarifyingSelectedOptionIndex: deps.setClarifyingSelectedOptionIndex,
    setLastRemovedClarifyingAnswer: deps.setLastRemovedClarifyingAnswer,
    setValue: deps.setValue,
    setActivity: deps.setActivity,
    showToast: deps.showToast,
    focusInputToEnd: deps.focusInputToEnd,
    blurInput: deps.blurInput,
    getPreferencesToAsk: preference.getPreferencesToAsk,
    startPreferenceQuestions: preference.startPreferenceQuestions,
    generateFinalPromptForTask: (task, answers, options) =>
      deps.guardedGenerateFinalPromptForTask(task, answers, {
        ...options,
        allowUnclear: options?.allowUnclear ?? deps.allowUnclearFlag,
      }),
    onUnclearTask: deps.handleClarifyingUnclear,
    onSubscriptionRequired: deps.handleSubscriptionRequired,
  })

  return {
    clarifyingRunIdRef,
    preference,
    clarifying,
  }
}
