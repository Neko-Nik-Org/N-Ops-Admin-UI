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
/** Create-account card shown on the invite page: a four-step form (account, password, then optional work and contact details). */

import { yupResolver } from '@hookform/resolvers/yup'
import { ArrowLeft, ArrowRight, AtSign, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useForm, type FieldErrors, type FieldPath } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { AuthBanner, AuthField } from '@/components/AuthShell/AuthField'
import { AuthCard } from '@/components/AuthShell/AuthCard'
import { LoadingButton } from '@/components/LoadingButton'
import { ProfileDetailsFields, type ProfileDetailsGroup } from '@/components/ProfileDetailsFields'
import { InviteStepper } from '@/pages/auth/invite/InviteStepper'
import { useAcceptInvite } from '@/pages/auth/invite/useAcceptInvite'
import { inviteSchema, type InviteFormValues } from '@/pages/auth/invite/inviteValidation'
import type { InviteLink } from '@/types/invite'
import { errorCode } from '@/types/api'
import { NAVIGATE_DELAY_MS } from '@/constants/config'
import { ROUTES } from '@/constants/routes'
import { isProfileDetailsEmpty, serializeProfileDetails } from '@/utils/profileDetails'
import { emptyDetailsForm, fromDetailsForm } from '@/utils/profileDetailsForm'

interface Step {
  label: string
  title: string
  hint: string
  optional?: boolean
  /** Fields checked before moving on from this step. */
  fields: FieldPath<InviteFormValues>[]
  /** Profile details groups shown on this step. */
  groups?: ProfileDetailsGroup[]
}

const STEPS: readonly Step[] = [
  {
    label: 'Account',
    title: 'Your account',
    hint: 'How you appear to your team, and the username you sign in with.',
    fields: ['displayName', 'userName'],
  },
  {
    label: 'Password',
    title: 'Choose a password',
    hint: 'You sign in with it, together with your username.',
    fields: ['password', 'confirmPassword'],
  },
  {
    label: 'Work',
    title: 'Work',
    hint: 'Optional. Helps your team know who you are.',
    optional: true,
    fields: ['details.work'],
    groups: ['work'],
  },
  {
    label: 'Contact',
    title: 'Contact',
    hint: 'Optional. How your team can reach you.',
    optional: true,
    fields: ['details.contact'],
    groups: ['contact'],
  },
]
const LAST = STEPS.length - 1

/** The first step with an error, or -1. */
const firstStepWithError = (errors: FieldErrors<InviteFormValues>): number =>
  STEPS.findIndex((step) =>
    step.fields.some((name) =>
      name.split('.').reduce<unknown>((e, key) => (e as Record<string, unknown> | undefined)?.[key], errors),
    ),
  )

/**
 * Shows who invited the user and where, then walks them through creating the account: name and
 * username, password, then optional work and contact details (as in the admin's user form). On
 * success they're sent to sign in, with the username filled in.
 */
export const InviteForm = ({ link }: { link: InviteLink }) => {
  const [acceptState, accept] = useAcceptInvite(link)
  const [formError, setFormError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const inviter = link.invitedBy || 'Someone'
  const current = STEPS[step]

  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: yupResolver(inviteSchema),
    defaultValues: {
      displayName: '',
      userName: '',
      password: '',
      confirmPassword: '',
      details: emptyDetailsForm(),
    },
  })

  /** Checks this step's fields, then moves on. */
  const next = async () => {
    if (await trigger(current.fields)) setStep((s) => Math.min(LAST, s + 1))
  }

  const onSubmit = (values: InviteFormValues) => {
    setFormError(null)
    const details = fromDetailsForm(values.details)
    accept({
      userName: values.userName,
      displayName: values.displayName,
      password: values.password,
      userDetails: isProfileDetailsEmpty(details) ? {} : serializeProfileDetails(details),
    })
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
        if (errorCode(error) === 'E112') setStep(0) // most likely a taken username
      })
  }

  /** Enter (or the main button) moves to the next step; on the last one it creates the account. */
  const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (step < LAST) return void next()
    void handleSubmit(onSubmit, (errs) => {
      const at = firstStepWithError(errs)
      if (at >= 0) setStep(at)
    })(e)
  }

  return (
    <AuthCard
      hideIcon
      className="n-auth-card--wide"
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
      <InviteStepper steps={STEPS} current={step} onSelect={setStep} />

      <form className="n-auth-form" onSubmit={onFormSubmit} noValidate aria-label={current.title}>
        {formError && <AuthBanner key={attempt}>{formError}</AuthBanner>}

        <div>
          <h2 className="text-base font-semibold text-text">
            {current.title}
            <span className="ml-2 text-xs font-normal text-text-muted">
              Step {step + 1} of {STEPS.length}
            </span>
          </h2>
          <p className="text-sm text-text-muted">{current.hint}</p>
        </div>

        {step === 0 && (
          <>
            {/* the invitation is for this address; the API takes it from the invitation, so it can't be changed */}
            <AuthField
              id="inviteEmail"
              label="Email"
              type="email"
              icon={<Mail size={18} />}
              value={link.email}
              disabled
              readOnly
            />
            <AuthField
              id="displayName"
              label="Your name"
              required
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
              required
              icon={<AtSign size={18} />}
              placeholder="priya"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              error={errors.userName?.message}
              hint="You sign in with this."
              {...register('userName')}
            />
          </>
        )}

        {step === 1 && (
          <>
            <AuthField
              id="password"
              label="Create a password"
              required
              type="password"
              icon={<Lock size={18} />}
              autoComplete="new-password"
              autoFocus
              error={errors.password?.message}
              hint="8–64 characters with an uppercase letter, a lowercase letter, a digit and a symbol."
              {...register('password')}
            />
            <AuthField
              id="confirmPassword"
              label="Confirm password"
              required
              type="password"
              icon={<Lock size={18} />}
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </>
        )}

        {current.groups && (
          <div className="flex flex-col gap-4">
            <ProfileDetailsFields
              register={register}
              control={control}
              errors={errors.details}
              prefix="details."
              groups={current.groups}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          {step > 0 && (
            <LoadingButton
              variant="secondary"
              size="lg"
              icon={<ArrowLeft size={16} />}
              onClick={() => setStep((s) => s - 1)}
              disabled={acceptState === 'loading'}
            >
              Back
            </LoadingButton>
          )}
          {step < LAST ? (
            <LoadingButton type="submit" size="lg" className="n-auth-submit flex-1">
              Next
              <ArrowRight size={16} aria-hidden="true" />
            </LoadingButton>
          ) : (
            <LoadingButton
              type="submit"
              size="lg"
              className="n-auth-submit flex-1"
              state={acceptState}
              loadingText="Creating account"
              successText="Account created"
            >
              Create account
            </LoadingButton>
          )}
        </div>
        {current.optional && step < LAST && (
          <button type="button" className="n-auth-link self-center text-sm" onClick={() => setStep(LAST)}>
            Skip the optional details
          </button>
        )}
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
