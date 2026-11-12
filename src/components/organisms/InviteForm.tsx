import { yupResolver } from '@hookform/resolvers/yup'
import { ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Input } from '@/components/atoms/Input'
import { LoadingButton } from '@/components/loading'
import { FormField } from '@/components/molecules/FormField'
import { PasswordInput } from '@/components/molecules/PasswordInput'
import { useAcceptInvite } from '@/features/invite/hooks/useAcceptInvite'
import { inviteSchema, type InviteFormValues } from '@/features/invite/schema/inviteSchema'
import type { InviteDetails } from '@/features/invite/types'

const NAVIGATE_DELAY_MS = 500

export const InviteForm = ({ token, details }: { token: string; details: InviteDetails }) => {
  const [acceptState, accept] = useAcceptInvite(token)
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
    accept(values)
      .then(() => {
        setTimeout(() => navigate('/', { replace: true }), NAVIGATE_DELAY_MS)
      })
      .catch(() => toast.error("Accepting invites isn't available on the server yet — ask an admin to create your account for you."))
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-secondary/15 text-sm font-semibold text-accent-secondary">
          {details.inviterName.charAt(0).toUpperCase()}
        </span>
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-text">{details.inviterName}</span> invited you to join{' '}
          <span className="font-semibold text-text">{details.organizationName}</span>
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold text-text">Join {details.organizationName} on N-Ops</h1>
        <p className="text-sm text-text-muted">Set up your account to start working with the team.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">Role</span>
          <span className="font-semibold text-text">{details.role}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">Tags</span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {details.tags.map((tag) => (
              <span key={tag} className="rounded bg-ink px-1.5 py-0.5 font-mono text-xs text-accent-secondary">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-muted">Email</span>
          <span className="font-mono text-xs text-text">{details.email}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField id="fullName" label="Full name" error={errors.fullName?.message}>
          <Input id="fullName" placeholder="Your name" autoComplete="name" hasError={!!errors.fullName} {...register('fullName')} />
        </FormField>

        <FormField id="password" label="Create a password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            placeholder="A long passphrase"
            autoComplete="new-password"
            hasError={!!errors.password}
            {...register('password')}
          />
          {!errors.password && <p className="text-xs text-text-muted">Use a long passphrase you don't use anywhere else.</p>}
        </FormField>

        <LoadingButton type="submit" className="w-full" state={acceptState} loadingText="Creating account" successText="Account created">
          Create account
        </LoadingButton>

        <p className="text-center text-xs text-text-muted">You'll be signed in automatically.</p>
      </form>

      <p className="flex items-start gap-2 text-xs text-text-muted">
        <ShieldCheck size={14} className="mt-0.5 shrink-0 text-signal" />
        What you can see and do depends on your role and tags, set by your admin.
      </p>
    </div>
  )
}
