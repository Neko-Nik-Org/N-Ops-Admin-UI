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
/** Invite page (/invite?code=…): lets an invited person create their account. */

import { CircleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthCard } from '@/components/AuthShell/AuthCard'
import { AuthShell } from '@/components/AuthShell'
import { InviteForm } from '@/pages/auth/invite/InviteForm'
import { parseInviteCode } from '@/api/invite'
import { ROUTES } from '@/constants/routes'

/** Shown when the link has no readable invitation in it. */
const InviteUnavailable = () => (
  <AuthCard
    title="This invite link isn't valid"
    subtitle="It may be incomplete. Open the link from your invitation email again, or ask whoever invited you to send a new one."
    icon={<CircleAlert size={26} />}
  >
    <Link to={ROUTES.login} replace className="n-btn n-btn--secondary n-btn--lg n-auth-submit n-auth-cta">
      Back to sign in
    </Link>
  </AuthCard>
)

/**
 * Reads the invitation from the link's `code`, then shows the create-account form. The link itself
 * can't tell whether the invitation has expired or been used; the API says so when the form is sent.
 */
export const InvitePage = () => {
  const [params] = useSearchParams()
  const code = params.get('code')
  const link = useMemo(() => parseInviteCode(code), [code])

  return (
    <AuthShell org={link?.organizationName ? { name: link.organizationName } : undefined}>
      {link ? <InviteForm link={link} /> : <InviteUnavailable />}
    </AuthShell>
  )
}
