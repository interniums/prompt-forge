'use client'

import React, { memo, useCallback, useMemo, useState } from 'react'
import Image from 'next/image'
import type { TerminalLine, ClarifyingQuestion, Preferences, GenerationMode, TaskActivity } from '@/lib/types'
import { ROLE } from '@/lib/constants'
import { textButtonClass } from './styles'

const providerIcons: Record<string, { src: string; alt: string }> = {
  chatgpt: { src: 'https://cdn.simpleicons.org/openai', alt: 'OpenAI logo' },
  claude: { src: '/claude.svg', alt: 'Claude logo' }, // served locally to avoid remote failures
  perplexity: { src: 'https://cdn.simpleicons.org/perplexity', alt: 'Perplexity logo' },
  gemini: { src: 'https://cdn.simpleicons.org/googlegemini', alt: 'Google Gemini logo' },
}

const primaryActionButtonClass =
  'inline-flex h-[44px] items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950 px-3 text-[14px] font-semibold text-slate-200 transition hover:border-slate-500 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 cursor-pointer'

export type TerminalOutputAreaProps = {
  lines?: TerminalLine[]
  activity?: TaskActivity | null
  editablePrompt: string | null
  promptForLinks?: string | null
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  answeringQuestions: boolean
  currentClarifyingQuestion: ClarifyingQuestion | null
  currentClarifyingQuestionIndex?: number | null
  clarifyingTotalCount?: number
  clarifyingSelectedOptionIndex: number | null
  editablePromptRef: React.RefObject<HTMLDivElement | null>
  scrollRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  clarifyingAnswersCount: number
  onHelpCommandClick: (cmd: string) => void
  onConsentOptionClick: (index: number) => void
  onClarifyingOptionClick: (index: number) => void
  onUndoAnswer: () => void
  onRevise: () => void
  onCopyEditable: () => Promise<void> | void
  onStartNewConversation: () => void
  onLike?: () => void
  onDislike?: () => void
  likeState?: 'none' | 'liked' | 'disliked'
  isAskingPreferenceQuestions?: boolean
  currentPreferenceQuestionKey?: keyof Preferences | null
  preferenceSelectedOptionIndex?: number | null
  onPreferenceOptionClick?: (index: number) => void
  getPreferenceOptions?: (key: keyof Preferences) => Array<{ id: string; label: string }>
  getPreferenceQuestionText?: (key: keyof Preferences) => string
  getPreferencesToAsk?: () => Array<keyof Preferences>
  showStarter?: boolean
  starterTitle?: string
  starterSubtitle?: string
  generationMode?: GenerationMode
  onModeChange?: (mode: GenerationMode, options?: { silent?: boolean }) => void
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
      : 'In progress'

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-5 w-5 text-slate-200">
          {isLoading && (
            <span
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-500 border-t-transparent"
              aria-label="Loading"
            />
          )}
          {isSuccess && (
            <svg
              className="h-5 w-5 text-emerald-400"
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
              className="h-5 w-5 text-rose-400"
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
  const options = useMemo(() => ['Generate now', 'Sharpen first (3 quick questions)'], [])

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
}: {
  questionText: string
  options: Array<{ id: string; label: string }>
  selectedOptionIndex: number | null
  currentIndex: number
  totalCount: number
  onOptionClick: (index: number) => void
}) {
  if (options.length === 0) return null

  return (
    <div className="mt-6 border-t border-slate-700/80 pt-4 text-[15px] text-slate-200 space-y-3">
      <div className="text-[16px] text-slate-50 font-mono leading-relaxed">
        Preference {currentIndex + 1}/{totalCount}: {questionText}
      </div>
      <div className="text-[13px] uppercase tracking-wide text-slate-500">
        Choose an option (or answer in your own words)
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onOptionClick(-1)}
          className="cursor-pointer text-left text-[15px] text-slate-300 hover:text-slate-50"
        >
          Skip and generate now
        </button>
        {options.map((opt, index) => {
          const isSelected = index === selectedOptionIndex
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onOptionClick(index)}
              className="cursor-pointer group flex w-full items-start gap-2 px-0 py-1.5 text-left text-[15px] text-slate-300"
            >
              <span className="mt-0.5 text-[13px] text-slate-500">{opt.id})</span>
              <span
                className={`font-mono text-[15px] ${
                  isSelected
                    ? 'text-slate-50 underline underline-offset-4'
                    : 'text-slate-100 group-hover:underline group-hover:underline-offset-4'
                }`}
              >
                {opt.label}
              </span>
            </button>
          )
        })}
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
  answersCount,
  onUndoAnswer,
}: {
  question: ClarifyingQuestion
  currentIndex: number
  totalCount: number
  answersCount: number
  onUndoAnswer: () => void
}) {
  const safeTotal = Math.max(totalCount, currentIndex + 1)
  return (
    <div className="mt-6 border-t border-slate-800 pt-4 text-[14px] text-slate-300 space-y-2">
      <div className="text-[15px] text-slate-50 font-mono leading-relaxed">
        Question {currentIndex + 1}/{safeTotal}: {question.question}
      </div>
      <div className="text-[13px] uppercase tracking-wide text-slate-500">
        Type your answer and press Enter (or click Back to revise).
      </div>
      <div className="flex flex-wrap gap-3 text-[13px] text-slate-400">
        <button
          type="button"
          className={`${textButtonClass} text-slate-300 hover:text-slate-50`}
          onClick={onUndoAnswer}
        >
          ← Back
        </button>
        {answersCount > 0 && <span className="text-slate-500">Answered: {answersCount}</span>}
      </div>
    </div>
  )
})

/**
 * Memoized clarifying question options
 */
const ClarifyingOptions = memo(function ClarifyingOptions({
  question,
  selectedOptionIndex,
  answersCount,
  onOptionClick,
  onUndoAnswer,
}: {
  question: ClarifyingQuestion
  selectedOptionIndex: number | null
  answersCount: number
  onOptionClick: (index: number) => void
  onUndoAnswer: () => void
}) {
  return (
    <div className="mt-6 border-t border-slate-800 pt-4 text-[14px] text-slate-300 space-y-2">
      <div className="text-[15px] text-slate-50 font-mono leading-relaxed">{question.question}</div>
      <div className="text-[13px] uppercase tracking-wide text-slate-500">
        Choose an option (or answer in your own words)
      </div>
      <div className="flex flex-wrap gap-3 text-[13px] text-slate-400">
        <button
          type="button"
          className={`${textButtonClass} ${selectedOptionIndex === -1 ? 'text-slate-50 underline' : ''}`}
          onClick={onUndoAnswer}
        >
          ← Back
        </button>
        {answersCount > 0 && <span className="text-slate-500">Answered: {answersCount}</span>}
      </div>
      <div className="flex flex-col gap-1">
        {question.options.map((opt, index) => {
          const isSelected = index === selectedOptionIndex
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onOptionClick(index)}
              className="cursor-pointer group flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-[14px] text-slate-300"
            >
              <span className="mt-0.5 text-[13px] text-slate-500">{opt.id})</span>
              <span
                className={`font-mono text-[14px] ${
                  isSelected
                    ? 'text-slate-50 underline underline-offset-4'
                    : 'text-slate-100 group-hover:underline group-hover:underline-offset-4'
                }`}
              >
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
})

/**
 * Memoized editable prompt section
 */
const EditablePromptSection = memo(function EditablePromptSection({
  editablePrompt,
  editablePromptRef,
  onCopyEditable,
  onLike,
  onDislike,
  likeState = 'none',
}: {
  editablePrompt: string
  editablePromptRef: React.RefObject<HTMLDivElement | null>
  onCopyEditable: () => Promise<void> | void
  onLike?: () => void
  onDislike?: () => void
  likeState?: 'none' | 'liked' | 'disliked'
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const sentimentButtonClass =
    'inline-flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-md border border-slate-700/80 bg-slate-950 text-slate-200 transition hover:border-slate-500 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed'
  const copyIconButtonClass =
    'inline-flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-md border border-slate-700/80 bg-slate-950 text-slate-200 transition hover:border-slate-500 hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950'
  const handleCopyClick = useCallback(() => {
    const maybePromise = onCopyEditable()
    Promise.resolve(maybePromise)
      .then(() => {
        setCopyState('copied')
      })
      .catch(() => {
        setCopyState('idle')
      })
  }, [onCopyEditable])

  return (
    <div className="mt-6 space-y-3 border-t border-slate-800 pt-4">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] uppercase tracking-wide text-slate-500">Prompt ready</span>
        <span className="text-[14px] text-slate-200">Copy it or open in your AI.</span>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4 shadow-[0_14px_42px_rgba(0,0,0,0.35)]">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCopyClick}
            className={copyIconButtonClass}
            aria-label="Copy prompt"
            title={copyState === 'copied' ? 'Copied' : 'Copy prompt'}
          >
            {copyState === 'copied' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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
        <div ref={editablePromptRef} className="w-full overflow-x-hidden">
          <pre className="whitespace-pre-wrap wrap-break-word text-[15px] leading-relaxed text-slate-50 font-mono">
            {editablePrompt}
          </pre>
        </div>
        {(onLike || onDislike) && (
          <div className="mt-3 flex items-center justify-end gap-2 text-[12px] text-slate-400">
            <div className="flex items-center gap-2">
              {onLike && (
                <button
                  type="button"
                  aria-label="Like prompt"
                  title="Like prompt"
                  className={sentimentButtonClass}
                  onClick={onLike}
                  disabled={likeState === 'liked'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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
                  onClick={onDislike}
                  disabled={likeState === 'disliked'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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
          </div>
        )}
      </div>
    </div>
  )
})

const ApprovedPromptLinks = memo(function ApprovedPromptLinks({
  prompt,
  disabled = false,
  onRevise,
  onStartNewConversation,
}: {
  prompt: string
  disabled?: boolean
  onRevise?: () => void
  onStartNewConversation?: () => void
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
            width={16}
            height={16}
            className="h-4 w-4 rounded-sm"
            loading="lazy"
            unoptimized
          />
        ) : null}
        <span>{provider.label}</span>
      </span>
    )
  }

  const hasActions = Boolean(onRevise || onStartNewConversation)

  return (
    <div className="mt-4 text-[14px] text-slate-200">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="space-y-2">
          <div className="text-[13px] uppercase tracking-wide text-slate-500">Open prompt in popular AIs</div>
          <div className={`flex flex-wrap gap-3 ${disabled ? 'opacity-50' : ''}`}>
            {providers.map((provider) =>
              'action' in provider ? (
                <button
                  key={provider.id}
                  type="button"
                  onClick={disabled ? undefined : provider.action}
                  disabled={disabled}
                  className={`inline-flex items-center gap-2 cursor-pointer bg-transparent text-[13px] text-slate-100 underline decoration-transparent underline-offset-4 hover:decoration-current ${
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
                  className={`inline-flex items-center gap-2 cursor-pointer text-[13px] text-slate-100 underline decoration-transparent underline-offset-4 hover:decoration-current ${
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
            {onRevise && (
              <button type="button" onClick={onRevise} className={primaryActionButtonClass}>
                Revise
              </button>
            )}
            {onStartNewConversation && (
              <button type="button" onClick={onStartNewConversation} className={primaryActionButtonClass}>
                New session
              </button>
            )}
          </div>
        )}
      </div>
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
  promptForLinks = null,
  awaitingQuestionConsent,
  consentSelectedIndex,
  answeringQuestions,
  currentClarifyingQuestion,
  currentClarifyingQuestionIndex = null,
  clarifyingTotalCount = 0,
  clarifyingSelectedOptionIndex,
  editablePromptRef,
  scrollRef,
  inputRef: _inputRef,
  clarifyingAnswersCount,
  onHelpCommandClick: _onHelpCommandClick,
  onConsentOptionClick,
  onClarifyingOptionClick,
  onUndoAnswer,
  onRevise,
  onCopyEditable,
  onStartNewConversation,
  onLike,
  onDislike,
  likeState = 'none',
  isAskingPreferenceQuestions = false,
  currentPreferenceQuestionKey = null,
  preferenceSelectedOptionIndex = null,
  onPreferenceOptionClick,
  getPreferenceOptions,
  getPreferenceQuestionText,
  getPreferencesToAsk,
  showStarter = false,
  generationMode = 'guided',
  onModeChange,
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
      <div className="terminal-scroll flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-6 pb-6 text-[15px] leading-relaxed text-slate-200 font-mono bg-slate-950">
        {activity && <div className=" bg-slate-950 w-full left-0 right-0 h-10 absolute top-0" />}
        {activity && (
          <div className="sticky top-6 z-10 bg-slate-950 shadow-[0_6px_14px_rgba(0,0,0,0.35)] rounded-xl">
            <ActivityBlock activity={activity} />
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
          <div className="space-y-3">
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
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-slate-100">
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
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-slate-100">
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
            answersCount={clarifyingAnswersCount}
            onUndoAnswer={onUndoAnswer}
          />
        )}

        {answeringQuestions && currentClarifyingQuestion && currentClarifyingQuestion.options.length > 0 && (
          <ClarifyingOptions
            question={currentClarifyingQuestion}
            selectedOptionIndex={clarifyingSelectedOptionIndex}
            answersCount={clarifyingAnswersCount}
            onOptionClick={onClarifyingOptionClick}
            onUndoAnswer={onUndoAnswer}
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
            const prefsToAsk = getPreferencesToAsk()
            const currentIndex = prefsToAsk.indexOf(currentPreferenceQuestionKey)
            if (options.length > 0) {
              return (
                <PreferenceOptions
                  questionText={getPreferenceQuestionText(currentPreferenceQuestionKey)}
                  options={options}
                  selectedOptionIndex={preferenceSelectedOptionIndex ?? null}
                  currentIndex={currentIndex}
                  totalCount={prefsToAsk.length}
                  onOptionClick={onPreferenceOptionClick}
                />
              )
            }
            return null
          })()}

        {editablePrompt !== null && (
          <EditablePromptSection
            editablePrompt={editablePrompt}
            editablePromptRef={editablePromptRef}
            onCopyEditable={onCopyEditable}
            onLike={onLike}
            onDislike={onDislike}
            likeState={likeState}
          />
        )}

        {hasLinksContainer && (
          <ApprovedPromptLinks
            prompt={linksPrompt}
            disabled={linksDisabled}
            onRevise={onRevise}
            onStartNewConversation={onStartNewConversation}
          />
        )}

        {!editablePrompt && <div className="min-h-50" aria-hidden />}
      </div>
    </div>
  )
})
