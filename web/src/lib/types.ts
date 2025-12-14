/**
 * Shared type definitions for the PromptForge application.
 * Single source of truth to prevent type drift.
 */

import type { TerminalRole } from './constants'

export type TerminalStatus = {
  title: string
  description: string
  state?: 'loading' | 'success' | 'error'
}

/**
 * Single activity lifecycle for a task, rendered as a compact status card.
 */
export type TaskActivity = {
  task: string
  stage: 'collecting' | 'clarifying' | 'preferences' | 'generating' | 'ready' | 'error' | 'stopped'
  status: 'loading' | 'success' | 'error'
  message: string
  detail?: string
}

/** A single line in the terminal output */
export type TerminalLine = {
  id: number
  role: TerminalRole
  text: string
  status?: TerminalStatus
}

export type ThemeName = 'dark' | 'dim' | 'light'
export type GenerationMode = 'quick' | 'guided'
export type ExamplesPreference = 'none' | 'one' | 'few'
export type CreativityPreset = 'deterministic' | 'balanced' | 'creative'
export type LanguageOption = 'auto' | 'en' | 'es' | 'uk' | 'de' | 'fr' | 'pt' | 'zh' | 'ja' | 'custom'

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
  languageCustom?: string
  allowMixedLanguage?: boolean
  depth?: string
  citationPreference?: string
  personaHints?: string
  uiDefaults?: {
    autoCopyApproved?: boolean
    /**
     * Default generation mode. Defaults to 'guided'.
     * 'quick' = skip clarifying + preference questions.
     * 'guided' = always ask clarifying, then preference questions (when enabled).
     */
    generationMode?: GenerationMode
    defaultProvider?: string
    defaultTextModel?: string
    defaultImageModel?: string
    defaultVideoModel?: string
    defaultAudioModel?: string
    examplesPreference?: ExamplesPreference
    creativityPreset?: CreativityPreset
    languageSelection?: LanguageOption
    languageCustom?: string
    allowMixedLanguage?: boolean
    /**
     * Whether preference questions should run during guided mode.
     * Defaults to true when unset.
     */
    askPreferencesInGuided?: boolean
    /**
     * Voice input language (BCP 47 tag like 'en-US', 'uk-UA').
     * 'auto' means use browser's navigator.language.
     */
    voiceLanguage?: string
    /**
     * Legacy flags retained for backwards compatibility with stored data.
     * They are ignored by the current UI.
     */
    showClarifying?: boolean
    askPreferencesOnSkip?: boolean
    theme?: ThemeName
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

export type SubscriptionTier = 'free_trial' | 'basic' | 'advanced' | 'expired'

export type SubscriptionRecord = {
  userId: string
  subscriptionTier: SubscriptionTier
  trialExpiresAt: string | null
  periodStart: string
  quotaGenerations: number
  quotaEdits: number
  quotaClarifying: number
  usageGenerations: number
  usageEdits: number
  usageClarifying: number
  // For tiers that allow premium finals (e.g., gpt-4.1)
  premiumFinalsRemaining?: number
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
