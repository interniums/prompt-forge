'use client'

import { useCallback } from 'react'
import type { ClarifyingAnswer, Preferences, TaskActivity } from '@/lib/types'
import type { PreferenceKey } from '@/features/terminal/terminalState'

const debugFlow = process.env.NEXT_PUBLIC_DEBUG_FLOW === 'true'
const logFlow = (...args: unknown[]) => {
  if (!debugFlow) return

  console.info('[pf:flow]', ...args)
}

type PreferenceQuestionDeps = {
  preferences: Preferences
  pendingTask: string | null
  currentPreferenceQuestionKey: PreferenceKey | null
  isAskingPreferenceQuestions: boolean
  preferenceSelectedOptionIndex: number | null
  pendingPreferenceUpdates: Partial<Preferences>
  preferenceQuestionsEnabled: boolean
  setIsAskingPreferenceQuestions: (value: boolean) => void
  setCurrentPreferenceQuestionKey: (value: PreferenceKey | null) => void
  setPreferenceSelectedOptionIndex: (value: number | null) => void
  setPendingPreferenceUpdates: (value: Partial<Preferences>) => void
  setActivity: (activity: TaskActivity | null) => void
  focusInputToEnd: () => void
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  generateFinalPromptForTask: (
    task: string,
    answers: ClarifyingAnswer[],
    options?: { skipConsentCheck?: boolean; preferencesOverride?: Preferences }
  ) => Promise<void>
}

type KeyEventInfo = {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  value: string
}

export function usePreferenceQuestions({
  preferences,
  pendingTask,
  currentPreferenceQuestionKey,
  isAskingPreferenceQuestions,
  preferenceSelectedOptionIndex,
  pendingPreferenceUpdates,
  preferenceQuestionsEnabled,
  setIsAskingPreferenceQuestions,
  setCurrentPreferenceQuestionKey,
  setPreferenceSelectedOptionIndex,
  setPendingPreferenceUpdates,
  setActivity,
  focusInputToEnd,
  clarifyingAnswersRef,
  generateFinalPromptForTask,
}: PreferenceQuestionDeps) {
  const getPreferenceOptions = useCallback((key: keyof Preferences): Array<{ id: string; label: string }> => {
    switch (key) {
      case 'tone':
        return ['casual', 'neutral', 'formal'].map((opt, idx) => ({
          id: String.fromCharCode('a'.charCodeAt(0) + idx),
          label: opt,
        }))
      case 'audience':
        return ['general', 'technical', 'executive'].map((opt, idx) => ({
          id: String.fromCharCode('a'.charCodeAt(0) + idx),
          label: opt,
        }))
      case 'domain':
        return ['product', 'marketing', 'engineering'].map((opt, idx) => ({
          id: String.fromCharCode('a'.charCodeAt(0) + idx),
          label: opt,
        }))
      case 'depth':
        return [
          { id: 'a', label: 'Brief summary' },
          { id: 'b', label: 'Standard depth' },
          { id: 'c', label: 'Deep dive' },
        ]
      case 'outputFormat':
        return [
          { id: 'a', label: 'Plain text' },
          { id: 'b', label: 'Bulleted list' },
          { id: 'c', label: 'Step-by-step' },
          { id: 'd', label: 'Table' },
          { id: 'e', label: 'Outline' },
        ]
      case 'citationPreference':
        return [
          { id: 'a', label: 'No citations' },
          { id: 'b', label: 'Light references' },
          { id: 'c', label: 'Strict citations' },
        ]
      case 'language':
        return ['English', 'Spanish', 'French', 'German'].map((opt, idx) => ({
          id: String.fromCharCode('a'.charCodeAt(0) + idx),
          label: opt,
        }))
      case 'defaultModel':
        return [
          'gpt-4o',
          'gpt-4.1',
          'o3',
          'o4-mini',
          'claude-3.5-sonnet',
          'claude-3-opus',
          'claude-3-haiku',
          'gemini-2.5-pro',
          'gemini-2.5-flash',
        ].map((opt, idx) => ({ id: String.fromCharCode('a'.charCodeAt(0) + idx), label: opt }))
      case 'temperature':
        return [
          { id: 'a', label: '0.3 (focused)' },
          { id: 'b', label: '0.7 (balanced)' },
          { id: 'c', label: '0.9 (creative)' },
        ]
      default:
        return []
    }
  }, [])

  const getPreferenceQuestionText = useCallback((key: keyof Preferences): string => {
    switch (key) {
      case 'tone':
        return 'What tone would you like for this prompt? (e.g., professional, casual, technical)'
      case 'audience':
        return 'Who is the target audience? (e.g., developers, managers, general audience)'
      case 'domain':
        return 'What domain is this for? (e.g., marketing, engineering, product)'
      case 'defaultModel':
        return 'Which AI model are you targeting? (e.g., gpt-4, claude, gemini)'
      case 'temperature':
        return 'What temperature/creativity level? (0.0-1.0, e.g., 0.7 for balanced, 0.9 for creative)'
      case 'outputFormat':
        return 'What output format do you prefer? (e.g., markdown, plain text, code)'
      case 'language':
        return 'What language should the output be in? (e.g., English, Spanish, French)'
      case 'depth':
        return 'How detailed should the output be? (e.g., concise, detailed, comprehensive)'
      case 'citationPreference':
        return 'How should citations be handled? (e.g., include sources, no citations, inline references)'
      case 'styleGuidelines':
        return 'Any specific style guidelines? (e.g., use bullet points, keep paragraphs short, active voice)'
      case 'personaHints':
        return 'Any persona or voice hints? (e.g., write as a senior engineer, be helpful but concise)'
      default:
        return 'Please provide your preference:'
    }
  }, [])

  const getPreferencesToAsk = useCallback((): PreferenceKey[] => {
    if (!preferenceQuestionsEnabled) return []
    const doNotAskAgain = preferences.doNotAskAgain ?? {}
    const askablePreferenceKeys: PreferenceKey[] = [
      'tone',
      'audience',
      'domain',
      'defaultModel',
      'temperature',
      'outputFormat',
      'language',
      'depth',
      'citationPreference',
      'styleGuidelines',
      'personaHints',
    ]
    return askablePreferenceKeys.filter((key) => {
      const doNotAskKey = key as keyof NonNullable<Preferences['doNotAskAgain']>
      const value = preferences[key]
      const hasValue = value !== undefined && value !== null && value !== ''
      return doNotAskAgain[doNotAskKey] !== true && !hasValue
    })
  }, [preferenceQuestionsEnabled, preferences])

  const startPreferenceQuestions = useCallback(async () => {
    if (!preferenceQuestionsEnabled) {
      logFlow('preferences:skip_disabled')
      setActivity({
        task: pendingTask ?? '',
        stage: 'preferences',
        status: 'success',
        message: 'Preferences skipped',
        detail: 'Generating your prompt without preference questions.',
      })
      if (pendingTask) {
        await generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current)
      }
      return
    }
    setActivity({
      task: pendingTask ?? '',
      stage: 'preferences',
      status: 'loading',
      message: 'Collecting preferences',
      detail: 'Answer a couple of quick questions to sharpen the prompt.',
    })
    const prefsToAsk = getPreferencesToAsk()
    if (prefsToAsk.length === 0) {
      setActivity({
        task: pendingTask ?? '',
        stage: 'preferences',
        status: 'success',
        message: 'Preferences up to date',
        detail: 'Using your saved preferences. Generating your prompt now.',
      })
      if (pendingTask) {
        await generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current)
      }
      return
    }

    logFlow('preferences:start', { pendingTask, count: prefsToAsk.length })
    setIsAskingPreferenceQuestions(true)
    setCurrentPreferenceQuestionKey(prefsToAsk[0])
    setPendingPreferenceUpdates({})
    const firstKeyOptions = getPreferenceOptions(prefsToAsk[0])
    setPreferenceSelectedOptionIndex(firstKeyOptions.length > 0 ? 0 : null)
    setActivity({
      task: pendingTask ?? '',
      stage: 'preferences',
      status: 'loading',
      message: `Preferences ${1}/${prefsToAsk.length}`,
      detail: getPreferenceQuestionText(prefsToAsk[0]),
    })

    // UI renders preference questions; avoid duplicating in transcript.
    focusInputToEnd()
  }, [
    clarifyingAnswersRef,
    focusInputToEnd,
    generateFinalPromptForTask,
    getPreferenceOptions,
    getPreferenceQuestionText,
    getPreferencesToAsk,
    preferenceQuestionsEnabled,
    pendingTask,
    setActivity,
    setCurrentPreferenceQuestionKey,
    setIsAskingPreferenceQuestions,
    setPendingPreferenceUpdates,
    setPreferenceSelectedOptionIndex,
  ])

  const handlePreferenceAnswer = useCallback(
    async (answer: string) => {
      if (!currentPreferenceQuestionKey) return

      const trimmedAnswer = answer.trim()
      logFlow('preferences:answer', { key: currentPreferenceQuestionKey, answer: trimmedAnswer })

      let value: string | number | undefined = trimmedAnswer
      if (currentPreferenceQuestionKey === 'temperature') {
        const numValue = parseFloat(trimmedAnswer)
        value = isNaN(numValue) ? undefined : Math.max(0, Math.min(1, numValue))
      }

      const updates = { ...pendingPreferenceUpdates, [currentPreferenceQuestionKey]: value }
      setPendingPreferenceUpdates(updates)

      const prefsToAsk = getPreferencesToAsk()
      const currentIndex = prefsToAsk.indexOf(currentPreferenceQuestionKey)
      const nextIndex = currentIndex + 1

      if (nextIndex < prefsToAsk.length) {
        const nextKey = prefsToAsk[nextIndex]
        logFlow('preferences:next', { nextKey, index: nextIndex })
        setCurrentPreferenceQuestionKey(nextKey)
        const nextKeyOptions = getPreferenceOptions(nextKey)
        setPreferenceSelectedOptionIndex(nextKeyOptions.length > 0 ? 0 : null)
        setActivity({
          task: pendingTask ?? '',
          stage: 'preferences',
          status: 'loading',
          message: `Preferences ${nextIndex + 1}/${prefsToAsk.length}`,
          detail: getPreferenceQuestionText(nextKey),
        })
        focusInputToEnd()
      } else {
        logFlow('preferences:complete', { updates })
        setIsAskingPreferenceQuestions(false)
        setCurrentPreferenceQuestionKey(null)
        setPreferenceSelectedOptionIndex(null)
        const updatedPrefs = { ...preferences, ...updates }
        setPendingPreferenceUpdates({})

        setActivity({
          task: pendingTask ?? '',
          stage: 'preferences',
          status: 'success',
          message: 'Preferences captured for this prompt',
          detail: 'Using these answers only for this prompt.',
        })
        if (pendingTask) {
          await generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current, {
            preferencesOverride: updatedPrefs,
          })
        }
      }
    },
    [
      clarifyingAnswersRef,
      currentPreferenceQuestionKey,
      focusInputToEnd,
      generateFinalPromptForTask,
      getPreferenceOptions,
      getPreferenceQuestionText,
      getPreferencesToAsk,
      pendingPreferenceUpdates,
      pendingTask,
      preferences,
      setActivity,
      setCurrentPreferenceQuestionKey,
      setIsAskingPreferenceQuestions,
      setPendingPreferenceUpdates,
      setPreferenceSelectedOptionIndex,
    ]
  )

  const handlePreferenceOptionClick = useCallback(
    (index: number) => {
      if (index === -1) {
        logFlow('preferences:skip_option')
        setIsAskingPreferenceQuestions(false)
        setCurrentPreferenceQuestionKey(null)
        setPreferenceSelectedOptionIndex(null)
        setPendingPreferenceUpdates({})
        if (pendingTask) {
          setActivity({
            task: pendingTask,
            stage: 'preferences',
            status: 'success',
            message: 'Preferences skipped',
            detail: 'Generating your prompt without additional preferences.',
          })
          void generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current)
        }
        return
      }

      if (!currentPreferenceQuestionKey) return
      const options = getPreferenceOptions(currentPreferenceQuestionKey)
      if (index < 0 || index >= options.length) return
      const chosen = options[index]
      logFlow('preferences:option', { key: currentPreferenceQuestionKey, option: chosen.label, index })
      setPreferenceSelectedOptionIndex(index)
      void handlePreferenceAnswer(chosen.label)
      focusInputToEnd()
    },
    [
      clarifyingAnswersRef,
      currentPreferenceQuestionKey,
      focusInputToEnd,
      getPreferenceOptions,
      handlePreferenceAnswer,
      pendingTask,
      generateFinalPromptForTask,
      setActivity,
      setCurrentPreferenceQuestionKey,
      setIsAskingPreferenceQuestions,
      setPendingPreferenceUpdates,
      setPreferenceSelectedOptionIndex,
    ]
  )

  const handlePreferenceKey = useCallback(
    (info: KeyEventInfo): boolean => {
      if (!isAskingPreferenceQuestions || !currentPreferenceQuestionKey) return false
      const { key, metaKey, ctrlKey, value } = info
      const options = getPreferenceOptions(currentPreferenceQuestionKey)
      const isPlainEnter = key === 'Enter' && !metaKey && !ctrlKey

      if (options.length > 0) {
        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
          const isForward = key === 'ArrowDown' || key === 'ArrowRight'
          const current = preferenceSelectedOptionIndex
          const nextIndex =
            current === null
              ? isForward
                ? 0
                : options.length - 1
              : (current + (isForward ? 1 : -1) + options.length) % options.length
          setPreferenceSelectedOptionIndex(nextIndex)
          return true
        }

        if (isPlainEnter && !value.trim() && preferenceSelectedOptionIndex !== null) {
          handlePreferenceOptionClick(preferenceSelectedOptionIndex)
          return true
        }
      }
      return false
    },
    [
      currentPreferenceQuestionKey,
      getPreferenceOptions,
      handlePreferenceOptionClick,
      isAskingPreferenceQuestions,
      preferenceSelectedOptionIndex,
      setPreferenceSelectedOptionIndex,
    ]
  )

  return {
    getPreferencesToAsk,
    startPreferenceQuestions,
    handlePreferenceAnswer,
    handlePreferenceOptionClick,
    handlePreferenceKey,
    getPreferenceOptions,
    getPreferenceQuestionText,
  }
}
