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

/** Dialog that verifies the signed-in user's primary email with an emailed one-time code. */

import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'react-toastify'
import { OtpInput } from '@/components/molecules/OtpInput'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { Dialog } from '@/components/molecules/Dialog'
import { EMAIL_CODE_LENGTH, sendEmailVerification, verifyEmailCode } from '@/features/account/api/account'
import { useSyncSelfSession, type SessionSyncResult } from '@/features/account/hooks/useSyncSelfSession'
import { errorStatus } from '@/types/api'

/** Seconds before "Resend code" is offered again, so a double click doesn't send two emails. */
const RESEND_COOLDOWN_S = 30

/** Props for EmailVerificationDialog. */
interface EmailVerificationDialogProps {
  open: boolean
  /** Address the code goes to (shown so the user knows which inbox to check). */
  email: string
  onClose: () => void
}

/** 'start': nothing sent yet. 'sent': waiting for the code. 'used': the last code was rejected or expired, so a new one is needed. */
type Step = 'start' | 'sent' | 'used'

/** Success toast, depending on whether the API's cached session could be refreshed. */
const verifiedMessage = (result: SessionSyncResult): string =>
  result === 'refreshed' ? 'Email verified.' : 'Email verified. Sign out and back in to apply it to this session everywhere.'

/**
 * Two steps: send a code to the primary email, then type it in. Wrong or expired codes are
 * discarded by the API, so the dialog then asks for a new one. On success the session is synced
 * (refreshed for "Keep me signed in" sessions) so the profile shows the email as verified.
 */
export const EmailVerificationDialog = ({ open, email, onClose }: EmailVerificationDialogProps) => (
  <Dialog
    open={open}
    onClose={onClose}
    title="Verify your email"
    description={`We'll email a ${EMAIL_CODE_LENGTH}-character code to ${email}.`}
  >
    {/* Dialog only renders children while open, so every opening starts from a fresh first step. */}
    <EmailVerificationSteps email={email} onDone={() => setTimeout(onClose, 500)} onCancel={onClose} />
  </Dialog>
)

/** The dialog body: the send step, then the code step. */
/** Props for EmailVerificationSteps. */
interface EmailVerificationStepsProps {
  email: string
  /** Runs once the email is verified (and the session updated). */
  onDone: () => void
  /** Shows a Cancel button on the first step. */
  onCancel?: () => void
  /** Replaces the first step's explanation. */
  intro?: ReactNode
}

/** Send a code, type it, done. Used by the dialog and by the forced security setup. */
export const EmailVerificationSteps = ({ email, onDone, onCancel, intro }: EmailVerificationStepsProps) => {
  const { sync, signOut } = useSyncSelfSession()
  const [step, setStep] = useState<Step>('start')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Count the resend cooldown down once a second.
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  /** Applies "verified" locally (and on the server session when possible), then closes. */
  const finish = async (message: (result: SessionSyncResult) => string) => {
    const result = await sync({ isEmailVerified: true })
    if (result === 'signed-out') {
      toast.info('Email verified. Your session ended, so please sign in again.')
      signOut()
      return
    }
    toast.success(message(result))
    onDone()
  }

  const [sendState, send] = useAsyncAction(sendEmailVerification, { successMs: 800 })
  const [verifyState, verify] = useAsyncAction(verifyEmailCode, { successMs: 500 })

  /** Sends (or re-sends) the code. Any earlier code stops working. */
  const onSend = () =>
    send()
      .then(() => {
        setStep('sent')
        setCode('')
        setCodeError(null)
        setCooldown(RESEND_COOLDOWN_S)
        toast.success(`Code sent to ${email}.`)
      })
      .catch((error: Error) => {
        if (errorStatus(error) === 409) return finish(() => 'Your email is already verified.')
        toast.error(error.message)
      })

  /** Checks the typed code. */
  const onVerify = (value = code) => {
    if (value.length !== EMAIL_CODE_LENGTH || verifyState !== 'idle') return
    verify(value)
      .then(() => finish(verifiedMessage))
      .catch((error: Error) => {
        const status = errorStatus(error)
        if (status === 409) return finish(() => 'Your email is already verified.')
        setCode('')
        if (status === 400 || status === 410) {
          // The API discards the code after a wrong guess or once it expires.
          setStep('used')
          setCooldown(0)
          setCodeError(
            status === 410 ? 'That code has expired. Send a new one.' : 'That code is wrong. Send a new one and try again.',
          )
          return
        }
        setCodeError(error.message)
      })
  }

  const busy = verifyState !== 'idle'

  return step === 'start' ? (
    <>
      <p className="text-sm text-text-muted">
        {intro ?? 'A verified email lets N-Ops send you alerts and notifications.'} The code expires 5 minutes after it is sent.
      </p>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <LoadingButton variant="ghost" onClick={onCancel}>
            Cancel
          </LoadingButton>
        )}
        <LoadingButton state={sendState} loadingText="Sending" successText="Sent" onClick={onSend}>
          Send code
        </LoadingButton>
      </div>
    </>
  ) : (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onVerify()
      }}
    >
      <OtpInput
        variant="app"
        charset="alphanumeric"
        length={EMAIL_CODE_LENGTH}
        value={code}
        onChange={(value) => {
          setCode(value)
          if (codeError && step === 'sent') setCodeError(null)
        }}
        onComplete={onVerify}
        state={codeError ? 'error' : verifyState === 'success' ? 'success' : 'idle'}
        disabled={busy || step === 'used'}
        autoFocus={step === 'sent'}
        label="Email verification code"
      />
      <p className="min-h-5 text-sm" role={codeError ? 'alert' : undefined}>
        {codeError ? (
          <span className="text-danger">{codeError}</span>
        ) : (
          <span className="text-text-muted">Check your inbox (and spam folder). The code expires in 5 minutes.</span>
        )}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LoadingButton
          variant="ghost"
          size="sm"
          state={sendState}
          loadingText="Sending"
          successText="Sent"
          onClick={onSend}
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : step === 'used' ? 'Send a new code' : 'Resend code'}
        </LoadingButton>
        <LoadingButton
          type="submit"
          state={verifyState}
          loadingText="Verifying"
          successText="Verified"
          disabled={step === 'used' || code.length !== EMAIL_CODE_LENGTH}
        >
          Verify
        </LoadingButton>
      </div>
    </form>
  )
}
