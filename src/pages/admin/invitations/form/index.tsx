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
/** Admin › Invitations › new (/admin/invitations/new): the send-invitation form as its own page. */

import { PageHeader } from '@/components/PageHeader'
import { PageToolbar } from '@/components/PageToolbar'
import { InvitationForm } from '@/pages/admin/invitations/form/InvitationForm'
import { ROUTES } from '@/constants/routes'
import { useGoBack } from '@/hooks/useGoBack'
import { useHasPermissions } from '@/hooks/usePermissions'

const TITLE = 'Invite someone'

export const InvitationFormPage = () => {
  // the API checks user:create too, since accepting creates a user
  const canSend = useHasPermissions('user:invite:create', 'user:create')
  // back to where the user came from; opened directly, the list
  const back = useGoBack(ROUTES.adminInvitations)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <PageToolbar
          crumbs={[{ label: 'Invitations', to: ROUTES.adminInvitations }, { label: TITLE }]}
          back={ROUTES.adminInvitations}
        />
        {/* the path above names the page; the heading is for screen readers */}
        <PageHeader title={TITLE} />
      </div>
      {canSend ? (
        <InvitationForm onSent={back} onCancel={back} />
      ) : (
        <p className="text-sm text-text-muted">
          Sending invitations needs the “Create invitations” and “Create users” permissions (user:invite:create, user:create).
        </p>
      )}
    </div>
  )
}
