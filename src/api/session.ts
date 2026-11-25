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

/** Session lifecycle API calls: verify, session info, sign out and refresh. */

import { apiClient } from '@/api/client'
import { toCurrentUser, type CurrentUser, type RawSessionProfile, type SessionInfo } from '@/types/auth'

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

/** `GET /auth/session` response. */
interface RawSessionInfo {
  allow_refresh: boolean
  allow_device_logins: boolean
  allowed_linux_users: string[]
  permissions: string[]
  tags: number[]
  can_approve_approvals: boolean
  can_bypass_approvals: boolean
}

/**
 * `GET /auth/session` — what this session may do, as copied at sign-in (so a policy change shows only
 * after signing in again, unlike `/user/self/profile`, which is read fresh).
 */
export const getSessionInfo = async (): Promise<SessionInfo> => {
  const { data } = await apiClient.get<RawSessionInfo>('/auth/session')
  return {
    allowRefresh: data.allow_refresh === true,
    // only an explicit false forbids it, like the API's own default
    allowDeviceLogins: data.allow_device_logins !== false,
    allowedLinuxUsers: Array.isArray(data.allowed_linux_users) ? data.allowed_linux_users : [],
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    canApproveApprovals: data.can_approve_approvals === true,
    canBypassApprovals: data.can_bypass_approvals === true,
  }
}
