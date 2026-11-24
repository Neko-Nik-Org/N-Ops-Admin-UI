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
import { returnToLastPageAtom } from '@/features/account/hooks/useUiInfoSync'
import { readSecurityRequirements, type SecurityRequirements } from '../securitySetup'
import { securityRequirementsAtom } from '../store/securityRequirements'
import { currentUserAtom, sessionStatusAtom } from '../store/session'
import { setSessionToken } from '../store/sessionToken'
import { toCurrentUser, type LoginSuccessResponse } from '../types'

/** Stores the session token and current user from a successful login/OTP-verify response. */
export const useApplySession = () => {
  const setCurrentUser = useSetAtom(currentUserAtom)
  const setSessionStatus = useSetAtom(sessionStatusAtom)
  const setReturnToLastPage = useSetAtom(returnToLastPageAtom)
  const setRequirements = useSetAtom(securityRequirementsAtom)

  /**
   * `requirements` overrides what the response says about the access policy: after a 2FA challenge
   * the challenge response knew which factors the user already has, the final one may not.
   */
  return (response: LoginSuccessResponse, rememberMe: boolean, requirements?: SecurityRequirements | null) => {
    setSessionToken(response.session_id, rememberMe)
    setCurrentUser(toCurrentUser(response.data))
    setRequirements(requirements !== undefined ? requirements : readSecurityRequirements({ ...response.data }))
    setReturnToLastPage(true) // back to the page they were last on, once their preferences load
    setSessionStatus('authenticated')
  }
}
