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
