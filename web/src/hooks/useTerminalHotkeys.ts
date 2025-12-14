'use client'

import { useEffect, useCallback } from 'react'
import type { ClarifyingQuestion } from '@/lib/types'

export type ConsentNav = {
  active: boolean
  value: string
  selected: number | null
  setSelected: (value: number | null) => void
  onAnswer: (answer: string) => void
}

export type ClarifyingNav = {
  active: boolean
  questions: ClarifyingQuestion[] | null
  currentIndex: number
  selectedIndex: number | null
  setSelectedIndex: (value: number | null) => void
  onSelectOption: (index: number) => void
  onUndo: () => void
  onSkip?: () => void
  onFreeAnswer?: () => void
}

export type PreferenceNav = {
  active: boolean
  options: Array<{ id: string; label: string }>
  selectedIndex: number | null
  setSelectedIndex: (value: number | null) => void
  onSelectOption: (index: number) => void
  onBack?: () => void
  onSkip?: () => void
  onFreeAnswer?: () => void
}

export type PromptControls = {
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

function moveSelection(slotOrder: number[], current: number | null, isForward: boolean) {
  const totalSlots = slotOrder.length
  const fallbackPos = slotOrder.findIndex((val) => val >= 0)
  const resolvedPrevIndex =
    current === null ? (fallbackPos >= 0 ? fallbackPos : 0) : slotOrder.findIndex((val) => val === current)
  const prevPos = Math.max(0, Math.min(totalSlots - 1, resolvedPrevIndex >= 0 ? resolvedPrevIndex : 0))
  const delta = isForward ? 1 : -1
  const nextPos = (prevPos + delta + totalSlots) % totalSlots
  return slotOrder[nextPos] ?? null
}

function focusInputEnd(inputRef: React.RefObject<HTMLTextAreaElement | null>) {
  const el = inputRef.current
  if (!el) return
  const len = el.value.length
  el.focus()
  el.setSelectionRange(len, len)
}

function handleConsentHotkeys(
  key: string,
  isPlainEnter: boolean,
  preventDefault: () => void,
  consent: ConsentNav,
  prompt: PromptControls
) {
  if (!consent.active) return false
  const options = ['yes', 'no']
  if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
    preventDefault()
    const isForward = key === 'ArrowDown' || key === 'ArrowRight'
    const nextIndex = moveSelection(
      options.map((_, idx) => idx),
      consent.selected,
      isForward
    )
    consent.setSelected(nextIndex)
    return true
  }

  if (isPlainEnter) {
    preventDefault()
    // Consent only has predefined options, no "my own answer"
    // Always use selection if present
    if (consent.selected !== null) {
      const chosen = options[consent.selected]
      void consent.onAnswer(chosen)
      return true
    }
    // No selection and no input - do nothing
    return true
  }
  return false
}

function handleClarifyingHotkeys(
  key: string,
  isPlainEnter: boolean,
  preventDefault: () => void,
  clarifying: ClarifyingNav,
  prompt: PromptControls
) {
  if (
    !clarifying.active ||
    !clarifying.questions ||
    clarifying.questions.length === 0 ||
    clarifying.currentIndex >= clarifying.questions.length
  ) {
    return false
  }
  const current = clarifying.questions[clarifying.currentIndex]
  const options = current.options ?? []
  // Back is only available from question 2+ (index 1+), not from question 1 (index 0)
  const hasBack = clarifying.currentIndex > 0
  const hasFree = Boolean(clarifying.onFreeAnswer)
  const hasSkip = Boolean(clarifying.onSkip)
  const slotOrder: number[] = []
  for (let i = 0; i < options.length; i += 1) slotOrder.push(i)
  if (hasFree) slotOrder.push(-2)
  if (hasBack) slotOrder.push(-1)
  if (hasSkip) slotOrder.push(-3)
  const totalSlots = slotOrder.length

  if (totalSlots > 0) {
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
      preventDefault()
      const isForward = key === 'ArrowDown' || key === 'ArrowRight'
      const nextIndex = moveSelection(slotOrder, clarifying.selectedIndex, isForward)
      clarifying.setSelectedIndex(nextIndex)
      return true
    }

    if (isPlainEnter) {
      preventDefault()
      const sel = clarifying.selectedIndex
      const trimmed = prompt.value.trim()

      // If a selection is made (not "My own answer"), always use the selection
      // Input text is ONLY submitted when "My own answer" (-2) is selected
      if (sel !== null && sel !== -2) {
        if (sel === -1 && hasBack) {
          clarifying.onUndo()
          return true
        }
        if (sel === -3 && hasSkip) {
          clarifying.onSkip?.()
          return true
        }
        if (sel >= 0 && sel < options.length) {
          void clarifying.onSelectOption(sel)
          return true
        }
      }

      // "My own answer" selected - submit input text if present
      if (sel === -2 && hasFree) {
        if (trimmed) {
          prompt.submit()
        } else {
          clarifying.onFreeAnswer?.()
        }
        return true
      }

      // No selection made - only submit if there's input text
      if (sel === null && trimmed) {
        prompt.submit()
      }
      return true
    }
  }

  return false
}

function handlePreferenceHotkeys(
  key: string,
  isPlainEnter: boolean,
  preventDefault: () => void,
  preference: PreferenceNav,
  prompt: PromptControls
) {
  if (!preference.active) return false
  const options = preference.options ?? []
  const hasBack = Boolean(preference.onBack)
  const hasFree = Boolean(preference.onFreeAnswer)
  const hasSkip = Boolean(preference.onSkip)
  const slotOrder: number[] = []
  for (let i = 0; i < options.length; i += 1) slotOrder.push(i)
  if (hasFree) slotOrder.push(-2)
  if (hasBack) slotOrder.push(-1)
  if (hasSkip) slotOrder.push(-3)
  const totalSlots = slotOrder.length

  if (totalSlots > 0) {
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') {
      preventDefault()
      const isForward = key === 'ArrowDown' || key === 'ArrowRight'
      const prev = preference.selectedIndex
      const prevPos =
        prev === null
          ? 0
          : Math.max(
              0,
              Math.min(
                totalSlots - 1,
                slotOrder.findIndex((val) => val === prev)
              )
            )
      const delta = isForward ? 1 : -1
      const nextPos = (prevPos + delta + totalSlots) % totalSlots
      const nextIndex = slotOrder[nextPos] ?? null
      preference.setSelectedIndex(nextIndex)
      return true
    }

    if (isPlainEnter) {
      preventDefault()
      const sel = preference.selectedIndex
      const trimmed = prompt.value.trim()

      // If a selection is made (not "My own answer"), always use the selection
      // Input text is ONLY submitted when "My own answer" (-2) is selected
      if (sel !== null && sel !== -2) {
        if (sel === -1 && hasBack) {
          preference.onBack?.()
          return true
        }
        if (sel === -3 && hasSkip) {
          preference.onSkip?.()
          return true
        }
        if (sel >= 0 && sel < options.length) {
          preference.onSelectOption(sel)
          return true
        }
      }

      // "My own answer" selected - submit input text if present
      if (sel === -2 && hasFree) {
        if (trimmed) {
          prompt.submit()
        } else {
          preference.onFreeAnswer?.()
        }
        return true
      }

      // No selection made - only submit if there's input text
      if (sel === null && trimmed) {
        prompt.submit()
      }
      return true
    }
  }

  return false
}

function handleGlobalHotkeys(
  key: string,
  isPlainEnter: boolean,
  metaKey: boolean,
  ctrlKey: boolean,
  preventDefault: () => void,
  prompt: PromptControls
) {
  if (isPlainEnter) {
    preventDefault()
    prompt.submit()
    return true
  }

  if ((metaKey || ctrlKey) && key.toLowerCase() === 'e' && prompt.editablePrompt) {
    preventDefault()
    return true
  }

  if ((metaKey || ctrlKey) && key.toLowerCase() === 'j') {
    preventDefault()
    focusInputEnd(prompt.inputRef)
    return true
  }

  if ((metaKey || ctrlKey) && key === 'Enter' && prompt.editablePrompt) {
    if (prompt.onCopyEditablePrompt) {
      preventDefault()
      prompt.onCopyEditablePrompt()
    }
    return true
  }

  return false
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

      if (handleConsentHotkeys(key, isPlainEnter, preventDefault, consent, prompt)) return
      if (handleClarifyingHotkeys(key, isPlainEnter, preventDefault, clarifying, prompt)) return
      if (handlePreferenceHotkeys(key, isPlainEnter, preventDefault, preference, prompt)) return
      if (handleGlobalHotkeys(key, isPlainEnter, metaKey, ctrlKey, preventDefault, prompt)) return
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
