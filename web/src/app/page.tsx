import { redirect } from 'next/navigation'
import { FastEasyShell } from '@/components/FastEasyShell'
import { loadSessionState } from './session'
import { ROLE, MESSAGE } from '@/lib/constants'
import type { TerminalLine, Preferences, HistoryItem } from '@/lib/types'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Force dynamic rendering to always check latest session
export const dynamic = 'force-dynamic'
export const revalidate = 0

function buildInitialLines(generations: HistoryItem[]): TerminalLine[] {
  const lines: TerminalLine[] = [
    {
      id: 0,
      role: ROLE.SYSTEM,
      text: MESSAGE.WELCOME,
    },
  ]

  let nextId = 1

  for (const g of generations.slice().reverse()) {
    lines.push(
      {
        id: nextId++,
        role: ROLE.USER,
        text: g.task,
      },
      {
        id: nextId++,
        role: ROLE.APP,
        text: `Previous prompt (${g.label}):\n\n${g.body}`,
      }
    )
  }

  return lines
}

export default async function Home() {
  const state = await loadSessionState()

  // Require authentication to access the app
  if (!state.user) {
    redirect('/login')
  }

  const initialLines = buildInitialLines(state.generations)
  const initialPreferences: Preferences = state.preferences

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-stretch justify-center">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.18),transparent_55%)] opacity-80" />
      <ErrorBoundary>
        <FastEasyShell
          initialLines={initialLines}
          initialPreferences={initialPreferences}
          initialUser={state.user}
          initialPreferenceSource={state.preferencesSource}
          isFirstLogin={state.isFirstLogin}
        />
      </ErrorBoundary>
    </div>
  )
}
