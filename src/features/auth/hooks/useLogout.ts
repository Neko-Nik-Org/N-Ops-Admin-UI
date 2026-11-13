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

/** Sign-out hook used by the sidebar account row. */

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
