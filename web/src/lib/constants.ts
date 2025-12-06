/**
 * Centralized constants for the PromptForge application.
 * Prevents magic strings scattered throughout the codebase.
 */

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

export const MODEL_OPTIONS = [
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
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
  WELCOME: 'Describe your task and what kind of AI answer you expect.',
  WELCOME_FRESH: 'Starting fresh. Describe your task and what kind of AI answer you expect.',
  HISTORY_CLEARED: 'History cleared. Use /restore to bring it back.',
  NO_PREFERENCES: 'no preferences set yet',
  EMPTY_SUBMIT_WARNING: 'Nothing to submit. Type a command or describe a task.',
  PROMPT_COPIED: 'Prompt copied',
  GENERATING_WAIT: 'Please wait for the AI to finish before submitting.',
  AI_STOPPED: 'Stopped AI generation for the current task.',
  ASKING_QUESTIONS: 'Thinking about the best questions to ask...',
  CREATING_PROMPT: 'Creating your prompt...',
  EDITING_PROMPT: 'Editing your prompt...',
  QUESTION_CONSENT:
    'Before I craft your prompt, would you like to answer 3 quick questions to improve the context? (yes/no)',
  PROMPT_READY: 'Here is a prompt you can use or edit:',
  PROMPT_APPROVED:
    'Prompt approved and copied. You can now start a new task by typing /discard or continue updating this prompt.',
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
