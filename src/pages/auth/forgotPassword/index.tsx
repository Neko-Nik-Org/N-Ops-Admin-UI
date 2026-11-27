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
/** Forgot-password page (/login/forgot-password): ask for the account's email and send a reset code to it. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useAtomValue } from 'jotai'
import { Lock, Mail, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { PASSWORD_RESET_CODE_MINUTES, requestPasswordReset } from '@/api/passwordReset'
import { AuthBanner, AuthField } from '@/components/AuthShell/AuthField'
import { AuthCard } from '@/components/AuthShell/AuthCard'
import { AuthShell } from '@/components/AuthShell'
import { LoadingButton } from '@/components/LoadingButton'
import { ROUTES } from '@/constants/routes'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { TurnstileWidget } from '@/pages/auth/login/TurnstileWidget'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/pages/auth/forgotPassword/forgotPasswordValidation'
import { resolvedThemeAtom } from '@/store/theme'

const backToSignIn = (
  <Link to={ROUTES.login} replace className="n-btn n-btn--secondary n-btn--lg n-auth-submit n-auth-cta">
    Back to sign in
  </Link>
)

/**
 * Sends a one-time reset code to the email. The API has no endpoint yet to use that code
 * (`/auth/reset/password` only sends it), so after sending this page says where the code went
 * and that an admin can still reset the password. Add the code + new password step once it exists.
 */
export const ForgotPasswordPage = () => {
  const theme = useAtomValue(resolvedThemeAtom)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sendState, send] = useAsyncAction(requestPasswordReset)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: yupResolver(forgotPasswordSchema), defaultValues: { email: '' } })

  const onSubmit = ({ email }: ForgotPasswordFormValues) => {
    setFormError(null)
    if (!turnstileToken) {
      setFormError('Complete the verification check first.')
      return
    }
    send(email, turnstileToken)
      .then(() => setSentTo(email))
      .catch((error: Error) => {
        setFormError(error.message || "Couldn't send the reset code. Try again.")
        // Turnstile tokens are single-use: get a fresh one for the next attempt
        setTurnstileToken(null)
        setTurnstileResetKey((k) => k + 1)
      })
  }

  if (sentTo)
    return (
      <AuthShell>
        <AuthCard
          title="Check your email"
          subtitle={`We sent a password reset code to ${sentTo}. It expires in ${PASSWORD_RESET_CODE_MINUTES} minutes.`}
          icon={<MailCheck size={26} />}
        >
          <div className="n-auth-note">
            <p>
              Entering the code here isn't available on this server yet. Until it is, an admin in your organization can reset your
              password for you.
            </p>
            <p>Check the anti-phishing code in the email matches yours before you trust it.</p>
          </div>
          {backToSignIn}
        </AuthCard>
      </AuthShell>
    )

  return (
    <AuthShell>
      <AuthCard
        title="Reset your password"
        subtitle="Enter the verified email on your account and we'll send you a reset code."
        icon={<Lock size={26} />}
      >
        <form className="n-auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && <AuthBanner key={formError + turnstileResetKey}>{formError}</AuthBanner>}

          <AuthField
            id="email"
            label="Email"
            required
            type="email"
            icon={<Mail size={18} />}
            placeholder="you@company.com"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="n-auth-turnstile">
            <TurnstileWidget
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              resetKey={turnstileResetKey}
              theme={theme}
            />
          </div>

          <LoadingButton
            type="submit"
            size="lg"
            className="n-auth-submit"
            state={sendState}
            loadingText="Sending"
            successText="Sent"
          >
            Send reset code
          </LoadingButton>
        </form>

        <div className="n-auth-note">
          <p>
            Remembered it?{' '}
            <Link to={ROUTES.login} className="n-auth-link">
              Back to sign in
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthShell>
  )
}
