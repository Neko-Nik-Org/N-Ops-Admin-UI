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

/** Turns a successful sign-in response into local session state. */

import { useSetAtom } from 'jotai'
import { currentUserAtom, sessionStatusAtom } from '../store/session'
import { setSessionToken } from '../store/sessionToken'
import type { LoginSuccessResponse } from '../types'

/** Stores the session token and current user from a successful login/OTP-verify response. */
export const useApplySession = () => {
  const setCurrentUser = useSetAtom(currentUserAtom)
  const setSessionStatus = useSetAtom(sessionStatusAtom)

  return (response: LoginSuccessResponse, rememberMe: boolean) => {
    setSessionToken(response.session_id, rememberMe)
    setCurrentUser({
      userId: response.data.user_id,
      organizationId: response.data.organization_id,
      permissions: response.data.permissions,
      tags: response.data.tags,
      userName: response.data.user_name,
      displayName: response.data.display_name,
      organizationName: response.data.organization_name,
      primaryEmail: response.data.primary_email,
      isEmailVerified: response.data.is_email_verified,
    })
    setSessionStatus('authenticated')
  }
}
