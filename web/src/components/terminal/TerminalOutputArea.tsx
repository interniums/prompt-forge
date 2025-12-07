'use client'

import React, { memo, useMemo, useCallback } from 'react'
import type { TerminalLine, ClarifyingQuestion } from '@/lib/types'
import { ROLE } from '@/lib/constants'
import { textButtonClass } from './styles'

export type TerminalOutputAreaProps = {
  lines: TerminalLine[]
  editablePrompt: string | null
  approvedPrompt: string | null
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  answeringQuestions: boolean
  currentClarifyingQuestion: ClarifyingQuestion | null
  clarifyingSelectedOptionIndex: number | null
  editablePromptRef: React.RefObject<HTMLTextAreaElement | null>
  isPromptEditable: boolean
  isPromptFinalized: boolean
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
  onEditClick: () => void
  onApproveClick: () => void
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
  const options = useMemo(() => ['yes', 'no'], [])

  return (
    <div className="mt-5 border-t border-slate-800 pt-4 text-[14px] text-slate-300">
      <div className="mb-2 text-[13px] uppercase tracking-wide text-slate-500">Answer consent (yes/no)</div>
      <div className="flex flex-row gap-2">
        {options.map((label, index) => {
          const isSelected = index === consentSelectedIndex
          return (
            <button
              key={label}
              type="button"
              onClick={() => onConsentOptionClick(index)}
              className="cursor-pointer group flex items-center gap-1 rounded-md px-2 py-0.5 text-left text-[14px] text-slate-300"
            >
              <span
                className={`font-mono text-[14px] ${
                  isSelected
                    ? 'text-slate-50 underline underline-offset-4'
                    : 'text-slate-100 group-hover:underline group-hover:underline-offset-4'
                }`}
              >
                {label}
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
  approvedPrompt,
  editablePromptRef,
  isPromptEditable,
  isPromptFinalized,
  onRevise,
  onApproveClick,
  onCopyEditable,
  onEditClick,
  onEditableChange,
}: {
  editablePrompt: string
  approvedPrompt: string | null
  editablePromptRef: React.RefObject<HTMLTextAreaElement | null>
  isPromptEditable: boolean
  isPromptFinalized: boolean
  onRevise: () => void
  onApproveClick: () => void
  onCopyEditable: () => void
  onEditClick: () => void
  onEditableChange: (text: string) => void
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
        <span>{isPromptEditable ? 'Editable prompt' : 'Generated prompt'}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onRevise} className={textButtonClass}>
            Revise task &amp; answers
          </button>
          {!isPromptFinalized && (
            <>
              <button type="button" onClick={onApproveClick} className={textButtonClass}>
                Approve &amp; copy
              </button>
              {isPromptEditable ? (
                <button type="button" onClick={onCopyEditable} className={textButtonClass}>
                  Copy
                </button>
              ) : (
                <button type="button" onClick={onEditClick} className={textButtonClass}>
                  Edit
                </button>
              )}
            </>
          )}
          {isPromptFinalized && (
            <span className="text-[13px] uppercase tracking-wide text-emerald-400">Approved — still editable</span>
          )}
        </div>
      </div>
      <div className="flex items-start">
        <span className="pr-1 text-zinc-500" />
        <textarea
          ref={isPromptEditable ? editablePromptRef : undefined}
          value={editablePrompt}
          onChange={isPromptEditable ? (e) => onEditableChange(e.target.value) : undefined}
          onKeyDown={handleKeyDown}
          readOnly={!isPromptEditable}
          className="terminal-input w-full min-h-50 resize-none overflow-hidden bg-transparent px-0 py-0 text-[15px] leading-relaxed text-slate-50 outline-none font-mono"
        />
      </div>
      {isPromptFinalized && approvedPrompt && <ApprovedPromptLinks prompt={approvedPrompt} />}
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
              className="cursor-pointer bg-transparent text-[13px] text-slate-100 underline-offset-4 hover:underline"
              title={provider.hint ?? 'Copies prompt, then opens in new tab'}
            >
              {provider.label}
            </button>
          ) : (
            <a
              key={provider.id}
              href={provider.href}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer text-[13px] text-slate-100 underline-offset-4 hover:underline"
              title="Prefills and opens in a new tab"
            >
              {provider.label}
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
  approvedPrompt,
  awaitingQuestionConsent,
  consentSelectedIndex,
  answeringQuestions,
  currentClarifyingQuestion,
  clarifyingSelectedOptionIndex,
  editablePromptRef,
  isPromptEditable,
  isPromptFinalized,
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
  onEditClick,
  onApproveClick,
}: TerminalOutputAreaProps) {
  // Memoize the rendered lines to prevent recalculation on every render
  const renderedLines = useMemo(
    () =>
      lines.map((line) => (
        <TerminalLineItem key={line.id} line={line} onHelpCommandClick={onHelpCommandClick} inputRef={inputRef} />
      )),
    [lines, onHelpCommandClick, inputRef]
  )

  return (
    <div
      ref={scrollRef}
      className="terminal-scroll flex-1 space-y-2 overflow-y-auto px-3 pt-3 pb-4 text-[15px] leading-relaxed text-slate-200 font-mono"
    >
      {renderedLines}

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

      {editablePrompt !== null && (
        <EditablePromptSection
          editablePrompt={editablePrompt}
          approvedPrompt={approvedPrompt}
          editablePromptRef={editablePromptRef}
          isPromptEditable={isPromptEditable}
          isPromptFinalized={isPromptFinalized}
          onRevise={onRevise}
          onApproveClick={onApproveClick}
          onCopyEditable={onCopyEditable}
          onEditClick={onEditClick}
          onEditableChange={onEditableChange}
        />
      )}

      {!editablePrompt && <div className="min-h-50" aria-hidden />}
    </div>
  )
})
