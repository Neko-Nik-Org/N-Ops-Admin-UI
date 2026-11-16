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

/** Security card on the Account page: password change and account deactivation. */

import { useRef, useState } from 'react'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { ChangePasswordDialog } from '@/components/organisms/ChangePasswordDialog'
import { deactivateAccount } from '@/features/account/api/account'
import { useSyncSelfSession } from '@/features/account/hooks/useSyncSelfSession'

/** Which dialog is open, if any. */
type OpenDialog = 'password' | 'deactivate' | null

/** Always shown (unlike the profile, these actions don't need the user's profile to be loaded). */
export const AccountSecurityCard = () => {
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const { signOut } = useSyncSelfSession()
  // Set once the API confirms deactivation; closing the dialog then signs out instead.
  const deactivated = useRef(false)

  const close = () => setDialog(null)

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <h2 className="mb-4 font-semibold text-text">Security</h2>
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
    </section>
  )
}
