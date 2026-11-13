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
import { currentUserAtom } from '@/features/auth/store/session'
import { cn } from '@/utils/cn'

/** The signed-in user's identity. Only known right after sign-in, so nothing renders after a page reload. */
export const UserDetailsCard = () => {
  const user = useAtomValue(currentUserAtom)
  if (!user) return null

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
          <dd className="font-mono text-text">{user.userName}</dd>
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
          </dd>
        </div>
      </dl>
    </section>
  )
}
