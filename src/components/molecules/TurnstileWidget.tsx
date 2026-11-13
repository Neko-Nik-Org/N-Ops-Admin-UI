import { useEffect, useRef } from 'react'
import { env } from '@/config/env'

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  /** Change this number to get a fresh token. Tokens are single-use, so reset after every failed submit. */
  resetKey?: number
}

/** Renders the Cloudflare Turnstile widget via the global script tag loaded in index.html. */
export const TurnstileWidget = ({ onVerify, onExpire, resetKey = 0 }: TurnstileWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | undefined>(undefined)
  const callbacksRef = useRef({ onVerify, onExpire })

  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire }
  }, [onVerify, onExpire])

  useEffect(() => {
    let pollId: ReturnType<typeof setInterval>

    const render = () => {
      if (!window.turnstile || !containerRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: env.turnstileSiteKey,
        theme: 'dark',
        callback: (token) => callbacksRef.current.onVerify(token),
        'expired-callback': () => callbacksRef.current.onExpire?.(),
      })
      clearInterval(pollId)
    }

    pollId = setInterval(render, 100)
    render()

    return () => {
      clearInterval(pollId)
      if (widgetIdRef.current) {
        window.turnstile?.remove(widgetIdRef.current)
      }
    }
  }, [])

  // a used token can't be verified again: when the parent bumps resetKey, run a new challenge
  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current) {
      window.turnstile?.reset(widgetIdRef.current)
    }
  }, [resetKey])

  return <div ref={containerRef} />
}
