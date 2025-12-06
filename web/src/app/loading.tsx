import { TerminalSkeleton } from '@/components/TerminalSkeleton'

/**
 * Loading UI shown while the page is loading.
 * Next.js automatically uses this during navigation.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-stretch justify-center">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(37,99,235,0.18),transparent_55%)] opacity-80" />
      <TerminalSkeleton />
    </div>
  )
}
