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

/** Restores a saved session when the app first loads. */

import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { verifySession } from '../api/session'
import { currentUserAtom, sessionStatusAtom } from '../store/session'
import { clearSessionToken, getSessionToken } from '../store/sessionToken'

/** Confirms a persisted session cookie is still valid on app load and restores the signed-in user's profile. */
export const useSessionBootstrap = (): void => {
  const setStatus = useSetAtom(sessionStatusAtom)
  const setCurrentUser = useSetAtom(currentUserAtom)

  useEffect(() => {
    /** Nothing saved: go straight to the signed-out state without calling the API. */
    if (!getSessionToken()) {
      setStatus('unauthenticated')
      return
    }

    verifySession()
      .then((user) => {
        setCurrentUser(user)
        setStatus('authenticated')
      })
      .catch(() => {
        clearSessionToken()
        setStatus('unauthenticated')
      })
  }, [setStatus, setCurrentUser])
}
