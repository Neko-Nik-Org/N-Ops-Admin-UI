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
/** The second factors an access policy requires, as badges. Used by the access policy and users pages. */

import { Badge } from '@/components/Badge'
import { type AccessPolicy } from '@/types/accessPolicy'

/** Badges for the second factors a policy requires; null when it requires none. */
export const TwoFactorBadges = ({ policy }: { policy: AccessPolicy }) =>
  policy.enforceTotp2fa || policy.enforceEmail2fa ? (
    <>
      {policy.enforceTotp2fa && <Badge tone="signal">Authenticator app</Badge>}
      {policy.enforceEmail2fa && <Badge tone="signal">Email code</Badge>}
    </>
  ) : null
