import { DEFAULT_TEMPERATURE } from '@/lib/constants'
import type { Preferences } from '@/lib/types'

export type PreferenceRow = {
  tone?: unknown
  audience?: unknown
  domain?: unknown
  default_model?: unknown
  temperature?: unknown
  style_guidelines?: unknown
  output_format?: unknown
  language?: unknown
  depth?: unknown
  citation_preference?: unknown
  persona_hints?: unknown
  ui_defaults?: unknown
  sharing_links?: unknown
  do_not_ask_again?: unknown
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return undefined
}

function coerceObject<T extends Record<string, unknown>>(value: unknown): T | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T
  }
  return undefined
}

/**
 * Map a database row to strongly typed Preferences.
 */
export function mapPreferences(row?: PreferenceRow | null): Preferences {
  if (!row) return {}
  return {
    tone: coerceString(row.tone),
    audience: coerceString(row.audience),
    domain: coerceString(row.domain),
    defaultModel: coerceString(row.default_model),
    temperature: typeof row.temperature === 'number' && !Number.isNaN(row.temperature) ? row.temperature : null,
    styleGuidelines: coerceString(row.style_guidelines),
    outputFormat: coerceString(row.output_format),
    language: coerceString(row.language),
    depth: coerceString(row.depth),
    citationPreference: coerceString(row.citation_preference),
    personaHints: coerceString(row.persona_hints),
    uiDefaults: coerceObject(row.ui_defaults),
    sharingLinks: coerceObject(row.sharing_links),
    doNotAskAgain: coerceObject(row.do_not_ask_again),
  }
}

export function clampTemperature(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  const clamped = Math.min(1, Math.max(0, value))
  return Number.isFinite(clamped) ? clamped : null
}

export function resolveTemperature(preferences?: Preferences): number {
  const candidate = clampTemperature(preferences?.temperature)
  if (candidate === null) return DEFAULT_TEMPERATURE
  return candidate
}

/**
 * Payload builder for user-scoped preference upsert.
 */
export function buildUserPreferencesPayload(preferences: Preferences, userId: string, updatedAt: string) {
  return {
    user_id: userId,
    tone: preferences.tone ?? null,
    audience: preferences.audience ?? null,
    domain: preferences.domain ?? null,
    default_model: preferences.defaultModel ?? null,
    temperature: clampTemperature(preferences.temperature),
    style_guidelines: preferences.styleGuidelines ?? null,
    output_format: preferences.outputFormat ?? null,
    language: preferences.language ?? null,
    depth: preferences.depth ?? null,
    citation_preference: preferences.citationPreference ?? null,
    persona_hints: preferences.personaHints ?? null,
    ui_defaults: preferences.uiDefaults ?? null,
    sharing_links: preferences.sharingLinks ?? null,
    do_not_ask_again: preferences.doNotAskAgain ?? null,
    updated_at: updatedAt,
  }
}

/**
 * Payload builder for session-scoped preference upsert (guest users).
 */
export function buildSessionPreferencesPayload(preferences: Preferences, sessionId: string) {
  return {
    session_id: sessionId,
    tone: preferences.tone ?? null,
    audience: preferences.audience ?? null,
    domain: preferences.domain ?? null,
  }
}
