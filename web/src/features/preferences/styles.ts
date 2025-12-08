'use client'

export const modalBackdropClass =
  'fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'

export const modalCardClass =
  'w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl bg-slate-950 p-6 shadow-[0_0_80px_rgba(15,23,42,0.95)] terminal-scroll'

const baseField =
  'w-full font-mono bg-slate-900 border border-slate-700 rounded-md text-base text-slate-100 placeholder-slate-500 shadow-[var(--pf-shadow-input)] focus:border-slate-500 focus:text-slate-50 focus:outline-none'

export const preferenceInputClass = `${baseField} px-3 py-2.5 pr-16`
export const preferenceSelectTriggerClass = `${baseField} px-3 py-2.5`
export const preferenceTextareaClass = `${baseField} px-3 py-2.5 pr-12 resize-none`
