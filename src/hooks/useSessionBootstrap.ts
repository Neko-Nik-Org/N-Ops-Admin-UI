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

import { useQueryClient } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { verifySession } from '@/api/session'
import { SAVED_STARTUP_QUERIES } from '@/hooks/useAppBootstrap'
import { currentUserAtom, sessionStatusAtom } from '@/store/session'
import { loadStoredProfile } from '@/store/profileStorage'
import { clearSessionToken, getSessionToken } from '@/store/sessionToken'

/**
 * Confirms a persisted session cookie is still valid on app load and restores the signed-in user's profile.
 *
 * When the user's startup data was restored from the saved copy (utils/queryPersistence), the session
 * counts as signed in straight away so the app opens without the loading screen; `/auth/verify` still
 * runs, and if it refuses the session the user is signed out as usual.
 */
export const useSessionBootstrap = (): void => {
  const setStatus = useSetAtom(sessionStatusAtom)
  const setCurrentUser = useSetAtom(currentUserAtom)
  const queryClient = useQueryClient()

  useEffect(() => {
    /** Nothing saved: go straight to the signed-out state without calling the API. */
    if (!getSessionToken()) {
      clearSessionToken() // drops a profile left behind when a browser-session cookie expired
      setStatus('unauthenticated')
      return
    }

    const stored = loadStoredProfile()
    const warm = !!stored && SAVED_STARTUP_QUERIES.every((key) => queryClient.getQueryData(key) !== undefined)
    if (warm) {
      setCurrentUser(stored)
      setStatus('authenticated')
    }

    verifySession()
      .then((user) => {
        // The API's /auth/verify has no body today, so fall back to the profile saved at sign-in.
        if (warm) {
          if (user) setCurrentUser(user)
          return
        }
        setCurrentUser(user ?? loadStoredProfile())
        setStatus('authenticated')
      })
      .catch(() => {
        clearSessionToken()
        setCurrentUser(null)
        setStatus('unauthenticated')
      })
  }, [setStatus, setCurrentUser, queryClient])
}
