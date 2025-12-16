'use client'

'use client'

declare global {
  interface Window {
    Paddle: any
  }
}

type PaddleEnv = 'sandbox' | 'production'

const PADDLE_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js'
let paddleLoader: Promise<typeof window.Paddle> | null = null

function resolveEnv(): PaddleEnv {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox' ? 'sandbox' : 'production'
}

async function loadPaddle(token: string, environment: PaddleEnv): Promise<typeof window.Paddle> {
  if (paddleLoader) return paddleLoader

  paddleLoader = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('PADDLE_UNAVAILABLE'))
      return
    }

    const existing = window.Paddle
    if (existing) {
      existing.Environment.set(environment)
      existing.Setup({ token })
      resolve(existing)
      return
    }

    const script = document.createElement('script')
    script.src = PADDLE_SRC
    script.async = true
    script.onload = () => {
      if (!window.Paddle) {
        reject(new Error('PADDLE_LOAD_FAILED'))
        return
      }
      window.Paddle.Environment.set(environment)
      window.Paddle.Setup({ token })
      resolve(window.Paddle)
    }
    script.onerror = () => reject(new Error('PADDLE_LOAD_FAILED'))
    document.head.appendChild(script)
  })

  return paddleLoader
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
      successUrl,
      cancelUrl,
    },
  })
}

