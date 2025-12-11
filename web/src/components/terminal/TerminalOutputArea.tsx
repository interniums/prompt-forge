'use client'

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import type { TerminalLine, ClarifyingQuestion, Preferences, GenerationMode, TaskActivity } from '@/lib/types'
import { ROLE } from '@/lib/constants'

type PromptEditDiff = { previous: string; current: string }
type DiffLine = { type: 'added' | 'removed' | 'unchanged'; content: string }

const providerIcons: Record<string, { src: string; alt: string }> = {
  chatgpt: { src: 'https://cdn.simpleicons.org/openai', alt: 'OpenAI logo' },
  claude: { src: 'https://cdn.simpleicons.org/claude', alt: 'Claude logo' },
  perplexity: { src: 'https://cdn.simpleicons.org/perplexity', alt: 'Perplexity logo' },
  gemini: { src: 'https://cdn.simpleicons.org/googlegemini', alt: 'Google Gemini logo' },
}

function computeLineDiff(previous: string, current: string): DiffLine[] {
  const prevLines = previous.split(/\r?\n/)
  const currLines = current.split(/\r?\n/)
  const m = prevLines.length
  const n = currLines.length
  const lcs: number[][] = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0))

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (prevLines[i] === currLines[j]) {
        lcs[i][j] = lcs[i + 1][j + 1] + 1
      } else {
        lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1])
      }
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0

  while (i < m && j < n) {
    if (prevLines[i] === currLines[j]) {
      result.push({ type: 'unchanged', content: prevLines[i] })
      i += 1
      j += 1
      continue
    }

    if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      result.push({ type: 'removed', content: prevLines[i] })
      i += 1
    } else {
      result.push({ type: 'added', content: currLines[j] })
      j += 1
    }
  }

  while (i < m) {
    result.push({ type: 'removed', content: prevLines[i] })
    i += 1
  }

  while (j < n) {
    result.push({ type: 'added', content: currLines[j] })
    j += 1
  }

  return result
}

const elevationShadowClass = 'shadow-[0_4px_12px_rgba(0,0,0,0.18)]'
const primaryActionButtonClass = `inline-flex h-[44px] items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950 px-3 text-[14px] font-semibold text-slate-200 ${elevationShadowClass} transition hover:border-slate-500 hover:text-slate-50 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-slate-700/80 disabled:hover:text-slate-200 disabled:hover:bg-slate-950`
const selectedActionButtonClass =
  'border-slate-500 text-slate-50 bg-slate-900 ring-2 ring-slate-300 ring-offset-1 ring-offset-slate-950'

export type TerminalOutputAreaProps = {
  lines?: TerminalLine[]
  activity?: TaskActivity | null
  editablePrompt: string | null
  promptEditDiff?: PromptEditDiff | null
  promptForLinks?: string | null
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  answeringQuestions: boolean
  currentClarifyingQuestion: ClarifyingQuestion | null
  currentClarifyingQuestionIndex?: number | null
  clarifyingTotalCount?: number
  clarifyingSelectedOptionIndex: number | null
  clarifyingCanSubmit?: boolean
  clarifyingLastAnswer?: string | null
  onFocusInputSelectFree?: () => void
  editablePromptRef: React.RefObject<HTMLDivElement | null>
  scrollRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  onFocusInput: () => void
  onHelpCommandClick: (cmd: string) => void
  onConsentOptionClick: (index: number) => void
  onClarifyingOptionClick: (index: number) => void
  onUndoAnswer: () => void
  onClarifyingSkip?: () => void
  onCopyEditable: (textOverride?: string) => Promise<void> | void
  onUpdateEditablePrompt: (nextPrompt: string, previousPrompt: string) => void
  onStartNewConversation: () => void
  onLike?: () => void
  onDislike?: () => void
  likeState?: 'none' | 'liked' | 'disliked'
  isAskingPreferenceQuestions?: boolean
  currentPreferenceQuestionKey?: keyof Preferences | null
  preferenceSelectedOptionIndex?: number | null
  preferenceLastAnswer?: string | null
  onPreferenceFocusInputSelectFree?: () => void
  onPreferenceOptionClick?: (index: number) => void
  onPreferenceSkip?: () => void
  onPreferenceYourAnswer?: () => void
  onPreferenceBack?: () => void
  getPreferenceOptions?: (key: keyof Preferences) => Array<{ id: string; label: string }>
  getPreferenceQuestionText?: (key: keyof Preferences) => string
  getPreferenceOrder?: () => Array<keyof Preferences>
  getPreferencesToAsk?: () => Array<keyof Preferences>
  showStarter?: boolean
  starterTitle?: string
  starterSubtitle?: string
  generationMode?: GenerationMode
  onModeChange?: (mode: GenerationMode, options?: { silent?: boolean }) => void
  onFinalBack?: () => void
}

/**
 * Memoized terminal line component - prevents re-rendering unchanged lines
 */
const ActivityBlock = memo(function ActivityBlock({ activity }: { activity: TaskActivity }) {
  const isLoading = activity.status === 'loading'
  const isSuccess = activity.status === 'success'
  const isError = activity.status === 'error'
  const stageLabel =
    activity.stage === 'clarifying'
      ? 'Clarifying'
      : activity.stage === 'preferences'
      ? 'Preferences'
      : activity.stage === 'generating'
      ? 'Generating'
      : activity.stage === 'ready'
      ? 'Ready'
      : activity.stage === 'collecting'
      ? 'Collecting'
      : activity.stage === 'error'
      ? 'Error'
      : 'Status'

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center text-slate-200">
          {isLoading && (
            <span
              className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-transparent"
              aria-label="Loading"
            />
          )}
          {isSuccess && (
            <svg
              className="h-6 w-6 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {isError && (
            <svg
              className="h-6 w-6 text-rose-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <div className="text-[13px] uppercase tracking-wide text-slate-500">{stageLabel}</div>
          <div className="text-[14px] font-semibold text-slate-100">{activity.message}</div>
          {activity.detail && <div className="text-[13px] text-slate-300">{activity.detail}</div>}
        </div>
      </div>
    </div>
  )
})

/**
 * Memoized consent buttons
 */
const ConsentButtons = memo(function ConsentButtons({
  consentSelectedIndex,
  onConsentOptionClick,
}: {
  consentSelectedIndex: number | null
  onConsentOptionClick: (index: number) => void
}) {
  const options = useMemo(() => ['Generate now', 'Sharpen first (quick questions)'], [])

  return (
    <div className="mt-5 border-t border-slate-700/80 pt-4 text-[15px] text-slate-200">
      <div className="mb-3 text-[17px] font-mono text-slate-500 uppercase tracking-wide">
        How do you want to continue?
      </div>
      <div className="flex flex-col gap-3">
        {options.map((label: string, index: number) => {
          const isSelected = index === consentSelectedIndex
          return (
            <button
              key={label}
              type="button"
              onClick={() => onConsentOptionClick(index)}
              className={`cursor-pointer rounded-md px-0 py-0 text-left text-[16px] font-mono inline-flex items-center gap-2 ${
                isSelected ? 'text-slate-50' : 'text-slate-300 hover:text-slate-50'
              }`}
            >
              <span className="inline-block w-5 text-[26px] leading-none">{isSelected ? '•' : ''}</span>
              <span className={`font-mono text-[16px] ${isSelected ? 'underline underline-offset-4' : ''}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-3 text-[14px] text-slate-400">↑↓ choose • Enter confirm</div>
    </div>
  )
})

/**
 * Memoized preference question options
 */
const PreferenceOptions = memo(function PreferenceOptions({
  questionText,
  options,
  selectedOptionIndex,
  currentIndex,
  totalCount,
  onOptionClick,
  onFocusInputSelectFree,
  onFocusInput,
  onUndoAnswer,
  onSkip,
  lastAnsweredValue = null,
}: {
  questionText: string
  options: Array<{ id: string; label: string }>
  selectedOptionIndex: number | null
  currentIndex: number
  totalCount: number
  onOptionClick: (index: number) => void
  onFocusInputSelectFree?: () => void
  onFocusInput: () => void
  onUndoAnswer: () => void
  onSkip?: () => void
  lastAnsweredValue?: string | null
}) {
  const backSelected = selectedOptionIndex === -1
  const skipSelected = selectedOptionIndex === -3
  const handleMyOwn = onFocusInputSelectFree ?? onFocusInput
  const myOwnSelected = selectedOptionIndex === -2
  const normalizedLast = (lastAnsweredValue ?? '').trim()
  const hasLast = Boolean(normalizedLast)

  return (
    <div className="mt-6 border-t border-slate-700/80 pt-4 text-[15px] text-slate-200 space-y-3">
      <div className="text-[16px] text-slate-50 font-mono leading-relaxed">
        Preference {currentIndex + 1}/{totalCount}: {questionText}
      </div>
      <div className="text-[13px] text-slate-400">
        Pick one option or choose “My own answer” — click or use ↑↓; Enter to continue.
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt, index) => {
          const isSelected = index === selectedOptionIndex
          const isLast = hasLast && normalizedLast === opt.label.trim()
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onOptionClick(index)}
              aria-pressed={isSelected}
              className={`group flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-left text-[14px] transition ${
                isSelected
                  ? 'border-slate-500 bg-slate-900 text-slate-50'
                  : isLast
                  ? 'border-slate-600 bg-slate-950 text-slate-50/90 ring-1 ring-slate-600/70'
                  : 'border-slate-800 bg-slate-950 text-slate-100 hover:border-slate-600 hover:bg-slate-900'
              }`}
            >
              <span className="mt-0.5 text-[13px] text-slate-500">{opt.id})</span>
              <span className={`font-mono text-[14px] ${isSelected ? 'text-slate-50' : 'text-slate-100'}`}>
                {opt.label}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => {
            handleMyOwn()
            onOptionClick(-2)
          }}
          aria-pressed={myOwnSelected}
          className={`group flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-left text-[14px] transition ${
            myOwnSelected
              ? 'border-slate-500 bg-slate-900 text-slate-50'
              : 'border-slate-800 bg-slate-950 text-slate-100 hover:border-slate-600 hover:bg-slate-900'
          }`}
        >
          <span className="mt-0.5 text-[13px] text-slate-500">•</span>
          <span className="font-mono text-[14px]">My own answer</span>
        </button>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`${primaryActionButtonClass} ${
              backSelected ? selectedActionButtonClass : ''
            } justify-center h-[44px]`}
            onClick={onUndoAnswer}
            aria-label="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M15 18l-6-6 6-6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {onSkip && (
            <button
              type="button"
              className={`${primaryActionButtonClass} ${
                skipSelected ? selectedActionButtonClass : ''
              } justify-center h-[44px]`}
              onClick={onSkip}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

/**
 * Memoized clarifying question prompt for open-ended answers
 */
const ClarifyingQuestionPrompt = memo(function ClarifyingQuestionPrompt({
  question,
  currentIndex,
  totalCount,
  selectedOptionIndex,
  onUndoAnswer,
  onFocusInput,
  onFocusInputSelectFree,
  onSkip,
  lastAnsweredValue = null,
}: {
  question: ClarifyingQuestion
  currentIndex: number
  totalCount: number
  selectedOptionIndex: number | null
  canSubmit?: boolean
  onUndoAnswer: () => void
  onFocusInput: () => void
  onFocusInputSelectFree?: () => void
  onSkip?: () => void
  lastAnsweredValue?: string | null
}) {
  const safeTotal = Math.max(totalCount, currentIndex + 1)
  const remaining = Math.max(0, safeTotal - (currentIndex + 1))
  const backSelected = selectedOptionIndex === -1
  const freeSelected = selectedOptionIndex === -2
  const skipSelected = selectedOptionIndex === -3
  const normalizedLast = (lastAnsweredValue ?? '').trim()
  return (
    <div className="mt-6 border-t border-slate-800 pt-4 text-[14px] text-slate-300 space-y-2">
      <div className="text-[15px] text-slate-50 font-mono leading-relaxed">
        Question {currentIndex + 1}/{safeTotal}
        {remaining > 0 ? ` · ${remaining} left` : ''}: {question.question}
      </div>
      <div className="text-[13px] text-slate-400">Type an answer and press Enter or Next.</div>
      {normalizedLast && <div className="text-[12px] text-slate-400">Previous answer: {normalizedLast}</div>}
      <div className="flex flex-wrap gap-3 text-[13px] text-slate-400" />
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          className={`${primaryActionButtonClass} ${backSelected ? selectedActionButtonClass : ''} justify-center`}
          onClick={onUndoAnswer}
          aria-label="Back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M15 18l-6-6 6-6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          className={`${primaryActionButtonClass} ${freeSelected ? selectedActionButtonClass : ''}`}
          onClick={onFocusInputSelectFree ?? onFocusInput}
          aria-label="Type your own answer"
        >
          Write my own
        </button>
        {onSkip && (
          <button
            type="button"
            className={`${primaryActionButtonClass} ${skipSelected ? selectedActionButtonClass : ''}`}
            onClick={onSkip}
            aria-label="Skip question"
          >
            Skip
          </button>
        )}
      </div>
      {freeSelected && (
        <div className="text-[12px] text-slate-400">Type your answer in bottom input. Next or Enter to confirm.</div>
      )}
    </div>
  )
})

/**
 * Memoized clarifying question options
 */
const ClarifyingOptions = memo(function ClarifyingOptions({
  question,
  selectedOptionIndex,
  onOptionClick,
  onUndoAnswer,
  onFocusInput,
  onFocusInputSelectFree,
  onSkip,
  lastAnsweredValue = null,
}: {
  question: ClarifyingQuestion
  selectedOptionIndex: number | null
  onOptionClick: (index: number) => void
  onUndoAnswer: () => void
  onFocusInput: () => void
  onFocusInputSelectFree?: () => void
  onSkip?: () => void
  lastAnsweredValue?: string | null
}) {
  const backSelected = selectedOptionIndex === -1
  const skipSelected = selectedOptionIndex === -3
  const myOwnSelected = selectedOptionIndex === -2
  const handleMyOwn = onFocusInputSelectFree ?? onFocusInput
  const normalizedLast = (lastAnsweredValue ?? '').trim()
  const hasLast = Boolean(normalizedLast)
  return (
    <div className="mt-6 border-t border-slate-800 pt-4 text-[14px] text-slate-300 space-y-2">
      <div className="text-[15px] text-slate-50 font-mono leading-relaxed">{question.question}</div>
      <div className="text-[13px] text-slate-400">
        Pick one option or choose “My own answer” — click or use ↑↓; Enter to continue.
      </div>
      <div className="flex flex-wrap gap-3 text-[13px] text-slate-400" />
      <div className="flex flex-col gap-2">
        {question.options.map((opt, index) => {
          const isSelected = index === selectedOptionIndex
          const isLast = hasLast && normalizedLast === opt.label.trim()
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onOptionClick(index)}
              aria-pressed={isSelected}
              className={`group flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-left text-[14px] transition ${
                isSelected
                  ? 'border-slate-500 bg-slate-900 text-slate-50'
                  : isLast
                  ? 'border-slate-600 bg-slate-950 text-slate-50/90 ring-1 ring-slate-600/70'
                  : 'border-slate-800 bg-slate-950 text-slate-100 hover-border-slate-600 hover:bg-slate-900'
              }`}
            >
              <span className="mt-0.5 text-[13px] text-slate-500">{opt.id})</span>
              <span className={`font-mono text-[14px] ${isSelected ? 'text-slate-50' : 'text-slate-100'}`}>
                {opt.label}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => {
            handleMyOwn()
            onOptionClick(-2)
          }}
          aria-pressed={myOwnSelected}
          className={`group flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-left text-[14px] transition ${
            myOwnSelected
              ? 'border-slate-500 bg-slate-900 text-slate-50'
              : 'border-slate-800 bg-slate-950 text-slate-100 hover:border-slate-600 hover:bg-slate-900'
          }`}
        >
          <span className="mt-0.5 text-[13px] text-slate-500">•</span>
          <span className="font-mono text-[14px]">My own answer</span>
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`${primaryActionButtonClass} ${backSelected ? selectedActionButtonClass : ''} justify-center`}
          onClick={onUndoAnswer}
          aria-label="Back to previous question"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M15 18l-6-6 6-6" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {onSkip && (
          <button
            type="button"
            className={`${primaryActionButtonClass} ${skipSelected ? selectedActionButtonClass : ''}`}
            onClick={onSkip}
            aria-label="Skip question"
          >
            Skip
          </button>
        )}
      </div>
      <div className="min-h-[18px]">
        {myOwnSelected && (
          <div className="text-[12px] text-slate-400">Type your answer in bottom input. Enter to confirm.</div>
        )}
      </div>
    </div>
  )
})

/**
 * Memoized editable prompt section
 */
const EditablePromptSection = memo(function EditablePromptSection({
  editablePrompt,
  promptEditDiff = null,
  editablePromptRef,
  onCopyEditable,
  onUpdateEditablePrompt,
  linksSlot = null,
  onLike,
  onDislike,
  likeState = 'none',
}: {
  editablePrompt: string
  promptEditDiff?: PromptEditDiff | null
  editablePromptRef: React.RefObject<HTMLDivElement | null>
  onCopyEditable: (textOverride?: string) => Promise<void> | void
  onUpdateEditablePrompt: (nextPrompt: string, previousPrompt: string) => void
  linksSlot?: React.ReactNode
  onLike?: () => void
  onDislike?: () => void
  likeState?: 'none' | 'liked' | 'disliked'
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [isEditing, setIsEditing] = useState(false)
  const [isEditLayerVisible, setIsEditLayerVisible] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState(editablePrompt)
  const firstChangeRef = useRef<HTMLDivElement | null>(null)
  const editTextAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const sentimentButtonClass = `inline-flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-md border border-slate-700/80 bg-slate-950 text-slate-200 ${elevationShadowClass} transition hover:border-slate-500 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed`
  const copyIconButtonClass = `inline-flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-md border border-slate-700/80 bg-slate-950 text-slate-200 ${elevationShadowClass} transition hover:border-slate-500 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 disabled:opacity-60 disabled:cursor-not-allowed`
  const handleCopyClick = useCallback(
    (textOverride?: string) => {
      const maybePromise = onCopyEditable(textOverride)
      Promise.resolve(maybePromise)
        .then(() => {
          setCopyState('copied')
        })
        .catch(() => {
          setCopyState('idle')
        })
    },
    [onCopyEditable]
  )

  const diffLines = promptEditDiff ? computeLineDiff(promptEditDiff.previous, promptEditDiff.current) : null
  const hasDiff = Boolean(diffLines && diffLines.length > 0)

  const handleStartEdit = useCallback(() => {
    setCopyState('idle')
    setDraftPrompt(editablePrompt)
    setIsEditing(true)
  }, [editablePrompt])

  const handleConfirmEdit = useCallback(() => {
    const nextPrompt = draftPrompt ?? ''
    if (!nextPrompt.trim()) {
      setIsEditing(false)
      setDraftPrompt(editablePrompt)
      return
    }
    onUpdateEditablePrompt(nextPrompt, editablePrompt)
    setIsEditing(false)
    setCopyState('idle')
  }, [draftPrompt, editablePrompt, onUpdateEditablePrompt])

  const toggleEdit = useCallback(() => {
    if (isEditing) {
      handleConfirmEdit()
    } else {
      handleStartEdit()
    }
  }, [handleConfirmEdit, handleStartEdit, isEditing])

  const handleDismissEdit = useCallback(() => {
    setIsEditing(false)
    setDraftPrompt(editablePrompt)
    setCopyState('idle')
  }, [editablePrompt])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setIsEditLayerVisible(isEditing)
    })
    return () => cancelAnimationFrame(id)
  }, [isEditing])

  useEffect(() => {
    if (isEditing && editTextAreaRef.current) {
      const el = editTextAreaRef.current
      el.focus()
      const len = el.value.length
      el.setSelectionRange(len, len)
    }
  }, [draftPrompt, isEditing])

  const editDisabled = isEditing && !(draftPrompt ?? '').trim()
  const editButtonTitle = isEditing ? 'Confirm changes' : 'Edit prompt'
  const showDiff = hasDiff && !isEditing
  const cardLabel = isEditing ? 'Editing prompt' : showDiff ? 'Updated prompt shown with changes' : 'Current prompt'
  const handleCardClick = useCallback(() => {
    if (isEditing) return
    handleCopyClick()
  }, [handleCopyClick, isEditing])

  const handleCardKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isEditing) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleCopyClick()
      }
    },
    [handleCopyClick, isEditing]
  )

  const handleEditAreaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      // Allow newlines in the textarea but prevent bubbling to outer submit handlers.
      e.stopPropagation()
    }
  }, [])

  useEffect(() => {
    if (!isEditing || !editTextAreaRef.current) return
    const el = editTextAreaRef.current
    // Auto-size to content to avoid scrollbars and layout jumps.
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 180)}px`
  }, [draftPrompt, isEditing])

  const cardMotionClass = isEditing
    ? 'translate-y-[-8px] scale-[1.02] shadow-[0_26px_72px_rgba(0,0,0,0.55)] border-slate-700 bg-slate-950/70'
    : 'shadow-[0_14px_42px_rgba(0,0,0,0.35)]'

  const renderDiffLines = useMemo(() => {
    if (!diffLines) return null
    let changeRefAttached = false
    return diffLines.map((line, index) => {
      const isAdded = line.type === 'added'
      const isRemoved = line.type === 'removed'
      const attachRef = !changeRefAttached && (isAdded || isRemoved)
      if (attachRef) changeRefAttached = true
      const prefix = isAdded ? '+' : isRemoved ? '-' : ' '
      const lineClass = isAdded
        ? 'bg-emerald-500/10 text-emerald-100 border-emerald-700/60'
        : isRemoved
        ? 'bg-rose-500/10 text-rose-100 border-rose-700/60'
        : 'text-slate-100'
      const markerClass = isAdded ? 'text-emerald-300' : isRemoved ? 'text-rose-300' : 'text-slate-500'
      return (
        <div
          key={`${line.type}-${index}-${line.content.slice(0, 12)}`}
          ref={attachRef ? firstChangeRef : undefined}
          className={`flex gap-2 whitespace-pre-wrap wrap-break-word text-[14px] leading-relaxed font-mono px-3 py-1.5 ${lineClass}`}
        >
          <span className={`w-4 shrink-0 text-right ${markerClass}`} aria-hidden="true">
            {prefix}
          </span>
          <span className="flex-1">{line.content || ' '}</span>
        </div>
      )
    })
  }, [diffLines])

  useEffect(() => {
    const node = firstChangeRef.current
    if (showDiff && node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [promptEditDiff, showDiff])

  const promptCard = (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4 transition-all duration-200 ease-out hover:border-slate-600 ${cardMotionClass} ${
        isEditing ? 'cursor-text' : 'cursor-pointer'
      }`}
      role={isEditing ? undefined : 'button'}
      tabIndex={isEditing ? -1 : 0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label={isEditing ? 'Editable prompt' : 'Copy prompt'}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] text-slate-400">{cardLabel}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleEdit()
            }}
            className={copyIconButtonClass}
            aria-label={editButtonTitle}
            title={editButtonTitle}
            disabled={editDisabled}
          >
            {isEditing ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0-2.1-2.1L6 17.9V20z"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M13.5 6.5l3 3" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleCopyClick(isEditing ? draftPrompt : undefined)
            }}
            className={copyIconButtonClass}
            aria-label="Copy prompt"
            title={copyState === 'copied' ? 'Copied' : 'Copy prompt'}
          >
            {copyState === 'copied' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <rect x="9" y="9" width="10" height="12" rx="2" ry="2" strokeWidth={1.6} />
                <path d="M5 15V5a2 2 0 012-2h8" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <div ref={editablePromptRef} className="w-full overflow-x-hidden">
        {showDiff ? (
          <div className="rounded-lg">{renderDiffLines}</div>
        ) : isEditing ? (
          <textarea
            ref={editTextAreaRef}
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            onKeyDown={handleEditAreaKeyDown}
            aria-label="Edit prompt text"
            className="w-full min-h-[180px] resize-none overflow-hidden bg-transparent border-0 px-0 text-[15px] leading-relaxed text-slate-50 font-mono focus-visible:outline-none focus-visible:ring-0"
          />
        ) : (
          <pre className="whitespace-pre-wrap wrap-break-word text-[15px] leading-relaxed text-slate-50 font-mono">
            {editablePrompt}
          </pre>
        )}
      </div>
      {(onLike || onDislike) && (
        <div className="mt-3 flex items-center justify-end gap-2 text-[12px] text-slate-400">
          {onLike && (
            <button
              type="button"
              aria-label="Like prompt"
              title="Like prompt"
              className={sentimentButtonClass}
              onClick={(e) => {
                e.stopPropagation()
                onLike()
              }}
              disabled={likeState === 'liked'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M10.5 20H6a2 2 0 0 1-2-2v-5.5A2.5 2.5 0 0 1 6.5 10H9l1.5-4.5A2 2 0 0 1 12.4 4a2 2 0 0 1 1.7 1L16 8h3a2 2 0 0 1 1.95 2.35l-1.1 6A2 2 0 0 1 17.9 18H12"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {onDislike && (
            <button
              type="button"
              aria-label="Dislike prompt"
              title="Dislike prompt"
              className={sentimentButtonClass}
              onClick={(e) => {
                e.stopPropagation()
                onDislike()
              }}
              disabled={likeState === 'disliked'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M13.5 4H18a2 2 0 0 1 2 2v5.5A2.5 2.5 0 0 1 17.5 14H15l-1.5 4.5A2 2 0 0 1 11.6 20a2 2 0 0 1-1.7-1L8 16H5a2 2 0 0 1-1.95-2.35l1.1-6A2 2 0 0 1 6.1 6H12"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="mt-6 space-y-3 border-t border-slate-800 pt-4">
      {linksSlot}

      {!isEditing && promptCard}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur-sm transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Edit prompt"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              handleDismissEdit()
            }
          }}
        >
          <div
            className={`w-full max-w-4xl transform-gpu transition-all duration-200 ease-out ${
              isEditLayerVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.96] translate-y-2'
            }`}
          >
            {promptCard}
          </div>
        </div>
      )}
    </div>
  )
})

const ApprovedPromptLinks = memo(function ApprovedPromptLinks({
  prompt,
  disabled = false,
  onStartNewConversation,
  onFinalBack,
  showBack = false,
  showActions = true,
}: {
  prompt: string
  disabled?: boolean
  onStartNewConversation?: () => void
  onFinalBack?: () => void
  showBack?: boolean
  showActions?: boolean
}) {
  type PromptProvider =
    | { id: string; label: string; href: string; action?: undefined; hint?: undefined }
    | { id: string; label: string; href?: undefined; action: () => void; hint?: string }

  const providers: PromptProvider[] = useMemo(() => {
    const encoded = encodeURIComponent(prompt)
    return [
      { id: 'chatgpt', label: 'ChatGPT', href: `https://chatgpt.com/?q=${encoded}` },
      { id: 'claude', label: 'Claude', href: `https://claude.ai/new?q=${encoded}` },
      { id: 'perplexity', label: 'Perplexity', href: `https://www.perplexity.ai/search?q=${encoded}` },
      {
        id: 'gemini',
        label: 'Gemini (AI Studio)',
        href: `https://aistudio.google.com/prompts/new_chat?prompt=${encoded}`,
      },
    ]
  }, [prompt])

  const renderProviderLabel = (provider: PromptProvider) => {
    const icon = providerIcons[provider.id]
    return (
      <span className="inline-flex items-center gap-2">
        {icon ? (
          <Image
            src={icon.src}
            alt={icon.alt}
            width={20}
            height={20}
            className="h-5 w-5 rounded-sm"
            loading="lazy"
            unoptimized
          />
        ) : null}
        <span>{provider.label}</span>
      </span>
    )
  }

  const hasActions = showActions && Boolean(onStartNewConversation || (showBack && onFinalBack))

  return (
    <div className="mt-5 text-[15px] text-slate-200 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-5">
        <div className="space-y-2">
          <div className="text-[14px] uppercase tracking-wide text-slate-500">Open prompt in popular AIs</div>
          <div className={`flex flex-wrap gap-4 ${disabled ? 'opacity-50' : ''}`}>
            {providers.map((provider) =>
              'action' in provider ? (
                <button
                  key={provider.id}
                  type="button"
                  onClick={disabled ? undefined : provider.action}
                  disabled={disabled}
                  className={`inline-flex items-center gap-2 cursor-pointer bg-transparent text-[14px] text-slate-100 underline decoration-transparent underline-offset-4 hover:decoration-current ${
                    disabled ? 'cursor-not-allowed' : ''
                  }`}
                  title={
                    disabled ? 'Prompt not ready to open yet' : provider.hint ?? 'Copies prompt, then opens in new tab'
                  }
                >
                  {renderProviderLabel(provider)}
                </button>
              ) : (
                <a
                  key={provider.id}
                  href={disabled ? undefined : provider.href}
                  target={disabled ? undefined : '_blank'}
                  rel={disabled ? undefined : 'noreferrer'}
                  aria-disabled={disabled}
                  className={`inline-flex items-center gap-2 cursor-pointer text-[14px] text-slate-100 underline decoration-transparent underline-offset-4 hover:decoration-current ${
                    disabled ? 'pointer-events-none cursor-not-allowed' : ''
                  }`}
                  title={disabled ? 'Prompt not ready to open yet' : 'Prefills and opens in a new tab'}
                >
                  {renderProviderLabel(provider)}
                </a>
              )
            )}
          </div>
        </div>
        {hasActions && (
          <div className="flex flex-wrap items-center justify-end gap-2 md:items-center md:self-start">
            {showBack && onFinalBack && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onFinalBack()
                }}
                className={`${primaryActionButtonClass} h-[44px]`}
              >
                ← Back
              </button>
            )}
            {onStartNewConversation && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onStartNewConversation()
                }}
                className={`${primaryActionButtonClass} h-[44px]`}
              >
                New
              </button>
            )}
          </div>
        )}
      </div>
      <div className="h-3" />
    </div>
  )
})

/**
 * Terminal output area with memoized sub-components to prevent unnecessary re-renders.
 * This is one of the heaviest components in the app due to rendering many lines.
 */
export const TerminalOutputArea = memo(function TerminalOutputArea({
  lines: _lines = [],
  activity = null,
  editablePrompt,
  promptEditDiff = null,
  promptForLinks = null,
  awaitingQuestionConsent,
  consentSelectedIndex,
  answeringQuestions,
  currentClarifyingQuestion,
  currentClarifyingQuestionIndex = null,
  clarifyingTotalCount = 0,
  clarifyingSelectedOptionIndex,
  clarifyingCanSubmit = false,
  clarifyingLastAnswer = null,
  editablePromptRef,
  scrollRef,
  inputRef: _inputRef,
  onFocusInput,
  onFocusInputSelectFree,
  onHelpCommandClick: _onHelpCommandClick,
  onConsentOptionClick,
  onClarifyingOptionClick,
  onUndoAnswer,
  onClarifyingSkip,
  onCopyEditable,
  onUpdateEditablePrompt,
  onStartNewConversation,
  onLike,
  onDislike,
  likeState = 'none',
  isAskingPreferenceQuestions = false,
  currentPreferenceQuestionKey = null,
  preferenceSelectedOptionIndex = null,
  preferenceLastAnswer = null,
  onPreferenceFocusInputSelectFree,
  onPreferenceOptionClick,
  onPreferenceSkip,
  onPreferenceYourAnswer,
  onPreferenceBack,
  getPreferenceOptions,
  getPreferenceQuestionText,
  getPreferenceOrder,
  getPreferencesToAsk,
  showStarter = false,
  generationMode = 'guided',
  onModeChange,
  onFinalBack,
}: TerminalOutputAreaProps) {
  const lines = _lines
  void _inputRef
  void _onHelpCommandClick
  const handleModeKeyDown = useCallback(
    (e: React.KeyboardEvent, targetMode: GenerationMode) => {
      const key = e.key.toLowerCase()
      const moveFocus = (direction: 'prev' | 'next') => {
        const current = e.currentTarget as HTMLButtonElement | null
        const container = current?.parentElement
        if (!container) return
        const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-mode-index]'))
        const currentIndex = buttons.indexOf(current)
        if (currentIndex === -1) return
        const delta = direction === 'next' ? 1 : -1
        const nextIndex = (currentIndex + delta + buttons.length) % buttons.length
        buttons[nextIndex]?.focus()
      }

      if (key === 'arrowleft' || key === 'arrowup') {
        e.preventDefault()
        moveFocus('prev')
        return
      }

      if (key === 'arrowright' || key === 'arrowdown') {
        e.preventDefault()
        moveFocus('next')
        return
      }

      if (key === 'enter') {
        e.preventDefault()
        onModeChange?.(targetMode, { silent: true })
      }
    },
    [onModeChange]
  )
  // Memoize the rendered lines to prevent recalculation on every render
  // Legacy log hidden — we rely on structured cards instead.

  const hasLinksContainer = editablePrompt !== null || promptForLinks !== null
  const linksPrompt = (promptForLinks ?? editablePrompt ?? '').toString()
  const linksDisabled = linksPrompt.trim().length === 0
  return (
    <div ref={scrollRef} className="relative flex min-h-0 flex-1 overflow-visible">
      <div className="terminal-scroll flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-6 pb-6 text-[15px] leading-relaxed text-slate-200 font-mono bg-slate-950 pt-6">
        {activity && (
          <div className={`bg-slate-950 ${elevationShadowClass} rounded-xl`}>
            <ActivityBlock activity={activity} />
          </div>
        )}
        {onStartNewConversation && activity?.status === 'error' && activity?.message === 'Task unclear' && (
          <div className="mt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onStartNewConversation()
              }}
              className={`${primaryActionButtonClass} w-full justify-center h-[44px]`}
            >
              Start new conversation
            </button>
          </div>
        )}

        {lines.length > 0 && (
          <div className="space-y-2" aria-label="Conversation history">
            {lines.map((line, idx) => {
              const roleClass =
                line.role === ROLE.USER ? 'text-sky-200' : line.role === ROLE.APP ? 'text-slate-200' : 'text-slate-400'
              return (
                <div
                  key={`${line.id}-${idx}`}
                  className={`whitespace-pre-wrap text-[14px] leading-relaxed ${roleClass}`}
                >
                  {line.text}
                </div>
              )
            })}
          </div>
        )}

        {showStarter && onModeChange && (
          <div className="space-y-3 pt-2 md:pt-4">
            <div className="text-[15px] font-semibold text-slate-200">
              Let&apos;s choose a mode and generate your prompt.
            </div>
            <div className="grid gap-3 md:grid-cols-2" role="group" aria-label="Select mode for this prompt">
              <button
                type="button"
                onClick={() => onModeChange?.('quick', { silent: true })}
                onKeyDown={(e) => handleModeKeyDown(e, 'quick')}
                autoFocus
                data-mode-index="0"
                className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                  generationMode === 'quick'
                    ? 'border-slate-600 bg-slate-900 text-slate-50'
                    : 'border-slate-800 bg-slate-950/50 text-slate-100 hover:border-slate-600 hover:bg-slate-900'
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center text-slate-100">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M10 3l-4 10h5l-2 8 9-12h-6l2-6z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <div className="text-[14px] font-semibold text-slate-100">Quick Start</div>
                  <div className="text-[13px] text-slate-300">
                    Fastest. Generates the prompt immediately without clarifying or preference questions.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onModeChange?.('guided', { silent: true })}
                onKeyDown={(e) => handleModeKeyDown(e, 'guided')}
                data-mode-index="1"
                className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                  generationMode === 'guided'
                    ? 'border-slate-600 bg-slate-900 text-slate-50'
                    : 'border-slate-800 bg-slate-950/50 text-slate-100 hover:border-slate-600 hover:bg-slate-900'
                }`}
              >
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center text-slate-100">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  >
                    <path d="M9 18h6" strokeLinecap="round" />
                    <path d="M10.5 20.5h3" strokeLinecap="round" />
                    <path
                      d="M12 3.5c-3 0-5.5 2.3-5.5 5.2 0 1.7.8 3.2 2.1 4.2.6.5 1 .9 1 1.6V16h4.8v-.5c0-.7.4-1.1 1-1.6 1.3-1 2.1-2.5 2.1-4.2 0-2.9-2.5-5.2-5.5-5.2Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M10.5 14h3" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <div className="text-[14px] font-semibold text-slate-100">Guided Build</div>
                  <div className="text-[13px] text-slate-300">
                    Asks brief clarifying and preference questions first for higher-quality prompts.
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {awaitingQuestionConsent && (
          <ConsentButtons consentSelectedIndex={consentSelectedIndex} onConsentOptionClick={onConsentOptionClick} />
        )}

        {answeringQuestions && currentClarifyingQuestion && currentClarifyingQuestion.options.length === 0 && (
          <ClarifyingQuestionPrompt
            question={currentClarifyingQuestion}
            currentIndex={currentClarifyingQuestionIndex ?? 0}
            totalCount={clarifyingTotalCount}
            selectedOptionIndex={clarifyingSelectedOptionIndex}
            canSubmit={clarifyingCanSubmit}
            lastAnsweredValue={clarifyingLastAnswer}
            onUndoAnswer={onUndoAnswer}
            onFocusInput={onFocusInput}
            onFocusInputSelectFree={onFocusInputSelectFree}
            onSkip={onClarifyingSkip}
          />
        )}

        {answeringQuestions && currentClarifyingQuestion && currentClarifyingQuestion.options.length > 0 && (
          <ClarifyingOptions
            question={currentClarifyingQuestion}
            selectedOptionIndex={clarifyingSelectedOptionIndex}
            onOptionClick={onClarifyingOptionClick}
            onUndoAnswer={onUndoAnswer}
            onFocusInput={onFocusInput}
            onFocusInputSelectFree={onFocusInputSelectFree}
            onSkip={onClarifyingSkip}
            lastAnsweredValue={clarifyingLastAnswer}
          />
        )}

        {isAskingPreferenceQuestions &&
          currentPreferenceQuestionKey &&
          getPreferenceOptions &&
          getPreferenceQuestionText &&
          getPreferencesToAsk &&
          onPreferenceOptionClick &&
          (() => {
            const options = getPreferenceOptions(currentPreferenceQuestionKey)
            const prefsOrder =
              typeof getPreferenceOrder === 'function' && getPreferenceOrder()
                ? getPreferenceOrder()
                : getPreferencesToAsk()
            const currentIndex = prefsOrder.indexOf(currentPreferenceQuestionKey)
            return (
              <PreferenceOptions
                questionText={getPreferenceQuestionText(currentPreferenceQuestionKey)}
                options={options}
                selectedOptionIndex={preferenceSelectedOptionIndex ?? null}
                currentIndex={currentIndex}
                totalCount={prefsOrder.length}
                onOptionClick={onPreferenceOptionClick}
                onFocusInput={onPreferenceYourAnswer ?? onFocusInput}
                onFocusInputSelectFree={onPreferenceFocusInputSelectFree ?? onPreferenceYourAnswer ?? onFocusInput}
                onUndoAnswer={onPreferenceBack ?? (() => {})}
                onSkip={onPreferenceSkip}
                lastAnsweredValue={preferenceLastAnswer}
              />
            )
          })()}

        {editablePrompt !== null && (
          <EditablePromptSection
            editablePrompt={editablePrompt}
            promptEditDiff={promptEditDiff}
            editablePromptRef={editablePromptRef}
            onCopyEditable={onCopyEditable}
            onUpdateEditablePrompt={onUpdateEditablePrompt}
            linksSlot={
              hasLinksContainer ? (
                <ApprovedPromptLinks
                  prompt={linksPrompt}
                  disabled={linksDisabled}
                  onStartNewConversation={onStartNewConversation}
                  onFinalBack={onFinalBack}
                  showBack={Boolean(editablePrompt && onFinalBack)}
                  showActions={false}
                />
              ) : null
            }
            onLike={onLike}
            onDislike={onDislike}
            likeState={likeState}
          />
        )}

        {editablePrompt !== null && hasLinksContainer && Boolean(onStartNewConversation || onFinalBack) && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onFinalBack && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onFinalBack()
                }}
                className={`${primaryActionButtonClass} h-[52px] min-w-[150px] px-4 text-[15px] gap-2 justify-center`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M15 18l-6-6 6-6" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
            )}
            {onStartNewConversation && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onStartNewConversation()
                }}
                className={`${primaryActionButtonClass} h-[52px] min-w-[150px] px-4 text-[15px] gap-2 justify-center`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M12 5v14M5 12h14" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                New
              </button>
            )}
          </div>
        )}

        {!editablePrompt && <div className="min-h-50" aria-hidden />}
      </div>
    </div>
  )
})
