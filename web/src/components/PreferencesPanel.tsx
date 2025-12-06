'use client'

import React from 'react'
import {
  MODEL_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  DEPTH_OPTIONS,
  CITATION_OPTIONS,
  LANGUAGE_OPTIONS,
  TONE_OPTIONS,
  AUDIENCE_OPTIONS,
} from '@/lib/constants'
import type { Preferences, PreferenceSource, UserIdentity } from '@/lib/types'

type PreferencesPanelProps = {
  open: boolean
  values: Preferences
  source: PreferenceSource
  user: UserIdentity | null
  saving: boolean
  canSave: boolean
  onClose: () => void
  onChange: (next: Preferences) => void
  onSave: () => void
  onSignIn?: () => void
  onSignOut?: () => void
}

export function PreferencesPanel({
  open,
  values,
  source,
  user,
  saving,
  canSave,
  onClose,
  onChange,
  onSave,
}: PreferencesPanelProps) {
  if (!open) return null

  const uiDefaults = values.uiDefaults ?? {}
  const sharingLinks = values.sharingLinks ?? {}

  const handleTextChange =
    (key: keyof Preferences) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      onChange({
        ...values,
        [key]: value.trim() ? value : undefined,
      })
    }

  const handleSelectChange = (key: keyof Preferences) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    onChange({
      ...values,
      [key]: value ? value : undefined,
    })
  }

  const handleTemperatureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    if (value === '') {
      onChange({ ...values, temperature: null })
      return
    }
    const parsed = Number(value)
    onChange({ ...values, temperature: Number.isFinite(parsed) ? parsed : null })
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-100">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-base font-semibold text-slate-50">Preferences</div>
          <div className="text-xs text-slate-400">
            {user
              ? `Signed in${user.email ? ` as ${user.email}` : ''}. ${
                  source === 'user' ? 'Synced to your account.' : 'Unsaved changes in progress.'
                }`
              : 'Not signed in. Edits apply locally; saving to the cloud requires Google sign-in.'}
          </div>
          <div className="text-xs text-slate-500">
            You can update these anytime or override them individually on each prompt.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-slate-700 px-3 py-1 font-medium text-slate-200 hover:border-slate-500"
          >
            Close
          </button>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Tone</span>
            <input
              type="text"
              value={values.tone ?? ''}
              onChange={handleTextChange('tone')}
              placeholder={`e.g., ${Array.from(TONE_OPTIONS).join(', ')}`}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Audience</span>
            <input
              type="text"
              value={values.audience ?? ''}
              onChange={handleTextChange('audience')}
              placeholder={`e.g., ${Array.from(AUDIENCE_OPTIONS).join(', ')}`}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Domain focus</span>
            <input
              type="text"
              value={values.domain ?? ''}
              onChange={handleTextChange('domain')}
              placeholder="e.g., marketing, product, engineering"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Target model</span>
            <select
              value={values.defaultModel ?? ''}
              onChange={handleSelectChange('defaultModel')}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            >
              <option value="">Select a model</option>
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Temperature (0-1)</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={values.temperature ?? ''}
              onChange={handleTemperatureChange}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Output format</span>
            <select
              value={values.outputFormat ?? ''}
              onChange={handleSelectChange('outputFormat')}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            >
              <option value="">No preference</option>
              {OUTPUT_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Primary language</span>
            <select
              value={values.language ?? ''}
              onChange={handleSelectChange('language')}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            >
              <option value="">No preference</option>
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Depth</span>
            <select
              value={values.depth ?? ''}
              onChange={handleSelectChange('depth')}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            >
              <option value="">No preference</option>
              {DEPTH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Citations</span>
            <select
              value={values.citationPreference ?? ''}
              onChange={handleSelectChange('citationPreference')}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            >
              <option value="">No preference</option>
              {CITATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Style guidelines</span>
            <textarea
              value={values.styleGuidelines ?? ''}
              onChange={handleTextChange('styleGuidelines')}
              rows={3}
              placeholder="Tone, format, length, or other instructions to keep in mind."
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-xs text-slate-400">Persona hints</span>
            <textarea
              value={values.personaHints ?? ''}
              onChange={handleTextChange('personaHints')}
              rows={3}
              placeholder="Voice, role, or other persona notes to emulate."
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <div className="text-xs font-semibold text-slate-200">UI defaults</div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(uiDefaults.autoCopyApproved)}
                onChange={(event) =>
                  onChange({
                    ...values,
                    uiDefaults: { ...uiDefaults, autoCopyApproved: event.target.checked },
                  })
                }
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              Auto-copy approved prompts
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(uiDefaults.showClarifying)}
                onChange={(event) =>
                  onChange({
                    ...values,
                    uiDefaults: { ...uiDefaults, showClarifying: event.target.checked },
                  })
                }
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              Ask clarifying questions by default
            </label>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <div className="text-xs font-semibold text-slate-200">Sharing & links</div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(sharingLinks.allowPrefillLinks)}
                onChange={(event) =>
                  onChange({
                    ...values,
                    sharingLinks: { ...sharingLinks, allowPrefillLinks: event.target.checked },
                  })
                }
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              Allow prefill links
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(sharingLinks.warnSensitive)}
                onChange={(event) =>
                  onChange({
                    ...values,
                    sharingLinks: { ...sharingLinks, warnSensitive: event.target.checked },
                  })
                }
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500"
              />
              Warn about sensitive data
            </label>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-200 hover:border-slate-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave || saving}
            className="cursor-pointer rounded-md border border-indigo-600 bg-indigo-600/20 px-3 py-2 font-medium text-indigo-100 hover:bg-indigo-600/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-400"
            title={canSave ? '' : 'Sign in to save preferences to your account'}
          >
            {saving ? 'Saving…' : canSave ? 'Save preferences' : 'Sign in to save'}
          </button>
        </div>
      </form>
    </div>
  )
}
