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
import { Lock, ShieldCheck, User } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { AuthBanner, AuthField } from '@/components/auth/AuthField'
import { AuthCard } from '@/components/auth/AuthShell'
import { LoadingButton } from '@/components/loading'
import { useAcceptInvite } from '@/features/invite/hooks/useAcceptInvite'
import { inviteSchema, type InviteFormValues } from '@/features/invite/schema/inviteSchema'
import type { InviteDetails } from '@/features/invite/types'
import { NAVIGATE_DELAY_MS } from '@/constants/config'
import { ROUTES } from '@/constants/routes'

/**
 * Shows who invited the user and with what access, then collects their name and
 * password. On success the user is signed in and sent to the dashboard.
 */
export const InviteForm = ({ token, details }: { token: string; details: InviteDetails }) => {
  const [acceptState, accept] = useAcceptInvite(token)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: yupResolver(inviteSchema),
    defaultValues: { fullName: '', password: '' },
  })

  const onSubmit = (values: InviteFormValues) => {
    setFormError(null)
    accept(values)
      .then(() => {
        setTimeout(() => navigate(ROUTES.overview, { replace: true }), NAVIGATE_DELAY_MS)
      })
      .catch(() => {
        setAttempt((n) => n + 1)
        setFormError("Accepting invites isn't available on the server yet. Ask an admin to create your account for you.")
      })
  }

  return (
    <AuthCard
      title={<>Join {details.organizationName}</>}
      subtitle={
        <span className="n-auth-inviter">
          <span className="n-auth-avatar" aria-hidden="true">
            {details.inviterName.charAt(0).toUpperCase()}
          </span>
          <span>
            <b>{details.inviterName}</b> invited you to N-Ops
          </span>
        </span>
      }
    >
      <dl className="n-auth-summary">
        <div className="n-auth-summary__row">
          <dt>Role</dt>
          <dd>
            <b>{details.role}</b>
          </dd>
        </div>
        <div className="n-auth-summary__row">
          <dt>Tags</dt>
          <dd className="n-auth-summary__tags">
            {details.tags.map((tag) => (
              <span key={tag} className="n-auth-tag">
                {tag}
              </span>
            ))}
          </dd>
        </div>
        <div className="n-auth-summary__row">
          <dt>Email</dt>
          <dd className="n-auth-mono">{details.email}</dd>
        </div>
      </dl>

      <form className="n-auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && <AuthBanner key={attempt}>{formError}</AuthBanner>}

        <AuthField
          id="fullName"
          label="Full name"
          icon={<User size={18} />}
          placeholder="Your name"
          autoComplete="name"
          autoFocus
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <AuthField
          id="password"
          label="Create a password"
          type="password"
          icon={<Lock size={18} />}
          placeholder="A long passphrase"
          autoComplete="new-password"
          error={errors.password?.message}
          hint="Use a long passphrase you don't use anywhere else."
          {...register('password')}
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
        <p>You'll be signed in automatically.</p>
        <p className="n-auth-note__audit">
          <ShieldCheck size={15} />
          What you can see and do depends on your role and tags, set by your admin.
        </p>
      </div>
    </AuthCard>
  )
}
