/**
 * Centralized constants for the PromptForge application.
 * Prevents magic strings scattered throughout the codebase.
 */

import type { ThemeName } from './types'

/** Terminal line roles */
export const ROLE = {
  SYSTEM: 'system',
  USER: 'user',
  APP: 'app',
} as const

export type TerminalRole = (typeof ROLE)[keyof typeof ROLE]

/** Slash commands recognized by the terminal */
export const COMMAND = {
  HELP: '/help',
  PREFERENCES: '/preferences',
  CLEAR: '/clear',
  RESTORE: '/restore',
  DISCARD: '/discard',
  HISTORY: '/history',
  USE: '/use',
  EDIT: '/edit',
  BACK: '/back',
  REVISE: '/revise',
} as const

export type Command = (typeof COMMAND)[keyof typeof COMMAND]

/** Session cookie name */
export const SESSION_COOKIE = 'pf_session_id'

/** Preference defaults and option sets */
export const DEFAULT_MODEL = 'gpt-4.1-mini'
export const DEFAULT_TEMPERATURE = 0.4
export const DEFAULT_THEME: ThemeName = 'dark'

export const THEME_OPTIONS: ReadonlyArray<{ value: ThemeName; label: string }> = [
  { value: 'light', label: 'White (Light)' },
  { value: 'dim', label: 'Dim' },
  { value: 'dark', label: 'Black (Dark)' },
] as const

export const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'o3', label: 'o3' },
  { value: 'o4-mini', label: 'o4-mini' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'grok-4', label: 'Grok 4' },
  { value: 'command-r', label: 'Command R' },
  { value: 'command-r-plus', label: 'Command R+' },
  { value: 'llama-3.1', label: 'Llama 3.1' },
  { value: 'mistral-large-2', label: 'Mistral Large 2' },
  { value: 'mixtral-8x7b', label: 'Mixtral 8x7B' },
  { value: 'deepseek-r1', label: 'DeepSeek R1' },
  { value: 'qwen2.5', label: 'Qwen2.5' },
  { value: 'phi-4', label: 'Phi-4' },
  { value: 'dbrx', label: 'DBRX' },
  { value: 'jamba-1.5', label: 'Jamba 1.5' },
  { value: 'titan-text', label: 'Titan Text (Bedrock)' },
  { value: 'stable-diffusion-3', label: 'Stable Diffusion 3' },
  { value: 'flux-1', label: 'FLUX.1' },
  { value: 'midjourney-v7', label: 'Midjourney v7' },
  { value: 'adobe-firefly', label: 'Adobe Firefly' },
  { value: 'runway-gen-4', label: 'Runway Gen-4' },
  { value: 'elevenlabs-v3', label: 'ElevenLabs v3' },
] as const

export const OUTPUT_FORMAT_OPTIONS = [
  { value: 'plain_text', label: 'Plain text' },
  { value: 'bullet_list', label: 'Bulleted list' },
  { value: 'steps', label: 'Step-by-step' },
  { value: 'table', label: 'Table' },
  { value: 'outline', label: 'Outline' },
] as const

export const DEPTH_OPTIONS = [
  { value: 'brief', label: 'Brief summary' },
  { value: 'standard', label: 'Standard depth' },
  { value: 'deep', label: 'Deep dive' },
] as const

export const CITATION_OPTIONS = [
  { value: 'none', label: 'No citations' },
  { value: 'light', label: 'Light references' },
  { value: 'strict', label: 'Strict citations' },
] as const

export const TONE_OPTIONS = ['casual', 'neutral', 'formal'] as const
export const AUDIENCE_OPTIONS = ['general', 'technical', 'executive'] as const
export const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'German'] as const

/** Toast display duration in milliseconds */
export const TOAST_DURATION_MS = 2000

/** Default terminal messages */
export const MESSAGE = {
  WELCOME: 'Starting fresh. Tell me your task + the result you want.',
  WELCOME_FRESH: 'Starting fresh. Tell me your task + the result you want.',
  HISTORY_CLEARED: 'History cleared. Use /restore to bring it back.',
  NO_PREFERENCES: 'no preferences set yet',
  EMPTY_SUBMIT_WARNING: 'Nothing to submit. Type a command or describe a task.',
  PROMPT_COPIED: 'Prompt copied',
  GENERATING_WAIT: 'Please wait for the AI to finish before submitting.',
  AI_STOPPED: 'Stopped AI generation for the current task.',
  ASKING_QUESTIONS: 'Thinking about the best questions to ask...',
  CREATING_PROMPT: 'Creating your prompt...',
  EDITING_PROMPT: 'Editing your prompt...',
  QUESTION_CONSENT: 'Want to sharpen this before generating?',
  PROMPT_READY: 'Here is a prompt you can use or edit:',
  PROMPT_APPROVED: 'Prompt approved and copied. Use /discard to start new or keep editing.',
} as const

/** Keyboard shortcuts info */
export const SHORTCUT = {
  COPY_MAC: '⌘+Enter',
  COPY_WIN: 'Ctrl+Enter',
  FOCUS: 'Cmd/Ctrl+J',
  EDIT: 'Cmd/Ctrl+E',
} as const

/** Empty submit warning cooldown in milliseconds */
export const EMPTY_SUBMIT_COOLDOWN_MS = 20000
