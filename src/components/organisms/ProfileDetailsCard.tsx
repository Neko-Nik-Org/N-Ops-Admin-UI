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

/** Profile details card on the Account page: the user's free-form extra info (`/user/self/details`). */

import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { SkeletonText } from '@/components/molecules/Skeleton'
import { ProfileDetailsDialog } from '@/components/organisms/ProfileDetailsDialog'
import { formatDetailValue } from '@/features/account/details'
import { useUserDetails } from '@/features/account/hooks/useAccount'

/** Lists the saved details and opens the editor. Shown even after a reload, since it loads its own data. */
export const ProfileDetailsCard = () => {
  const { data: details, isPending, error } = useUserDetails()
  const [editing, setEditing] = useState(false)
  const entries = Object.entries(details ?? {})

  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-text">Profile details</h2>
        {details && (
          <LoadingButton variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(true)}>
            Edit
          </LoadingButton>
        )}
      </div>

      {isPending ? (
        <SkeletonText lines={2} />
      ) : error ? (
        <p className="text-sm text-danger">Couldn't load your profile details: {error.message}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-text-muted">No extra details yet. Add things like your job title or team.</p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {entries.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-text-muted">{label}</dt>
              <dd className={typeof value === 'string' ? 'break-words text-text' : 'break-all font-mono text-xs text-text'}>
                {typeof value === 'string' ? value || '—' : formatDetailValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {details && <ProfileDetailsDialog open={editing} details={details} onClose={() => setEditing(false)} />}
    </section>
  )
}
