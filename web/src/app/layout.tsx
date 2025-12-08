import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Geist, Geist_Mono } from 'next/font/google'
import { AuthSessionSync } from '@/components/AuthSessionSync'
import type { ThemeName } from '@/lib/types'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PromptForge',
  description: 'A minimalistic, high-craft prompt generator for turning fuzzy goals into clear, reusable prompts.',
}

const THEME_COOKIE = 'pf_theme'
const DEFAULT_THEME: ThemeName = 'dark'

async function readThemeCookie(): Promise<ThemeName | undefined> {
  const store = await cookies()
  const value = store.get(THEME_COOKIE)?.value
  if (value === 'light' || value === 'dark' || value === 'dim') return value
  return undefined
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieTheme = await readThemeCookie()
  const resolvedTheme: ThemeName = cookieTheme ?? DEFAULT_THEME

  return (
    <html
      lang="en"
      data-theme={resolvedTheme}
      style={{ colorScheme: resolvedTheme === 'light' ? 'light' : 'dark' }}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var initial=${JSON.stringify(
              resolvedTheme
            )};var fromCookie=(function(){var m=document.cookie.match(/(?:^|; )pf_theme=([^;]+)/);return m?decodeURIComponent(m[1]):null;})();var theme=fromCookie;var lsTheme=localStorage.getItem('pf_theme');if(!theme&&lsTheme){theme=lsTheme;}if(!theme){var stored=localStorage.getItem('pf_local_preferences');if(stored){try{var prefs=JSON.parse(stored);theme=prefs&&prefs.uiDefaults&&prefs.uiDefaults.theme;}catch(e){}}}if(theme!=='light'&&theme!=='dark'&&theme!=='dim'){theme=initial;}var root=document.documentElement;root.dataset.theme=theme;root.style.colorScheme=theme==='light'?'light':'dark';}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-50`}>
        <AuthSessionSync />
        {/* Pages control their own layout - no wrapper constraints */}
        {children}
      </body>
    </html>
  )
}
