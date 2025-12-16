'use server'

import { cookies } from 'next/headers'

const FREE_USAGE_COOKIE = 'pf_free_usage_v1'
const COOKIE_VERSION = 1
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365
const MAX_GUEST_PROMPTS = 1
const MAX_AUTH_PROMPTS = 1

type FreeUsageCookie = {
  v: number
  guest: number
  users: Record<string, number>
}

async function readCookie(): Promise<FreeUsageCookie> {
  const store = await cookies()
  const raw = store.get(FREE_USAGE_COOKIE)?.value
  if (!raw) {
    return { v: COOKIE_VERSION, guest: 0, users: {} }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FreeUsageCookie>
    if (parsed.v !== COOKIE_VERSION) {
      return { v: COOKIE_VERSION, guest: 0, users: {} }
    }
    return {
      v: COOKIE_VERSION,
      guest: Number(parsed.guest ?? 0) || 0,
      users: typeof parsed.users === 'object' && parsed.users !== null ? (parsed.users as Record<string, number>) : {},
    }
  } catch {
    return { v: COOKIE_VERSION, guest: 0, users: {} }
  }
}

async function writeCookie(next: FreeUsageCookie) {
  try {
    const store = await cookies()
    store.set(FREE_USAGE_COOKIE, JSON.stringify(next), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_YEAR_SECONDS * 2,
      secure: process.env.NODE_ENV === 'production',
    })
  } catch {
    // Non-fatal; best-effort persistence only.
  }
}

export async function consumeFreePromptAllowance(userId?: string): Promise<{
  allowed: boolean
  remaining: number
  used: number
  scope: 'guest' | 'user'
}> {
  const cookie = await readCookie()
  const isGuest = !userId
  const scope: 'guest' | 'user' = isGuest ? 'guest' : 'user'
  const max = isGuest ? MAX_GUEST_PROMPTS : MAX_AUTH_PROMPTS
  const current = isGuest ? cookie.guest : Number(cookie.users[userId!]) || 0

  if (current >= max) {
    return { allowed: false, remaining: 0, used: current, scope }
  }

  const nextValue = current + 1
  const nextCookie: FreeUsageCookie = {
    v: COOKIE_VERSION,
    guest: isGuest ? nextValue : cookie.guest,
    users: {
      ...cookie.users,
      ...(isGuest ? {} : { [userId!]: nextValue }),
    },
  }

  await writeCookie(nextCookie)

  return {
    allowed: true,
    remaining: Math.max(0, max - nextValue),
    used: nextValue,
    scope,
  }
}
