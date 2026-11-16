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

/** Profile card on the Account page. */

import { useAtomValue } from 'jotai'
import { useState } from 'react'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { ChangeUsernameDialog } from '@/components/organisms/ChangeUsernameDialog'
import { EmailVerificationDialog } from '@/components/organisms/EmailVerificationDialog'
import { currentUserAtom } from '@/features/auth/store/session'
import { cn } from '@/utils/cn'

/**
 * The signed-in user's identity, with actions to change the username and verify the email.
 * Renders nothing if the profile is unknown (it is saved at sign-in and restored after a reload).
 */
export const UserDetailsCard = () => {
  const user = useAtomValue(currentUserAtom)
  const [dialog, setDialog] = useState<'username' | 'email' | null>(null)
  if (!user) return null

  const close = () => setDialog(null)

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <h2 className="mb-4 font-semibold text-text">Profile</h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-text-muted">Display name</dt>
          <dd className="font-medium text-text">{user.displayName}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Username</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-text">{user.userName}</span>
            <LoadingButton variant="ghost" size="sm" onClick={() => setDialog('username')} aria-label="Change username">
              Change
            </LoadingButton>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-text-muted">Email</dt>
          <dd className="flex flex-wrap items-center gap-2 text-text">
            {user.primaryEmail}
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-xs',
                user.isEmailVerified ? 'bg-signal/15 text-signal' : 'bg-warning/15 text-warning',
              )}
            >
              {user.isEmailVerified ? 'Verified' : 'Not verified'}
            </span>
            {!user.isEmailVerified && (
              <LoadingButton variant="secondary" size="sm" onClick={() => setDialog('email')}>
                Verify email
              </LoadingButton>
            )}
          </dd>
        </div>
      </dl>

      <ChangeUsernameDialog open={dialog === 'username'} currentUserName={user.userName} onClose={close} />
      <EmailVerificationDialog open={dialog === 'email'} email={user.primaryEmail} onClose={close} />
    </section>
  )
}
