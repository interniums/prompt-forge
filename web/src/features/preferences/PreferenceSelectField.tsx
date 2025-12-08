'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClearButton } from './ClearButton'

type Option = { value: string; label: string }

type PreferenceSelectFieldProps = {
  label: string
  description: string
  value: string
  placeholder: string
  options: ReadonlyArray<Option>
  onChange: (value: string) => void
  onClear: () => void
  rightSlot?: React.ReactNode
}

export function PreferenceSelectField({
  label,
  description,
  value,
  placeholder,
  options,
  onChange,
  onClear,
  rightSlot,
}: PreferenceSelectFieldProps) {
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
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full font-mono bg-[#0b1016] border border-slate-700 rounded-md px-3 py-2.5 text-base text-slate-100 shadow-[0_8px_18px_rgba(0,0,0,0.22)] focus:border-slate-500 focus:text-slate-50 focus:outline-none">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className="font-mono">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ClearButton onClick={onClear} show={Boolean(value)} />
      </div>
    </div>
  )
}
