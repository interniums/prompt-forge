'use client'

import { PostHogProvider } from 'posthog-js/react'
import posthog from 'posthog-js'
import { useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { captureEvent, identifyUser, initAnalytics, isAnalyticsEnabled, resetAnalytics } from '@/lib/analytics'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isAnalyticsEnabled()) return
    const search = searchParams?.toString() ?? ''
    const url = search ? `${pathname}?${search}` : pathname
    if (lastUrlRef.current === url) return

    lastUrlRef.current = url
    captureEvent('page_view', {
      path: pathname,
      search: search || undefined,
      referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    })
  }, [pathname, searchParams])

  return null
}

function AnalyticsIdentitySync() {
  const [lastUserId, setLastUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true

    const sync = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const userId = session?.user?.id ?? null

        if (!isMounted) return

        if (userId && userId !== lastUserId) {
          identifyUser(userId)
          captureEvent('auth_login', {
            provider: session?.user?.app_metadata?.provider ?? 'unknown',
          })
          setLastUserId(userId)
        } else if (!userId && lastUserId) {
          resetAnalytics()
          setLastUserId(null)
        }
      } catch (err) {
        console.error('Failed to sync auth for analytics', err)
      }
    }

    void sync()
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null
      if (userId && userId !== lastUserId) {
        identifyUser(userId)
        captureEvent('auth_login', { provider: session?.user?.app_metadata?.provider ?? 'unknown' })
        setLastUserId(userId)
      } else if (!userId && lastUserId) {
        resetAnalytics()
        setLastUserId(null)
      }
    })

    return () => {
      isMounted = false
      subscription?.subscription?.unsubscribe()
    }
  }, [lastUserId])

  return null
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const [isReady] = useState(() => Boolean(initAnalytics()))

  if (!isReady) {
    return <>{children}</>
  }

  return (
    <PostHogProvider client={posthog}>
      <PageViewTracker />
      <AnalyticsIdentitySync />
      {children}
    </PostHogProvider>
  )
}
