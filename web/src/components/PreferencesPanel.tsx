'use client'

import React, { useEffect, useState, useCallback, useRef, startTransition } from 'react'
import {
  MODEL_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  DEPTH_OPTIONS,
  CITATION_OPTIONS,
  TONE_OPTIONS,
  AUDIENCE_OPTIONS,
} from '@/lib/constants'
import type { Preferences, PreferenceSource, UserIdentity } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

type CheckedState = boolean | 'indeterminate'

type ClearButtonProps = {
  onClick: () => void
  show?: boolean
  rightOffset?: string
}

const ClearButton = ({ onClick, show = true, rightOffset = 'right-2' }: ClearButtonProps) => {
  if (!show) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute ${rightOffset} top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors z-10 cursor-pointer`}
      aria-label="Clear"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

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

  const clearPreference = useCallback(
    (key: keyof Preferences) => {
      setLocalValues((prev) => {
        const updated =
          key === 'temperature' ? { ...prev, temperature: null } : ({ ...prev, [key]: undefined } as Preferences)
        if (key === 'temperature') {
          setTemperatureInput('')
        }
        debouncedOnChange(updated)
        return updated
      })
    },
    [debouncedOnChange]
  )

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
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#050608] p-6 shadow-[0_0_80px_rgba(15,23,42,0.95)] terminal-scroll"
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
          <div className="mb-10">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-2">Basic Preferences</h3>
            <div className="grid grid-cols-1 gap-x-5 gap-y-3 xl:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0">
                    <span className="block font-mono text-base font-medium text-slate-300">Tone</span>
                    <span className="block font-mono text-sm text-slate-500">Writing style and voice for prompts</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.tone === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('tone')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={localValues.tone ?? ''}
                    onChange={handleTextChange('tone')}
                    placeholder={`e.g., ${Array.from(TONE_OPTIONS).join(', ')}`}
                    className="w-full font-mono bg-[#0b1016] border border-slate-700 rounded-md px-3 py-2.5 pr-16 text-base text-slate-100 placeholder-slate-500 shadow-[0_8px_18px_rgba(0,0,0,0.22)] focus:border-slate-500 focus:text-slate-50 focus:outline-none"
                  />
                  <ClearButton onClick={() => clearPreference('tone')} show={!!localValues.tone} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0">
                    <span className="block font-mono text-base font-medium text-slate-300">Audience</span>
                    <span className="block font-mono text-sm text-slate-500">
                      Target readers or users of the content
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.audience === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('audience')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={localValues.audience ?? ''}
                    onChange={handleTextChange('audience')}
                    placeholder={`e.g., ${Array.from(AUDIENCE_OPTIONS).join(', ')}`}
                    className="w-full font-mono bg-[#0b1016] border border-slate-700 rounded-md px-3 py-2.5 pr-16 text-base text-slate-100 placeholder-slate-500 shadow-[0_8px_18px_rgba(0,0,0,0.22)] focus:border-slate-500 focus:text-slate-50 focus:outline-none"
                  />
                  <ClearButton onClick={() => clearPreference('audience')} show={!!localValues.audience} />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0">
                    <span className="block font-mono text-base font-medium text-slate-300">Domain</span>
                    <span className="block font-mono text-sm text-slate-500">Industry or field of work context</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.domain === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('domain')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={localValues.domain ?? ''}
                    onChange={handleTextChange('domain')}
                    placeholder="e.g., marketing, product, engineering"
                    className="w-full font-mono bg-[#0b1016] border border-slate-700 rounded-md px-3 py-2.5 pr-16 text-base text-slate-100 placeholder-slate-500 shadow-[0_8px_18px_rgba(0,0,0,0.22)] focus:border-slate-500 focus:text-slate-50 focus:outline-none"
                  />
                  <ClearButton onClick={() => clearPreference('domain')} show={!!localValues.domain} />
                </div>
              </div>
            </div>
          </div>

          {/* Model Configuration */}
          <div className="mb-10">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-2">Model Configuration</h3>
            <div className="grid grid-cols-1 gap-x-5 gap-y-3 xl:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0">
                    <span className="block font-mono text-base font-medium text-slate-300">Target Model</span>
                    <span className="block font-mono text-sm text-slate-500">AI model to optimize prompts for</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.defaultModel === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('defaultModel')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <Select
                    value={localValues.defaultModel ?? ''}
                    onValueChange={(value: string) => {
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
                  <ClearButton onClick={() => clearPreference('defaultModel')} show={!!localValues.defaultModel} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <span className="block font-mono text-base font-medium text-slate-300">Temperature</span>
                    <div className="font-mono text-sm text-slate-500 mt-0.5 leading-[1.2]">
                      <div className="leading-none">Creativity level</div>
                      <div className="leading-none text-xs">0=focused, 1=creative</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.temperature === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('temperature')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperatureInput}
                    onChange={handleTemperatureChange}
                    placeholder="0.0 - 1.0"
                    className="w-full font-mono bg-[#0b1016] border border-slate-700 rounded-md px-3 py-2.5 pr-16 text-base text-slate-100 placeholder-slate-500 shadow-[0_8px_18px_rgba(0,0,0,0.22)] focus:border-slate-500 focus:text-slate-50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <ClearButton onClick={() => clearPreference('temperature')} show={!!temperatureInput} />
                </div>
              </div>
            </div>
          </div>

          {/* Output Settings */}
          <div className="mb-10">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-2">Output Settings</h3>
            <div className="grid grid-cols-1 gap-x-5 gap-y-3 xl:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0">
                    <span className="block font-mono text-base font-medium text-slate-300">Output Format</span>
                    <span className="block font-mono text-sm text-slate-500">Preferred structure for responses</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.outputFormat === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('outputFormat')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <Select
                    value={localValues.outputFormat ?? ''}
                    onValueChange={(value: string) => {
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
                  <ClearButton onClick={() => clearPreference('outputFormat')} show={!!localValues.outputFormat} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0">
                    <span className="block font-mono text-base font-medium text-slate-300">Language</span>
                    <span className="block font-mono text-sm text-slate-500">Primary language for output</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.language === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('language')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={localValues.language ?? ''}
                    onChange={handleTextChange('language')}
                    placeholder="e.g., English, Spanish, Hindi"
                    className="w-full font-mono bg-[#0b1016] border border-slate-700 rounded-md px-3 py-2.5 pr-16 text-base text-slate-100 placeholder-slate-500 shadow-[0_8px_18px_rgba(0,0,0,0.22)] focus:border-slate-500 focus:text-slate-50 focus:outline-none"
                  />
                  <ClearButton onClick={() => clearPreference('language')} show={!!localValues.language} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0">
                    <span className="block font-mono text-base font-medium text-slate-300">Depth</span>
                    <span className="block font-mono text-sm text-slate-500">Level of detail in responses</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.depth === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('depth')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <Select
                    value={localValues.depth ?? ''}
                    onValueChange={(value: string) => {
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
                  <ClearButton onClick={() => clearPreference('depth')} show={!!localValues.depth} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0">
                    <span className="block font-mono text-base font-medium text-slate-300">Citations</span>
                    <span className="block font-mono text-sm text-slate-500">How to handle references and sources</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.citationPreference === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('citationPreference')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <Select
                    value={localValues.citationPreference ?? ''}
                    onValueChange={(value: string) => {
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
                  <ClearButton
                    onClick={() => clearPreference('citationPreference')}
                    show={!!localValues.citationPreference}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="mb-6">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-2">Advanced Settings</h3>
            <div className="grid grid-cols-1">
              <div className="space-y-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0">
                    <span className="block font-mono text-base font-medium text-slate-300">Style Guidelines</span>
                    <span className="block font-mono text-sm text-slate-500">
                      Custom instructions for formatting and structure
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.styleGuidelines === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('styleGuidelines')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    value={localValues.styleGuidelines ?? ''}
                    onChange={handleTextChange('styleGuidelines')}
                    rows={3}
                    placeholder="e.g., Always use bullet points, keep paragraphs under 3 sentences, use active voice"
                    className="w-full font-mono bg-[#0b1016] border border-slate-700 rounded-md px-3 py-2.5 pr-12 text-base text-slate-100 placeholder-slate-500 shadow-[0_8px_18px_rgba(0,0,0,0.22)] focus:border-slate-500 focus:text-slate-50 focus:outline-none resize-none"
                  />
                  <ClearButton
                    onClick={() => clearPreference('styleGuidelines')}
                    show={!!localValues.styleGuidelines}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-end gap-3 h-14">
                  <div className="flex-1 min-w-0">
                    <span className="block font-mono text-base font-medium text-slate-300">Persona Hints</span>
                    <span className="block font-mono text-sm text-slate-500">Voice, role, or character to emulate</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
                    <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
                      <Checkbox
                        checked={doNotAskAgain.personaHints === false}
                        onCheckedChange={(checked: CheckedState) => {
                          handleDoNotAskAgainChange('personaHints')(checked === false)
                        }}
                      />
                      <span className="font-mono">Ask every time</span>
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    value={localValues.personaHints ?? ''}
                    onChange={handleTextChange('personaHints')}
                    rows={3}
                    placeholder="e.g., Write as a senior engineer, be helpful but concise, use technical terminology"
                    className="w-full font-mono bg-[#0b1016] border border-slate-700 rounded-md px-3 py-2.5 pr-12 text-base text-slate-100 placeholder-slate-500 shadow-[0_8px_18px_rgba(0,0,0,0.22)] focus:border-slate-500 focus:text-slate-50 focus:outline-none resize-none"
                  />
                  <ClearButton onClick={() => clearPreference('personaHints')} show={!!localValues.personaHints} />
                </div>
              </div>
            </div>
          </div>

          {/* UI & Behavior Settings */}
          <div className="mb-10">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-2">UI & Behavior</h3>
            <div className="grid grid-cols-1 gap-x-5 gap-y-3 xl:grid-cols-2 items-start">
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={Boolean(uiDefaults.autoCopyApproved)}
                    onCheckedChange={(checked: CheckedState) => {
                      const updated = {
                        ...localValues,
                        uiDefaults: { ...uiDefaults, autoCopyApproved: checked === true },
                      }
                      setLocalValues(updated)
                      onChange(updated)
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-mono text-base text-slate-300">Auto-copy approved prompts</div>
                    <div className="font-mono text-sm text-slate-500 mt-0.5">Copy to clipboard when you approve</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={Boolean(uiDefaults.showClarifying)}
                    onCheckedChange={(checked: CheckedState) => {
                      const updated = {
                        ...localValues,
                        uiDefaults: { ...uiDefaults, showClarifying: checked === true },
                      }
                      setLocalValues(updated)
                      onChange(updated)
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-mono text-base text-slate-300">Ask clarifying questions</div>
                    <div className="font-mono text-sm text-slate-500 mt-0.5">Enable follow-up questions by default</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={Boolean(uiDefaults.askPreferencesOnSkip)}
                    onCheckedChange={(checked: CheckedState) => {
                      const updated = {
                        ...localValues,
                        uiDefaults: { ...uiDefaults, askPreferencesOnSkip: checked === true },
                      }
                      setLocalValues(updated)
                      onChange(updated)
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-mono text-base text-slate-300">Ask preferences if clarifying skipped</div>
                    <div className="font-mono text-sm text-slate-500 mt-0.5">
                      When you choose “no” for clarifying, still ask preference questions
                    </div>
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={Boolean(sharingLinks.allowPrefillLinks)}
                    onCheckedChange={(checked: CheckedState) => {
                      const updated = {
                        ...localValues,
                        sharingLinks: { ...sharingLinks, allowPrefillLinks: checked === true },
                      }
                      setLocalValues(updated)
                      onChange(updated)
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-mono text-base text-slate-300">Allow prefill links</div>
                    <div className="font-mono text-sm text-slate-500 mt-0.5">
                      Enable URL parameters to prefill forms
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={Boolean(sharingLinks.warnSensitive)}
                    onCheckedChange={(checked: CheckedState) => {
                      const updated = {
                        ...localValues,
                        sharingLinks: { ...sharingLinks, warnSensitive: checked === true },
                      }
                      setLocalValues(updated)
                      onChange(updated)
                    }}
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
