'use client'

import { useMemo } from 'react'
import type { PreferenceKey } from '@/features/terminal/terminalState'
import type { ClarifyingQuestion } from '@/lib/types'
import type { ConsentNav, ClarifyingNav, PreferenceNav } from '@/hooks/useTerminalHotkeys'

type UseTerminalNavDeps = {
  value: string
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  setConsentSelectedIndex: (value: number | null) => void
  handleQuestionConsent: (answer: string) => void

  answeringQuestions: boolean
  clarifyingQuestions: ClarifyingQuestion[] | null
  currentQuestionIndex: number
  clarifyingSelectedOptionIndex: number | null
  setClarifyingSelectedOptionIndex: (value: number | null) => void
  handleClarifyingNext: (index?: number | null) => void
  handleUndoAnswer: () => void
  handleClarifyingSkip: () => void
  focusInputToEnd: () => void

  isAskingPreferenceQuestions: boolean
  currentPreferenceQuestionKey: PreferenceKey | null
  preferenceSelectedOptionIndex: number | null
  setPreferenceSelectedOptionIndex: (value: number | null) => void
  handlePreferenceNext: (index?: number | null) => void
  handlePreferenceBackNav: () => void
  handlePreferenceOptionClick: (index: number) => void
  getPreferenceOptions: ((key: PreferenceKey) => Array<{ id: string; label: string }>) | null
}

export function useTerminalNav({
  value,
  awaitingQuestionConsent,
  consentSelectedIndex,
  setConsentSelectedIndex,
  handleQuestionConsent,
  answeringQuestions,
  clarifyingQuestions,
  currentQuestionIndex,
  clarifyingSelectedOptionIndex,
  setClarifyingSelectedOptionIndex,
  handleClarifyingNext,
  handleUndoAnswer,
  handleClarifyingSkip,
  focusInputToEnd,
  isAskingPreferenceQuestions,
  currentPreferenceQuestionKey,
  preferenceSelectedOptionIndex,
  setPreferenceSelectedOptionIndex,
  handlePreferenceNext,
  handlePreferenceBackNav,
  handlePreferenceOptionClick,
  getPreferenceOptions,
}: UseTerminalNavDeps): { consentNav: ConsentNav; clarifyingNav: ClarifyingNav; preferenceNav: PreferenceNav } {
  const consentNav: ConsentNav = useMemo(
    () => ({
      active: awaitingQuestionConsent,
      value,
      selected: consentSelectedIndex,
      setSelected: setConsentSelectedIndex,
      onAnswer: (answer: string) => handleQuestionConsent(answer),
    }),
    [awaitingQuestionConsent, consentSelectedIndex, handleQuestionConsent, setConsentSelectedIndex, value]
  )

  const clarifyingNav: ClarifyingNav = useMemo(
    () => ({
      active: answeringQuestions,
      questions: clarifyingQuestions,
      currentIndex: currentQuestionIndex,
      selectedIndex: clarifyingSelectedOptionIndex,
      setSelectedIndex: setClarifyingSelectedOptionIndex,
      onSelectOption: (index: number) => handleClarifyingNext(index),
      onUndo: handleUndoAnswer,
      onSkip: handleClarifyingSkip,
      onFreeAnswer: focusInputToEnd,
    }),
    [
      answeringQuestions,
      clarifyingQuestions,
      clarifyingSelectedOptionIndex,
      currentQuestionIndex,
      focusInputToEnd,
      handleClarifyingNext,
      handleClarifyingSkip,
      handleUndoAnswer,
      setClarifyingSelectedOptionIndex,
    ]
  )

  const preferenceNav: PreferenceNav = useMemo(() => {
    const preferenceOptions =
      currentPreferenceQuestionKey && getPreferenceOptions ? getPreferenceOptions(currentPreferenceQuestionKey) : []
    return {
      active: isAskingPreferenceQuestions,
      options: preferenceOptions,
      selectedIndex: preferenceSelectedOptionIndex,
      setSelectedIndex: setPreferenceSelectedOptionIndex,
      onSelectOption: (index: number) => handlePreferenceNext(index),
      onBack: handlePreferenceBackNav,
      onSkip: () => handlePreferenceOptionClick(-3),
      onFreeAnswer: focusInputToEnd,
    }
  }, [
    currentPreferenceQuestionKey,
    focusInputToEnd,
    getPreferenceOptions,
    handlePreferenceBackNav,
    handlePreferenceNext,
    handlePreferenceOptionClick,
    isAskingPreferenceQuestions,
    preferenceSelectedOptionIndex,
    setPreferenceSelectedOptionIndex,
  ])

  return { consentNav, clarifyingNav, preferenceNav }
}
