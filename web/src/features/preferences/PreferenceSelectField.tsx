'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClearButton } from './ClearButton'
import { preferenceSelectTriggerClass } from './styles'

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
  hideClear?: boolean
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
  hideClear = false,
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
          <SelectTrigger className={preferenceSelectTriggerClass}>
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
        {!hideClear && <ClearButton onClick={onClear} show={Boolean(value)} />}
      </div>
    </div>
  )
}
