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

/** `GET /auth/verify`: resolves when the stored session token is still valid, rejects otherwise. */
export const verifySession = async (): Promise<void> => {
  await apiClient.get('/auth/verify')
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
