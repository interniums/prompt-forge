import { DEFAULT_THEME } from './constants'
import type { ThemeName } from './types'

export function parseTheme(value: unknown): ThemeName | undefined {
  if (value === 'light' || value === 'dark' || value === 'dim') return value
  return undefined
}

export function normalizeTheme(value: unknown, fallback: ThemeName = DEFAULT_THEME): ThemeName {
  return parseTheme(value) ?? fallback
}

export function resolveStoredTheme(): ThemeName | undefined {
  if (typeof document === 'undefined') return undefined
  const cookieMatch = document.cookie.match(/(?:^|; )pf_theme=([^;]+)/)
  const cookieTheme = parseTheme(cookieMatch ? decodeURIComponent(cookieMatch[1]) : undefined)
  if (cookieTheme) return cookieTheme
  const lsTheme = parseTheme(localStorage.getItem('pf_theme'))
  if (lsTheme) return lsTheme
  return undefined
}

export function setStoredTheme(next?: ThemeName) {
  if (typeof document === 'undefined') return
  const resolved = parseTheme(next)
  if (resolved) {
    localStorage.setItem('pf_theme', resolved)
    document.cookie = `pf_theme=${encodeURIComponent(resolved)}; path=/; max-age=31536000; SameSite=Lax`
  } else {
    localStorage.removeItem('pf_theme')
    document.cookie = 'pf_theme=; path=/; max-age=0; SameSite=Lax'
  }
}

export function applyThemeToDocument(theme: ThemeName | undefined, fallback: ThemeName = DEFAULT_THEME) {
  if (typeof document === 'undefined') return
  const resolved = normalizeTheme(theme, fallback)
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved === 'light' ? 'light' : 'dark'
}
