export function detectUnclearTaskClient(task: string): string | null {
  const normalized = task.trim()
  if (!normalized) return 'Task is empty. Please describe what you want to accomplish.'

  const lower = normalized.toLowerCase()
  const shortAllowlist = new Set(['api', 'sql', 'css', 'ui', 'ux'])
  if (normalized.length < 4 && !shortAllowlist.has(lower)) {
    return 'Task is very short. Please describe what you want to accomplish in more detail.'
  }

  const letters = normalized.replace(/[^\p{L}]/gu, '')
  const digits = normalized.replace(/[^\p{N}]/gu, '')
  const nonSpace = normalized.replace(/\s+/g, '')
  const symbols = nonSpace.replace(/[\p{L}\p{N}]/gu, '')
  const hasLetters = letters.length > 0
  const hasDigits = digits.length > 0
  const hasSymbols = symbols.length > 0

  if (!hasLetters && !hasDigits && hasSymbols) {
    return 'Task contains only symbols or emojis. Please describe what you want to accomplish in words.'
  }
  if (!hasLetters && hasDigits && !hasSymbols) {
    return 'Task contains only numbers. Please describe what you want to accomplish in words.'
  }
  if (!hasLetters) {
    return 'Task has no readable words. Please describe what you want to accomplish.'
  }

  const length = nonSpace.length
  const vowelMatches = letters.match(/[aeiouy]/gi)
  const vowelCount = vowelMatches?.length ?? 0
  const digitRatio = hasDigits ? digits.length / Math.max(length, 1) : 0
  const hasSpaces = /\s/.test(normalized)

  if (!hasSpaces && letters.length >= 10 && vowelCount === 0) {
    return 'This looks like random characters. Please describe the goal in plain language.'
  }

  if (!hasSpaces && length >= 10 && digitRatio > 0.4) {
    return 'Task mixes letters and digits without clear context. Please describe the goal in plain language.'
  }

  const hasLongRepeat = /(.)\1{5,}/u.test(normalized)
  if (hasLongRepeat) {
    return 'Task contains long character repeats. Please describe the goal more clearly.'
  }

  return null
}
