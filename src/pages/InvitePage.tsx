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

import { CircleAlert } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AuthCard, AuthShell } from '@/components/auth/AuthShell'
import { NSpinner } from '@/components/loading'
import { InviteForm } from '@/components/organisms/InviteForm'
import { useInviteDetails } from '@/features/invite/hooks/useInviteDetails'
import { ROUTES } from '@/constants/routes'

/** Shown when the invite link is invalid, expired or not supported by the server. */
const InviteUnavailable = () => (
  <AuthCard
    title="This invite isn't available"
    subtitle="The link may be invalid or expired, or invites aren't supported on this server yet. Ask whoever invited you to send a new link."
    icon={<CircleAlert size={26} />}
  >
    <Link to={ROUTES.login} replace className="n-btn n-btn--secondary n-btn--lg n-auth-submit n-auth-cta">
      Back to sign in
    </Link>
  </AuthCard>
)

/** Card shown while the invite is being looked up. */
const InviteLoading = () => (
  <AuthCard title="Opening your invite">
    <p className="n-auth-loading" role="status">
      <NSpinner size="1.6em" />
      Loading your invite
    </p>
  </AuthCard>
)

/** Loads the invite from the URL token, then shows the create-account form or an error. */
export const InvitePage = () => {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, isError } = useInviteDetails(token ?? '')

  if (!token) return <Navigate to={ROUTES.login} replace />

  return (
    <AuthShell org={data ? { name: data.organizationName } : undefined}>
      {isLoading ? <InviteLoading /> : isError || !data ? <InviteUnavailable /> : <InviteForm token={token} details={data} />}
    </AuthShell>
  )
}
