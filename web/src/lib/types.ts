/**
 * Shared type definitions for the PromptForge application.
 * Single source of truth to prevent type drift.
 */

import type { TerminalRole } from './constants'

/** A single line in the terminal output */
export type TerminalLine = {
  id: number
  role: TerminalRole
  text: string
}

/** User preferences for prompt shaping */
export type Preferences = {
  tone?: string
  audience?: string
  domain?: string
  defaultModel?: string
  temperature?: number | null
  styleGuidelines?: string
  outputFormat?: string
  language?: string
  depth?: string
  citationPreference?: string
  personaHints?: string
  uiDefaults?: {
    autoCopyApproved?: boolean
    showClarifying?: boolean
    askPreferencesOnSkip?: boolean
  }
  sharingLinks?: {
    allowPrefillLinks?: boolean
    warnSensitive?: boolean
  }
  doNotAskAgain?: {
    tone?: boolean
    audience?: boolean
    domain?: boolean
    defaultModel?: boolean
    temperature?: boolean
    styleGuidelines?: boolean
    outputFormat?: boolean
    language?: boolean
    depth?: boolean
    citationPreference?: boolean
    personaHints?: boolean
  }
}

export type UserIdentity = {
  id: string
  email?: string | null
}

export type PreferenceSource = 'user' | 'session' | 'local' | 'none'

/** A generated prompt with metadata */
export type GeneratedPrompt = {
  id: string
  label: string
  body: string
}

/** A history item from saved generations */
export type HistoryItem = {
  id: string
  task: string
  label: string
  body: string
  created_at: string
}

/** A single option for a clarifying question */
export type ClarifyingOption = {
  id: string
  label: string
}

/** A clarifying question with optional multiple-choice options */
export type ClarifyingQuestion = {
  id: string
  question: string
  options: ClarifyingOption[]
}

/** User's answer to a clarifying question */
export type ClarifyingAnswer = {
  questionId: string
  question: string
  answer: string
}

/** Stages in the preferences wizard flow */
export type PreferencesStep = 'tone' | 'audience' | 'domain' | null

/** Session state loaded from the database */
export type SessionState = {
  sessionId: string
  preferences: Preferences
  preferencesSource: PreferenceSource
  user: UserIdentity | null
  generations: HistoryItem[]
  isFirstLogin?: boolean
}

/** Template summary for listing */
export type TemplateSummary = {
  id: string
  name: string
  description: string | null
}

/** Full template definition */
export type Template = TemplateSummary & {
  base_prompt: string
  created_at?: string
  updated_at?: string
}

/** A field within a template */
export type TemplateField = {
  id: string
  name: string
  label: string
  field_type: string
  required: boolean
  helper_text: string | null
  sort_order?: number
}
