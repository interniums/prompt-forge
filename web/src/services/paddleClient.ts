'use client'

'use client'

type PaddleEnv = 'sandbox' | 'production'

type PaddleCheckoutOptions = {
  items: Array<{ priceId: string; quantity: number }>
  customer?: { email?: string | null }
  settings?: {
    displayMode?: 'overlay'
    successUrl?: string
    cancelUrl?: string
  }
}

type PaddleClient = {
  Environment: { set: (env: PaddleEnv) => void }
  Setup: (options: { token: string }) => void
  Checkout: { open: (options: PaddleCheckoutOptions) => void }
}

declare global {
  interface Window {
    Paddle?: PaddleClient
  }
}

const PADDLE_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js'
const PADDLE_SRC_FALLBACK = 'https://cdn.paddle.com/paddle/paddle.js'
let paddleLoader: Promise<PaddleClient> | null = null

function resolveEnv(): PaddleEnv {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox' ? 'sandbox' : 'production'
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('PADDLE_SCRIPT_ERROR')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => {
      script.remove()
      reject(new Error('PADDLE_SCRIPT_ERROR'))
    }
    document.head.appendChild(script)
  })
}

async function loadPaddle(token: string, environment: PaddleEnv): Promise<PaddleClient> {
  if (paddleLoader) return paddleLoader

  paddleLoader = (async () => {
    if (typeof window === 'undefined') {
      throw new Error('PADDLE_UNAVAILABLE')
    }

    const existing = window.Paddle
    if (existing) {
      existing.Environment.set(environment)
      existing.Setup({ token })
      return existing
    }

    const sources = [PADDLE_SRC, PADDLE_SRC_FALLBACK]
    let lastError: Error | null = null

    for (const src of sources) {
      try {
        await loadScript(src)
        if (!window.Paddle) {
          lastError = new Error('PADDLE_LOAD_FAILED')
          continue
        }
        window.Paddle.Environment.set(environment)
        window.Paddle.Setup({ token })
        return window.Paddle
      } catch (error) {
        // Commonly triggered by network issues or aggressive content blockers.
        lastError = error instanceof Error ? error : new Error('PADDLE_LOAD_FAILED')
      }
    }

    throw lastError ?? new Error('PADDLE_LOAD_FAILED')
  })()

  try {
    return await paddleLoader
  } catch (error) {
    // Allow retries after a failure (e.g., user disables blocker and retries).
    paddleLoader = null
    throw error
  }
}

function normalizeBaseUrl(url?: string) {
  if (!url) return undefined
  try {
    const normalized = new URL(url)
    normalized.hash = ''
    normalized.search = ''
    return normalized.toString().replace(/\/$/, '')
  } catch {
    return undefined
  }
}

function resolveUrls(providedSuccess?: string, providedCancel?: string) {
  const envBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)
  const runtimeBase = normalizeBaseUrl(typeof window !== 'undefined' ? window.location.origin : undefined)
  const base = envBase || runtimeBase

  // Paddle requires validated, non-empty URLs. If we cannot derive them, fail fast with a clear error.
  const success = providedSuccess || (base ? `${base}/subscription/success` : undefined)
  const cancel = providedCancel || (base ? `${base}/subscription/cancel` : undefined)

  if (!success || !cancel) {
    throw new Error('PADDLE_URLS_MISSING')
  }

  return { success, cancel }
}

export async function openPaddleCheckout({
  priceId,
  trialPriceId,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  priceId: string
  trialPriceId?: string
  customerEmail?: string | null
  successUrl?: string
  cancelUrl?: string
}) {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
  if (!token) {
    throw new Error('PADDLE_TOKEN_MISSING')
  }

  const env = resolveEnv()
  const paddle = await loadPaddle(token, env)
  const { success, cancel } = resolveUrls(successUrl, cancelUrl)

  const items = [
    {
      priceId: trialPriceId && env === 'sandbox' ? trialPriceId : priceId,
      quantity: 1,
    },
  ]

  paddle.Checkout.open({
    items,
    customer: customerEmail ? { email: customerEmail } : undefined,
    settings: {
      displayMode: 'overlay',
      successUrl: success,
      cancelUrl: cancel,
    },
  })
}
