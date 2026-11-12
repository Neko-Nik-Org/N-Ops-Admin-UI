import { ChevronLeft, Mail, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { LoadingButton } from '@/components/loading'
import { OtpInput } from '@/components/molecules/OtpInput'
import { resendOtp } from '@/features/auth/api/twoFactor'
import { useVerifyOtp } from '@/features/auth/hooks/useVerifyOtp'
import type { TwoFactorContext, TwoFactorMethod } from '@/features/auth/types'
import { maskEmail } from '@/utils/maskEmail'

const CODE_LENGTH = 6
const NAVIGATE_DELAY_MS = 500
const RESEND_COOLDOWN_S = 30

const METHOD_COPY: Record<TwoFactorMethod, { icon: typeof Smartphone; subtext: (email: string) => string }> = {
  totp: {
    icon: Smartphone,
    subtext: (email) => `Enter the 6-digit code from your authenticator app for ${email}.`,
  },
  email: {
    icon: Mail,
    subtext: (email) => `Enter the 6-digit code we emailed to ${email}.`,
  },
}

export const TwoFactorForm = ({ context }: { context: TwoFactorContext }) => {
  const [method, setMethod] = useState<TwoFactorMethod>(context.hasTotp ? 'totp' : 'email')
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [verifyState, verify] = useVerifyOtp()
  const navigate = useNavigate()

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  useEffect(() => {
    if (verifyState !== 'success') return
    const t = setTimeout(() => navigate('/', { replace: true }), NAVIGATE_DELAY_MS)
    return () => clearTimeout(t)
  }, [verifyState, navigate])

  const handleSubmit = () => {
    if (code.length < CODE_LENGTH) {
      toast.error('Enter the full 6-digit code.')
      return
    }
    // TODO: drop this catch once /auth/verify-otp is real — right now any failure means "doesn't exist yet".
    verify({ temporaryAuthToken: context.temporaryAuthToken, method, code, rememberMe: context.rememberMe }).catch(
      () => toast.error("Two-factor verification isn't available on the server yet."),
    )
  }

  const handleResend = async () => {
    setCooldown(RESEND_COOLDOWN_S)
    try {
      await resendOtp(context.temporaryAuthToken, method)
      toast.success('Code sent.')
    } catch {
      toast.info("Resending codes isn't available yet — ask an admin if you didn't get one.")
    }
  }

  const switchMethod = (next: TwoFactorMethod) => {
    setMethod(next)
    setCode('')
  }

  const { icon: Icon, subtext } = METHOD_COPY[method]
  const alternate: TwoFactorMethod | null = method === 'totp' && context.hasEmail ? 'email' : method === 'email' && context.hasTotp ? 'totp' : null

  return (
    <div className="flex w-full flex-col gap-6">
      <button
        type="button"
        onClick={() => navigate('/login', { replace: true })}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ChevronLeft size={16} />
        Back to sign in
      </button>

      <div className="flex size-11 items-center justify-center rounded-lg border border-signal text-signal">
        <Icon size={20} />
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold text-text">Two-step verification</h1>
        <p className="text-sm text-text-muted">
          {subtext(method === 'email' ? maskEmail(context.email) : context.email)}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-text-muted">Verification code</span>
        <OtpInput value={code} onChange={setCode} disabled={verifyState !== 'idle'} />
        {method === 'totp' ? (
          <p className="text-xs text-text-muted">Codes refresh every 30 seconds.</p>
        ) : (
          <button
            type="button"
            disabled={cooldown > 0}
            onClick={handleResend}
            className="w-fit text-xs text-signal hover:text-signal-strong disabled:text-text-muted"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        )}
      </div>

      <LoadingButton
        type="button"
        className="w-full"
        state={verifyState}
        loadingText="Verifying"
        successText="Verified"
        onClick={handleSubmit}
      >
        Verify and continue
      </LoadingButton>

      {alternate && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted">Other ways to verify</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => switchMethod(alternate)}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3 text-left hover:border-border-strong"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ink text-accent-secondary">
              {alternate === 'email' ? <Mail size={16} /> : <Smartphone size={16} />}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-text">
                {alternate === 'email' ? 'Email me a code' : 'Use your authenticator app'}
              </span>
              <span className="text-xs text-text-muted">
                {alternate === 'email' ? `We'll send it to ${maskEmail(context.email)}` : 'Enter the code from your app instead'}
              </span>
            </span>
          </button>
        </>
      )}

      <p className="text-xs text-text-muted">
        Your admin requires two-step verification for everyone in {context.organizationName}.
      </p>
    </div>
  )
}
