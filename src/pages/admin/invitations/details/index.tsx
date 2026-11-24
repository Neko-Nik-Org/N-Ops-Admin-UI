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
/**
 * Admin › Invitations › one invitation (/admin/invitations/:invitationId): who it's for and what they
 * get, with Revoke. The API can't edit or re-send an invitation; revoke it and send a new one instead.
 */

import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingButton } from '@/components/LoadingButton'
import { PageHeader } from '@/components/PageHeader'
import { SkeletonText } from '@/components/Skeleton'
import { PageToolbar, type Crumb } from '@/components/PageToolbar'
import { InvitationDetails, InvitationRevokeImpact } from '@/pages/admin/invitations/InvitationDetails'
import { ROUTES } from '@/constants/routes'
import { useDeleteInvitation, useInvitation } from '@/hooks/useInvitations'
import { useHasPermissions } from '@/hooks/usePermissions'

/** "Invitations › <current>". */
const crumbs = (current: string): Crumb[] => [{ label: 'Invitations', to: ROUTES.adminInvitations }, { label: current }]

export const InvitationDetailPage = () => {
  const invitationId = Number(useParams().invitationId)
  const valid = Number.isInteger(invitationId) && invitationId > 0
  const canView = useHasPermissions('user:invite:view')
  const canRevoke = useHasPermissions('user:invite:view', 'user:invite:delete')
  const { invitation, isLoading, error } = useInvitation(valid ? invitationId : null, { enabled: canView })
  const { mutateAsync: revoke } = useDeleteInvitation()
  const [revoking, setRevoking] = useState(false)
  // when the page opened; good enough for marking it expired
  const [now] = useState(Date.now)
  const navigate = useNavigate()

  if (!canView)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('Invitation')} back={ROUTES.adminInvitations} />
        <p className="text-sm text-text-muted">
          You need the “View invitations” permission (user:invite:view) to see invitations.
        </p>
      </div>
    )
  if (valid && isLoading) return <SkeletonText lines={6} />
  if (!valid || error || !invitation)
    return (
      <div className="flex flex-col gap-6">
        <PageToolbar crumbs={crumbs('Not found')} back={ROUTES.adminInvitations} />
        <p className="text-sm text-text-muted">
          {error
            ? `Couldn't load this invitation: ${error.message}`
            : "There's no invitation here. It may have been accepted, revoked or cleaned up after expiring."}
        </p>
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <PageToolbar
          crumbs={crumbs(invitation.email)}
          back={ROUTES.adminInvitations}
          actions={
            canRevoke && (
              <LoadingButton variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setRevoking(true)}>
                Revoke
              </LoadingButton>
            )
          }
        />
        <PageHeader
          title={invitation.email}
          showTitle
          description="Invitations can't be edited. To change one, revoke it and send a new one."
        />
      </div>

      <InvitationDetails invitation={invitation} now={now} />

      <ConfirmDialog
        open={revoking}
        title="Revoke invitation"
        confirmLabel="Revoke invitation"
        successMessage={`Revoked the invitation for ${invitation.email}.`}
        onConfirm={() => revoke(invitation.invitationId).then(() => setTimeout(() => navigate(ROUTES.adminInvitations), 500))}
        onClose={() => setRevoking(false)}
      >
        <InvitationRevokeImpact invitation={invitation} />
      </ConfirmDialog>
    </div>
  )
}
