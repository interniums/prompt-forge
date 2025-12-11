'use client'

import { useCallback, useRef } from 'react'
import { AUDIENCE_OPTIONS, LANGUAGE_SELECT_OPTIONS, TONE_OPTIONS } from '@/lib/constants'
import type { ClarifyingAnswer, Preferences, TaskActivity } from '@/lib/types'
import type { PreferenceKey } from '@/features/terminal/terminalState'

const debugFlow = process.env.NEXT_PUBLIC_DEBUG_FLOW === 'true'
const logFlow = (...args: unknown[]) => {
  if (!debugFlow) return
  console.info('[pf:flow]', ...args)
}

const letterId = (idx: number) => String.fromCharCode('a'.charCodeAt(0) + idx)

type PreferenceQuestionDeps = {
  preferences: Preferences
  pendingTask: string | null
  currentPreferenceQuestionKey: PreferenceKey | null // informational; actual key is driven by index
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
  onBackToClarifying: () => void
}

type KeyEventInfo = { key: string; metaKey: boolean; ctrlKey: boolean; value: string }

export function usePreferenceQuestions({
  preferences,
  pendingTask,
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
  onBackToClarifying,
}: PreferenceQuestionDeps) {
  const preferenceOrderRef = useRef<PreferenceKey[]>([])
  const preferenceIndexRef = useRef<number>(-1)
  const lastVisitedPreferenceIndexRef = useRef<number>(-1)
  const currentPreferenceKeyRef = useRef<PreferenceKey | null>(null)
  const preferenceAnswersRef = useRef<Partial<Record<PreferenceKey, string | number | undefined>>>({})

  const setCurrentPreferenceKey = useCallback(
    (key: PreferenceKey | null) => {
      currentPreferenceKeyRef.current = key
      setCurrentPreferenceQuestionKey(key)
    },
    [setCurrentPreferenceQuestionKey]
  )

  const getPreferenceOptions = useCallback(
    (key: keyof Preferences): Array<{ id: string; label: string; value: string }> => {
      switch (key) {
        case 'tone':
          return TONE_OPTIONS.map((opt, idx) => ({ id: letterId(idx), label: opt, value: opt }))
        case 'audience':
          return AUDIENCE_OPTIONS.map((opt, idx) => ({ id: letterId(idx), label: opt, value: opt }))
        case 'domain':
          return ['product', 'marketing', 'engineering', 'research', 'design', 'data', 'sales', 'support'].map(
            (opt, idx) => ({ id: letterId(idx), label: opt, value: opt })
          )
        case 'depth':
          return [
            { id: 'a', label: 'Brief summary', value: 'brief' },
            { id: 'b', label: 'Standard depth', value: 'standard' },
            { id: 'c', label: 'Deep dive', value: 'deep' },
          ]
        case 'outputFormat':
          return [
            { id: 'a', label: 'Plain text', value: 'plain_text' },
            { id: 'b', label: 'Bulleted list', value: 'bullet_list' },
            { id: 'c', label: 'Step-by-step', value: 'steps' },
            { id: 'd', label: 'Table', value: 'table' },
            { id: 'e', label: 'Outline', value: 'outline' },
          ]
        case 'citationPreference':
          return [
            { id: 'a', label: 'No citations', value: 'none' },
            { id: 'b', label: 'Light references', value: 'light' },
            { id: 'c', label: 'Strict citations', value: 'strict' },
          ]
        case 'language':
          return LANGUAGE_SELECT_OPTIONS.filter((opt) => opt.value !== 'auto').map((opt, idx) => ({
            id: letterId(idx),
            label: opt.label,
            value: opt.value,
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
          ].map((opt, idx) => ({ id: letterId(idx), label: opt, value: opt }))
        case 'temperature':
          return [
            { id: 'a', label: '0.3 (focused)', value: '0.3' },
            { id: 'b', label: '0.7 (balanced)', value: '0.7' },
            { id: 'c', label: '0.9 (creative)', value: '0.9' },
          ]
        default:
          return []
      }
    },
    []
  )

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

  const getPreferenceOrder = useCallback((): PreferenceKey[] => {
    if (preferenceOrderRef.current.length > 0) return preferenceOrderRef.current.slice()
    const next = getPreferencesToAsk()
    preferenceOrderRef.current = next
    return next
  }, [getPreferencesToAsk])

  const getCurrentPreferenceKey = useCallback((): PreferenceKey | null => {
    const order = getPreferenceOrder()
    const idx = preferenceIndexRef.current
    if (idx >= 0 && idx < order.length) return order[idx]
    return currentPreferenceKeyRef.current
  }, [getPreferenceOrder])

  const getResumePreferenceIndex = useCallback(() => lastVisitedPreferenceIndexRef.current, [])

  const getPreferenceLastAnswer = useCallback(
    (key: PreferenceKey | null | undefined): string | number | null => {
      if (!key) return null
      const fromRef = preferenceAnswersRef.current[key]
      if (fromRef !== undefined && fromRef !== null) return fromRef
      const raw = preferences[key]
      if (raw === undefined || raw === null) return null
      const trimmed = String(raw).trim()
      return trimmed.length ? trimmed : null
    },
    [preferences]
  )

  const startPreferenceQuestions = useCallback(
    async (options?: { resumeIndex?: number | null; preservePending?: boolean }) => {
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
      const prefsToAsk = preferenceOrderRef.current.length > 0 ? preferenceOrderRef.current : getPreferencesToAsk()
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
      const resumeIndex =
        options?.resumeIndex ?? (lastVisitedPreferenceIndexRef.current >= 0 ? lastVisitedPreferenceIndexRef.current : 0)
      const startIndex = Math.min(Math.max(resumeIndex ?? 0, 0), prefsToAsk.length - 1)
      preferenceIndexRef.current = startIndex
      lastVisitedPreferenceIndexRef.current = startIndex
      setIsAskingPreferenceQuestions(true)
      setCurrentPreferenceKey(prefsToAsk[startIndex] ?? null)
      if (!options?.preservePending) {
        setPendingPreferenceUpdates({})
        preferenceAnswersRef.current = {}
      }
      // Do not prefill input or selection; only outline last answer visually.
      setValue('')
      setPreferenceSelectedOptionIndex(null)
      setActivity({
        task: pendingTask ?? '',
        stage: 'preferences',
        status: 'loading',
        message: `Preferences ${startIndex + 1}/${prefsToAsk.length}`,
        detail: 'Answering these questions improves the quality of your prompt.',
      })
    },
    [
      preferenceQuestionsEnabled,
      setActivity,
      pendingTask,
      getPreferencesToAsk,
      setIsAskingPreferenceQuestions,
      setCurrentPreferenceKey,
      setPendingPreferenceUpdates,
      setPreferenceSelectedOptionIndex,
      generateFinalPromptForTask,
      clarifyingAnswersRef,
      setValue,
    ]
  )

  const resetPreferenceOrder = useCallback(() => {
    preferenceOrderRef.current = []
    preferenceIndexRef.current = -1
    lastVisitedPreferenceIndexRef.current = -1
    currentPreferenceKeyRef.current = null
    preferenceAnswersRef.current = {}
  }, [])

  const handlePreferenceAnswer = useCallback(
    async (answer: string) => {
      const activeKey = getCurrentPreferenceKey()
      if (!activeKey) return

      const trimmedRaw = answer.trim()
      const isBack = trimmedRaw.toLowerCase() === 'back'

      if (isBack) {
        const order = getPreferenceOrder()
        let currentIndex = preferenceIndexRef.current
        if (currentIndex < 0) {
          currentIndex = order.indexOf(activeKey)
          preferenceIndexRef.current = currentIndex
        }
        const prevIndex = currentIndex - 1

        if (prevIndex >= 0 && currentIndex !== -1) {
          const prevKey = order[prevIndex]
          logFlow('preferences:back', { from: activeKey, to: prevKey, via: 'order' })
          preferenceIndexRef.current = prevIndex
          lastVisitedPreferenceIndexRef.current = prevIndex
          setCurrentPreferenceKey(prevKey)
          setPreferenceSelectedOptionIndex(null)
          setValue('') // do not prefill when navigating back
          setActivity({
            task: pendingTask ?? '',
            stage: 'preferences',
            status: 'loading',
            message: `Preferences ${prevIndex + 1}/${order.length}`,
            detail: 'Answering these questions improves the quality of your prompt.',
          })
        } else {
          onBackToClarifying()
          resetPreferenceOrder()
        }
        return
      }

      if (!answer && answer.trim() === '') {
        return
      }

      const trimmedAnswer = trimmedRaw
      logFlow('preferences:answer', { key: activeKey, answer: trimmedAnswer })

      let value: string | number | undefined = trimmedAnswer
      if (activeKey === 'temperature') {
        const numValue = parseFloat(trimmedAnswer)
        value = isNaN(numValue) ? undefined : Math.max(0, Math.min(1, numValue))
      }

      const updates = { ...pendingPreferenceUpdates, [activeKey]: value }
      setPendingPreferenceUpdates(updates)
      preferenceAnswersRef.current = { ...preferenceAnswersRef.current, [activeKey]: value }

      const order = getPreferenceOrder()
      let currentIndex = preferenceIndexRef.current
      if (currentIndex < 0) {
        currentIndex = order.indexOf(activeKey)
        preferenceIndexRef.current = currentIndex
      }
      const nextIndex = currentIndex + 1

      if (nextIndex < order.length) {
        const nextKey = order[nextIndex]
        logFlow('preferences:next', { nextKey, index: nextIndex })
        preferenceIndexRef.current = nextIndex
        lastVisitedPreferenceIndexRef.current = nextIndex
        setCurrentPreferenceKey(nextKey)
        setValue('') // do not prefill when moving forward
        setPreferenceSelectedOptionIndex(null)
        setActivity({
          task: pendingTask ?? '',
          stage: 'preferences',
          status: 'loading',
          message: `Preferences ${nextIndex + 1}/${order.length}`,
          detail: 'Answering these questions improves the quality of your prompt.',
        })
      } else {
        logFlow('preferences:complete', { updates })
        lastVisitedPreferenceIndexRef.current = order.length - 1
        setIsAskingPreferenceQuestions(false)
        setCurrentPreferenceQuestionKey(null)
        setPreferenceSelectedOptionIndex(null)
        setValue('')
        const updatedPrefs = { ...preferences, ...updates }

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
      generateFinalPromptForTask,
      getPreferenceOrder,
      getCurrentPreferenceKey,
      setCurrentPreferenceKey,
      setCurrentPreferenceQuestionKey,
      onBackToClarifying,
      pendingPreferenceUpdates,
      pendingTask,
      preferences,
      setActivity,
      setIsAskingPreferenceQuestions,
      setPendingPreferenceUpdates,
      setPreferenceSelectedOptionIndex,
      setValue,
      resetPreferenceOrder,
    ]
  )

  const handlePreferenceOptionClick = useCallback(
    (index: number) => {
      if (index === -3) {
        const activeKey = getCurrentPreferenceKey()
        if (!activeKey) return
        logFlow('preferences:skip_option_current', { key: activeKey })

        const order = getPreferenceOrder()
        const currentIndex = preferenceIndexRef.current
        const nextIndex = currentIndex + 1

        if (nextIndex < order.length) {
          const nextKey = order[nextIndex]
          preferenceIndexRef.current = nextIndex
          lastVisitedPreferenceIndexRef.current = nextIndex
          setCurrentPreferenceKey(nextKey)
          // no prefill; keep selection unset to avoid accidental submit
          setPreferenceSelectedOptionIndex(null)
          setValue('')
          setActivity({
            task: pendingTask ?? '',
            stage: 'preferences',
            status: 'loading',
            message: `Preferences ${nextIndex + 1}/${order.length}`,
            detail: 'Answering these questions improves the quality of your prompt.',
          })
        } else {
          logFlow('preferences:complete_after_skips', { updates: pendingPreferenceUpdates })
          lastVisitedPreferenceIndexRef.current = order.length - 1
          setIsAskingPreferenceQuestions(false)
          setCurrentPreferenceQuestionKey(null)
          setPreferenceSelectedOptionIndex(null)
          setValue('')
          const updatedPrefs = { ...preferences, ...pendingPreferenceUpdates }

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

      const activeKey = getCurrentPreferenceKey()
      if (!activeKey) return
      const options = getPreferenceOptions(activeKey)
      if (index < 0 || index >= options.length) return
      const chosen = options[index]
      logFlow('preferences:option', { key: activeKey, option: chosen.label, value: chosen.value, index })
      setPreferenceSelectedOptionIndex(index)
      void handlePreferenceAnswer(chosen.value)
    },
    [
      getCurrentPreferenceKey,
      getPreferenceOptions,
      setPreferenceSelectedOptionIndex,
      handlePreferenceAnswer,
      getPreferenceOrder,
      setCurrentPreferenceKey,
      setValue,
      setActivity,
      pendingTask,
      pendingPreferenceUpdates,
      setIsAskingPreferenceQuestions,
      setCurrentPreferenceQuestionKey,
      preferences,
      generateFinalPromptForTask,
      clarifyingAnswersRef,
    ]
  )

  const handlePreferenceKey = useCallback(
    (info: KeyEventInfo): boolean => {
      if (!isAskingPreferenceQuestions) return false
      const activeKey = getCurrentPreferenceKey()
      if (!activeKey) return false
      const { key, metaKey, ctrlKey, value } = info
      const options = getPreferenceOptions(activeKey)
      const isPlainEnter = key === 'Enter' && !metaKey && !ctrlKey

      const navOrder: number[] = [...options.map((_, idx) => idx), -2, -1, -3]

      const isArrowNav = key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight'
      if (isArrowNav) {
        const isForward = key === 'ArrowDown' || key === 'ArrowRight'
        const current = preferenceSelectedOptionIndex
        const currentPos = current === null ? -1 : navOrder.indexOf(current)
        const nextPos =
          currentPos === -1
            ? isForward
              ? 0
              : navOrder.length - 1
            : (currentPos + (isForward ? 1 : -1) + navOrder.length) % navOrder.length
        setPreferenceSelectedOptionIndex(navOrder[nextPos] ?? null)
        return true
      }

      if (isPlainEnter) {
        const sel = preferenceSelectedOptionIndex
        if (sel !== null) {
          // Always prioritize selected option/back/skip over free text
          if (sel === -2) {
            setPreferenceSelectedOptionIndex(-2)
            focusInputToEnd()
            return true
          }
          if (sel === -1) {
            void handlePreferenceAnswer('back')
            return true
          }
          if (sel === -3) {
            handlePreferenceOptionClick(-3)
            return true
          }
          handlePreferenceOptionClick(sel)
          return true
        }
        const trimmed = value.trim()
        if (trimmed) {
          void handlePreferenceAnswer(trimmed)
          return true
        }
      }

      return false
    },
    [
      getCurrentPreferenceKey,
      getPreferenceOptions,
      handlePreferenceOptionClick,
      handlePreferenceAnswer,
      isAskingPreferenceQuestions,
      focusInputToEnd,
      preferenceSelectedOptionIndex,
      setPreferenceSelectedOptionIndex,
    ]
  )

  return {
    getPreferencesToAsk,
    getPreferenceOrder,
    getCurrentPreferenceKey,
    getResumePreferenceIndex,
    getPreferenceLastAnswer,
    startPreferenceQuestions,
    handlePreferenceAnswer,
    handlePreferenceOptionClick,
    handlePreferenceKey,
    getPreferenceOptions,
    getPreferenceQuestionText,
    resetPreferenceOrder,
  }
}
