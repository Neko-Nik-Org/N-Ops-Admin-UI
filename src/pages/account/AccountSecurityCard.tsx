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

/** Security card on Account › Security: password change and account deactivation. */

import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { LoadingButton } from '@/components/LoadingButton'
import { AccountCard } from '@/pages/account/AccountCard'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { AntiPhishingDialog } from '@/pages/account/AntiPhishingDialog'
import { ChangePasswordDialog } from '@/pages/account/ChangePasswordDialog'
import { deactivateAccount } from '@/api/account'
import { useAntiPhishingSecret } from '@/hooks/useAccount'
import { useSyncSelfSession } from '@/hooks/useSyncSelfSession'

/** Which dialog is open, if any. */
type OpenDialog = 'password' | 'antiPhishing' | 'deactivate' | null

/** Always shown (unlike the profile, these actions don't need the user's profile to be loaded). */
export const AccountSecurityCard = ({ className }: { className?: string }) => {
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const { signOut } = useSyncSelfSession()
  // Set once the API confirms deactivation; closing the dialog then signs out instead.
  const deactivated = useRef(false)
  // the secret is only fetched once the user asks to see or change it
  const [revealed, setRevealed] = useState(false)
  const secret = useAntiPhishingSecret(revealed || dialog === 'antiPhishing')

  const close = () => setDialog(null)

  return (
    <AccountCard icon={<KeyRound size={16} />} title="Security" className={className}>
      <div className="flex flex-col divide-y divide-border text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div>
            <p className="text-text">Password</p>
            <p className="text-text-muted">Set a new password for signing in.</p>
          </div>
          <LoadingButton variant="secondary" size="sm" onClick={() => setDialog('password')}>
            Change password
          </LoadingButton>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="text-text">Anti-phishing secret</p>
            <p className="text-text-muted">Shown in every email N-Ops sends you. An email without it isn't from N-Ops.</p>
            <p className="mt-1.5 flex items-center gap-2">
              <code className="rounded bg-ink px-2 py-0.5 font-mono text-text" aria-live="polite">
                {!revealed
                  ? '••••••••'
                  : secret.isPending
                    ? 'Loading…'
                    : secret.error
                      ? "Couldn't load it"
                      : secret.data || 'Not set'}
              </code>
              <button
                type="button"
                onClick={() => setRevealed((r) => !r)}
                aria-label={revealed ? 'Hide anti-phishing secret' : 'Show anti-phishing secret'}
                className="rounded p-1 text-text-muted hover:text-text"
              >
                {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </p>
          </div>
          <LoadingButton variant="secondary" size="sm" onClick={() => setDialog('antiPhishing')}>
            Change secret
          </LoadingButton>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div>
            <p className="text-text">Deactivate account</p>
            <p className="text-text-muted">Signs you out and blocks sign-in. Only an admin can reactivate it.</p>
          </div>
          <LoadingButton variant="danger" size="sm" onClick={() => setDialog('deactivate')}>
            Deactivate
          </LoadingButton>
        </div>
      </div>

      <ChangePasswordDialog open={dialog === 'password'} onClose={close} />
      <AntiPhishingDialog open={dialog === 'antiPhishing'} current={secret.data ?? ''} onClose={close} />
      <ConfirmDialog
        open={dialog === 'deactivate'}
        title="Deactivate your account?"
        confirmLabel="Deactivate my account"
        successMessage="Your account has been deactivated."
        onConfirm={async () => {
          await deactivateAccount()
          deactivated.current = true
        }}
        onClose={() => {
          if (deactivated.current) signOut()
          else close()
        }}
      >
        <p>You will be signed out straight away and won't be able to sign in again.</p>
        <p className="mt-2">To use this account again, ask an admin of your organization to reactivate it.</p>
      </ConfirmDialog>
    </AccountCard>
  )
}
