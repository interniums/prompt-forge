'use client'

import React from 'react'
import { ClearButton } from './ClearButton'

type PreferenceTextFieldProps = {
  label: string
  description: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  onClear: () => void
  rightSlot?: React.ReactNode
  inputType?: React.HTMLInputTypeAttribute
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'placeholder'>
}

export function PreferenceTextField({
  label,
  description,
  value,
  placeholder,
  onChange,
  onClear,
  rightSlot,
  inputType = 'text',
  inputProps,
}: PreferenceTextFieldProps) {
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
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={inputType}
          {...inputProps}
          className="w-full font-mono bg-[#0b1016] border border-slate-700 rounded-md px-3 py-2.5 pr-16 text-base text-slate-100 placeholder-slate-500 shadow-[0_8px_18px_rgba(0,0,0,0.22)] focus:border-slate-500 focus:text-slate-50 focus:outline-none"
        />
        <ClearButton onClick={onClear} show={Boolean(value)} />
      </div>
    </div>
  )
}
