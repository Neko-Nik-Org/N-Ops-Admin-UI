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

/**
 * Keeps the API's cached session in step with self-service account changes.
 *
 * The API stores a copy of the user's profile with the session (in Redis) and only rebuilds it on
 * `/auth/refresh`. That endpoint only works for sessions created with "Keep me signed in", so:
 * - remembered sessions are refreshed right away, and the server copy is current again;
 * - other sessions only get the local profile updated; the server copy catches up at next sign-in.
 */

import { useSetAtom } from 'jotai'
import { useCallback } from 'react'
import { refreshSessionNow } from '@/features/auth/hooks/useSessionRefresh'
import { currentUserAtom, sessionStatusAtom } from '@/features/auth/store/session'
import { clearSessionToken, getSessionToken, isSessionRemembered } from '@/features/auth/store/sessionToken'
import type { CurrentUser } from '@/features/auth/types'

/**
 * What happened to the session:
 * - 'refreshed': the API rebuilt the session from the database.
 * - 'local-only': not a remembered session, so only the in-app profile changed.
 * - 'refresh-failed': the refresh was rejected but the session still works.
 * - 'signed-out': the refresh was rejected and the session is gone; the user must sign in again.
 */
export type SessionSyncResult = 'refreshed' | 'local-only' | 'refresh-failed' | 'signed-out'

/** Returns `sync(patch)`: applies `patch` to the signed-in user, then refreshes the session if allowed. */
export const useSyncSelfSession = () => {
  const setCurrentUser = useSetAtom(currentUserAtom)
  const setStatus = useSetAtom(sessionStatusAtom)

  /** Signs out locally; the route guards then send the user to the sign-in page. */
  const signOut = useCallback(() => {
    clearSessionToken()
    setCurrentUser(null)
    setStatus('unauthenticated')
  }, [setCurrentUser, setStatus])

  const sync = useCallback(
    async (patch: Partial<CurrentUser>): Promise<SessionSyncResult> => {
      setCurrentUser((user) => (user ? { ...user, ...patch } : user))
      if (!isSessionRemembered()) return 'local-only'
      try {
        await refreshSessionNow()
        return 'refreshed'
      } catch {
        // A 401 already removed the token in the axios interceptor.
        return getSessionToken() ? 'refresh-failed' : 'signed-out'
      }
    },
    [setCurrentUser],
  )

  return { sync, signOut }
}
