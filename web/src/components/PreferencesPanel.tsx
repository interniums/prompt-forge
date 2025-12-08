'use client'

import React, { useEffect, useState, useCallback, useRef, startTransition, useMemo } from 'react'
import {
  MODEL_OPTIONS,
  OUTPUT_FORMAT_OPTIONS,
  DEPTH_OPTIONS,
  CITATION_OPTIONS,
  TONE_OPTIONS,
  AUDIENCE_OPTIONS,
  THEME_OPTIONS,
  DEFAULT_THEME,
} from '@/lib/constants'
import type { Preferences, PreferenceSource, UserIdentity, ThemeName } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { ClearButton } from '@/features/preferences/ClearButton'
import { PreferenceSelectField } from '@/features/preferences/PreferenceSelectField'
import { PreferenceTextField } from '@/features/preferences/PreferenceTextField'
import { PreferenceTextareaField } from '@/features/preferences/PreferenceTextareaField'
import { modalBackdropClass, modalCardClass, preferenceInputClass } from '@/features/preferences/styles'

type CheckedState = boolean | 'indeterminate'

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
  const doNotAskAgain = useMemo(() => localValues.doNotAskAgain ?? {}, [localValues.doNotAskAgain])
  const selectedTheme = (uiDefaults.theme as ThemeName | undefined) ?? DEFAULT_THEME

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

  const handleDoNotAskAgainChange = useCallback(
    (key: keyof NonNullable<Preferences['doNotAskAgain']>) => (checked: boolean) => {
      setLocalValues((prev) => {
        const updatedDoNotAskAgain = { ...(prev.doNotAskAgain ?? {}), [key]: checked }
        const updated = { ...prev, doNotAskAgain: updatedDoNotAskAgain }
        // Checkboxes update parent immediately (no debounce)
        onChange(updated)
        return updated
      })
    },
    [onChange]
  )

  const renderAskEveryTimeSlot = useCallback(
    (key: keyof NonNullable<Preferences['doNotAskAgain']>) => (
      <div className="flex items-center gap-3 shrink-0 w-[140px] justify-end">
        <label className="flex items-center gap-1.5 text-sm text-slate-500 whitespace-nowrap cursor-pointer">
          <Checkbox
            checked={doNotAskAgain[key] === false}
            onCheckedChange={(checked: CheckedState) => {
              handleDoNotAskAgainChange(key)(checked === false)
            }}
          />
          <span className="font-mono">Ask every time</span>
        </label>
      </div>
    ),
    [doNotAskAgain, handleDoNotAskAgainChange]
  )

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
    <div className={modalBackdropClass} onClick={handleBackdropClick}>
      <div className={modalCardClass} onClick={(e) => e.stopPropagation()}>
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
              <PreferenceTextField
                label="Tone"
                description="Writing style and voice for prompts"
                value={localValues.tone ?? ''}
                placeholder={`e.g., ${Array.from(TONE_OPTIONS).join(', ')}`}
                onChange={(val) =>
                  handleTextChange('tone')({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>)
                }
                onClear={() => clearPreference('tone')}
                rightSlot={
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
                }
              />

              <PreferenceTextField
                label="Audience"
                description="Target readers or users of the content"
                value={localValues.audience ?? ''}
                placeholder={`e.g., ${Array.from(AUDIENCE_OPTIONS).join(', ')}`}
                onChange={(val) =>
                  handleTextChange('audience')({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>)
                }
                onClear={() => clearPreference('audience')}
                rightSlot={
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
                }
              />

              <div className="md:col-span-2">
                <PreferenceTextField
                  label="Domain"
                  description="Industry or field of work context"
                  value={localValues.domain ?? ''}
                  placeholder="e.g., marketing, product, engineering"
                  onChange={(val) =>
                    handleTextChange('domain')({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>)
                  }
                  onClear={() => clearPreference('domain')}
                  rightSlot={
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
                  }
                />
              </div>
            </div>
          </div>

          {/* Model Configuration */}
          <div className="mb-10">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-2">Model Configuration</h3>
            <div className="grid grid-cols-1 gap-x-5 gap-y-3 xl:grid-cols-2">
              <PreferenceSelectField
                label="Target Model"
                description="AI model to optimize prompts for"
                value={localValues.defaultModel ?? ''}
                placeholder="Select a model"
                options={MODEL_OPTIONS}
                onChange={(value) => {
                  const updated = { ...localValues, defaultModel: value || undefined }
                  setLocalValues(updated)
                  debouncedOnChange(updated)
                }}
                onClear={() => clearPreference('defaultModel')}
                rightSlot={
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
                }
              />

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
                    className={`${preferenceInputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
              <PreferenceSelectField
                label="Output Format"
                description="Preferred structure for responses"
                value={localValues.outputFormat ?? ''}
                placeholder="No preference"
                options={OUTPUT_FORMAT_OPTIONS}
                onChange={(value) => {
                  const updated = { ...localValues, outputFormat: value || undefined }
                  setLocalValues(updated)
                  debouncedOnChange(updated)
                }}
                onClear={() => clearPreference('outputFormat')}
                rightSlot={renderAskEveryTimeSlot('outputFormat')}
              />

              <PreferenceTextField
                label="Language"
                description="Primary language for output"
                value={localValues.language ?? ''}
                placeholder="e.g., English, Spanish, Hindi"
                onChange={(val) => {
                  const updated = { ...localValues, language: val.trim() ? val : undefined }
                  setLocalValues(updated)
                  debouncedOnChange(updated)
                }}
                onClear={() => clearPreference('language')}
                rightSlot={renderAskEveryTimeSlot('language')}
              />

              <PreferenceSelectField
                label="Depth"
                description="Level of detail in responses"
                value={localValues.depth ?? ''}
                placeholder="No preference"
                options={DEPTH_OPTIONS}
                onChange={(value) => {
                  const updated = { ...localValues, depth: value || undefined }
                  setLocalValues(updated)
                  debouncedOnChange(updated)
                }}
                onClear={() => clearPreference('depth')}
                rightSlot={renderAskEveryTimeSlot('depth')}
              />

              <PreferenceSelectField
                label="Citations"
                description="How to handle references and sources"
                value={localValues.citationPreference ?? ''}
                placeholder="No preference"
                options={CITATION_OPTIONS}
                onChange={(value) => {
                  const updated = { ...localValues, citationPreference: value || undefined }
                  setLocalValues(updated)
                  debouncedOnChange(updated)
                }}
                onClear={() => clearPreference('citationPreference')}
                rightSlot={renderAskEveryTimeSlot('citationPreference')}
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="mb-6">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-2">Advanced Settings</h3>
            <div className="grid grid-cols-1">
              <PreferenceTextareaField
                label="Style Guidelines"
                description="Custom instructions for formatting and structure"
                value={localValues.styleGuidelines ?? ''}
                placeholder="e.g., Always use bullet points, keep paragraphs under 3 sentences, use active voice"
                onChange={(val) => {
                  const updated = { ...localValues, styleGuidelines: val.trim() ? val : undefined }
                  setLocalValues(updated)
                  debouncedOnChange(updated)
                }}
                onClear={() => clearPreference('styleGuidelines')}
                rightSlot={renderAskEveryTimeSlot('styleGuidelines')}
              />

              <PreferenceTextareaField
                label="Persona Hints"
                description="Voice, role, or character to emulate"
                value={localValues.personaHints ?? ''}
                placeholder="e.g., Write as a senior engineer, be helpful but concise, use technical terminology"
                onChange={(val) => {
                  const updated = { ...localValues, personaHints: val.trim() ? val : undefined }
                  setLocalValues(updated)
                  debouncedOnChange(updated)
                }}
                onClear={() => clearPreference('personaHints')}
                rightSlot={renderAskEveryTimeSlot('personaHints')}
              />
            </div>
          </div>

          {/* UI & Behavior Settings */}
          <div className="mb-10">
            <h3 className="font-mono text-lg font-semibold text-slate-200 mb-2">UI & Behavior</h3>
            <div className="grid grid-cols-1 gap-x-5 gap-y-3 xl:grid-cols-2 items-start">
              <div className="xl:col-span-2">
                <PreferenceSelectField
                  label="Theme"
                  description="Choose between black, dim, or white interface styles"
                  value={selectedTheme}
                  placeholder="Select a theme"
                  options={THEME_OPTIONS}
                  hideClear
                  onChange={(value) => {
                    const updatedUiDefaults = { ...uiDefaults, theme: value as ThemeName }
                    const updated = { ...localValues, uiDefaults: updatedUiDefaults }
                    setLocalValues(updated)
                    onChange(updated)
                  }}
                  onClear={() => {}}
                />
              </div>

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
