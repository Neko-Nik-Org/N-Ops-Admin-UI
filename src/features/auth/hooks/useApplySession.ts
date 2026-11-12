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
