import { PromptTerminal } from '@/components/PromptTerminal'
import { loadSessionState } from '../../session'
import type { TerminalLine, Preferences } from '@/lib/types'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Force dynamic rendering to always check latest session
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function GeneratePage() {
  const state = await loadSessionState()

  // Allow unauthenticated access - users can explore the app without logging in
  // Login will be required before generating the first prompt

  const initialLines: TerminalLine[] = []
  const initialPreferences: Preferences = state.preferences

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.18),transparent_55%)] opacity-80" />
      <ErrorBoundary>
        <PromptTerminal
          initialLines={initialLines}
          initialPreferences={initialPreferences}
          initialUser={state.user}
          initialPreferenceSource={state.preferencesSource}
          isFirstLogin={state.isFirstLogin}
          sessionId={state.sessionId}
        />
      </ErrorBoundary>
    </main>
  )
}
