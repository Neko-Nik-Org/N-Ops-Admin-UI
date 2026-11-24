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

/** Profile details card on Account › Profile (`/user/self/details`), grouped as in utils/profileDetails.ts. */

import { IdCard, Pencil } from 'lucide-react'
import { useState } from 'react'
import { LoadingButton } from '@/components/LoadingButton'
import { AccountCard } from '@/pages/account/AccountCard'
import { SkeletonText } from '@/components/Skeleton'
import { ProfileDetailsDialog } from '@/components/ProfileDetailsDialog'
import { ProfileDetailsView } from '@/components/ProfileDetailsView'
import { useUserDetails } from '@/hooks/useAccount'
import { isProfileDetailsEmpty, parseProfileDetails } from '@/utils/profileDetails'

/** Shows the saved details and opens the editor. Shown even after a reload, since it loads its own data. */
export const ProfileDetailsCard = ({ className }: { className?: string }) => {
  const { data: details, isPending, error } = useUserDetails()
  const [editing, setEditing] = useState(false)
  const empty =
    !details ||
    (isProfileDetailsEmpty(parseProfileDetails(details).details) && !Object.keys(parseProfileDetails(details).preserved).length)

  return (
    <AccountCard
      icon={<IdCard size={16} />}
      title="Profile details"
      className={className}
      actions={
        details && (
          <LoadingButton variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(true)}>
            Edit
          </LoadingButton>
        )
      }
    >
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
    </AccountCard>
  )
}
