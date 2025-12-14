'use client'

import type React from 'react'
import { useCallback, useMemo } from 'react'
import type { ClarifyingAnswer, ClarifyingQuestion, Preferences, TaskActivity } from '@/lib/types'
import type { PreferenceKey } from '@/features/terminal/terminalState'
import { createBeginQuestionFlow } from './clarifyingFlow/beginQuestionFlow'
import {
  createHandleClarifyingAnswer,
  createHandleClarifyingOptionClick,
  createHandleClarifyingSkip,
  createHandleUndoAnswer,
} from './clarifyingFlow/answerNavigation'
import { createHandleQuestionConsent } from './clarifyingFlow/questionConsent'
import { createSelectForQuestion } from './clarifyingFlow/selectForQuestion'
import { createStartClarifyingQuestions } from './clarifyingFlow/startClarifyingQuestions'

export type ClarifyingFlowDeps = {
  pendingTask: string | null
  preferences: Preferences
  clarifyingQuestions: ClarifyingQuestion[] | null
  currentQuestionIndex: number
  generationRunIdRef: React.MutableRefObject<number>
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  setIsGenerating: (value: boolean) => void
  setClarifyingQuestions: (value: ClarifyingQuestion[] | null) => void
  setClarifyingAnswers: (value: ClarifyingAnswer[], currentIndex: number) => void
  setCurrentQuestionIndex: (value: number) => void
  setAnsweringQuestions: (value: boolean) => void
  setAwaitingQuestionConsent: (value: boolean) => void
  setConsentSelectedIndex: (value: number | null) => void
  setClarifyingSelectedOptionIndex: (value: number | null) => void
  setLastRemovedClarifyingAnswer: (value: { questionId: string | null; answer: string | null }) => void
  setValue: (value: string) => void
  setActivity: (activity: TaskActivity | null) => void
  showToast: (msg: string) => void
  focusInputToEnd: () => void
  blurInput: () => void
  getPreferencesToAsk: () => PreferenceKey[]
  startPreferenceQuestions: () => Promise<void> | void
  generateFinalPromptForTask: (
    task: string,
    answers: ClarifyingAnswer[],
    options?: { skipConsentCheck?: boolean; allowUnclear?: boolean }
  ) => Promise<void>
  onUnclearTask?: (info: { reason: string; stage: 'clarifying'; task: string }) => void
}

export type ClarifyingFlowHandlers = {
  startClarifyingQuestions: (task: string, options?: { allowUnclear?: boolean }) => Promise<void>
  handleQuestionConsent: (answer: string) => Promise<void>
  handleClarifyingOptionClick: (idx: number) => void
  handleClarifyingAnswer: (answer: string) => Promise<void>
  handleClarifyingSkip: () => void
  handleUndoAnswer: () => void
  appendClarifyingQuestion: (question: ClarifyingQuestion, index: number, total: number) => void
  selectForQuestion: (question: ClarifyingQuestion | null, hasBack: boolean) => void
}

export function useClarifyingFlow(deps: ClarifyingFlowDeps): ClarifyingFlowHandlers {
  const appendClarifyingQuestion = useCallback((_question?: ClarifyingQuestion, _index?: number, _total?: number) => {
    void _question
    void _index
    void _total
  }, [])

  const selectForQuestion = useMemo(
    () => createSelectForQuestion(deps.setClarifyingSelectedOptionIndex),
    [deps.setClarifyingSelectedOptionIndex]
  )

  const beginQuestionFlow = useMemo(
    () =>
      createBeginQuestionFlow({
        pendingTask: deps.pendingTask,
        clarifyingAnswersRef: deps.clarifyingAnswersRef,
        setClarifyingQuestions: deps.setClarifyingQuestions,
        setClarifyingAnswers: deps.setClarifyingAnswers,
        setAwaitingQuestionConsent: deps.setAwaitingQuestionConsent,
        setConsentSelectedIndex: deps.setConsentSelectedIndex,
        setAnsweringQuestions: deps.setAnsweringQuestions,
        setActivity: deps.setActivity,
        selectForQuestion,
        appendClarifyingQuestion,
      }),
    [
      appendClarifyingQuestion,
      deps.clarifyingAnswersRef,
      deps.pendingTask,
      deps.setActivity,
      deps.setAnsweringQuestions,
      deps.setAwaitingQuestionConsent,
      deps.setClarifyingAnswers,
      deps.setClarifyingQuestions,
      deps.setConsentSelectedIndex,
      selectForQuestion,
    ]
  )

  const startClarifyingQuestions = useMemo(
    () =>
      createStartClarifyingQuestions({
        preferences: deps.preferences,
        generationRunIdRef: deps.generationRunIdRef,
        setIsGenerating: deps.setIsGenerating,
        setActivity: deps.setActivity,
        setAwaitingQuestionConsent: deps.setAwaitingQuestionConsent,
        setAnsweringQuestions: deps.setAnsweringQuestions,
        beginQuestionFlow,
        showToast: deps.showToast,
        onUnclearTask: deps.onUnclearTask,
      }),
    [
      beginQuestionFlow,
      deps.generationRunIdRef,
      deps.onUnclearTask,
      deps.preferences,
      deps.setActivity,
      deps.setAnsweringQuestions,
      deps.setAwaitingQuestionConsent,
      deps.setIsGenerating,
      deps.showToast,
    ]
  )

  const handleClarifyingAnswer = useMemo<(answer: string) => Promise<void>>(
    () =>
      createHandleClarifyingAnswer({
        clarifyingQuestions: deps.clarifyingQuestions,
        pendingTask: deps.pendingTask,
        clarifyingAnswersRef: deps.clarifyingAnswersRef,
        currentQuestionIndex: deps.currentQuestionIndex,
        setAnsweringQuestions: deps.setAnsweringQuestions,
        setClarifyingAnswers: deps.setClarifyingAnswers,
        setCurrentQuestionIndex: deps.setCurrentQuestionIndex,
        setClarifyingSelectedOptionIndex: deps.setClarifyingSelectedOptionIndex,
        setActivity: deps.setActivity,
        setValue: deps.setValue,
        selectForQuestion,
        appendClarifyingQuestion,
        blurInput: deps.blurInput,
        focusInputToEnd: deps.focusInputToEnd,
        getPreferencesToAsk: deps.getPreferencesToAsk,
        startPreferenceQuestions: deps.startPreferenceQuestions,
        generateFinalPromptForTask: deps.generateFinalPromptForTask,
      }),
    [
      appendClarifyingQuestion,
      deps.blurInput,
      deps.clarifyingAnswersRef,
      deps.clarifyingQuestions,
      deps.currentQuestionIndex,
      deps.focusInputToEnd,
      deps.generateFinalPromptForTask,
      deps.getPreferencesToAsk,
      deps.pendingTask,
      deps.setActivity,
      deps.setAnsweringQuestions,
      deps.setClarifyingAnswers,
      deps.setClarifyingSelectedOptionIndex,
      deps.setCurrentQuestionIndex,
      deps.setValue,
      deps.startPreferenceQuestions,
      selectForQuestion,
    ]
  )

  const handleClarifyingSkip = useMemo(
    () =>
      createHandleClarifyingSkip({
        clarifyingQuestions: deps.clarifyingQuestions,
        pendingTask: deps.pendingTask,
        clarifyingAnswersRef: deps.clarifyingAnswersRef,
        currentQuestionIndex: deps.currentQuestionIndex,
        setAnsweringQuestions: deps.setAnsweringQuestions,
        setClarifyingAnswers: deps.setClarifyingAnswers,
        setCurrentQuestionIndex: deps.setCurrentQuestionIndex,
        setClarifyingSelectedOptionIndex: deps.setClarifyingSelectedOptionIndex,
        setActivity: deps.setActivity,
        setValue: deps.setValue,
        selectForQuestion,
        appendClarifyingQuestion,
        blurInput: deps.blurInput,
        focusInputToEnd: deps.focusInputToEnd,
        getPreferencesToAsk: deps.getPreferencesToAsk,
        startPreferenceQuestions: deps.startPreferenceQuestions,
        generateFinalPromptForTask: deps.generateFinalPromptForTask,
      }),
    [
      appendClarifyingQuestion,
      deps.blurInput,
      deps.clarifyingAnswersRef,
      deps.clarifyingQuestions,
      deps.currentQuestionIndex,
      deps.focusInputToEnd,
      deps.generateFinalPromptForTask,
      deps.getPreferencesToAsk,
      deps.pendingTask,
      deps.setActivity,
      deps.setAnsweringQuestions,
      deps.setClarifyingAnswers,
      deps.setClarifyingSelectedOptionIndex,
      deps.setCurrentQuestionIndex,
      deps.setValue,
      deps.startPreferenceQuestions,
      selectForQuestion,
    ]
  )

  const handleClarifyingOptionClick = useMemo(
    () =>
      createHandleClarifyingOptionClick(
        {
          clarifyingQuestions: deps.clarifyingQuestions,
          pendingTask: deps.pendingTask,
          clarifyingAnswersRef: deps.clarifyingAnswersRef,
          currentQuestionIndex: deps.currentQuestionIndex,
          setAnsweringQuestions: deps.setAnsweringQuestions,
          setClarifyingAnswers: deps.setClarifyingAnswers,
          setCurrentQuestionIndex: deps.setCurrentQuestionIndex,
          setClarifyingSelectedOptionIndex: deps.setClarifyingSelectedOptionIndex,
          setActivity: deps.setActivity,
          setValue: deps.setValue,
          selectForQuestion,
          appendClarifyingQuestion,
          blurInput: deps.blurInput,
          focusInputToEnd: deps.focusInputToEnd,
          getPreferencesToAsk: deps.getPreferencesToAsk,
          startPreferenceQuestions: deps.startPreferenceQuestions,
          generateFinalPromptForTask: deps.generateFinalPromptForTask,
        },
        handleClarifyingAnswer
      ),
    [
      appendClarifyingQuestion,
      deps.blurInput,
      deps.clarifyingAnswersRef,
      deps.clarifyingQuestions,
      deps.currentQuestionIndex,
      deps.focusInputToEnd,
      deps.generateFinalPromptForTask,
      deps.getPreferencesToAsk,
      deps.pendingTask,
      deps.setActivity,
      deps.setAnsweringQuestions,
      deps.setClarifyingAnswers,
      deps.setClarifyingSelectedOptionIndex,
      deps.setCurrentQuestionIndex,
      deps.setValue,
      deps.startPreferenceQuestions,
      handleClarifyingAnswer,
      selectForQuestion,
    ]
  )

  const handleQuestionConsent = useMemo(
    () =>
      createHandleQuestionConsent({
        pendingTask: deps.pendingTask,
        clarifyingQuestions: deps.clarifyingQuestions,
        clarifyingAnswersRef: deps.clarifyingAnswersRef,
        setAwaitingQuestionConsent: deps.setAwaitingQuestionConsent,
        setConsentSelectedIndex: deps.setConsentSelectedIndex,
        setAnsweringQuestions: deps.setAnsweringQuestions,
        setCurrentQuestionIndex: deps.setCurrentQuestionIndex,
        selectForQuestion,
        appendClarifyingQuestion,
        startClarifyingQuestions,
        generateFinalPromptForTask: deps.generateFinalPromptForTask,
        setActivity: deps.setActivity,
        focusInputToEnd: deps.focusInputToEnd,
      }),
    [
      appendClarifyingQuestion,
      deps.clarifyingAnswersRef,
      deps.clarifyingQuestions,
      deps.focusInputToEnd,
      deps.generateFinalPromptForTask,
      deps.pendingTask,
      deps.setActivity,
      deps.setAnsweringQuestions,
      deps.setAwaitingQuestionConsent,
      deps.setConsentSelectedIndex,
      deps.setCurrentQuestionIndex,
      selectForQuestion,
      startClarifyingQuestions,
    ]
  )

  const handleUndoAnswer = useMemo(
    () =>
      createHandleUndoAnswer({
        clarifyingQuestions: deps.clarifyingQuestions,
        pendingTask: deps.pendingTask,
        clarifyingAnswersRef: deps.clarifyingAnswersRef,
        currentQuestionIndex: deps.currentQuestionIndex,
        setAnsweringQuestions: deps.setAnsweringQuestions,
        setClarifyingAnswers: deps.setClarifyingAnswers,
        setCurrentQuestionIndex: deps.setCurrentQuestionIndex,
        setClarifyingSelectedOptionIndex: deps.setClarifyingSelectedOptionIndex,
        setActivity: deps.setActivity,
        setValue: deps.setValue,
        selectForQuestion,
        appendClarifyingQuestion,
        blurInput: deps.blurInput,
        focusInputToEnd: deps.focusInputToEnd,
        getPreferencesToAsk: deps.getPreferencesToAsk,
        startPreferenceQuestions: deps.startPreferenceQuestions,
        generateFinalPromptForTask: deps.generateFinalPromptForTask,
        setAwaitingQuestionConsent: deps.setAwaitingQuestionConsent,
        setLastRemovedClarifyingAnswer: deps.setLastRemovedClarifyingAnswer,
      }),
    [
      appendClarifyingQuestion,
      deps.blurInput,
      deps.clarifyingAnswersRef,
      deps.clarifyingQuestions,
      deps.currentQuestionIndex,
      deps.focusInputToEnd,
      deps.generateFinalPromptForTask,
      deps.getPreferencesToAsk,
      deps.pendingTask,
      deps.setActivity,
      deps.setAnsweringQuestions,
      deps.setAwaitingQuestionConsent,
      deps.setClarifyingAnswers,
      deps.setClarifyingSelectedOptionIndex,
      deps.setCurrentQuestionIndex,
      deps.setLastRemovedClarifyingAnswer,
      deps.setValue,
      deps.startPreferenceQuestions,
      selectForQuestion,
    ]
  )

  return {
    startClarifyingQuestions,
    handleQuestionConsent,
    handleClarifyingOptionClick,
    handleClarifyingAnswer,
    handleClarifyingSkip,
    handleUndoAnswer,
    selectForQuestion,
    appendClarifyingQuestion,
  }
}
