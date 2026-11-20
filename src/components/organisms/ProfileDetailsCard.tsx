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

/** Profile details card on the Account page (`/user/self/details`), grouped as in features/account/profileDetails.ts. */

import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { LoadingButton } from '@/components/molecules/LoadingButton'
import { SkeletonText } from '@/components/molecules/Skeleton'
import { ProfileDetailsDialog } from '@/components/organisms/ProfileDetailsDialog'
import { ProfileDetailsView } from '@/components/organisms/ProfileDetailsView'
import { useUserDetails } from '@/features/account/hooks/useAccount'
import { isProfileDetailsEmpty, parseProfileDetails } from '@/features/account/profileDetails'

/** Shows the saved details and opens the editor. Shown even after a reload, since it loads its own data. */
export const ProfileDetailsCard = () => {
  const { data: details, isPending, error } = useUserDetails()
  const [editing, setEditing] = useState(false)
  const empty =
    !details ||
    (isProfileDetailsEmpty(parseProfileDetails(details).details) && !Object.keys(parseProfileDetails(details).preserved).length)

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
      ) : empty ? (
        <p className="text-sm text-text-muted">
          No details yet. Add your job title, how and when to reach you, or your SSH keys.
        </p>
      ) : (
        <ProfileDetailsView raw={details} />
      )}

      {details && <ProfileDetailsDialog open={editing} details={details} onClose={() => setEditing(false)} />}
    </section>
  )
}
