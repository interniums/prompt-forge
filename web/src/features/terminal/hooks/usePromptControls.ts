'use client'

import { useMemo } from 'react'
import type { PromptControls } from '@/hooks/useTerminalHotkeys'

type UsePromptControlsDeps = {
  value: string
  submit: () => void
  editablePrompt: string | null
  setIsPromptEditable: (value: boolean) => void
  setIsPromptFinalized: (value: boolean) => void
  editablePromptRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  copyEditablePrompt: () => void
}

export function usePromptControls({
  value,
  submit,
  editablePrompt,
  setIsPromptEditable,
  setIsPromptFinalized,
  editablePromptRef,
  inputRef,
  copyEditablePrompt,
}: UsePromptControlsDeps): PromptControls {
  return useMemo(
    () => ({
      value,
      submit,
      editablePrompt,
      setIsPromptEditable,
      setIsPromptFinalized,
      editablePromptRef,
      inputRef,
      onCopyEditablePrompt: () => void copyEditablePrompt(),
    }),
    [
      copyEditablePrompt,
      editablePrompt,
      editablePromptRef,
      inputRef,
      setIsPromptEditable,
      setIsPromptFinalized,
      submit,
      value,
    ]
  )
}
