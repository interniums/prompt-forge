'use client'

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, Copy, Heart, Pencil } from 'lucide-react'
import type { TerminalLine, ClarifyingQuestion, Preferences, GenerationMode, TaskActivity } from '@/lib/types'
import { ROLE, MAX_EDITABLE_PROMPT_LENGTH } from '@/lib/constants'

type PromptEditDiff = { previous: string; current: string }

const providerIcons: Record<string, { src: string; alt: string }> = {
  chatgpt: { src: 'https://cdn.simpleicons.org/openai', alt: 'OpenAI logo' },
  claude: { src: 'https://cdn.simpleicons.org/claude', alt: 'Claude logo' },
  perplexity: { src: 'https://cdn.simpleicons.org/perplexity', alt: 'Perplexity logo' },
  gemini: { src: 'https://cdn.simpleicons.org/googlegemini', alt: 'Google Gemini logo' },
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
  likeState?: 'none' | 'liked'
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
      <div className="text-[16px] text-slate-50 font-mono leading-relaxed">{questionText}</div>
      <div className="text-[13px] text-slate-400">
        Pick one option or choose “My own answer” — click or use ↑↓; Enter to continue.
      </div>
      <div className="flex flex-col gap-2">
        {options.map((opt, index) => {
          const isSelected = index === selectedOptionIndex
          // Check both label and value for outline matching (answer might be stored as value)
          const optLabel = opt.label.trim().toLowerCase()
          const optValue = ((opt as { value?: string }).value ?? opt.label).trim().toLowerCase()
          const lastLower = normalizedLast.toLowerCase()
          const isLast = hasLast && (lastLower === optLabel || lastLower === optValue)
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onOptionClick(index)}
              aria-pressed={isSelected}
              data-selected={isSelected || undefined}
              data-last={isLast || undefined}
              className="group flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-left text-[14px] question-option"
            >
              <span className="mt-0.5 text-[13px]" style={{ color: 'var(--pf-foreground-muted)' }}>
                {opt.id})
              </span>
              <span className="font-mono text-[14px]" style={{ color: 'var(--pf-foreground)' }}>
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
          data-selected={myOwnSelected || undefined}
          className="group flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-left text-[14px] question-option"
        >
          <span className="mt-0.5 text-[13px]" style={{ color: 'var(--pf-foreground-muted)' }}>
            •
          </span>
          <span className="font-mono text-[14px]" style={{ color: 'var(--pf-foreground)' }}>
            My own answer
          </span>
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
        {currentIndex > 0 && (
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
        )}
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
  currentIndex,
  selectedOptionIndex,
  onOptionClick,
  onUndoAnswer,
  onFocusInput,
  onFocusInputSelectFree,
  onSkip,
  lastAnsweredValue = null,
}: {
  question: ClarifyingQuestion
  currentIndex: number
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
        {question.options.slice(0, 4).map((opt, index) => {
          const isSelected = index === selectedOptionIndex
          // Case-insensitive comparison for outline matching
          const isLast = hasLast && normalizedLast.toLowerCase() === opt.label.trim().toLowerCase()
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onOptionClick(index)}
              aria-pressed={isSelected}
              data-selected={isSelected || undefined}
              data-last={isLast || undefined}
              className="group flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-left text-[14px] question-option"
            >
              <span className="mt-0.5 text-[13px]" style={{ color: 'var(--pf-foreground-muted)' }}>
                {opt.id})
              </span>
              <span className="font-mono text-[14px]" style={{ color: 'var(--pf-foreground)' }}>
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
          data-selected={myOwnSelected || undefined}
          className="group flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-left text-[14px] question-option"
        >
          <span className="mt-0.5 text-[13px]" style={{ color: 'var(--pf-foreground-muted)' }}>
            •
          </span>
          <span className="font-mono text-[14px]" style={{ color: 'var(--pf-foreground)' }}>
            My own answer
          </span>
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {currentIndex > 0 && (
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
        )}
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
  promptEditDiff: _promptEditDiff = null,
  editablePromptRef,
  onCopyEditable,
  onUpdateEditablePrompt,
  linksSlot = null,
  onLike,
  likeState = 'none',
}: {
  editablePrompt: string
  promptEditDiff?: PromptEditDiff | null
  editablePromptRef: React.RefObject<HTMLDivElement | null>
  onCopyEditable: (textOverride?: string) => Promise<void> | void
  onUpdateEditablePrompt: (nextPrompt: string, previousPrompt: string) => void
  linksSlot?: React.ReactNode
  onLike?: () => void
  likeState?: 'none' | 'liked'
}) {
  void _promptEditDiff
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [isEditing, setIsEditing] = useState(false)
  const [isEditLayerVisible, setIsEditLayerVisible] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState(editablePrompt)
  const promptLength = draftPrompt?.length ?? 0
  const isOverMaxLength = promptLength > MAX_EDITABLE_PROMPT_LENGTH
  const excessCharacters = Math.max(0, promptLength - MAX_EDITABLE_PROMPT_LENGTH)
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
    if (nextPrompt.length > MAX_EDITABLE_PROMPT_LENGTH) {
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

  const editDisabled = isEditing && (isOverMaxLength || !(draftPrompt ?? '').trim())
  const editButtonTitle = isEditing ? 'Confirm changes' : 'Edit prompt'
  const showDiff = false
  const cardLabel = isEditing ? 'Editing prompt' : 'Current prompt'
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
    // Auto-size to content while keeping the modal within the viewport.
    el.style.height = 'auto'
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : null
    const maxHeight = viewportHeight ? Math.floor(viewportHeight * 0.6) : null
    const nextHeight = Math.max(180, maxHeight ? Math.min(el.scrollHeight, maxHeight) : el.scrollHeight)
    el.style.height = `${nextHeight}px`
  }, [draftPrompt, isEditing])

  const cardMotionClass = isEditing
    ? 'translate-y-[-4px] scale-[1.005] shadow-[0_18px_48px_rgba(0,0,0,0.42)] border-slate-700 bg-slate-950/85'
    : 'shadow-[0_14px_42px_rgba(0,0,0,0.35)]'

  const renderDiffLines = null

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
      <div className="flex items-start justify-between gap-3 mb-3">
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
            {isEditing ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
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
            {copyState === 'copied' ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <div ref={editablePromptRef} className="w-full overflow-x-hidden">
        {showDiff ? (
          <div className="rounded-lg">{renderDiffLines}</div>
        ) : isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={editTextAreaRef}
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              onKeyDown={handleEditAreaKeyDown}
              aria-label="Edit prompt text"
              className="w-full min-h-[180px] max-h-[60vh] resize-none overflow-y-auto overflow-x-hidden bg-transparent border-0 px-0 pt-2 pr-2 text-[15px] leading-relaxed font-mono focus-visible:outline-none focus-visible:ring-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
              style={{
                color: 'var(--pf-foreground)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
              }}
            />
            <div className="flex items-center justify-between text-[12px] text-slate-400">
              <span>Max {MAX_EDITABLE_PROMPT_LENGTH.toLocaleString('en-US')} characters</span>
              <span aria-live="polite" className={isOverMaxLength ? 'text-amber-300' : undefined}>
                {promptLength.toLocaleString('en-US')} / {MAX_EDITABLE_PROMPT_LENGTH.toLocaleString('en-US')}
              </span>
            </div>
            {isOverMaxLength && (
              <div className="text-[12px] text-amber-300" role="status" aria-live="polite">
                Remove {excessCharacters.toLocaleString('en-US')} characters to save changes.
              </div>
            )}
          </div>
        ) : (
          <pre
            className="whitespace-pre-wrap wrap-break-word text-[15px] leading-relaxed font-mono"
            style={{ color: 'var(--pf-foreground)', wordBreak: 'break-word' }}
          >
            {editablePrompt}
          </pre>
        )}
      </div>
      {onLike && (
        <div className="mt-3 flex items-center justify-end gap-2 text-[12px] text-slate-400">
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
            {likeState === 'liked' ? <Heart className="h-5 w-5 fill-current" /> : <Heart className="h-5 w-5" />}
          </button>
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
          className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto overflow-x-hidden bg-black/60 px-4 py-8 sm:py-12 safe-px safe-pt safe-pb backdrop-blur-sm transition-opacity duration-200"
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
            } max-h-[calc(100vh-96px)] px-3 sm:px-4 py-5 sm:py-6 safe-px safe-pt safe-pb`}
          >
            <div
              className="w-full overflow-y-auto overflow-x-hidden p-2
              style={{ maxHeight: 'calc(100vh - 140px)' }}
            "
            >
              {promptCard}
            </div>
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
  getPreferencesToAsk,
  showStarter = false,
  generationMode = 'guided',
  onModeChange,
  onFinalBack,
}: TerminalOutputAreaProps) {
  const lines = _lines
  void _inputRef
  void _onHelpCommandClick
  const selectMode = useCallback(
    (mode: GenerationMode) => {
      onModeChange?.(mode, { silent: true })
      onFocusInput?.()
    },
    [onFocusInput, onModeChange]
  )

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
        selectMode(targetMode)
      }
    },
    [selectMode]
  )
  // Memoize the rendered lines to prevent recalculation on every render
  // Legacy log hidden — we rely on structured cards instead.

  const hasLinksContainer = editablePrompt !== null || promptForLinks !== null
  const linksPrompt = (promptForLinks ?? editablePrompt ?? '').toString()
  const linksDisabled = linksPrompt.trim().length === 0

  // Center content vertically when showing starter (empty/fresh state)
  const isCenteredLayout = showStarter && !editablePrompt && !activity && lines.length === 0

  return (
    <div ref={scrollRef} className="relative h-full">
      <div
        className={`terminal-scroll h-full overflow-y-auto overflow-x-hidden safe-px pt-12 sm:pt-16 text-[15px] leading-relaxed text-slate-200 font-mono ${
          isCenteredLayout ? 'flex flex-col justify-center items-center' : ''
        }`}
        style={{ paddingBottom: 'calc(7.5rem + var(--pf-safe-bottom))' }}
      >
        {/* Content container - same max-width as input bar */}
        <div className="w-full responsive-container-narrow space-y-3">
          {activity && (
            <div className={`bg-slate-950/80 backdrop-blur-sm ${elevationShadowClass} rounded-xl`}>
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
                  line.role === ROLE.USER
                    ? 'text-sky-200'
                    : line.role === ROLE.APP
                    ? 'text-slate-200'
                    : 'text-slate-400'
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
            <div className="relative w-full responsive-container-narrow">
              <div className="relative space-y-5 py-5">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-semibold text-foreground drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                    What would you like to create?
                  </h1>
                  <p className="text-[15px] text-subtle-boost">Choose a mode to get started</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2" role="group" aria-label="Select mode for this prompt">
                  <button
                    type="button"
                    onClick={() => selectMode('quick')}
                    onKeyDown={(e) => handleModeKeyDown(e, 'quick')}
                    autoFocus={generationMode === 'quick'}
                    data-mode-index="0"
                    data-selected={generationMode === 'quick' || undefined}
                    aria-pressed={generationMode === 'quick'}
                    className="mode-card group relative flex w-full cursor-pointer items-start gap-3 rounded-xl px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-border-strong) focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  >
                    {generationMode === 'quick' && (
                      <span className="mode-card-check" aria-hidden="true">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center text-foreground">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M10 3l-4 10h5l-2 8 9-12h-6l2-6z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="space-y-1 pr-8">
                      <div className="text-[14px] font-semibold text-foreground">Quick Start</div>
                      <div className="text-[13px] text-subtle-boost">Generate instantly (no questions).</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectMode('guided')}
                    onKeyDown={(e) => handleModeKeyDown(e, 'guided')}
                    autoFocus={generationMode === 'guided'}
                    data-mode-index="1"
                    data-selected={generationMode === 'guided' || undefined}
                    aria-pressed={generationMode === 'guided'}
                    className="mode-card group relative flex w-full cursor-pointer items-start gap-3 rounded-xl px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--pf-border-strong) focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  >
                    {generationMode === 'guided' && (
                      <span className="mode-card-check" aria-hidden="true">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center text-foreground">
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
                    <div className="space-y-1 pr-8">
                      <div className="text-[14px] font-semibold text-foreground">Guided Build</div>
                      <div className="text-[13px] text-subtle-boost">Answer a few questions for a better result.</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {awaitingQuestionConsent && (
            <ConsentButtons consentSelectedIndex={consentSelectedIndex} onConsentOptionClick={onConsentOptionClick} />
          )}

          {answeringQuestions && currentClarifyingQuestion && currentClarifyingQuestion.options.length === 0 && (
            <div>
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
            </div>
          )}

          {answeringQuestions && currentClarifyingQuestion && currentClarifyingQuestion.options.length > 0 && (
            <div>
              <ClarifyingOptions
                question={currentClarifyingQuestion}
                currentIndex={currentClarifyingQuestionIndex ?? 0}
                selectedOptionIndex={clarifyingSelectedOptionIndex}
                onOptionClick={onClarifyingOptionClick}
                onUndoAnswer={onUndoAnswer}
                onFocusInput={onFocusInput}
                onFocusInputSelectFree={onFocusInputSelectFree}
                onSkip={onClarifyingSkip}
                lastAnsweredValue={clarifyingLastAnswer}
              />
            </div>
          )}

          {isAskingPreferenceQuestions &&
            currentPreferenceQuestionKey &&
            getPreferenceOptions &&
            getPreferenceQuestionText &&
            getPreferencesToAsk &&
            onPreferenceOptionClick &&
            (() => {
              const options = getPreferenceOptions(currentPreferenceQuestionKey)
              return (
                <div>
                  <PreferenceOptions
                    questionText={getPreferenceQuestionText(currentPreferenceQuestionKey)}
                    options={options}
                    selectedOptionIndex={preferenceSelectedOptionIndex ?? null}
                    onOptionClick={onPreferenceOptionClick}
                    onFocusInput={onPreferenceYourAnswer ?? onFocusInput}
                    onFocusInputSelectFree={onPreferenceFocusInputSelectFree ?? onPreferenceYourAnswer ?? onFocusInput}
                    onUndoAnswer={onPreferenceBack ?? (() => {})}
                    onSkip={onPreferenceSkip}
                    lastAnsweredValue={preferenceLastAnswer}
                  />
                </div>
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
        {/* Close content container */}
      </div>
    </div>
  )
})
