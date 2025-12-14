'use client'

import { MESSAGE } from '@/lib/constants'
import type { Preferences } from '@/lib/types'

export function formatPreferencesSummary(preferences: Preferences): string {
  const parts: string[] = []
  if (preferences.tone) parts.push(`tone=${preferences.tone}`)
  if (preferences.audience) parts.push(`audience=${preferences.audience}`)
  if (preferences.domain) parts.push(`domain=${preferences.domain}`)
  if (preferences.defaultModel) parts.push(`model=${preferences.defaultModel}`)
  if (preferences.outputFormat) parts.push(`format=${preferences.outputFormat}`)
  if (preferences.language) parts.push(`language=${preferences.language}`)
  if (preferences.depth) parts.push(`depth=${preferences.depth}`)
  if (typeof preferences.temperature === 'number') parts.push(`temp=${preferences.temperature}`)
  if (preferences.uiDefaults?.theme) parts.push(`theme=${preferences.uiDefaults.theme}`)
  if (parts.length === 0) return MESSAGE.NO_PREFERENCES
  return parts.join(', ')
}
