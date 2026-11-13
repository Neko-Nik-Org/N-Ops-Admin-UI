/*
 * Copyright (C) 2026 Neko Nik <nikhil@nekonik.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

/** Cloudflare Turnstile bot-protection widget used on the sign-in form. */

import { useEffect, useRef } from 'react'
import { env } from '@/config/env'

/** Props for TurnstileWidget. */
interface TurnstileWidgetProps {
  /** Receives the token to send with the login request. */
  onVerify: (token: string) => void
  /** Called when the token expires before it was used. */
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
    /** Keep the latest callbacks without re-rendering the widget. */
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

    /** The Turnstile script loads asynchronously: retry until it is ready, then render once. */
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
