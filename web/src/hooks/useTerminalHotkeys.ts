'use client'

import { useEffect, useCallback } from 'react'
import type { ClarifyingQuestion } from '@/lib/types'

type KeyEventInfo = {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  value: string
}

type ConsentNav = {
  active: boolean
  value: string
  selected: number | null
  setSelected: (value: number | null) => void
  onAnswer: (answer: string) => void
}

type ClarifyingNav = {
  active: boolean
  questions: ClarifyingQuestion[] | null
  currentIndex: number
  selectedIndex: number | null
  setSelectedIndex: (value: number | null) => void
  onSelectOption: (index: number) => void
  onUndo: () => void
}

type PreferenceNav = {
  active: boolean
  onKey: (info: KeyEventInfo) => boolean
}

type PromptControls = {
  value: string
  submit: () => void
  editablePrompt: string | null
  setIsPromptEditable: (value: boolean) => void
  setIsPromptFinalized: (value: boolean) => void
  editablePromptRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  onCopyEditablePrompt?: () => void
}

type UseTerminalHotkeysDeps = {
  consent: ConsentNav
  clarifying: ClarifyingNav
  preference: PreferenceNav
  prompt: PromptControls
}

export function useTerminalHotkeys({ consent, clarifying, preference, prompt }: UseTerminalHotkeysDeps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement> | KeyboardEvent) => {
      if (e.defaultPrevented) return

      const key = e.key
      const metaKey = 'metaKey' in e ? e.metaKey : false
      const ctrlKey = 'ctrlKey' in e ? e.ctrlKey : false
      const preventDefault = () => e.preventDefault()
      const isPlainEnter = key === 'Enter' && !metaKey && !ctrlKey

      // Consent yes/no navigation
      if (consent.active) {
        const options = ['yes', 'no']
        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
          preventDefault()
          const isForward = key === 'ArrowDown' || key === 'ArrowRight'
          const current = consent.selected
          const nextIndex =
            current === null
              ? isForward
                ? 0
                : options.length - 1
              : (current + (isForward ? 1 : -1) + options.length) % options.length
          consent.setSelected(nextIndex)
          return
        }

        if (isPlainEnter && !prompt.value.trim() && consent.selected !== null) {
          preventDefault()
          const chosen = options[consent.selected]
          void consent.onAnswer(chosen)
          return
        }
      }

      // Clarifying option navigation
      if (
        clarifying.active &&
        clarifying.questions &&
        clarifying.questions.length > 0 &&
        clarifying.currentIndex < clarifying.questions.length
      ) {
        const current = clarifying.questions[clarifying.currentIndex]
        const options = current.options ?? []
        const hasBack = true
        const totalSlots = options.length + 1

        if (totalSlots > 0) {
          if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
            preventDefault()
            const isForward = key === 'ArrowDown' || key === 'ArrowRight'
            const prev = clarifying.selectedIndex ?? (hasBack ? -1 : 0)
            const toPos = (idx: number) => (idx === -1 ? 0 : hasBack ? idx + 1 : idx)
            const fromPos = (pos: number) => (hasBack ? (pos === 0 ? -1 : pos - 1) : pos)
            const prevPos = Math.max(0, Math.min(totalSlots - 1, toPos(prev)))
            const delta = isForward ? 1 : -1
            const nextPos = (prevPos + delta + totalSlots) % totalSlots
            const nextIndex = fromPos(nextPos)
            clarifying.setSelectedIndex(nextIndex)
            return
          }

          if (isPlainEnter && !prompt.value.trim()) {
            preventDefault()
            const sel = clarifying.selectedIndex ?? (hasBack ? -1 : 0)
            if (sel === -1 && hasBack) {
              clarifying.onUndo()
              return
            }
            if (sel !== null && sel >= 0 && sel < options.length) {
              void clarifying.onSelectOption(sel)
              return
            }
          }
        }
      }

      // Preference navigation (delegate)
      if (
        preference.active &&
        preference.onKey({
          key,
          metaKey,
          ctrlKey,
          value: prompt.value,
        })
      ) {
        preventDefault()
        return
      }

      // Plain Enter submits
      if (isPlainEnter) {
        preventDefault()
        prompt.submit()
        return
      }

      // Cmd/Ctrl+E focuses editable prompt when available
      if ((metaKey || ctrlKey) && key.toLowerCase() === 'e' && prompt.editablePrompt) {
        preventDefault()
        return
      }

      // Cmd/Ctrl+J focuses input
      if ((metaKey || ctrlKey) && key.toLowerCase() === 'j') {
        preventDefault()
        if (prompt.inputRef.current) {
          const el = prompt.inputRef.current
          const len = el.value.length
          el.focus()
          el.setSelectionRange(len, len)
        }
        return
      }

      // Cmd/Ctrl+Enter to copy editable prompt
      if ((metaKey || ctrlKey) && key === 'Enter' && prompt.editablePrompt) {
        if (prompt.onCopyEditablePrompt) {
          preventDefault()
          prompt.onCopyEditablePrompt()
        }
        return
      }
    },
    [clarifying, consent, preference, prompt]
  )

  useEffect(() => {
    if (!clarifying.active && !consent.active && !preference.active) return
    const handler = (ev: KeyboardEvent) => handleKeyDown(ev)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clarifying.active, consent.active, handleKeyDown, preference.active])

  return { handleKeyDown }
}
