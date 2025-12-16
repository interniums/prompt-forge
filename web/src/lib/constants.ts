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
  DISCARD: '/discard',
} as const

export type Command = (typeof COMMAND)[keyof typeof COMMAND]

/** Session cookie name */
export const SESSION_COOKIE = 'pf_session_id'

/** Preference defaults and option sets */
export const DEFAULT_MODEL = 'gpt-4.1-mini'
export const DEFAULT_TEMPERATURE = 0.4
export const DEFAULT_THEME: ThemeName = 'dim'
export const MIN_TASK_LENGTH = 4
export const MAX_TASK_LENGTH = 4000
export const MAX_EDITABLE_PROMPT_LENGTH = 6000

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

export const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'xai', label: 'xAI' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'meta', label: 'Meta' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'stability', label: 'Stability AI' },
  { value: 'midjourney', label: 'Midjourney' },
  { value: 'runway', label: 'Runway' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
] as const

export const TEXT_MODEL_OPTIONS = [
  { value: 'auto', label: 'Auto-pick' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'o4-mini', label: 'o4-mini' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'llama-3.1', label: 'Llama 3.1' },
  { value: 'mistral-large-2', label: 'Mistral Large 2' },
  { value: 'deepseek-r1', label: 'DeepSeek R1' },
  { value: 'command-r-plus', label: 'Command R+' },
] as const

export const IMAGE_MODEL_OPTIONS = [
  { value: 'auto', label: 'Auto-pick' },
  { value: 'stable-diffusion-3', label: 'Stable Diffusion 3' },
  { value: 'flux-1', label: 'FLUX.1' },
  { value: 'midjourney-v7', label: 'Midjourney v7' },
  { value: 'adobe-firefly', label: 'Adobe Firefly' },
] as const

export const VIDEO_MODEL_OPTIONS = [
  { value: 'auto', label: 'Auto-pick' },
  { value: 'runway-gen-4', label: 'Runway Gen-4' },
] as const

export const AUDIO_MODEL_OPTIONS = [
  { value: 'auto', label: 'Auto-pick' },
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

export const TONE_OPTIONS = ['casual', 'friendly', 'neutral', 'professional', 'formal'] as const
export const AUDIENCE_OPTIONS = ['general', 'beginner', 'technical', 'expert', 'executive'] as const
export const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'German'] as const
export const LANGUAGE_SELECT_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'custom', label: 'Custom…' },
] as const

export const EXAMPLES_PREFERENCE_OPTIONS = [
  { value: 'none', label: 'No examples' },
  { value: 'one', label: 'One example' },
  { value: 'few', label: 'A few examples' },
] as const

/**
 * Voice input language options (BCP 47 language tags).
 * 'auto' means use browser's navigator.language.
 */
export const VOICE_LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto (browser language)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'uk-UA', label: 'Ukrainian' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'pt-PT', label: 'Portuguese (Portugal)' },
  { value: 'ru-RU', label: 'Russian' },
  { value: 'pl-PL', label: 'Polish' },
  { value: 'nl-NL', label: 'Dutch' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'ar-SA', label: 'Arabic' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'tr-TR', label: 'Turkish' },
  { value: 'vi-VN', label: 'Vietnamese' },
  { value: 'th-TH', label: 'Thai' },
] as const

export const CREATIVITY_PRESET_OPTIONS = [
  { value: 'deterministic', label: 'Deterministic' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'creative', label: 'Creative' },
] as const

/** Toast display duration in milliseconds */
export const TOAST_DURATION_MS = 2000

/** Default terminal messages */
export const MESSAGE = {
  WELCOME: "Let's choose a mode and generate your prompt.",
  WELCOME_FRESH: "Let's choose a mode and generate your prompt.",
  HISTORY_CLEARED: 'New session. Choose a mode to generate your prompt.',
  NO_PREFERENCES: 'no preferences set yet',
  EMPTY_SUBMIT_WARNING: '',
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
