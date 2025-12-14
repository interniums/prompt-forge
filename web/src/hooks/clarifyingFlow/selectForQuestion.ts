import type { ClarifyingQuestion } from '@/lib/types'

export type SelectForQuestion = (question: ClarifyingQuestion | null, hasBack: boolean) => void

export function createSelectForQuestion(
  setClarifyingSelectedOptionIndex: (value: number | null) => void
): SelectForQuestion {
  return (question, hasBack) => {
    if (!question) {
      setClarifyingSelectedOptionIndex(null)
      return
    }
    if (question.options.length > 0) {
      // Default to first option to hint keyboard navigation
      setClarifyingSelectedOptionIndex(0)
      return
    }
    if (hasBack) {
      // Allow "back" selection when no options exist
      setClarifyingSelectedOptionIndex(-1)
      return
    }
    setClarifyingSelectedOptionIndex(null)
  }
}
