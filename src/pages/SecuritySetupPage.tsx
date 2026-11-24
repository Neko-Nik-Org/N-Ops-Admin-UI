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
/**
 * Forced security setup (/security-setup). When the user's access policy requires second factors
 * they don't have yet, RequireSecuritySetup sends every app route here, and nothing else opens until
 * each step is done (or they sign out). Steps come from `pendingSetupSteps`; each has a view below.
 */

import { useAtomValue, useSetAtom } from 'jotai'
import { Check, CircleAlert, LogOut, Mail, MailCheck, ShieldCheck, Smartphone } from 'lucide-react'
import { useEffect, useState, type ComponentType, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { NSpinner } from '@/components/atoms/NSpinner'
import { AuthCard } from '@/components/molecules/AuthCard'
import { CopyButton } from '@/components/molecules/CopyButton'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { OtpInput } from '@/components/molecules/OtpInput'
import { EmailVerificationSteps } from '@/components/organisms/EmailVerificationDialog'
import { AuthShell } from '@/components/templates/AuthShell'
import { ROUTES } from '@/constants/routes'
import {
  checkTotpCode,
  createTotpEntry,
  setEmailTwoFactor,
  setTotpTwoFactor,
  type TotpEnrollment,
} from '@/features/auth/api/twoFactorSetup'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { pendingSetupSteps, type SecondFactor, type SetupStepId } from '@/features/auth/securitySetup'
import { markFactorEnabledAtom, securityRequirementsAtom } from '@/features/auth/store/securityRequirements'
import { currentUserAtom } from '@/features/auth/store/session'
import type { CurrentUser } from '@/features/auth/types'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { errorStatus } from '@/types/api'

/** How long the "all set" card shows before the dashboard opens. */
const DONE_HOLD_MS = 1200

/** Names of the second factors, as the policy summary shows them. */
const FACTOR_LABELS: Record<SecondFactor, string> = {
  email: 'Email codes',
  totp: 'Authenticator app',
}

// ── Steps ────────────────────────────────────────────────

/** Confirms the email address, which email codes need first. Finishing it updates the profile, which advances the flow. */
const VerifyEmailStep = ({ user }: { user: CurrentUser | null }) => (
  <EmailVerificationSteps
    email={user?.primaryEmail ?? 'your email'}
    onDone={() => {}}
    intro="Your sign-in codes will go to this address, so first confirm it's yours."
  />
)

/** Turns email codes on. */
const EnableEmailStep = ({ user }: { user: CurrentUser | null }) => {
  const markEnabled = useSetAtom(markFactorEnabledAtom)
  const [state, enable] = useAsyncAction(() => setEmailTwoFactor(true), { successMs: 600 })
  const onEnable = () =>
    enable()
      .then(() => {
        toast.success('Email codes are on.')
        setTimeout(() => markEnabled('email'), 600)
      })
      .catch((error: Error) => toast.error(error.message))
  return (
    <div className="n-auth-form">
      <p className="n-auth-hint">
        Each time you sign in, we'll email a one-time code to <b>{user?.primaryEmail ?? 'your verified address'}</b>. You'll enter
        it after your password.
      </p>
      <LoadingButton
        size="lg"
        className="n-auth-submit"
        state={state}
        loadingText="Turning on"
        successText="On"
        onClick={onEnable}
      >
        Turn on email codes
      </LoadingButton>
    </div>
  )
}

/** "JBSW Y3DP EHPK 3PXP": easier to type by hand. */
const groupSecret = (secret: string) => secret.match(/.{1,4}/g)?.join(' ') ?? secret

/** Adds an authenticator app: create an entry, add its key to the app, confirm one code, turn it on. */
const TotpStep = () => {
  const markEnabled = useSetAtom(markFactorEnabledAtom)
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [startState, start] = useAsyncAction(() => createTotpEntry('Authenticator app'), { successMs: 300 })
  const [verifyState, verify] = useAsyncAction(
    async (entryId: number, value: string) => {
      await checkTotpCode(entryId, value)
      await setTotpTwoFactor(true)
    },
    { successMs: 600 },
  )

  const onStart = () =>
    start()
      .then(setEnrollment)
      .catch((e: Error) => toast.error(e.message))

  const check = (value = code) => {
    if (!enrollment || value.length !== 6 || verifyState !== 'idle') return
    verify(enrollment.entryId, value)
      .then(() => {
        toast.success('Authenticator app is on.')
        setTimeout(() => markEnabled('totp'), 600)
      })
      .catch((e: Error) => {
        setCode('')
        setError(
          errorStatus(e) === 400
            ? "That code didn't match. Check your phone's clock is right and enter the newest code."
            : e.message,
        )
      })
  }

  if (!enrollment)
    return (
      <div className="n-auth-form">
        <p className="n-auth-hint">
          You'll need an authenticator app on your phone, such as Google Authenticator, Microsoft Authenticator, 1Password or
          Authy.
        </p>
        <LoadingButton
          size="lg"
          className="n-auth-submit"
          state={startState}
          loadingText="Preparing"
          successText="Ready"
          onClick={onStart}
        >
          Set up authenticator app
        </LoadingButton>
      </div>
    )

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    check()
  }

  return (
    <form className="n-auth-form" onSubmit={onSubmit} noValidate>
      <p className="n-auth-hint">
        In your app, add an account and enter this setup key, or{' '}
        <a className="n-auth-link" href={enrollment.otpauthUrl}>
          open it in your authenticator app
        </a>{' '}
        on this device.
      </p>
      <dl className="n-auth-summary">
        <div className="n-auth-summary__row">
          <dt>Setup key</dt>
          <dd className="flex items-center gap-1">
            <span className="n-auth-mono">{groupSecret(enrollment.secret)}</span>
            <CopyButton text={enrollment.secret} label="Copy setup key" />
          </dd>
        </div>
      </dl>
      <p className="n-auth-hint">Then enter the 6-digit code the app shows.</p>
      <OtpInput
        value={code}
        onChange={(v) => {
          setCode(v)
          if (error) setError(null)
        }}
        onComplete={check}
        state={error ? 'error' : 'idle'}
        disabled={verifyState !== 'idle'}
        label="Code from your authenticator app"
      />
      {error && (
        <p className="n-auth-error" role="alert">
          <CircleAlert size={15} />
          {error}
        </p>
      )}
      <LoadingButton
        type="submit"
        size="lg"
        className="n-auth-submit"
        state={verifyState}
        loadingText="Checking"
        successText="Turned on"
        disabled={code.length !== 6}
      >
        Confirm and turn on
      </LoadingButton>
    </form>
  )
}

/** How each step looks. A new factor's step is added here (and in `securitySetup.ts`). */
const STEP_VIEWS: Record<
  SetupStepId,
  { label: string; title: string; icon: ReactNode; View: ComponentType<{ user: CurrentUser | null }> }
> = {
  'verify-email': { label: 'Verify email', title: 'Verify your email', icon: <Mail size={26} />, View: VerifyEmailStep },
  'enable-email-2fa': {
    label: 'Turn on email codes',
    title: 'Turn on email codes',
    icon: <MailCheck size={26} />,
    View: EnableEmailStep,
  },
  'enable-totp-2fa': {
    label: 'Add authenticator app',
    title: 'Add an authenticator app',
    icon: <Smartphone size={26} />,
    View: TotpStep,
  },
}

// ── Page ─────────────────────────────────────────────────

/** Steps done, current and to come; the plan is what was pending when the page opened. */
const StepList = ({ plan, pending }: { plan: SetupStepId[]; pending: SetupStepId[] }) => (
  <ol className="n-auth-summary" aria-label="Setup steps">
    {plan.map((step, i) => {
      const done = !pending.includes(step)
      const current = step === pending[0]
      return (
        <li key={step} className="n-auth-summary__row" aria-current={current ? 'step' : undefined}>
          <span>
            {i + 1}. {current ? <b>{STEP_VIEWS[step].label}</b> : STEP_VIEWS[step].label}
          </span>
          <span className="n-auth-tag">{done ? 'Done' : current ? 'Now' : 'Next'}</span>
        </li>
      )
    })}
  </ol>
)

export const SecuritySetupPage = () => {
  const requirements = useAtomValue(securityRequirementsAtom)
  const user = useAtomValue(currentUserAtom)
  const pending = pendingSetupSteps(requirements, user)
  const navigate = useNavigate()
  const [signOutState, signOut] = useLogout()
  // the steps as they stood on arrival, for the checklist; a step that appears later is appended
  const [initialPlan] = useState(pending)
  const plan = [...initialPlan, ...pending.filter((s) => !initialPlan.includes(s))]
  const finished = initialPlan.length > 0 && pending.length === 0

  useEffect(() => {
    if (!finished) return
    const timer = setTimeout(() => navigate(ROUTES.overview, { replace: true }), DONE_HOLD_MS)
    return () => clearTimeout(timer)
  }, [finished, navigate])

  // nothing to set up (e.g. opened by hand): go to the app
  if (!initialPlan.length) return <Navigate to={ROUTES.overview} replace />

  const org = user ? { name: user.organizationName } : undefined

  if (finished)
    return (
      <AuthShell org={org}>
        <AuthCard
          title="You're all set"
          subtitle="Two-step sign-in is on for your account."
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
      </AuthShell>
    )

  const step = STEP_VIEWS[pending[0]!]
  const required = requirements?.required ?? []

  return (
    <AuthShell org={org}>
      <AuthCard title={step.title} subtitle={`Step ${plan.indexOf(pending[0]!) + 1} of ${plan.length}`} icon={step.icon}>
        <p className="n-auth-hint mb-4 flex items-start gap-2">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {user?.organizationName ?? 'Your organization'} requires {required.map((f) => FACTOR_LABELS[f]).join(' and ')} for
            your account. Finish these steps to open N-Ops.
          </span>
        </p>
        <StepList plan={plan} pending={pending} />
        {/* keyed so each step starts fresh */}
        <step.View key={pending[0]} user={user} />
        <button type="button" className="n-auth-back" onClick={() => void signOut()} disabled={signOutState !== 'idle'}>
          <LogOut size={16} />
          Sign out
        </button>
      </AuthCard>
    </AuthShell>
  )
}
