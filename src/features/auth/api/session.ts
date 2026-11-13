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

/** Session lifecycle API calls: verify, sign out and refresh. */

import { apiClient } from '@/lib/axios'
import { toCurrentUser, type CurrentUser, type RawSessionProfile } from '../types'

/**
 * `GET /auth/verify`: resolves with the signed-in user's profile when the stored session token
 * is still valid, rejects otherwise. Resolves null if an older API answers 204 with no body.
 */
export const verifySession = async (): Promise<CurrentUser | null> => {
  const { data } = await apiClient.get<{ data?: RawSessionProfile } | ''>('/auth/verify')
  return data && data.data ? toCurrentUser(data.data) : null
}

/** `DELETE /auth/logout`: ends the session on the server. */
export const logout = async (): Promise<void> => {
  await apiClient.delete('/auth/logout')
}

/**
 * `POST /auth/refresh` — rotates the session id and resets its 3h TTL.
 * Only sessions created with `remember_me: true` may refresh; the old id stops working immediately.
 */
export const refreshSession = async (): Promise<string> => {
  const { data } = await apiClient.post<{ message: string; session_id: string }>('/auth/refresh')
  return data.session_id
}
