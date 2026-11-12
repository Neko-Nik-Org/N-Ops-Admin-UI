import { useEffect, useRef } from 'react'
import { env } from '@/config/env'

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
}

/** Renders the Cloudflare Turnstile widget via the global script tag loaded in index.html. */
export const TurnstileWidget = ({ onVerify, onExpire }: TurnstileWidgetProps) => {
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

  return <div ref={containerRef} />
}
