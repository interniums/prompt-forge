'use client'

import React, { useEffect, useState, useCallback, useRef, startTransition } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

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
  user,
  saving,
  canSave,
  onClose,
  onChange,
  onSave,
}: PreferencesPanelProps) {
  // Local state for immediate UI updates - sync with parent only on close
  const [localValues, setLocalValues] = useState<Preferences>(values)
  const [temperatureInput, setTemperatureInput] = useState<string>(() =>
    values.temperature !== null && values.temperature !== undefined ? String(values.temperature) : ''
  )

  // Sync from parent when modal opens or values change while open
  useEffect(() => {
    if (!open) return
    startTransition(() => {
      setLocalValues(values)
      setTemperatureInput(
        values.temperature !== null && values.temperature !== undefined ? String(values.temperature) : ''
      )
    })
  }, [open, values])

  const uiDefaults = localValues.uiDefaults ?? {}
  const sharingLinks = localValues.sharingLinks ?? {}
  const doNotAskAgain = localValues.doNotAskAgain ?? {}

  // Debounce timeout ref
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced parent update
  const debouncedOnChange = useCallback(
    (updated: Preferences) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      updateTimeoutRef.current = setTimeout(() => {
        onChange(updated)
        updateTimeoutRef.current = null
      }, 300)
    },
    [onChange]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  const handleTextChange =
    (key: keyof Preferences) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      const updated = { ...localValues, [key]: value.trim() ? value : undefined }
      setLocalValues(updated)
      debouncedOnChange(updated)
    }

  const handleTemperatureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    const parsed = value === '' ? null : Number(value)
    const updated = { ...localValues, temperature: Number.isFinite(parsed) ? parsed : null }
    setTemperatureInput(value)
    setLocalValues(updated)
    debouncedOnChange(updated)
  }

  const handleDoNotAskAgainChange = (key: keyof NonNullable<Preferences['doNotAskAgain']>) => (checked: boolean) => {
    const updatedDoNotAskAgain = { ...doNotAskAgain, [key]: checked }
    const updated = { ...localValues, doNotAskAgain: updatedDoNotAskAgain }
    setLocalValues(updated)
    // Checkboxes update parent immediately (no debounce)
    onChange(updated)
  }

  const handleBlurSave = async () => {
    // Flush any pending debounced updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
      onChange(localValues)
      updateTimeoutRef.current = null
    }

    if (canSave && !saving) {
      await onSave()
    } else if (!user) {
      // Save to localStorage for non-authenticated users
      if (typeof window !== 'undefined') {
        localStorage.setItem('pf_local_preferences', JSON.stringify(localValues))
      }
    }
  }

  if (!open) return null

  const handleBackdropClick = async (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Flush pending updates and save before closing
      await handleBlurSave()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#050608] p-6 shadow-[0_0_80px_rgba(15,23,42,0.95)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-2">
            <div className="font-mono text-lg font-semibold text-slate-50">Preferences</div>
            <div className="font-mono text-sm text-slate-400 max-w-2xl leading-relaxed">
              Set default preferences for prompt generation. Changes are saved automatically.
            </div>
            <div className="font-mono text-sm text-slate-500 max-w-2xl">
              {!user && 'Sign in to sync across devices'}
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await handleBlurSave()
              onClose()
            }}
            className="cursor-pointer bg-transparent p-1 text-slate-400 hover:text-slate-100 hover:underline hover:underline-offset-4"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Preferences */}
          <div className="mb-6">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-4">Basic Preferences</h3>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Tone</span>
                    <span className="block font-mono text-sm text-slate-500">Writing style and voice for prompts</span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.tone === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('tone')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={localValues.tone ?? ''}
                  onChange={handleTextChange('tone')}
                  placeholder={`e.g., ${Array.from(TONE_OPTIONS).join(', ')}`}
                  className="w-full font-mono bg-[#050608] border border-slate-800 rounded-md px-3 py-2.5 text-base text-slate-100 placeholder-slate-600 focus:border-slate-600 focus:text-slate-50 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Audience</span>
                    <span className="block font-mono text-sm text-slate-500">
                      Target readers or users of the content
                    </span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.audience === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('audience')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={localValues.audience ?? ''}
                  onChange={handleTextChange('audience')}
                  placeholder={`e.g., ${Array.from(AUDIENCE_OPTIONS).join(', ')}`}
                  className="w-full font-mono bg-[#050608] border border-slate-800 rounded-md px-3 py-2.5 text-base text-slate-100 placeholder-slate-600 focus:border-slate-600 focus:text-slate-50 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Domain</span>
                    <span className="block font-mono text-sm text-slate-500">Industry or field of work context</span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.domain === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('domain')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={localValues.domain ?? ''}
                  onChange={handleTextChange('domain')}
                  placeholder="e.g., marketing, product, engineering"
                  className="w-full font-mono bg-[#050608] border border-slate-800 rounded-md px-3 py-2.5 text-base text-slate-100 placeholder-slate-600 focus:border-slate-600 focus:text-slate-50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Model Configuration */}
          <div className="mb-6">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-4">Model Configuration</h3>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Target Model</span>
                    <span className="block font-mono text-sm text-slate-500">AI model to optimize prompts for</span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.defaultModel === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('defaultModel')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <Select
                  value={localValues.defaultModel ?? ''}
                  onValueChange={(value) => {
                    const updated = { ...localValues, defaultModel: value || undefined }
                    setLocalValues(updated)
                    debouncedOnChange(updated)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Temperature</span>
                    <span className="block font-mono text-sm text-slate-500">
                      Creativity level (0=focused, 1=creative)
                    </span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.temperature === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('temperature')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperatureInput}
                  onChange={handleTemperatureChange}
                  placeholder="0.0 - 1.0"
                  className="w-full font-mono bg-[#050608] border border-slate-800 rounded-md px-3 py-2.5 text-base text-slate-100 placeholder-slate-600 focus:border-slate-600 focus:text-slate-50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Output Settings */}
          <div className="mb-6">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-4">Output Settings</h3>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Output Format</span>
                    <span className="block font-mono text-sm text-slate-500">Preferred structure for responses</span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.outputFormat === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('outputFormat')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <Select
                  value={localValues.outputFormat ?? ''}
                  onValueChange={(value) => {
                    const updated = { ...localValues, outputFormat: value || undefined }
                    setLocalValues(updated)
                    debouncedOnChange(updated)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Language</span>
                    <span className="block font-mono text-sm text-slate-500">Primary language for output</span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.language === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('language')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <Select
                  value={localValues.language ?? ''}
                  onValueChange={(value) => {
                    const updated = { ...localValues, language: value || undefined }
                    setLocalValues(updated)
                    debouncedOnChange(updated)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Depth</span>
                    <span className="block font-mono text-sm text-slate-500">Level of detail in responses</span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.depth === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('depth')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <Select
                  value={localValues.depth ?? ''}
                  onValueChange={(value) => {
                    const updated = { ...localValues, depth: value || undefined }
                    setLocalValues(updated)
                    debouncedOnChange(updated)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPTH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Citations</span>
                    <span className="block font-mono text-sm text-slate-500">How to handle references and sources</span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.citationPreference === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('citationPreference')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <Select
                  value={localValues.citationPreference ?? ''}
                  onValueChange={(value) => {
                    const updated = { ...localValues, citationPreference: value || undefined }
                    setLocalValues(updated)
                    debouncedOnChange(updated)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="mb-6">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-4">Advanced Settings</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Style Guidelines</span>
                    <span className="block font-mono text-sm text-slate-500">
                      Custom instructions for formatting and structure
                    </span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.styleGuidelines === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('styleGuidelines')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <textarea
                  value={localValues.styleGuidelines ?? ''}
                  onChange={handleTextChange('styleGuidelines')}
                  rows={3}
                  placeholder="e.g., Always use bullet points, keep paragraphs under 3 sentences, use active voice"
                  className="w-full font-mono bg-[#050608] border border-slate-800 rounded-md px-3 py-2.5 text-base text-slate-100 placeholder-slate-600 focus:border-slate-600 focus:text-slate-50 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3 min-h-12">
                  <div className="flex-1">
                    <span className="block font-mono text-base font-medium text-slate-300">Persona Hints</span>
                    <span className="block font-mono text-sm text-slate-500">Voice, role, or character to emulate</span>
                  </div>
                  <label className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                    <Checkbox
                      checked={doNotAskAgain.personaHints === false}
                      onCheckedChange={(checked) => {
                        handleDoNotAskAgainChange('personaHints')(checked === false)
                      }}
                    />
                    <span className="font-mono">Ask every time</span>
                  </label>
                </div>
                <textarea
                  value={localValues.personaHints ?? ''}
                  onChange={handleTextChange('personaHints')}
                  rows={3}
                  placeholder="e.g., Write as a senior engineer, be helpful but concise, use technical terminology"
                  className="w-full font-mono bg-[#050608] border border-slate-800 rounded-md px-3 py-2.5 text-base text-slate-100 placeholder-slate-600 focus:border-slate-600 focus:text-slate-50 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* UI & Behavior Settings */}
          <div className="mb-6">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-4">UI & Behavior</h3>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={Boolean(uiDefaults.autoCopyApproved)}
                    onCheckedChange={(checked) => {
                      const updated = {
                        ...localValues,
                        uiDefaults: { ...uiDefaults, autoCopyApproved: checked === true },
                      }
                      setLocalValues(updated)
                      onChange(updated)
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-mono text-base text-slate-300">Auto-copy approved prompts</div>
                    <div className="font-mono text-sm text-slate-500 mt-0.5">Copy to clipboard when you approve</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={Boolean(uiDefaults.showClarifying)}
                    onCheckedChange={(checked) => {
                      const updated = {
                        ...localValues,
                        uiDefaults: { ...uiDefaults, showClarifying: checked === true },
                      }
                      setLocalValues(updated)
                      onChange(updated)
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-mono text-base text-slate-300">Ask clarifying questions</div>
                    <div className="font-mono text-sm text-slate-500 mt-0.5">Enable follow-up questions by default</div>
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={Boolean(sharingLinks.allowPrefillLinks)}
                    onCheckedChange={(checked) => {
                      const updated = {
                        ...localValues,
                        sharingLinks: { ...sharingLinks, allowPrefillLinks: checked === true },
                      }
                      setLocalValues(updated)
                      onChange(updated)
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-mono text-base text-slate-300">Allow prefill links</div>
                    <div className="font-mono text-sm text-slate-500 mt-0.5">
                      Enable URL parameters to prefill forms
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={Boolean(sharingLinks.warnSensitive)}
                    onCheckedChange={(checked) => {
                      const updated = {
                        ...localValues,
                        sharingLinks: { ...sharingLinks, warnSensitive: checked === true },
                      }
                      setLocalValues(updated)
                      onChange(updated)
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-mono text-base text-slate-300">Warn about sensitive data</div>
                    <div className="font-mono text-sm text-slate-500 mt-0.5">Show alerts when sharing private info</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
