'use client'

import React, { memo, useMemo, useCallback } from 'react'
import Image from 'next/image'
import type { TerminalLine, ClarifyingQuestion, Preferences } from '@/lib/types'
import { ROLE } from '@/lib/constants'
import { textButtonClass } from './styles'

const providerIcons: Record<string, { src: string; alt: string }> = {
  chatgpt: { src: 'https://cdn.simpleicons.org/openai', alt: 'OpenAI logo' },
  claude: { src: 'https://cdn.simpleicons.org/anthropic', alt: 'Anthropic logo' },
  perplexity: { src: 'https://cdn.simpleicons.org/perplexity', alt: 'Perplexity logo' },
  gemini: { src: 'https://cdn.simpleicons.org/googlegemini', alt: 'Google Gemini logo' },
}

export type TerminalOutputAreaProps = {
  lines: TerminalLine[]
  editablePrompt: string | null
  promptForLinks?: string | null
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  answeringQuestions: boolean
  currentClarifyingQuestion: ClarifyingQuestion | null
  clarifyingSelectedOptionIndex: number | null
  editablePromptRef: React.RefObject<HTMLTextAreaElement | null>
  scrollRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  clarifyingAnswersCount: number
  onHelpCommandClick: (cmd: string) => void
  onConsentOptionClick: (index: number) => void
  onClarifyingOptionClick: (index: number) => void
  onUndoAnswer: () => void
  onRevise: () => void
  onEditableChange: (text: string) => void
  onCopyEditable: () => void
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
  starterExamples?: string[]
  starterTitle?: string
  starterSubtitle?: string
  onExampleInsert?: (text: string) => void
}

/**
 * Memoized terminal line component - prevents re-rendering unchanged lines
 */
const TerminalLineItem = memo(function TerminalLineItem({
  line,
  onHelpCommandClick,
  inputRef,
}: {
  line: TerminalLine
  onHelpCommandClick: (cmd: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const isClickableHelp = line.role === ROLE.APP && line.text.trim().startsWith('/')

  if (!isClickableHelp) {
    return (
      <div className="whitespace-pre-wrap leading-[1.7]">
        <span className="pr-1 text-zinc-500">{line.role === ROLE.USER ? '>' : line.role === ROLE.APP ? '' : '#'}</span>
        <span className="text-slate-100">{line.text}</span>
      </div>
    )
  }

  const [cmd, ...rest] = line.text.trim().split(/\s+/)
  const description = rest.join(' ')

  return (
    <button
      type="button"
      className="group flex w-full items-baseline whitespace-pre-wrap text-left text-[14px] text-slate-200 cursor-pointer"
      onClick={() => {
        onHelpCommandClick(cmd)
        inputRef.current?.focus()
      }}
    >
      <span className="font-mono text-slate-100 group-hover:underline group-hover:underline-offset-4">
        {cmd}
        {description ? ' ' : ''}
      </span>
      {description && (
        <span className="text-slate-100 group-hover:underline group-hover:underline-offset-4">{description}</span>
      )}
    </button>
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
    <div className="mt-5 border-t border-slate-800 pt-4 text-[14px] text-slate-300">
      <div className="mb-2 text-[13px] uppercase tracking-wide text-slate-500">How do you want to continue?</div>
      <div className="flex flex-col gap-2">
        {options.map((label, index) => {
          const isSelected = index === consentSelectedIndex
          return (
            <button
              key={label}
              type="button"
              onClick={() => onConsentOptionClick(index)}
              className={`cursor-pointer rounded-md px-0 py-0 text-left text-[14px] font-mono ${
                isSelected ? 'text-slate-50 underline underline-offset-4' : 'text-slate-300 hover:text-slate-50'
              }`}
            >
              <span className="font-mono text-[13px]">{label}</span>
            </button>
          )
        })}
      </div>
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
    <div className="mt-6 border-t border-slate-800 pt-4 text-[14px] text-slate-300 space-y-2">
      <div className="text-[15px] text-slate-50 font-mono leading-relaxed">
        Preference {currentIndex + 1}/{totalCount}: {questionText}
      </div>
      <div className="text-[13px] uppercase tracking-wide text-slate-500">
        Choose an option (or answer in your own words)
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onOptionClick(-1)}
          className="cursor-pointer text-left text-[14px] text-slate-300 hover:text-slate-50"
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
              className="cursor-pointer group flex w-full items-start gap-2 px-0 py-1 text-left text-[14px] text-slate-300"
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
  onRevise,
  onCopyEditable,
  onEditableChange,
  onStartNewConversation,
}: {
  editablePrompt: string
  editablePromptRef: React.RefObject<HTMLTextAreaElement | null>
  onRevise: () => void
  onCopyEditable: () => void
  onEditableChange: (text: string) => void
  onStartNewConversation: () => void
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onCopyEditable()
      }
    },
    [onCopyEditable]
  )

  return (
    <div className="mt-6 border-t border-slate-800 pt-4 space-y-2">
      <div className="mb-1 flex items-center justify-between text-[13px] uppercase tracking-wide text-slate-500">
        <span>Editable prompt</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onRevise} className={textButtonClass}>
            Revise task &amp; answers
          </button>
          <button type="button" onClick={onCopyEditable} className={textButtonClass}>
            Copy
          </button>
          <button type="button" onClick={onStartNewConversation} className={textButtonClass}>
            Start new conversation
          </button>
        </div>
      </div>
      <div className="flex items-start">
        <span className="pr-1 text-zinc-500" />
        <textarea
          ref={editablePromptRef}
          value={editablePrompt}
          onChange={(e) => onEditableChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="terminal-input w-full min-h-50 resize-none overflow-hidden bg-transparent px-0 py-0 text-[15px] leading-relaxed text-slate-50 outline-none font-mono"
        />
      </div>
    </div>
  )
})

const ApprovedPromptLinks = memo(function ApprovedPromptLinks({ prompt }: { prompt: string }) {
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

  return (
    <div className="mt-4 space-y-2 text-[14px] text-slate-200">
      <div className="flex items-center justify-between text-[13px] uppercase tracking-wide text-slate-500">
        <span>Open prompt in popular AIs</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {providers.map((provider) =>
          'action' in provider ? (
            <button
              key={provider.id}
              type="button"
              onClick={provider.action}
              className="inline-flex items-center gap-2 cursor-pointer bg-transparent text-[13px] text-slate-100 underline decoration-transparent underline-offset-4 hover:decoration-current"
              title={provider.hint ?? 'Copies prompt, then opens in new tab'}
            >
              {renderProviderLabel(provider)}
            </button>
          ) : (
            <a
              key={provider.id}
              href={provider.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 cursor-pointer text-[13px] text-slate-100 underline decoration-transparent underline-offset-4 hover:decoration-current"
              title="Prefills and opens in a new tab"
            >
              {renderProviderLabel(provider)}
            </a>
          )
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
  lines,
  editablePrompt,
  promptForLinks = null,
  awaitingQuestionConsent,
  consentSelectedIndex,
  answeringQuestions,
  currentClarifyingQuestion,
  clarifyingSelectedOptionIndex,
  editablePromptRef,
  scrollRef,
  inputRef,
  clarifyingAnswersCount,
  onHelpCommandClick,
  onConsentOptionClick,
  onClarifyingOptionClick,
  onUndoAnswer,
  onRevise,
  onEditableChange,
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
  starterExamples = [],
  starterTitle = 'No history yet. Generate your first prompt to get started.',
  starterSubtitle = "You'll get 1–3 prompt options plus quick refinements.",
  onExampleInsert,
}: TerminalOutputAreaProps) {
  // Memoize the rendered lines to prevent recalculation on every render
  const renderedLines = useMemo(
    () =>
      lines.map((line, index) => (
        <TerminalLineItem
          key={`${line.id}-${index}`}
          line={line}
          onHelpCommandClick={onHelpCommandClick}
          inputRef={inputRef}
        />
      )),
    [lines, onHelpCommandClick, inputRef]
  )

  return (
    <div
      ref={scrollRef}
      className="terminal-scroll relative flex-1 space-y-2 overflow-y-auto px-3 pt-3 pb-4 text-[15px] leading-relaxed text-slate-200 font-mono"
    >
      {renderedLines}

      {showStarter && starterExamples.length > 0 && onExampleInsert && (
        <div className="mt-2 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
          <div className="text-[15px] font-mono text-slate-50">{starterTitle}</div>
          {starterSubtitle ? <div className="mt-1 text-[13px] text-slate-300">{starterSubtitle}</div> : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {starterExamples.map((example, idx) => (
              <button
                key={`${idx}-${example.slice(0, 16)}`}
                type="button"
                onClick={() => onExampleInsert(example)}
                className="w-full cursor-pointer rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3 text-left text-[14px] text-slate-100 transition hover:border-slate-600 hover:bg-slate-900/80"
              >
                <span className="block font-mono leading-relaxed">{example}</span>
                <span className="mt-2 block text-[12px] text-slate-400">Click to paste into the input</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {awaitingQuestionConsent && (
        <ConsentButtons consentSelectedIndex={consentSelectedIndex} onConsentOptionClick={onConsentOptionClick} />
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
          onRevise={onRevise}
          onCopyEditable={onCopyEditable}
          onEditableChange={onEditableChange}
          onStartNewConversation={onStartNewConversation}
        />
      )}

      {promptForLinks && (
        <div className="mt-4 flex items-end justify-between gap-4">
          <ApprovedPromptLinks prompt={promptForLinks} />
          {(onLike || onDislike) && (
            <div className="flex gap-2 pb-1">
              {onLike && (
                <button
                  type="button"
                  disabled={likeState === 'liked'}
                  onClick={likeState === 'liked' ? undefined : onLike}
                  className={`${textButtonClass} text-[20px] disabled:hover:no-underline ${
                    likeState === 'liked' ? 'text-emerald-300 cursor-not-allowed opacity-60' : ''
                  }`}
                  aria-label="Like prompt"
                  title="Like prompt"
                >
                  👍
                </button>
              )}
              {onDislike && (
                <button
                  type="button"
                  disabled={likeState === 'disliked'}
                  onClick={likeState === 'disliked' ? undefined : onDislike}
                  className={`${textButtonClass} text-[20px] disabled:hover:no-underline ${
                    likeState === 'disliked' ? 'text-rose-300 cursor-not-allowed opacity-60' : ''
                  }`}
                  aria-label="Dislike prompt"
                  title="Dislike prompt"
                >
                  👎
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!editablePrompt && <div className="min-h-50" aria-hidden />}
    </div>
  )
})
