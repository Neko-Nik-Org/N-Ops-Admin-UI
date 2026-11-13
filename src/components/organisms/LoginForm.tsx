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

/** Sign-in form: username, password, "Keep me signed in" and the Turnstile check. */

import { yupResolver } from '@hookform/resolvers/yup'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Checkbox } from '@/components/atoms/Checkbox'
import { Input } from '@/components/atoms/Input'
import { LoadingButton } from '@/components/loading'
import { FormField } from '@/components/molecules/FormField'
import { PasswordInput } from '@/components/molecules/PasswordInput'
import { TurnstileWidget } from '@/components/molecules/TurnstileWidget'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { loginSchema, type LoginFormValues } from '@/features/auth/schema/loginSchema'
import { NAVIGATE_DELAY_MS } from '@/constants/config'
import { ROUTES } from '@/constants/routes'


/** Signs the user in, or forwards them to the 2FA page when a second factor is required. */
export const LoginForm = () => {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
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
    if (!turnstileToken) {
      toast.error('Complete the verification check before signing in.')
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
        toast.error(error.message)
        // the backend has spent this token (Turnstile tokens are single-use): get a fresh one
        // before the next attempt, otherwise every retry fails with "Failed to verify CAPTCHA"
        setTurnstileToken(null)
        setTurnstileResetKey((k) => k + 1)
      })
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
        <FormField id="userName" label="Username" error={errors.userName?.message}>
          <Input
            id="userName"
            type="text"
            placeholder="your-username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            hasError={!!errors.userName}
            {...register('userName')}
          />
        </FormField>

        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
          labelExtra={
            <button
              type="button"
              className="text-sm text-signal hover:text-signal-strong"
              onClick={() => toast.info("Password reset isn't available yet — ask an admin to reset it for you.")}
            >
              Forgot password?
            </button>
          }
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            hasError={!!errors.password}
            {...register('password')}
          />
        </FormField>

        <label className="flex items-center gap-2 text-sm text-text-muted">
          <Checkbox {...register('rememberMe')} />
          Keep me signed in on this device
        </label>

        <TurnstileWidget
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
          resetKey={turnstileResetKey}
        />

        <LoadingButton type="submit" className="w-full" state={loginState} loadingText="Signing in" successText="Verified">
          Sign in
        </LoadingButton>
      </form>

      <div className="mt-6 border-t border-border pt-6 text-sm text-text-muted">
        Don't have an account? Ask an admin in your organization to create one for you.
      </div>
    </>
  )
}
