'use client'

import React from 'react'
import { ClearButton } from './ClearButton'
import { preferenceTextareaClass } from './styles'

type PreferenceTextareaFieldProps = {
  label: string
  description: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  onClear: () => void
  rightSlot?: React.ReactNode
  rows?: number
}

export function PreferenceTextareaField({
  label,
  description,
  value,
  placeholder,
  onChange,
  onClear,
  rightSlot,
  rows = 3,
}: PreferenceTextareaFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-3 h-14">
        <div className="flex-1 min-w-0">
          <span className="block font-mono text-base font-medium text-slate-300">{label}</span>
          <span className="block font-mono text-sm text-slate-500">{description}</span>
        </div>
        {rightSlot}
      </div>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={preferenceTextareaClass}
        />
        <ClearButton onClick={onClear} show={Boolean(value)} />
      </div>
    </div>
  )
}
