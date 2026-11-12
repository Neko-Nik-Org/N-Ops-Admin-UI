import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { verifySession } from '../api/session'
import { sessionStatusAtom } from '../store/session'
import { clearSessionToken, getSessionToken } from '../store/sessionToken'

/** Confirms a persisted session cookie is still valid with the API on app load. */
export const useSessionBootstrap = (): void => {
  const setStatus = useSetAtom(sessionStatusAtom)

  useEffect(() => {
    if (!getSessionToken()) {
      setStatus('unauthenticated')
      return
    }

    verifySession()
      .then(() => setStatus('authenticated'))
      .catch(() => {
        clearSessionToken()
        setStatus('unauthenticated')
      })
  }, [setStatus])
}
