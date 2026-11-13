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

/** Invite page (/invite/:token): lets an invited person create their account. */

import { Link, Navigate, useParams } from 'react-router-dom'
import { PanelLoader } from '@/components/loading'
import { AuthLayout } from '@/components/templates/AuthLayout'
import { InviteForm } from '@/components/organisms/InviteForm'
import { useInviteDetails } from '@/features/invite/hooks/useInviteDetails'
import { ROUTES } from '@/constants/routes'

/** Shown when the invite link is invalid, expired or not supported by the server. */
const InviteUnavailable = () => (
  <div className="flex flex-col gap-3 text-center">
    <h1 className="text-2xl font-bold text-text">This invite isn't available</h1>
    <p className="text-sm text-text-muted">
      The link may be invalid or expired, or invites aren't supported on this server yet. Ask whoever invited you to send a new link.
    </p>
    <Link to={ROUTES.login} className="text-sm text-signal hover:text-signal-strong">
      Back to sign in
    </Link>
  </div>
)

/** Loads the invite from the URL token, then shows the create-account form or an error. */
export const InvitePage = () => {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, isError } = useInviteDetails(token ?? '')

  if (!token) return <Navigate to={ROUTES.login} replace />

  return (
    <AuthLayout
      headline="Your team runs its infrastructure here."
      subtext="Servers, secrets, containers, approvals and workflows for your whole team, in one place."
    >
      {isLoading ? (
        <div className="relative flex min-h-[320px] items-center justify-center">
          <PanelLoader label="Loading your invite" />
        </div>
      ) : isError || !data ? (
        <InviteUnavailable />
      ) : (
        <InviteForm token={token} details={data} />
      )}
    </AuthLayout>
  )
}
