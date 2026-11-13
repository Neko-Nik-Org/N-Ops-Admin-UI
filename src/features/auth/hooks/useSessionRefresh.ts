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

/** Background refresh of "Keep me signed in" sessions so they never hit the API's 3-hour expiry. */

import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { refreshSession } from '../api/session'
import { currentUserAtom, sessionStatusAtom } from '../store/session'
import { getSessionIssuedAt, getSessionToken, isSessionRemembered, setSessionToken } from '../store/sessionToken'

/** The API keeps sessions in Redis for 3h; rotate well before that. */
const REFRESH_AFTER_MS = 2 * 60 * 60 * 1000

// Refresh invalidates the old id, so two concurrent calls (StrictMode, two mounted shells) would log the user out.
// Share one in-flight request across every caller.
let inFlight: Promise<void> | null = null

/** Calls `/auth/refresh` and stores the new session id, reusing any request already in flight. */
const runRefresh = (): Promise<void> => {
  inFlight ??= refreshSession()
    .then((sessionId) => setSessionToken(sessionId, true))
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/** Keeps a "Keep me signed in" session alive while the app is open by calling `/auth/refresh` on a timer. */
export const useSessionRefresh = (): void => {
  const status = useAtomValue(sessionStatusAtom)
  const setStatus = useSetAtom(sessionStatusAtom)
  const setCurrentUser = useSetAtom(currentUserAtom)

  useEffect(() => {
    if (status !== 'authenticated' || !isSessionRemembered()) return

    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    /** Waits until the current session id is REFRESH_AFTER_MS old, refreshes, then schedules the next one. */
    const schedule = () => {
      const dueIn = Math.max(0, getSessionIssuedAt() + REFRESH_AFTER_MS - Date.now())
      timer = setTimeout(() => {
        runRefresh()
          .then(() => {
            if (!cancelled) schedule()
          })
          .catch(() => {
            // A 401 already cleared the cookie in the axios interceptor — send the user back to sign in.
            if (!cancelled && !getSessionToken()) {
              setCurrentUser(null)
              setStatus('unauthenticated')
            }
          })
      }, dueIn)
    }

    schedule()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [status, setStatus, setCurrentUser])
}
