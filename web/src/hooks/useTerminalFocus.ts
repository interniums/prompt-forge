'use client'

import { useEffect, useCallback } from 'react'

type UseTerminalFocusDeps = {
  editablePrompt: string | null
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  copyEditablePrompt: (textOverride?: string) => Promise<void> | void
}

export function useTerminalFocus({ editablePrompt, inputRef, copyEditablePrompt }: UseTerminalFocusDeps) {
  const focusInputToEnd = useCallback(() => {
    if (!inputRef.current) return
    const el = inputRef.current
    el.focus()
    const len = el.value.length
    el.setSelectionRange(len, len)
  }, [inputRef])

  const blurInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }, [inputRef])

  useEffect(() => {
    if (!editablePrompt) return
    function handleGlobalCopy(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        void copyEditablePrompt()
      }
    }
    window.addEventListener('keydown', handleGlobalCopy)
    return () => window.removeEventListener('keydown', handleGlobalCopy)
  }, [copyEditablePrompt, editablePrompt])

  return { focusInputToEnd, blurInput }
}
