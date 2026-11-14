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
/** Two-step card: 6-digit code from an authenticator app or email, then a "You're in" state. */

import { ArrowLeft, Check, CircleAlert, Mail, Smartphone } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthCard } from '@/components/auth/AuthShell'
import { OtpInput } from '@/components/auth/OtpInput'
import { LoadingButton, NSpinner } from '@/components/loading'
import { resendOtp } from '@/features/auth/api/twoFactor'
import { useVerifyOtp } from '@/features/auth/hooks/useVerifyOtp'
import type { TwoFactorContext, TwoFactorMethod } from '@/features/auth/types'
import { maskEmail } from '@/utils/maskEmail'
import { ROUTES } from '@/constants/routes'

/** Digits in a one-time code. */
const CODE_LENGTH = 6
/** Authenticator apps roll their code over every this many seconds. */
const TOTP_PERIOD_S = 30
/** Seconds to wait before another email code can be requested. */
const RESEND_COOLDOWN_S = 30
/** How long the "You're in" card shows before the dashboard opens. */
const SUCCESS_HOLD_MS = 1200

/** Seconds left in the current authenticator window, ticking every second. */
const useCodeWindow = (period: number) => {
  const left = () => period - (Math.floor(Date.now() / 1000) % period)
  const [seconds, setSeconds] = useState(left)
  useEffect(() => {
    const t = setInterval(() => setSeconds(period - (Math.floor(Date.now() / 1000) % period)), 1000)
    return () => clearInterval(t)
  }, [period])
  return seconds
}

/** Ring that empties as the authenticator code's 30 seconds run out. */
const CodeTimer = ({ left }: { left: number }) => {
  const ring = 2 * Math.PI * 9
  return (
    <p className="n-auth-timer" aria-live="off">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" fill="none" stroke="var(--n-auth-field-line)" strokeWidth="2.5" />
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="var(--n-mint)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={ring}
          strokeDashoffset={ring * (1 - left / TOTP_PERIOD_S)}
          transform="rotate(-90 12 12)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      New code in {left}s
    </p>
  )
}

/**
 * Verifies the code for the challenge in `context`. The code submits itself once all six digits
 * are in. Offers the other method only when the account has both TOTP and email codes enabled.
 */
export const TwoFactorForm = ({ context }: { context: TwoFactorContext }) => {
  const [method, setMethod] = useState<TwoFactorMethod>(context.hasTotp ? 'totp' : 'email')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)
  const [verifyState, verify] = useVerifyOtp()
  const navigate = useNavigate()
  const left = useCodeWindow(TOTP_PERIOD_S)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => navigate(ROUTES.overview, { replace: true }), SUCCESS_HOLD_MS)
    return () => clearTimeout(t)
  }, [done, navigate])

  /** Checks the code; on success the session is stored and the "You're in" card shows. */
  const check = (value: string) => {
    if (verifyState !== 'idle') return
    if (value.length < CODE_LENGTH) {
      setError('Enter the full 6-digit code.')
      return
    }
    setError(null)
    // TODO: show the server's message once /auth/verify-otp is real — right now any failure means "doesn't exist yet".
    verify({ temporaryAuthToken: context.temporaryAuthToken, method, code: value, rememberMe: context.rememberMe })
      .then(() => setDone(true))
      .catch(() => {
        setError("Two-factor verification isn't available on the server yet.")
        setCode('')
      })
  }

  /** Emails a new code, then starts the resend cooldown. */
  const sendEmailCode = async () => {
    setSending(true)
    setError(null)
    try {
      await resendOtp(context.temporaryAuthToken, 'email')
      setCooldown(RESEND_COOLDOWN_S)
    } catch {
      setError("Sending codes by email isn't available yet. Ask an admin if you didn't get one.")
    } finally {
      setSending(false)
    }
  }

  /** Switches between TOTP and email codes; switching to email sends a code right away. */
  const switchMethod = (next: TwoFactorMethod) => {
    setMethod(next)
    setCode('')
    setError(null)
    if (next === 'email') void sendEmailCode()
  }

  if (done) {
    return (
      <AuthCard
        title="You're in"
        subtitle="Two-step verification complete."
        icon={
          <span className="n-auth-done" aria-hidden="true">
            <Check size={30} strokeWidth={2.6} />
          </span>
        }
      >
        <p className="n-auth-progress" role="status">
          <NSpinner size="1.1em" />
          Opening your dashboard
        </p>
      </AuthCard>
    )
  }

  /** The other method the user can switch to, or null when only one is enabled. */
  const alternate: TwoFactorMethod | null =
    method === 'totp' && context.hasEmail ? 'email' : method === 'email' && context.hasTotp ? 'totp' : null
  const masked = maskEmail(context.email)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    check(code)
  }

  return (
    <AuthCard
      title="Two-step verification"
      subtitle={
        method === 'totp' ? (
          <>
            Enter the 6-digit code from your authenticator app for <b>{context.email}</b>.
          </>
        ) : (
          <>
            Enter the 6-digit code we emailed to <b>{masked}</b>.
          </>
        )
      }
      icon={method === 'totp' ? <Smartphone size={26} /> : <Mail size={26} />}
    >
      <form className="n-auth-form" onSubmit={onSubmit} noValidate>
        <OtpInput
          // a new method starts with fresh, focused boxes
          key={method}
          value={code}
          onChange={(v) => {
            setCode(v)
            if (error) setError(null)
          }}
          onComplete={check}
          state={error ? 'error' : 'idle'}
          disabled={verifyState !== 'idle'}
        />
        <div className="n-auth-otp-meta">
          {error ? (
            <p className="n-auth-error" role="alert">
              <CircleAlert size={15} />
              {error}
            </p>
          ) : method === 'totp' ? (
            <CodeTimer left={left} />
          ) : (
            <button type="button" className="n-auth-resend" disabled={cooldown > 0 || sending} onClick={sendEmailCode}>
              {sending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          )}
        </div>
        <LoadingButton type="submit" size="lg" className="n-auth-submit" state={verifyState} loadingText="Verifying" successText="Verified">
          Verify
        </LoadingButton>
      </form>

      {alternate && (
        <>
          <div className="n-auth-or">
            <span>Other ways to verify</span>
          </div>
          <div className="n-auth-alts">
            <button type="button" className="n-auth-alt" onClick={() => switchMethod(alternate)}>
              <span className={alternate === 'email' ? 'n-auth-alt__icon is-amber' : 'n-auth-alt__icon is-violet'}>
                {alternate === 'email' ? <Mail size={18} /> : <Smartphone size={18} />}
              </span>
              <span className="n-auth-alt__text">
                <b>{alternate === 'email' ? 'Email me a code' : 'Use your authenticator app'}</b>
                <span>{alternate === 'email' ? `We'll send it to ${masked}` : 'Enter the code from your app instead'}</span>
              </span>
            </button>
          </div>
        </>
      )}

      <div className="n-auth-note">
        <p>Your admin requires two-step verification for everyone in {context.organizationName}.</p>
      </div>

      <button type="button" className="n-auth-back" onClick={() => navigate(ROUTES.login, { replace: true })}>
        <ArrowLeft size={16} />
        Use a different account
      </button>
    </AuthCard>
  )
}
