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
/** Create-account card shown on the invite page. */

import { yupResolver } from '@hookform/resolvers/yup'
import { AtSign, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { AuthBanner, AuthField } from '@/components/molecules/AuthField'
import { AuthCard } from '@/components/molecules/AuthCard'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { useAcceptInvite } from '@/features/invite/hooks/useAcceptInvite'
import { inviteSchema, type InviteFormValues } from '@/features/invite/schema/inviteSchema'
import type { InviteLink } from '@/features/invite/types'
import { NAVIGATE_DELAY_MS } from '@/constants/config'
import { ROUTES } from '@/constants/routes'

/**
 * Shows who invited the user and where, then collects their name, username and password. On success
 * they're sent to sign in, with the username filled in.
 */
export const InviteForm = ({ link }: { link: InviteLink }) => {
  const [acceptState, accept] = useAcceptInvite(link)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()
  const inviter = link.invitedBy || 'Someone'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: yupResolver(inviteSchema),
    defaultValues: { displayName: '', userName: '', password: '', confirmPassword: '' },
  })

  const onSubmit = (values: InviteFormValues) => {
    setFormError(null)
    accept({ userName: values.userName, displayName: values.displayName, password: values.password })
      .then(() => {
        toast.success('Your account is ready. Sign in with your new password.')
        setTimeout(
          () => navigate(ROUTES.login, { replace: true, state: { userName: values.userName.trim() } }),
          NAVIGATE_DELAY_MS,
        )
      })
      .catch((error: Error) => {
        setAttempt((n) => n + 1)
        setFormError(error.message || "Couldn't create your account. Try again.")
      })
  }

  return (
    <AuthCard
      hideIcon
      title={<>Join {link.organizationName || 'your organization'}</>}
      subtitle={
        <span className="n-auth-inviter">
          <span className="n-auth-avatar" aria-hidden="true">
            {inviter.charAt(0).toUpperCase()}
          </span>
          <span>
            <b>{inviter}</b> invited you to N-Ops
          </span>
        </span>
      }
    >
      <form className="n-auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <AuthBanner key={attempt}>{formError}</AuthBanner>}

        {/* the invitation is for this address; the API takes it from the invitation, so it can't be changed */}
        <AuthField id="inviteEmail" label="Email" type="email" icon={<Mail size={18} />} value={link.email} disabled readOnly />

        <AuthField
          id="displayName"
          label="Your name"
          icon={<User size={18} />}
          placeholder="Priya Rao"
          autoComplete="name"
          autoFocus
          error={errors.displayName?.message}
          {...register('displayName')}
        />

        <AuthField
          id="userName"
          label="Username"
          icon={<AtSign size={18} />}
          placeholder="priya"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.userName?.message}
          hint="You sign in with this."
          {...register('userName')}
        />

        <AuthField
          id="password"
          label="Create a password"
          type="password"
          icon={<Lock size={18} />}
          autoComplete="new-password"
          error={errors.password?.message}
          hint="8–64 characters with an uppercase letter, a lowercase letter, a digit and a symbol."
          {...register('password')}
        />

        <AuthField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          icon={<Lock size={18} />}
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <LoadingButton
          type="submit"
          size="lg"
          className="n-auth-submit"
          state={acceptState}
          loadingText="Creating account"
          successText="Account created"
        >
          Create account
        </LoadingButton>
      </form>

      <div className="n-auth-note">
        <p>You'll sign in with your new username and password next.</p>
        <p className="n-auth-note__audit">
          <ShieldCheck size={15} />
          What you can see and do depends on the role your admin picked for you.
        </p>
      </div>
    </AuthCard>
  )
}
