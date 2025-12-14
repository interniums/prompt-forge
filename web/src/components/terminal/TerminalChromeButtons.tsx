'use client'

export type TerminalChromeButtonsProps = {
  isGenerating: boolean
  onStop: () => void
  onSubmit: () => void
  /** Called when mic button is clicked while NOT listening (to start) */
  onVoiceStart?: () => void
  /** Called when stop button is clicked while listening (to stop) */
  onVoiceStop?: () => void
  /** Whether voice input is currently active (listening) */
  isVoiceListening?: boolean
  /** Whether voice input is supported in this browser */
  voiceSupported?: boolean
}

export function TerminalChromeButtons({
  isGenerating,
  onStop,
  onSubmit,
  onVoiceStart,
  onVoiceStop,
  isVoiceListening = false,
  voiceSupported = true,
}: TerminalChromeButtonsProps) {
  return (
    <div className="mt-2 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/70 px-3 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-1 text-[12px] text-slate-400">
        <span className="text-slate-200">Enter = generate • Shift+Enter = new line</span>
        <span>You&apos;ll get 1–3 prompt options + quick refinements.</span>
        <span className="text-slate-500">Drafts save automatically (locally).</span>
      </div>
      <div className="flex items-center gap-2">
        {voiceSupported && (
          <button
            type="button"
            aria-label={isVoiceListening ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={isVoiceListening}
            title={isVoiceListening ? 'Click to stop recording' : 'Click to start voice input'}
            className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 transition ${
              isVoiceListening
                ? 'border-rose-500/80 bg-rose-500/20 text-rose-400 animate-pulse hover:bg-rose-500/30'
                : 'border-slate-700/80 bg-slate-950 text-slate-200 hover:border-slate-500 hover:text-slate-50'
            }`}
            onClick={isVoiceListening ? onVoiceStop : onVoiceStart}
          >
            {isVoiceListening ? (
              /* Stop icon when recording */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <rect x="7" y="7" width="10" height="10" rx="1.5" strokeWidth={1.6} fill="currentColor" />
              </svg>
            ) : (
              /* Mic icon when idle */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" strokeWidth={1.6} strokeLinecap="round" />
                <path d="M12 19v3" strokeWidth={1.6} strokeLinecap="round" />
              </svg>
            )}
          </button>
        )}
        <button
          type="button"
          aria-busy={isGenerating}
          onClick={() => {
            if (isGenerating) {
              onStop()
            } else {
              onSubmit()
            }
          }}
          className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-[14px] font-semibold text-slate-950 shadow-[0_12px_30px_rgba(16,185,129,0.35)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
            isGenerating ? 'bg-rose-400 hover:bg-rose-300' : 'bg-emerald-400 hover:bg-emerald-300'
          }`}
        >
          {isGenerating ? 'Stop' : 'Generate prompts'}
        </button>
      </div>
    </div>
  )
}
