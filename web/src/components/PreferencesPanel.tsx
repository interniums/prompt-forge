'use client'

import React, { useEffect, useState, useCallback, useRef, startTransition, useMemo } from 'react'
import {
  OUTPUT_FORMAT_OPTIONS,
  DEPTH_OPTIONS,
  CITATION_OPTIONS,
  TONE_OPTIONS,
  AUDIENCE_OPTIONS,
  THEME_OPTIONS,
  DEFAULT_THEME,
  PROVIDER_OPTIONS,
  TEXT_MODEL_OPTIONS,
  IMAGE_MODEL_OPTIONS,
  VIDEO_MODEL_OPTIONS,
  AUDIO_MODEL_OPTIONS,
  LANGUAGE_SELECT_OPTIONS,
  EXAMPLES_PREFERENCE_OPTIONS,
} from '@/lib/constants'
import type {
  GenerationMode,
  Preferences,
  PreferenceSource,
  UserIdentity,
  ThemeName,
  LanguageOption,
  ExamplesPreference,
} from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Slider } from '@/components/ui/slider'
import { PreferenceSelectField } from '@/features/preferences/PreferenceSelectField'
import { PreferenceTextField } from '@/features/preferences/PreferenceTextField'
import { PreferenceTextareaField } from '@/features/preferences/PreferenceTextareaField'
import { modalBackdropClass, modalCardClass } from '@/features/preferences/styles'

type CheckedState = boolean | 'indeterminate'

const DOMAIN_PRESETS = [
  'product',
  'marketing',
  'engineering',
  'research',
  'design',
  'data',
  'sales',
  'support',
] as const
const ASK_OVERRIDE_LABELS: Record<keyof NonNullable<Preferences['doNotAskAgain']>, string> = {
  tone: 'Tone',
  audience: 'Audience',
  domain: 'Domain',
  defaultModel: 'Model',
  temperature: 'Temperature',
  outputFormat: 'Output format',
  language: 'Language',
  depth: 'Depth',
  citationPreference: 'Citations',
  styleGuidelines: 'Style notes',
  personaHints: 'Persona',
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
  const [status, setStatus] = useState<'saved' | 'saving' | 'editing'>('saved')

  // Sync from parent when modal opens or values change while open
  useEffect(() => {
    if (!open) return
    startTransition(() => {
      setLocalValues(values)
      setStatus('saved')
    })
  }, [open, values])

  const uiDefaults = useMemo(() => localValues.uiDefaults ?? {}, [localValues.uiDefaults])
  const sharingLinks = useMemo(() => localValues.sharingLinks ?? {}, [localValues.sharingLinks])
  const doNotAskAgain = useMemo(() => localValues.doNotAskAgain ?? {}, [localValues.doNotAskAgain])
  const selectedTheme = (uiDefaults.theme as ThemeName | undefined) ?? DEFAULT_THEME
  const generationMode: GenerationMode =
    uiDefaults.generationMode === 'quick'
      ? 'quick'
      : uiDefaults.generationMode === 'guided'
      ? 'guided'
      : uiDefaults.showClarifying === false
      ? 'quick'
      : 'guided'

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

  const markEditing = useCallback(() => {
    setStatus((prev) => (prev === 'saving' ? 'saving' : 'editing'))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  const updateUiDefaults = useCallback(
    (next: Partial<NonNullable<Preferences['uiDefaults']>>) => {
      setLocalValues((prev) => {
        const updatedUiDefaults = { ...(prev.uiDefaults ?? {}), ...next }
        const updated = { ...prev, uiDefaults: updatedUiDefaults }
        markEditing()
        onChange(updated)
        return updated
      })
    },
    [markEditing, onChange]
  )

  const clearPreference = useCallback(
    (key: keyof Preferences) => {
      setLocalValues((prev) => {
        const updated =
          key === 'temperature' ? { ...prev, temperature: null } : ({ ...prev, [key]: undefined } as Preferences)
        markEditing()
        debouncedOnChange(updated)
        return updated
      })
    },
    [debouncedOnChange, markEditing]
  )

  const handleDoNotAskAgainChange = useCallback(
    (key: keyof NonNullable<Preferences['doNotAskAgain']>) => (checked: boolean) => {
      setLocalValues((prev) => {
        const updatedDoNotAskAgain = { ...(prev.doNotAskAgain ?? {}), [key]: checked }
        const updated = { ...prev, doNotAskAgain: updatedDoNotAskAgain }
        // Defer parent update to avoid setState during render of PreferencesPanel
        setTimeout(() => onChange(updated), 0)
        markEditing()
        return updated
      })
    },
    [markEditing, onChange]
  )

  const handleBlurSave = useCallback(async () => {
    // Flush any pending debounced updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
      onChange(localValues)
      updateTimeoutRef.current = null
    }

    if (canSave && !saving) {
      setStatus('saving')
      await onSave()
      setStatus('saved')
    } else if (!user) {
      // Save to localStorage for non-authenticated users
      if (typeof window !== 'undefined') {
        localStorage.setItem('pf_local_preferences', JSON.stringify(localValues))
      }
      setStatus('saved')
    }
  }, [canSave, localValues, onChange, onSave, saving, user])

  // Close on Escape for accessibility
  useEffect(() => {
    if (!open) return
    const onKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault()
        await handleBlurSave()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleBlurSave, onClose, open])

  const handleModeChange = useCallback(
    (mode: GenerationMode) => {
      const updated = {
        ...localValues,
        uiDefaults: {
          ...uiDefaults,
          generationMode: mode,
          showClarifying: mode === 'guided',
        },
      }
      setLocalValues(updated)
      markEditing()
      onChange(updated)
    },
    [localValues, markEditing, onChange, uiDefaults]
  )

  const toneOptions = useMemo(
    () => Array.from(TONE_OPTIONS).map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
    []
  )
  const audienceOptions = useMemo(
    () =>
      Array.from(AUDIENCE_OPTIONS).map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
    []
  )
  const domainOptions = useMemo(
    () =>
      Array.from(DOMAIN_PRESETS).map((value) => ({
        value,
        label: value.charAt(0).toUpperCase() + value.slice(1),
      })),
    []
  )

  const temperatureValue = localValues.temperature ?? 0.55
  const temperatureLabel = useMemo(() => {
    if (temperatureValue < 0.35) return 'Focused'
    if (temperatureValue < 0.7) return 'Balanced'
    return 'Creative'
  }, [temperatureValue])
  const setTemperature = useCallback(
    (val: number) => {
      const clamped = Math.max(0, Math.min(1, val))
      const updated = { ...localValues, temperature: clamped }
      setLocalValues(updated)
      markEditing()
      debouncedOnChange(updated)
    },
    [debouncedOnChange, localValues, markEditing]
  )

  const languageOptionsSet = useMemo(() => new Set(LANGUAGE_SELECT_OPTIONS.map((opt) => opt.value)), [])
  const languageSelection: LanguageOption = useMemo(() => {
    const fromUi = uiDefaults.languageSelection as LanguageOption | undefined
    if (fromUi) return fromUi
    const current = localValues.language
    if (current && languageOptionsSet.has(current as LanguageOption)) {
      return current as LanguageOption
    }
    if (current) return 'custom'
    return 'auto'
  }, [languageOptionsSet, localValues.language, uiDefaults.languageSelection])
  const languageCustomValue = useMemo(
    () => uiDefaults.languageCustom ?? (languageSelection === 'custom' ? localValues.language ?? '' : ''),
    [languageSelection, localValues.language, uiDefaults.languageCustom]
  )
  const allowMixedLanguage = uiDefaults.allowMixedLanguage ?? localValues.allowMixedLanguage ?? false

  const defaultProvider = uiDefaults.defaultProvider ?? 'openai'
  const defaultTextModel = uiDefaults.defaultTextModel ?? localValues.defaultModel ?? 'auto'
  const defaultImageModel = uiDefaults.defaultImageModel ?? 'auto'
  const defaultVideoModel = uiDefaults.defaultVideoModel ?? 'auto'
  const defaultAudioModel = uiDefaults.defaultAudioModel ?? 'auto'
  const examplesPreference: ExamplesPreference =
    (uiDefaults.examplesPreference as ExamplesPreference | undefined) ?? 'one'

  if (!open) return null

  const handleBackdropClick = async (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Flush pending updates and save before closing
      await handleBlurSave()
      onClose()
    }
  }

  const statusLabel = status === 'saving' ? 'Saving…' : status === 'editing' ? 'Updating…' : 'Saved'

  return (
    <div className={modalBackdropClass} onClick={handleBackdropClick}>
      <div className={`${modalCardClass} space-y-8`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="font-mono text-lg font-semibold text-slate-50">Preferences</div>
            <div className="font-mono text-sm text-slate-400 max-w-2xl leading-relaxed">
              Defaults for future prompts. You can change them anytime.
            </div>
            <div className="font-mono text-sm text-slate-500 max-w-2xl">
              {!user && 'Sign in to sync across devices'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-mono ${
                status === 'saved'
                  ? 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/40'
                  : status === 'saving'
                  ? 'bg-indigo-900/40 text-indigo-200 border border-indigo-700/40'
                  : 'bg-amber-900/40 text-amber-100 border border-amber-700/40'
              }`}
            >
              {statusLabel}
              {status === 'saved' && (
                <svg
                  className="h-4 w-4 text-emerald-200"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l3 3 7-7" />
                </svg>
              )}
            </span>
            <button
              type="button"
              onClick={async () => {
                await handleBlurSave()
                onClose()
              }}
              className="cursor-pointer bg-transparent p-1 text-slate-400 hover:text-slate-100 hover:underline hover:underline-offset-4"
              aria-label="Close preferences"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-lg font-semibold text-slate-200">Essentials</h3>
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 xl:grid-cols-2">
              <PreferenceSelectField
                label="Tone"
                description="Overall voice (e.g., friendly, formal, neutral)"
                value={localValues.tone ?? ''}
                placeholder="Choose a tone"
                options={toneOptions}
                onChange={(value) => {
                  const updated = { ...localValues, tone: value || undefined }
                  setLocalValues(updated)
                  markEditing()
                  debouncedOnChange(updated)
                }}
                onClear={() => clearPreference('tone')}
              />

              <PreferenceSelectField
                label="Audience"
                description="Who you’re writing for (role or level)"
                value={localValues.audience ?? ''}
                placeholder="Choose an audience"
                options={audienceOptions}
                onChange={(value) => {
                  const updated = { ...localValues, audience: value || undefined }
                  setLocalValues(updated)
                  markEditing()
                  debouncedOnChange(updated)
                }}
                onClear={() => clearPreference('audience')}
              />

              <div className="xl:col-span-2 space-y-3">
                <PreferenceSelectField
                  label="Language"
                  description="Pick the primary output language"
                  value={languageSelection}
                  placeholder="Auto-detect"
                  options={LANGUAGE_SELECT_OPTIONS}
                  showClear={languageSelection !== 'auto'}
                  onChange={(value) => {
                    const selection = (value || 'auto') as LanguageOption
                    setLocalValues((prev) => {
                      const prevUi = prev.uiDefaults ?? {}
                      const nextUi = { ...prevUi, languageSelection: selection }
                      if (selection !== 'custom') {
                        delete nextUi.languageCustom
                      }
                      const nextLanguage =
                        selection === 'custom' ? prevUi.languageCustom ?? prev.language ?? '' : selection
                      const updated = { ...prev, language: nextLanguage, uiDefaults: nextUi }
                      markEditing()
                      debouncedOnChange(updated)
                      return updated
                    })
                  }}
                  onClear={() => {
                    setLocalValues((prev) => {
                      const prevUi = prev.uiDefaults ?? {}
                      const nextUi = { ...prevUi, languageSelection: 'auto' as LanguageOption }
                      delete nextUi.languageCustom
                      const updated = { ...prev, language: 'auto', uiDefaults: nextUi }
                      markEditing()
                      debouncedOnChange(updated)
                      return updated
                    })
                  }}
                />

                {languageSelection === 'custom' && (
                  <PreferenceTextField
                    label="Custom language"
                    description="Specify the language to use (e.g., Hindi, Arabic, Catalan)"
                    value={languageCustomValue}
                    placeholder="Type a language"
                    onChange={(val) => {
                      const nextVal = val.trim()
                      setLocalValues((prev) => {
                        const prevUi = prev.uiDefaults ?? {}
                        const nextUi = {
                          ...prevUi,
                          languageSelection: 'custom' as LanguageOption,
                          languageCustom: nextVal,
                        }
                        const updated = { ...prev, language: nextVal, uiDefaults: nextUi }
                        markEditing()
                        debouncedOnChange(updated)
                        return updated
                      })
                    }}
                    onClear={() => {
                      setLocalValues((prev) => {
                        const prevUi = prev.uiDefaults ?? {}
                        const nextUi = { ...prevUi, languageSelection: 'auto' as LanguageOption }
                        delete nextUi.languageCustom
                        const updated = { ...prev, language: 'auto', uiDefaults: nextUi }
                        markEditing()
                        debouncedOnChange(updated)
                        return updated
                      })
                    }}
                  />
                )}

                <label className="flex items-center gap-3 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2">
                  <Checkbox
                    checked={allowMixedLanguage}
                    onCheckedChange={(checked: CheckedState) =>
                      setLocalValues((prev) => {
                        const prevUi = prev.uiDefaults ?? {}
                        const nextUi = { ...prevUi, allowMixedLanguage: checked === true }
                        const updated = { ...prev, uiDefaults: nextUi, allowMixedLanguage: checked === true }
                        markEditing()
                        debouncedOnChange(updated)
                        return updated
                      })
                    }
                  />
                  <div className="space-y-1">
                    <p className="font-mono text-sm text-slate-100">Allow mixed language outputs</p>
                    <p className="font-mono text-xs text-slate-500">
                      Useful when you want primary language with English technical terms.
                    </p>
                  </div>
                </label>
              </div>

              <div className="xl:col-span-2">
                <PreferenceSelectField
                  label="Domain"
                  description="Subject area to stay grounded in"
                  value={localValues.domain ?? ''}
                  placeholder="Select a domain"
                  options={domainOptions}
                  onChange={(value) => {
                    const updated = { ...localValues, domain: value || undefined }
                    setLocalValues(updated)
                    markEditing()
                    debouncedOnChange(updated)
                  }}
                  onClear={() => clearPreference('domain')}
                />
              </div>
            </div>
          </div>

          <Accordion type="multiple" className="space-y-3">
            <AccordionItem
              value="model"
              className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
            >
              <AccordionTrigger className="cursor-pointer px-2 py-4 hover:no-underline">
                <span className="flex flex-col flex-1 text-center">
                  <span className="font-mono text-lg font-semibold text-slate-200">Model & Style</span>
                  <span className="font-mono text-sm text-slate-500">Target model + creativity level</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-5 pt-2">
                <div className="h-px w-full bg-slate-800 mb-4" />
                <div className="grid grid-cols-1 gap-x-5 gap-y-6 xl:grid-cols-2">
                  <div className="space-y-4">
                    <PreferenceSelectField
                      label="Provider"
                      description="Choose your default provider"
                      value={defaultProvider}
                      placeholder="Select a provider"
                      options={PROVIDER_OPTIONS}
                      showClear={defaultProvider !== 'openai'}
                      onChange={(value) => {
                        const next = value || 'openai'
                        updateUiDefaults({ defaultProvider: next })
                      }}
                      onClear={() => updateUiDefaults({ defaultProvider: 'openai' })}
                    />

                    <PreferenceSelectField
                      label="Text model"
                      description="Model to optimize prompts for"
                      value={defaultTextModel}
                      placeholder="Auto-pick"
                      options={TEXT_MODEL_OPTIONS}
                      showClear={defaultTextModel !== 'auto'}
                      onChange={(value) => {
                        const next = value || 'auto'
                        setLocalValues((prev) => {
                          const prevUi = prev.uiDefaults ?? {}
                          const updatedUi = { ...prevUi, defaultTextModel: next }
                          const updated = {
                            ...prev,
                            defaultModel: next === 'auto' ? undefined : next,
                            uiDefaults: updatedUi,
                          }
                          markEditing()
                          debouncedOnChange(updated)
                          return updated
                        })
                      }}
                      onClear={() => {
                        setLocalValues((prev) => {
                          const prevUi = prev.uiDefaults ?? {}
                          const updatedUi = { ...prevUi, defaultTextModel: 'auto' }
                          const updated = { ...prev, defaultModel: undefined, uiDefaults: updatedUi }
                          markEditing()
                          debouncedOnChange(updated)
                          return updated
                        })
                      }}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <PreferenceSelectField
                        label="Image model"
                        description="For image generations"
                        value={defaultImageModel}
                        placeholder="Auto-pick"
                        options={IMAGE_MODEL_OPTIONS}
                        showClear={defaultImageModel !== 'auto'}
                        onChange={(value) => {
                          const next = value || 'auto'
                          updateUiDefaults({ defaultImageModel: next })
                        }}
                        onClear={() => updateUiDefaults({ defaultImageModel: 'auto' })}
                      />

                      <PreferenceSelectField
                        label="Video model"
                        description="For video generations"
                        value={defaultVideoModel}
                        placeholder="Auto-pick"
                        options={VIDEO_MODEL_OPTIONS}
                        showClear={defaultVideoModel !== 'auto'}
                        onChange={(value) => {
                          const next = value || 'auto'
                          updateUiDefaults({ defaultVideoModel: next })
                        }}
                        onClear={() => updateUiDefaults({ defaultVideoModel: 'auto' })}
                      />

                      <div className="sm:col-span-2">
                        <PreferenceSelectField
                          label="Audio model"
                          description="For audio/voice generations"
                          value={defaultAudioModel}
                          placeholder="Auto-pick"
                          options={AUDIO_MODEL_OPTIONS}
                          showClear={defaultAudioModel !== 'auto'}
                          onChange={(value) => {
                            const next = value || 'auto'
                            updateUiDefaults({ defaultAudioModel: next })
                          }}
                          onClear={() => updateUiDefaults({ defaultAudioModel: 'auto' })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono text-base text-slate-300">Style</div>
                        <div className="font-mono text-sm text-slate-500">Adjust determinism vs. creativity</div>
                      </div>
                      <span className="font-mono text-xs text-slate-400">
                        {temperatureLabel} ({temperatureValue.toFixed(2)})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={[temperatureValue]}
                        onValueChange={(vals) => {
                          const nextVal = vals[0] ?? 0.55
                          setTemperature(nextVal)
                        }}
                        className="w-full cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[12px] font-mono text-slate-400">
                      <button
                        type="button"
                        className="cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 hover:border-slate-500 hover:text-slate-50"
                        onClick={() => setTemperature(0.2)}
                      >
                        Focused (~0.20)
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 hover:border-slate-500 hover:text-slate-50"
                        onClick={() => setTemperature(0.55)}
                      >
                        Balanced (~0.55)
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 hover:border-slate-500 hover:text-slate-50"
                        onClick={() => setTemperature(0.85)}
                      >
                        Creative (~0.85)
                      </button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="output"
              className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
            >
              <AccordionTrigger className="cursor-pointer px-2 py-4 hover:no-underline">
                <span className="flex flex-col flex-1 text-center">
                  <span className="font-mono text-lg font-semibold text-slate-200">Output</span>
                  <span className="font-mono text-sm text-slate-500">Structure, depth, and sourcing</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-5 pt-2">
                <div className="h-px w-full bg-slate-800 mb-4" />
                <div className="grid grid-cols-1 gap-x-5 gap-y-4 xl:grid-cols-2">
                  <PreferenceSelectField
                    label="Output format"
                    description="Layout you want back (bullets, steps, table, etc.)"
                    value={localValues.outputFormat ?? ''}
                    placeholder="No preference"
                    options={OUTPUT_FORMAT_OPTIONS}
                    onChange={(value) => {
                      const updated = { ...localValues, outputFormat: value || undefined }
                      setLocalValues(updated)
                      markEditing()
                      debouncedOnChange(updated)
                    }}
                    onClear={() => clearPreference('outputFormat')}
                  />

                  <PreferenceSelectField
                    label="Depth"
                    description="How detailed the response should be"
                    value={localValues.depth ?? ''}
                    placeholder="No preference"
                    options={DEPTH_OPTIONS}
                    onChange={(value) => {
                      const updated = { ...localValues, depth: value || undefined }
                      setLocalValues(updated)
                      markEditing()
                      debouncedOnChange(updated)
                    }}
                    onClear={() => clearPreference('depth')}
                  />

                  <PreferenceSelectField
                    label="Examples"
                    description="Include example outputs by default"
                    value={examplesPreference}
                    placeholder="Choose"
                    options={EXAMPLES_PREFERENCE_OPTIONS}
                    showClear={examplesPreference !== 'one'}
                    onChange={(value) => {
                      const next = (value || 'one') as ExamplesPreference
                      updateUiDefaults({ examplesPreference: next })
                    }}
                    onClear={() => updateUiDefaults({ examplesPreference: 'one' as ExamplesPreference })}
                  />

                  <PreferenceSelectField
                    label="Citations"
                    description="How to treat references and sources"
                    value={localValues.citationPreference ?? ''}
                    placeholder="No preference"
                    options={CITATION_OPTIONS}
                    onChange={(value) => {
                      const updated = { ...localValues, citationPreference: value || undefined }
                      setLocalValues(updated)
                      markEditing()
                      debouncedOnChange(updated)
                    }}
                    onClear={() => clearPreference('citationPreference')}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="behavior"
              className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
            >
              <AccordionTrigger className="cursor-pointer px-2 py-4 hover:no-underline">
                <span className="flex flex-col flex-1 text-center">
                  <span className="font-mono text-lg font-semibold text-slate-200">UI & Behavior</span>
                  <span className="font-mono text-sm text-slate-500">Theme, modes, and sharing defaults</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-5 pt-2">
                <div className="h-px w-full bg-slate-800 mb-4" />
                <div className="grid grid-cols-1 gap-x-5 gap-y-4 xl:grid-cols-2 items-start">
                  <div className="xl:col-span-1">
                    <PreferenceSelectField
                      label="Theme"
                      description="Interface style for the app"
                      value={selectedTheme}
                      placeholder="Select a theme"
                      options={THEME_OPTIONS}
                      hideClear
                      onChange={(value) => {
                        const updatedUiDefaults = { ...uiDefaults, theme: value as ThemeName }
                        const updated = { ...localValues, uiDefaults: updatedUiDefaults }
                        setLocalValues(updated)
                        markEditing()
                        onChange(updated)
                      }}
                      onClear={() => {}}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2 rounded-xl bg-transparent p-3">
                      <div className="font-mono text-base text-slate-200">Default prompt mode</div>
                      <div className="font-mono text-sm text-slate-500">
                        Quick Start skips questions. Guided Build asks a few to improve quality.
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(
                          [
                            { id: 'quick' as GenerationMode, title: 'Quick Start', hint: 'Fastest, no questions' },
                            { id: 'guided' as GenerationMode, title: 'Guided Build', hint: 'Clarifying + preferences' },
                          ] as const
                        ).map((option) => {
                          const isActive = generationMode === option.id
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => handleModeChange(option.id)}
                              className={`flex w-full cursor-pointer flex-col items-start rounded-lg border px-3 py-2 text-left shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                                isActive
                                  ? 'border-slate-500 bg-slate-900 text-slate-50'
                                  : 'border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-600 hover:text-slate-50'
                              }`}
                              aria-pressed={isActive}
                            >
                              <span className="font-mono text-[15px] font-semibold">{option.title}</span>
                              <span className="font-mono text-[13px] text-slate-400">{option.hint}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={Boolean(uiDefaults.autoCopyApproved)}
                        onCheckedChange={(checked: CheckedState) => {
                          const updated = {
                            ...localValues,
                            uiDefaults: { ...uiDefaults, autoCopyApproved: checked === true },
                          }
                          setLocalValues(updated)
                          markEditing()
                          onChange(updated)
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-mono text-base text-slate-300">Auto-copy approved prompts</div>
                        <div className="font-mono text-sm text-slate-500 mt-0.5">
                          Copy to clipboard when you approve
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={Boolean(sharingLinks.allowPrefillLinks)}
                        onCheckedChange={(checked: CheckedState) => {
                          const updated = {
                            ...localValues,
                            sharingLinks: { ...sharingLinks, allowPrefillLinks: checked === true },
                          }
                          setLocalValues(updated)
                          markEditing()
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
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="advanced"
              className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
            >
              <AccordionTrigger className="cursor-pointer px-2 py-4 hover:no-underline">
                <span className="flex flex-col flex-1 text-center">
                  <span className="font-mono text-lg font-semibold text-slate-200">Advanced</span>
                  <span className="font-mono text-sm text-slate-500">Optional style notes and ask-overrides</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-5 pt-2">
                <div className="h-px w-full bg-slate-800 mb-4" />
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <PreferenceTextareaField
                      label="Style Guidelines"
                      description="Formatting rules to follow (bullets, length, voice)"
                      value={localValues.styleGuidelines ?? ''}
                      placeholder="e.g., Use bullets, keep paragraphs under 3 sentences"
                      onChange={(val) => {
                        const updated = { ...localValues, styleGuidelines: val.trim() ? val : undefined }
                        setLocalValues(updated)
                        markEditing()
                        debouncedOnChange(updated)
                      }}
                      onClear={() => clearPreference('styleGuidelines')}
                    />

                    <PreferenceTextareaField
                      label="Persona Hints"
                      description="Role or voice to emulate (e.g., PM, staff engineer)"
                      value={localValues.personaHints ?? ''}
                      placeholder="e.g., Write as a senior engineer, be concise, use technical terminology"
                      onChange={(val) => {
                        const updated = { ...localValues, personaHints: val.trim() ? val : undefined }
                        setLocalValues(updated)
                        markEditing()
                        debouncedOnChange(updated)
                      }}
                      onClear={() => clearPreference('personaHints')}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="font-mono text-base text-slate-200">Always ask for these (overrides)</div>
                    <div className="font-mono text-sm text-slate-400">
                      Toggle on if you want a quick confirmation every run, even when a value exists.
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 mt-2">
                      {Object.entries(ASK_OVERRIDE_LABELS).map(([key, label]) => {
                        const typedKey = key as keyof NonNullable<Preferences['doNotAskAgain']>
                        return (
                          <label
                            key={key}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm text-slate-200 hover:bg-slate-900"
                          >
                            <Checkbox
                              checked={doNotAskAgain?.[typedKey] === false}
                              onCheckedChange={(checked: CheckedState) =>
                                handleDoNotAskAgainChange(typedKey)(checked === true ? false : true)
                              }
                            />
                            <span className="font-mono text-sm">{label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="font-mono text-xs text-slate-500">Auto-save is on. Hit Done or press Esc to close.</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                await handleBlurSave()
                onClose()
              }}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 font-mono text-sm text-slate-100 transition hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
