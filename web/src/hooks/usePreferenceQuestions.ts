'use client'

import { useCallback, useRef } from 'react'
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
  setValue: (value: string) => void
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
  setValue,
  clarifyingAnswersRef,
  generateFinalPromptForTask,
}: PreferenceQuestionDeps) {
  const preferenceOrderRef = useRef<PreferenceKey[]>([])
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

  const resolveSelectionForKey = useCallback(
    (key: PreferenceKey): number | null => {
      const saved = (pendingPreferenceUpdates as Record<string, unknown>)[key] ?? preferences[key]
      const opts = getPreferenceOptions(key)
      const trimmed = saved !== undefined && saved !== null ? String(saved).trim() : ''
      if (!trimmed) return null
      if (opts.length > 0) {
        const idx = opts.findIndex((opt) => opt.label === trimmed)
        return idx >= 0 ? idx : -2
      }
      return -2
    },
    [getPreferenceOptions, pendingPreferenceUpdates, preferences]
  )

  const startPreferenceQuestions = useCallback(async () => {
    if (!preferenceQuestionsEnabled) {
      logFlow('preferences:skip_disabled')
      setActivity({
        task: pendingTask ?? '',
        stage: 'preferences',
        status: 'success',
        message: 'Preferences skipped',
        detail: undefined,
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
      detail: 'Answering these questions improves the quality of your prompt.',
    })
    const prefsToAsk = getPreferencesToAsk()
    if (prefsToAsk.length === 0) {
      setActivity({
        task: pendingTask ?? '',
        stage: 'preferences',
        status: 'success',
        message: 'Preferences up to date',
        detail: undefined,
      })
      if (pendingTask) {
        await generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current)
      }
      return
    }

    logFlow('preferences:start', { pendingTask, count: prefsToAsk.length })
    preferenceOrderRef.current = prefsToAsk
    setIsAskingPreferenceQuestions(true)
    setCurrentPreferenceQuestionKey(prefsToAsk[0])
    setPendingPreferenceUpdates({})
    const firstSelection = resolveSelectionForKey(prefsToAsk[0])
    if (firstSelection === -2) {
      const saved = (pendingPreferenceUpdates as Record<string, unknown>)[prefsToAsk[0]] ?? preferences[prefsToAsk[0]]
      setValue(saved ? String(saved) : '')
    } else {
      setValue('')
    }
    setPreferenceSelectedOptionIndex(firstSelection)
    setActivity({
      task: pendingTask ?? '',
      stage: 'preferences',
      status: 'loading',
      message: `Preferences ${1}/${prefsToAsk.length}`,
      detail: 'Answering these questions improves the quality of your prompt.',
    })

    // UI renders preference questions; avoid duplicating in transcript.
    focusInputToEnd()
  }, [
    preferenceQuestionsEnabled,
    setActivity,
    pendingTask,
    getPreferencesToAsk,
    setIsAskingPreferenceQuestions,
    setCurrentPreferenceQuestionKey,
    setPendingPreferenceUpdates,
    resolveSelectionForKey,
    setPreferenceSelectedOptionIndex,
    focusInputToEnd,
    generateFinalPromptForTask,
    clarifyingAnswersRef,
    pendingPreferenceUpdates,
    preferences,
    setValue,
  ])

  const handlePreferenceAnswer = useCallback(
    async (answer: string) => {
      if (!currentPreferenceQuestionKey) return

      const trimmedRaw = answer.trim()
      const isBack = trimmedRaw.toLowerCase() === 'back'

      if (isBack) {
        const prefsToAsk = getPreferencesToAsk()
        const currentIndex = prefsToAsk.indexOf(currentPreferenceQuestionKey)
        const prevIndex = currentIndex - 1

        if (prevIndex >= 0) {
          const prevKey = prefsToAsk[prevIndex]
          logFlow('preferences:back', { from: currentPreferenceQuestionKey, to: prevKey })
          const resolvedSelection = resolveSelectionForKey(prevKey)
          setCurrentPreferenceQuestionKey(prevKey)
          setPreferenceSelectedOptionIndex(
            resolvedSelection !== null && resolvedSelection >= 0
              ? resolvedSelection
              : resolvedSelection === -2
              ? -2
              : null
          )
          if (resolvedSelection === -2) {
            const saved = (pendingPreferenceUpdates as Record<string, unknown>)[prevKey] ?? preferences[prevKey]
            setValue(saved ? String(saved) : '')
          } else {
            setValue('')
          }
          setActivity({
            task: pendingTask ?? '',
            stage: 'preferences',
            status: 'loading',
            message: `Preferences ${prevIndex + 1}/${prefsToAsk.length}`,
            detail: 'Answering these questions improves the quality of your prompt.',
          })
          focusInputToEnd()
        } else {
          focusInputToEnd()
        }
        return
      }

      // Free-answer (empty) should just focus input without advancing
      if (!answer && answer.trim() === '') {
        focusInputToEnd()
        return
      }

      const trimmedAnswer = trimmedRaw
      logFlow('preferences:answer', { key: currentPreferenceQuestionKey, answer: trimmedAnswer })

      let value: string | number | undefined = trimmedAnswer
      if (currentPreferenceQuestionKey === 'temperature') {
        const numValue = parseFloat(trimmedAnswer)
        value = isNaN(numValue) ? undefined : Math.max(0, Math.min(1, numValue))
      }

      const updates = { ...pendingPreferenceUpdates, [currentPreferenceQuestionKey]: value }
      setPendingPreferenceUpdates(updates)

      const order = preferenceOrderRef.current.length ? preferenceOrderRef.current : getPreferencesToAsk()
      const currentIndex = order.indexOf(currentPreferenceQuestionKey)
      const nextIndex = currentIndex + 1

      if (nextIndex < order.length) {
        const nextKey = order[nextIndex]
        logFlow('preferences:next', { nextKey, index: nextIndex })
        setCurrentPreferenceQuestionKey(nextKey)
        const nextSelection = resolveSelectionForKey(nextKey)
        if (nextSelection === -2) {
          const saved = (pendingPreferenceUpdates as Record<string, unknown>)[nextKey] ?? preferences[nextKey]
          setValue(saved ? String(saved) : '')
        } else {
          setValue('')
        }
        setPreferenceSelectedOptionIndex(nextSelection)
        setActivity({
          task: pendingTask ?? '',
          stage: 'preferences',
          status: 'loading',
          message: `Preferences ${nextIndex + 1}/${order.length}`,
          detail: 'Answering these questions improves the quality of your prompt.',
        })
        focusInputToEnd()
      } else {
        logFlow('preferences:complete', { updates })
        setIsAskingPreferenceQuestions(false)
        setCurrentPreferenceQuestionKey(null)
        setPreferenceSelectedOptionIndex(null)
        setValue('')
        const updatedPrefs = { ...preferences, ...updates }
        // keep pendingPreferenceUpdates and order to allow back navigation from final prompt

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
      getPreferencesToAsk,
      pendingPreferenceUpdates,
      pendingTask,
      preferences,
      resolveSelectionForKey,
      setActivity,
      setCurrentPreferenceQuestionKey,
      setIsAskingPreferenceQuestions,
      setPendingPreferenceUpdates,
      setPreferenceSelectedOptionIndex,
      setValue,
    ]
  )

  const handlePreferenceOptionClick = useCallback(
    (index: number) => {
      if (index === -1) {
        if (!currentPreferenceQuestionKey) return
        logFlow('preferences:skip_option_current', { key: currentPreferenceQuestionKey })

        const order = preferenceOrderRef.current.length ? preferenceOrderRef.current : getPreferencesToAsk()
        const currentIndex = order.indexOf(currentPreferenceQuestionKey)
        const nextIndex = currentIndex + 1

        if (nextIndex < order.length) {
          const nextKey = order[nextIndex]
          setCurrentPreferenceQuestionKey(nextKey)
          const nextSelection = resolveSelectionForKey(nextKey)
          setPreferenceSelectedOptionIndex(nextSelection)
          if (nextSelection === -2) {
            const saved = (pendingPreferenceUpdates as Record<string, unknown>)[nextKey] ?? preferences[nextKey]
            setValue(saved ? String(saved) : '')
          } else {
            setValue('')
          }
          setActivity({
            task: pendingTask ?? '',
            stage: 'preferences',
            status: 'loading',
            message: `Preferences ${nextIndex + 1}/${order.length}`,
            detail: 'Answering these questions improves the quality of your prompt.',
          })
          focusInputToEnd()
        } else {
          logFlow('preferences:complete_after_skips', { updates: pendingPreferenceUpdates })
          setIsAskingPreferenceQuestions(false)
          setCurrentPreferenceQuestionKey(null)
          setPreferenceSelectedOptionIndex(null)
          setValue('')
          const updatedPrefs = { ...preferences, ...pendingPreferenceUpdates }
          // keep pendingPreferenceUpdates and order to allow back navigation from final prompt

          setActivity({
            task: pendingTask ?? '',
            stage: 'preferences',
            status: 'success',
            message: 'Preferences captured for this prompt',
            detail: undefined,
          })
          if (pendingTask) {
            void generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current, {
              preferencesOverride: updatedPrefs,
            })
          }
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
      currentPreferenceQuestionKey,
      getPreferenceOptions,
      setPreferenceSelectedOptionIndex,
      handlePreferenceAnswer,
      focusInputToEnd,
      getPreferencesToAsk,
      setCurrentPreferenceQuestionKey,
      resolveSelectionForKey,
      setActivity,
      pendingTask,
      pendingPreferenceUpdates,
      preferences,
      setValue,
      setIsAskingPreferenceQuestions,
      generateFinalPromptForTask,
      clarifyingAnswersRef,
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
