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
/** Sign-in card: username, password, "Keep me signed in" and the Turnstile check. */

import { yupResolver } from '@hookform/resolvers/yup'
import { Lock, ShieldCheck, User } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { resolvedThemeAtom } from '@/app/theme'
import { AuthBanner, AuthField } from '@/components/auth/AuthField'
import { AuthCard } from '@/components/auth/AuthShell'
import { LoadingButton } from '@/components/loading'
import { TurnstileWidget } from '@/components/molecules/TurnstileWidget'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { loginSchema, type LoginFormValues } from '@/features/auth/schema/loginSchema'
import { NAVIGATE_DELAY_MS } from '@/constants/config'
import { ROUTES } from '@/constants/routes'

/** Signs the user in, or forwards them to the 2FA page when a second factor is required. */
export const LoginForm = () => {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  /** Server or Turnstile error, shown in the banner above the fields. */
  const [formError, setFormError] = useState<string | null>(null)
  const theme = useAtomValue(resolvedThemeAtom)
  const [loginState, login] = useLogin()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { userName: '', password: '', rememberMe: false },
  })

  const onSubmit = (values: LoginFormValues) => {
    setFormError(null)
    if (!turnstileToken) {
      setFormError('Complete the verification check before signing in.')
      return
    }

    // By the time this resolves, useLogin has already flipped the button to 'success' —
    // navigating here (rather than from an effect watching that state) avoids racing it.
    login({ credentials: values, turnstileToken })
      .then((outcome) => {
        setTimeout(() => {
          if (outcome.kind === 'two-factor') {
            navigate(ROUTES.twoFactor, { state: outcome.context, replace: true })
          } else {
            navigate(ROUTES.overview, { replace: true })
          }
        }, NAVIGATE_DELAY_MS)
      })
      .catch((error: Error) => {
        setFormError(error.message || 'Sign-in failed. Try again.')
        // the backend has spent this token (Turnstile tokens are single-use): get a fresh one
        // before the next attempt, otherwise every retry fails with "Failed to verify CAPTCHA"
        setTurnstileToken(null)
        setTurnstileResetKey((k) => k + 1)
      })
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to N-Ops to manage your infrastructure.">
      <form className="n-auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* key: a new error re-mounts the banner so it shakes again */}
        {formError && <AuthBanner key={formError + turnstileResetKey}>{formError}</AuthBanner>}

        <AuthField
          id="userName"
          label="Username"
          icon={<User size={18} />}
          placeholder="your-username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          error={errors.userName?.message}
          {...register('userName')}
        />

        <AuthField
          id="password"
          label="Password"
          type="password"
          icon={<Lock size={18} />}
          placeholder="Your password"
          autoComplete="current-password"
          error={errors.password?.message}
          aside={
            <Link to={ROUTES.forgotPassword} className="n-auth-link">
              Forgot password?
            </Link>
          }
          {...register('password')}
        />

        <label className="n-auth-check">
          <input type="checkbox" {...register('rememberMe')} />
          <span>Keep me signed in on this device</span>
        </label>

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
          state={loginState}
          loadingText="Signing in"
          successText="Verified"
        >
          Sign in
        </LoadingButton>
      </form>

      <div className="n-auth-note">
        <p>
          New here? Ask an admin in your organization to{' '}
          <a href="https://nops.app/contact" target="_blank" rel="noreferrer">
            invite you
          </a>
          , or{' '}
          <a href="https://nops.app/waitlist" target="_blank" rel="noreferrer">
            join the waitlist
          </a>
          .
        </p>
        <p className="n-auth-note__audit">
          <ShieldCheck size={15} />
          Sign-ins are protected by Cloudflare Turnstile.
        </p>
      </div>
    </AuthCard>
  )
}
