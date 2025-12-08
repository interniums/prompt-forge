'use client'

import { COMMAND, MESSAGE } from '@/lib/constants'
import type { Preferences } from '@/lib/types'

export function formatPreferencesSummary(preferences: Preferences): string {
  const parts: string[] = []
  if (preferences.tone) parts.push(`tone=${preferences.tone}`)
  if (preferences.audience) parts.push(`audience=${preferences.audience}`)
  if (preferences.domain) parts.push(`domain=${preferences.domain}`)
  if (preferences.defaultModel) parts.push(`model=${preferences.defaultModel}`)
  if (preferences.outputFormat) parts.push(`format=${preferences.outputFormat}`)
  if (preferences.language) parts.push(`lang=${preferences.language}`)
  if (preferences.depth) parts.push(`depth=${preferences.depth}`)
  if (typeof preferences.temperature === 'number') parts.push(`temp=${preferences.temperature}`)
  if (preferences.uiDefaults?.theme) parts.push(`theme=${preferences.uiDefaults.theme}`)
  if (parts.length === 0) return MESSAGE.NO_PREFERENCES
  return parts.join(', ')
}

export function appendHelpText(appendLine: (role: string, text: string) => void) {
  appendLine('app', 'Prompt Terminal commands:')
  appendLine('app', `${COMMAND.HELP}        Type /help to see commands.`)
  appendLine('app', `${COMMAND.PREFERENCES} Set your defaults (tone, audience, domain, model).`)
  appendLine('app', `${COMMAND.CLEAR}       Clear the log. Use /restore to undo once.`)
  appendLine('app', `${COMMAND.RESTORE}     Restore the last cleared log.`)
  appendLine('app', `${COMMAND.DISCARD}     Start fresh with a new task.`)
  appendLine('app', `${COMMAND.HISTORY}     List recent tasks and prompts.`)
  appendLine('app', `${COMMAND.USE} <n>     Load task #n from /history into the input.`)
  appendLine('app', 'Anything else: describe a task and we’ll draft a prompt using your preferences.')
}
