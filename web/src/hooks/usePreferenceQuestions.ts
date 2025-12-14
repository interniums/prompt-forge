'use client'

import { useCallback, useRef } from 'react'

import type { PreferenceKey } from '@/features/terminal/terminalState'
import { AUDIENCE_OPTIONS, LANGUAGE_SELECT_OPTIONS, TONE_OPTIONS } from '@/lib/constants'
import type { ClarifyingAnswer, Preferences, TaskActivity } from '@/lib/types'

const OPTION_LIMIT = 4
const NAV_SELECTION = {
  OwnAnswer: -2,
  Back: -1,
  Skip: -3,
} as const

type PreferenceOption = { id: string; label: string; value: string }
type KeyEventInfo = { key: string; metaKey: boolean; ctrlKey: boolean; value: string }

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
  blurInput: () => void
  setValue: (value: string) => void
  clarifyingAnswersRef: React.MutableRefObject<ClarifyingAnswer[]>
  generateFinalPromptForTask: (
    task: string,
    answers: ClarifyingAnswer[],
    options?: { skipConsentCheck?: boolean; preferencesOverride?: Preferences }
  ) => Promise<void>
  onBackToClarifying: () => void
}

const ASKABLE_PREFERENCE_KEYS: PreferenceKey[] = [
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

const letterId = (idx: number) => String.fromCharCode('a'.charCodeAt(0) + idx)

const PREFERENCE_OPTION_BUILDERS: Partial<Record<PreferenceKey, () => PreferenceOption[]>> = {
  tone: () => TONE_OPTIONS.map((opt, idx) => ({ id: letterId(idx), label: opt, value: opt })),
  audience: () =>
    AUDIENCE_OPTIONS.map((opt, idx) => ({
      id: letterId(idx),
      label: opt,
      value: opt,
    })),
  domain: () =>
    ['product', 'marketing', 'engineering', 'research', 'design', 'data', 'sales', 'support'].map((opt, idx) => ({
      id: letterId(idx),
      label: opt,
      value: opt,
    })),
  depth: () => [
    { id: 'a', label: 'Brief summary', value: 'brief' },
    { id: 'b', label: 'Standard depth', value: 'standard' },
    { id: 'c', label: 'Deep dive', value: 'deep' },
  ],
  outputFormat: () => [
    { id: 'a', label: 'Plain text', value: 'plain_text' },
    { id: 'b', label: 'Bulleted list', value: 'bullet_list' },
    { id: 'c', label: 'Step-by-step', value: 'steps' },
    { id: 'd', label: 'Table', value: 'table' },
    { id: 'e', label: 'Outline', value: 'outline' },
  ],
  citationPreference: () => [
    { id: 'a', label: 'No citations', value: 'none' },
    { id: 'b', label: 'Light references', value: 'light' },
    { id: 'c', label: 'Strict citations', value: 'strict' },
  ],
  language: () =>
    LANGUAGE_SELECT_OPTIONS.filter((opt) => opt.value !== 'auto').map((opt, idx) => ({
      id: letterId(idx),
      label: opt.label,
      value: opt.value,
    })),
  defaultModel: () =>
    [
      'gpt-4o',
      'gpt-4.1',
      'o3',
      'o4-mini',
      'claude-3.5-sonnet',
      'claude-3-opus',
      'claude-3-haiku',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
    ].map((opt, idx) => ({ id: letterId(idx), label: opt, value: opt })),
  temperature: () => [
    { id: 'a', label: '0.3 (focused)', value: '0.3' },
    { id: 'b', label: '0.7 (balanced)', value: '0.7' },
    { id: 'c', label: '0.9 (creative)', value: '0.9' },
  ],
}

const PREFERENCE_QUESTIONS: Partial<Record<PreferenceKey, string>> = {
  tone: 'What tone would you like for this prompt? (e.g., professional, casual, technical)',
  audience: 'Who is the target audience? (e.g., developers, managers, general audience)',
  domain: 'What domain is this for? (e.g., marketing, engineering, product)',
  defaultModel: 'Which AI model are you targeting? (e.g., gpt-4, claude, gemini)',
  temperature: 'What temperature/creativity level? (0.0-1.0, e.g., 0.7 for balanced, 0.9 for creative)',
  outputFormat: 'What output format do you prefer? (e.g., markdown, plain text, code)',
  language: 'What language should the output be in? (e.g., English, Spanish, French)',
  depth: 'How detailed should the output be? (e.g., concise, detailed, comprehensive)',
  citationPreference: 'How should citations be handled? (e.g., include sources, no citations, inline references)',
  styleGuidelines: 'Any specific style guidelines? (e.g., use bullet points, keep paragraphs short, active voice)',
  personaHints: 'Any persona or voice hints? (e.g., write as a senior engineer, be helpful but concise)',
}

const normalizeAnswer = (key: PreferenceKey, raw: string): string | number | undefined => {
  if (key !== 'temperature') return raw
  const numValue = parseFloat(raw)
  if (Number.isNaN(numValue)) return undefined
  return Math.max(0, Math.min(1, numValue))
}

const hasOwnAnswer = (options: PreferenceOption[], answerText: string): boolean => {
  const lowered = answerText.toLowerCase()
  return !options.some(
    (opt) => opt.label.trim().toLowerCase() === lowered || opt.value.trim().toLowerCase() === lowered
  )
}

const trimmedOrNull = (value: string | number | boolean | undefined | null) => {
  if (value === undefined || value === null || typeof value === 'boolean') return null
  const text = String(value).trim()
  return text.length ? text : null
}

export function usePreferenceQuestions({
  preferences,
  pendingTask,
  isAskingPreferenceQuestions,
  preferenceSelectedOptionIndex,
  preferenceQuestionsEnabled,
  pendingPreferenceUpdates,
  setIsAskingPreferenceQuestions,
  setCurrentPreferenceQuestionKey,
  setPreferenceSelectedOptionIndex,
  setPendingPreferenceUpdates,
  setActivity,
  focusInputToEnd,
  blurInput,
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

  const getPreferenceOptions = useCallback((key: PreferenceKey): PreferenceOption[] => {
    const builder = PREFERENCE_OPTION_BUILDERS[key]
    if (!builder) return []
    return builder().slice(0, OPTION_LIMIT)
  }, [])

  const getPreferenceQuestionText = useCallback(
    (key: PreferenceKey): string => PREFERENCE_QUESTIONS[key] ?? 'Please provide your preference:',
    []
  )

  const getPreferencesToAsk = useCallback((): PreferenceKey[] => {
    if (!preferenceQuestionsEnabled) return []
    const doNotAskAgain = preferences.doNotAskAgain ?? {}

    return ASKABLE_PREFERENCE_KEYS.filter((key) => {
      const doNotAskKey = key as keyof NonNullable<Preferences['doNotAskAgain']>
      return doNotAskAgain[doNotAskKey] !== true
    })
  }, [preferenceQuestionsEnabled, preferences])

  const getPreferenceOrder = useCallback((): PreferenceKey[] => {
    if (preferenceOrderRef.current.length > 0) return [...preferenceOrderRef.current]
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
      if (typeof raw !== 'string' && typeof raw !== 'number' && typeof raw !== 'boolean') {
        return null
      }
      return trimmedOrNull(raw)
    },
    [preferences]
  )

  const resetPreferenceOrder = useCallback(() => {
    preferenceOrderRef.current = []
    preferenceIndexRef.current = -1
    lastVisitedPreferenceIndexRef.current = -1
    currentPreferenceKeyRef.current = null
    preferenceAnswersRef.current = {}
  }, [])

  const setActivityStatus = useCallback(
    (status: TaskActivity['status'], message: string, detail?: string) => {
      setActivity({
        task: pendingTask ?? '',
        stage: 'preferences',
        status,
        message,
        detail,
      })
    },
    [pendingTask, setActivity]
  )

  const syncAnswer = useCallback(
    (key: PreferenceKey, raw: string) => {
      const normalized = normalizeAnswer(key, raw)
      preferenceAnswersRef.current = { ...preferenceAnswersRef.current, [key]: normalized }
      setPendingPreferenceUpdates(preferenceAnswersRef.current as Partial<Preferences>)
    },
    [setPendingPreferenceUpdates]
  )

  const hydrateQuestionUI = useCallback(
    (key: PreferenceKey | null, options: PreferenceOption[], selectFirstWhenEmpty: boolean) => {
      if (!key) {
        setPreferenceSelectedOptionIndex(null)
        setValue('')
        return
      }

      const answerText = trimmedOrNull(preferenceAnswersRef.current[key])
      if (!answerText) {
        setValue('')
        setPreferenceSelectedOptionIndex(selectFirstWhenEmpty && options.length > 0 ? 0 : null)
        blurInput()
        return
      }

      const answer = String(answerText)
      const ownAnswer = hasOwnAnswer(options, answer)

      if (ownAnswer) {
        setPreferenceSelectedOptionIndex(NAV_SELECTION.OwnAnswer)
        setValue(answer)
        focusInputToEnd()
        return
      }

      const matchingOptionIndex = options.findIndex(
        (opt) =>
          opt.label.trim().toLowerCase() === answer.toLowerCase() ||
          opt.value.trim().toLowerCase() === answer.toLowerCase()
      )

      setValue('')
      setPreferenceSelectedOptionIndex(matchingOptionIndex >= 0 ? matchingOptionIndex : null)
      blurInput()
    },
    [blurInput, focusInputToEnd, setPreferenceSelectedOptionIndex, setValue]
  )

  const moveToIndex = useCallback(
    (targetIndex: number, options?: { selectFirstWhenEmpty?: boolean }) => {
      const order = getPreferenceOrder()
      if (!order.length) return null

      const nextIndex = Math.min(Math.max(targetIndex, 0), order.length - 1)
      preferenceIndexRef.current = nextIndex
      lastVisitedPreferenceIndexRef.current = nextIndex

      const nextKey = order[nextIndex] ?? null
      setCurrentPreferenceKey(nextKey)

      const questionOptions = nextKey ? getPreferenceOptions(nextKey) : []
      hydrateQuestionUI(nextKey, questionOptions, options?.selectFirstWhenEmpty ?? true)

      setActivityStatus(
        'loading',
        `Preferences ${nextIndex + 1}/${order.length}`,
        'Answering these questions improves the quality of your prompt.'
      )

      return nextKey
    },
    [getPreferenceOptions, getPreferenceOrder, hydrateQuestionUI, setActivityStatus, setCurrentPreferenceKey]
  )

  const completeFlow = useCallback(async () => {
    const order = getPreferenceOrder()
    lastVisitedPreferenceIndexRef.current = order.length - 1
    setIsAskingPreferenceQuestions(false)
    setCurrentPreferenceQuestionKey(null)
    setPreferenceSelectedOptionIndex(null)
    setValue('')
    blurInput()

    const updatedPrefs = { ...preferences, ...preferenceAnswersRef.current } as Preferences

    setActivityStatus('success', 'Preferences captured for this prompt', 'Using these answers only for this prompt.')

    if (pendingTask) {
      await generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current, {
        preferencesOverride: updatedPrefs,
      })
    }
  }, [
    blurInput,
    clarifyingAnswersRef,
    generateFinalPromptForTask,
    getPreferenceOrder,
    pendingTask,
    preferences,
    setActivityStatus,
    setCurrentPreferenceQuestionKey,
    setIsAskingPreferenceQuestions,
    setPreferenceSelectedOptionIndex,
    setValue,
  ])

  const moveForward = useCallback(
    async (selectFirstWhenEmpty: boolean) => {
      const order = getPreferenceOrder()
      const activeKey = getCurrentPreferenceKey()
      if (!activeKey) return

      const currentIndex =
        preferenceIndexRef.current >= 0 ? preferenceIndexRef.current : order.indexOf(activeKey as PreferenceKey)
      const nextIndex = currentIndex + 1

      if (nextIndex < order.length) {
        moveToIndex(nextIndex, { selectFirstWhenEmpty })
        return
      }

      await completeFlow()
    },
    [completeFlow, getCurrentPreferenceKey, getPreferenceOrder, moveToIndex]
  )

  const moveBack = useCallback(() => {
    const activeKey = getCurrentPreferenceKey()
    if (!activeKey) return
    const order = getPreferenceOrder()
    const currentIndex =
      preferenceIndexRef.current >= 0 ? preferenceIndexRef.current : order.indexOf(activeKey as PreferenceKey)
    const prevIndex = currentIndex - 1

    if (prevIndex >= 0) {
      setPendingPreferenceUpdates(preferenceAnswersRef.current as Partial<Preferences>)
      moveToIndex(prevIndex, { selectFirstWhenEmpty: false })
      return
    }

    setPendingPreferenceUpdates(preferenceAnswersRef.current as Partial<Preferences>)
    onBackToClarifying()
  }, [getCurrentPreferenceKey, getPreferenceOrder, moveToIndex, onBackToClarifying, setPendingPreferenceUpdates])

  const startPreferenceQuestions = useCallback(
    async (options?: { resumeIndex?: number | null; preservePending?: boolean }) => {
      if (!preferenceQuestionsEnabled) {
        setActivityStatus('success', 'Preferences skipped')
        if (pendingTask) {
          await generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current)
        }
        return
      }

      const hasPendingAnswers =
        Object.keys(preferenceAnswersRef.current ?? {}).length > 0 ||
        Object.keys(pendingPreferenceUpdates ?? {}).length > 0
      const preservePending = options?.preservePending ?? hasPendingAnswers

      setActivityStatus(
        'loading',
        'Collecting preferences',
        'Answering these questions improves the quality of your prompt.'
      )

      if (!preservePending) {
        resetPreferenceOrder()
        setPendingPreferenceUpdates({})
        preferenceAnswersRef.current = {}
      } else if (Object.keys(preferenceAnswersRef.current ?? {}).length === 0 && pendingPreferenceUpdates) {
        const sanitized = Object.entries(pendingPreferenceUpdates).reduce<
          Partial<Record<PreferenceKey, string | number | undefined>>
        >((acc, [key, value]) => {
          if (value === null || value === undefined || typeof value === 'boolean') return acc
          acc[key as PreferenceKey] = value as string | number
          return acc
        }, {})
        preferenceAnswersRef.current = sanitized
      }

      const prefsToAsk =
        preservePending && preferenceOrderRef.current.length > 0 ? preferenceOrderRef.current : getPreferencesToAsk()

      if (prefsToAsk.length === 0) {
        setActivityStatus('success', 'Preferences up to date')
        if (pendingTask) {
          await generateFinalPromptForTask(pendingTask, clarifyingAnswersRef.current)
        }
        return
      }

      preferenceOrderRef.current = prefsToAsk
      const resumeIndex =
        options?.resumeIndex ??
        (preservePending && lastVisitedPreferenceIndexRef.current >= 0 ? lastVisitedPreferenceIndexRef.current : 0)
      const startIndex = Math.min(Math.max(resumeIndex ?? 0, 0), prefsToAsk.length - 1)
      preferenceIndexRef.current = startIndex
      lastVisitedPreferenceIndexRef.current = startIndex
      setIsAskingPreferenceQuestions(true)

      moveToIndex(startIndex, { selectFirstWhenEmpty: !preservePending })
    },
    [
      clarifyingAnswersRef,
      generateFinalPromptForTask,
      getPreferencesToAsk,
      moveToIndex,
      pendingTask,
      pendingPreferenceUpdates,
      preferenceQuestionsEnabled,
      resetPreferenceOrder,
      setActivityStatus,
      setIsAskingPreferenceQuestions,
      setPendingPreferenceUpdates,
    ]
  )

  const handlePreferenceAnswer = useCallback(
    async (answer: string) => {
      const activeKey = getCurrentPreferenceKey()
      if (!activeKey) return

      const trimmed = answer.trim()
      if (!trimmed) return

      if (trimmed.toLowerCase() === 'back') {
        moveBack()
        return
      }

      syncAnswer(activeKey, trimmed)
      await moveForward(true)
    },
    [getCurrentPreferenceKey, moveBack, moveForward, syncAnswer]
  )

  const handlePreferenceOptionClick = useCallback(
    (index: number) => {
      const activeKey = getCurrentPreferenceKey()
      if (!activeKey) return

      if (index === NAV_SELECTION.Skip) {
        void moveForward(true)
        return
      }

      const options = getPreferenceOptions(activeKey)
      if (index < 0 || index >= options.length) return

      const chosen = options[index]
      setPreferenceSelectedOptionIndex(index)
      blurInput()
      void handlePreferenceAnswer(chosen.value)
    },
    [
      blurInput,
      getCurrentPreferenceKey,
      getPreferenceOptions,
      handlePreferenceAnswer,
      moveForward,
      setPreferenceSelectedOptionIndex,
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

      const navOrder: number[] = [
        ...options.map((_, idx) => idx),
        NAV_SELECTION.OwnAnswer,
        NAV_SELECTION.Back,
        NAV_SELECTION.Skip,
      ]

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
          if (sel === NAV_SELECTION.OwnAnswer) {
            setPreferenceSelectedOptionIndex(NAV_SELECTION.OwnAnswer)
            focusInputToEnd()
            return true
          }
          if (sel === NAV_SELECTION.Back) {
            void handlePreferenceAnswer('back')
            return true
          }
          if (sel === NAV_SELECTION.Skip) {
            handlePreferenceOptionClick(NAV_SELECTION.Skip)
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
      focusInputToEnd,
      getCurrentPreferenceKey,
      getPreferenceOptions,
      handlePreferenceAnswer,
      handlePreferenceOptionClick,
      isAskingPreferenceQuestions,
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
