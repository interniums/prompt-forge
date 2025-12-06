'use client'

import React from 'react'
import type { TerminalLine } from '../FastEasyShell'
import type { ClarifyingQuestion } from '@/app/terminalActions'
import { textButtonClass } from './styles'

export type TerminalOutputAreaProps = {
  lines: TerminalLine[]
  editablePrompt: string | null
  awaitingQuestionConsent: boolean
  consentSelectedIndex: number | null
  answeringQuestions: boolean
  currentClarifyingQuestion: ClarifyingQuestion | null
  clarifyingSelectedOptionIndex: number | null
  editablePromptRef: React.RefObject<HTMLTextAreaElement>
  isPromptEditable: boolean
  isPromptFinalized: boolean
  scrollRef: React.RefObject<HTMLDivElement>
  inputRef: React.RefObject<HTMLTextAreaElement>
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

export function TerminalOutputArea({
  lines,
  editablePrompt,
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
  return (
    <div
      ref={scrollRef}
      className="terminal-scroll flex-1 space-y-2 overflow-y-auto px-3 pt-3 pb-4 text-[13px] leading-relaxed text-slate-200 font-mono"
    >
      {lines.map((line) => {
        const isClickableHelp = line.role === 'app' && line.text.trim().startsWith('/')

        if (!isClickableHelp) {
          return (
            <div key={line.id} className="whitespace-pre-wrap leading-[1.7]">
              <span className="pr-1 text-zinc-500">{line.role === 'user' ? '>' : line.role === 'app' ? '' : '#'}</span>
              <span className="text-slate-100">{line.text}</span>
            </div>
          )
        }

        const [cmd, ...rest] = line.text.trim().split(/\s+/)
        const description = rest.join(' ')

        return (
          <button
            key={line.id}
            type="button"
            className="group flex w-full items-baseline whitespace-pre-wrap text-left text-[12px] text-slate-200 cursor-pointer"
            onClick={() => {
              onHelpCommandClick(cmd)
              if (inputRef.current) inputRef.current.focus()
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
      })}

      {awaitingQuestionConsent && (
        <div className="mt-5 border-t border-slate-800 pt-4 text-[12px] text-slate-300">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Answer consent (yes/no)</div>
          <div className="flex flex-row gap-2">
            {['yes', 'no'].map((label, index) => {
              const isSelected = index === consentSelectedIndex
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onConsentOptionClick(index)}
                  className="cursor-pointer group flex items-center gap-1 rounded-md px-2 py-0.5 text-left text-[12px] text-slate-300"
                >
                  <span
                    className={`font-mono text-[12px] ${
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
      )}

      {answeringQuestions && currentClarifyingQuestion && currentClarifyingQuestion.options.length > 0 && (
        <div className="mt-6 border-t border-slate-800 pt-4 text-[12px] text-slate-300 space-y-2">
          <div className="text-[13px] text-slate-50 font-mono leading-relaxed">
            {currentClarifyingQuestion.question}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            Choose an option (or answer in your own words)
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
            <button
              type="button"
              className={`${textButtonClass} ${clarifyingSelectedOptionIndex === -1 ? 'text-slate-50 underline' : ''}`}
              onClick={onUndoAnswer}
            >
              ← Back
            </button>
            {clarifyingAnswersCount > 0 && <span className="text-slate-500">Answered: {clarifyingAnswersCount}</span>}
          </div>
          <div className="flex flex-col gap-1">
            {currentClarifyingQuestion.options.map((opt, index) => {
              const isSelected = index === clarifyingSelectedOptionIndex
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onClarifyingOptionClick(index)}
                  className="cursor-pointer group flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-[12px] text-slate-300"
                >
                  <span className="mt-0.5 text-[11px] text-slate-500">{opt.id})</span>
                  <span
                    className={`font-mono text-[12px] ${
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
      )}

      {editablePrompt !== null && (
        <div className="mt-6 border-t border-slate-800 pt-4 space-y-2">
          <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
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
                <span className="text-[11px] uppercase tracking-wide text-emerald-400">Approved — still editable</span>
              )}
            </div>
          </div>
          <div className="flex items-start">
            <span className="pr-1 text-zinc-500" />
            {isPromptEditable ? (
              <textarea
                ref={editablePromptRef}
                value={editablePrompt}
                onChange={(e) => onEditableChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    onCopyEditable()
                  }
                }}
                className="terminal-input w-full min-h-50 resize-none overflow-hidden bg-transparent px-0 py-0 text-[13px] leading-relaxed text-slate-50 outline-none font-mono"
              />
            ) : (
              <textarea
                value={editablePrompt}
                readOnly
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault()
                    onCopyEditable()
                  }
                }}
                className="terminal-input w-full min-h-50 resize-none overflow-hidden bg-transparent px-0 py-0 text-[13px] leading-relaxed text-slate-50 outline-none font-mono"
              />
            )}
          </div>
        </div>
      )}

      {!editablePrompt && <div className="min-h-50" aria-hidden />}
    </div>
  )
}
