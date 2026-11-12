import { useSetAtom } from 'jotai'
import { useAsyncAction } from '@/components/loading'
import { logout } from '../api/session'
import { currentUserAtom, sessionStatusAtom } from '../store/session'
import { clearSessionToken } from '../store/sessionToken'

/** Drives the sign-out LoadingButton: idle → loading → success. Caller navigates once `state` is 'success'. */
export const useLogout = () => {
  const setCurrentUser = useSetAtom(currentUserAtom)
  const setSessionStatus = useSetAtom(sessionStatusAtom)

  return useAsyncAction(
    async () => {
      try {
        await logout()
      } catch {
        // The local session is cleared below regardless of whether the API call succeeded.
      } finally {
        clearSessionToken()
        setCurrentUser(null)
        setSessionStatus('unauthenticated')
      }
    },
    { successMs: 500 },
  )
}
