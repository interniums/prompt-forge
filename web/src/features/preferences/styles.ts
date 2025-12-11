'use client'

export const modalBackdropClass = 'fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm'

export const modalCardClass =
  'w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-950 p-6 ring-1 ring-slate-900/60 shadow-[0_24px_70px_rgba(0,0,0,0.45),0_0_140px_rgba(15,23,42,0.8)] terminal-scroll'

const baseField =
  'w-full font-mono bg-slate-900 border border-slate-700 rounded-md text-base text-slate-100 placeholder-slate-500 shadow-[var(--pf-shadow-input)] focus:border-slate-500 focus:text-slate-50 focus:outline-none'

export const preferenceInputClass = `${baseField} px-3 py-2.5 pr-16`
export const preferenceSelectTriggerClass = `${baseField} px-3 py-2.5 cursor-pointer`
export const preferenceTextareaClass = `${baseField} px-3 py-2.5 pr-12 resize-none`
