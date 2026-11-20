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
 * Users in the organization (`/user/admin/*`). Everything here needs `user:view`; creating also needs
 * `user:create` + `user:role:view`, and every change to an existing user needs `user:edit` (deleting
 * included: the API checks `user:edit`, not `user:delete`). There is no endpoint yet for editing a
 * user's name, email, role or sign-in restrictions (`users::update_user` is still commented out).
 */

import { apiClient } from '@/lib/axios'
import { ApiError, errorCode } from '@/types/api'
import { toBase64 } from '@/utils/base64'
import type { AdminUser, AdminUserInput } from '../types'

/** A user as `/user/admin/list` and `/user/admin/fetch/{id}` return it (`UserProfileListing`). */
export interface RawAdminUser {
  user_id: number
  user_name: string
  display_name: string
  user_details: Record<string, unknown> | null
  primary_email: string
  is_email_verified: boolean
  is_active: boolean
  role_id: number
  has_ip_restriction: boolean
  has_geo_restriction: boolean
  allowed_ips: string[] | null
  allowed_geo_locations: string[] | null
  has_totp_2fa: boolean
  has_email_2fa: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export const toAdminUser = (u: RawAdminUser): AdminUser => ({
  userId: u.user_id,
  userName: u.user_name,
  displayName: u.display_name,
  primaryEmail: u.primary_email,
  roleId: u.role_id,
  isActive: u.is_active,
  isEmailVerified: u.is_email_verified,
  hasTotp2fa: u.has_totp_2fa,
  hasEmail2fa: u.has_email_2fa,
  hasIpRestriction: u.has_ip_restriction,
  allowedIps: u.allowed_ips ?? [],
  hasGeoRestriction: u.has_geo_restriction,
  allowedGeoLocations: u.allowed_geo_locations ?? [],
  userDetails: u.user_details ?? {},
  createdAt: u.created_at,
  updatedAt: u.updated_at,
  lastLoginAt: u.last_login_at,
})

/** Users fetched per request when listing them all. */
export const USER_PAGE_SIZE = 100

/** `GET /user/admin/list` — one page, by username A–Z; `search` matches part of the username. Needs `user:view`. */
export const listUsersPage = async ({
  search,
  limit = USER_PAGE_SIZE,
  offset = 0,
}: { search?: string; limit?: number; offset?: number } = {}): Promise<AdminUser[]> => {
  const params: Record<string, string | number> = { limit, offset }
  if (search?.trim()) params.user_name = search.trim()
  const { data } = await apiClient.get<RawAdminUser[]>('/user/admin/list', { params })
  return data.map(toAdminUser)
}

/** Every user in the organization (pages through the list). */
export const listUsers = async (): Promise<AdminUser[]> => {
  const users: AdminUser[] = []
  for (;;) {
    const page = await listUsersPage({ offset: users.length })
    users.push(...page)
    if (page.length < USER_PAGE_SIZE) return users
  }
}

/** `GET /user/admin/fetch/{id}` — needs `user:view`. The API answers `null` (200) when there is no such user. */
export const getUser = async (userId: number): Promise<AdminUser> => {
  const { data } = await apiClient.get<RawAdminUser | null>(`/user/admin/fetch/${userId}`)
  if (!data) throw new Error('That user no longer exists. Refresh and try again.')
  return toAdminUser(data)
}

/** Error codes the API returns when the welcome email fails, which happens after the user was saved. */
const EMAIL_ERRORS = new Set(['E122', 'E131', 'E132'])

/**
 * `POST /user/admin/create`. The API saves the user, then sends a welcome email; if only the email
 * fails it still answers with an error, so that case resolves with `welcomeEmailSent: false`.
 */
export const createUser = async (input: AdminUserInput): Promise<{ welcomeEmailSent: boolean }> => {
  try {
    await apiClient.post('/user/admin/create', {
      user_name: input.userName,
      display_name: input.displayName,
      primary_email: input.primaryEmail,
      user_details: {},
      is_active: input.isActive,
      role_id: input.roleId,
      password: toBase64(input.password),
      has_ip_restriction: input.hasIpRestriction,
      has_geo_restriction: input.hasGeoRestriction,
      allowed_ips: input.hasIpRestriction ? input.allowedIps : [],
      allowed_geo_locations: input.hasGeoRestriction ? input.allowedGeoLocations : [],
    })
    return { welcomeEmailSent: true }
  } catch (error) {
    const code = errorCode(error)
    if (code && EMAIL_ERRORS.has(code)) return { welcomeEmailSent: false }
    // a taken username or email and a full plan all come back as a bare database error
    if (code === 'E112')
      throw new ApiError(
        "Couldn't add the user. The username or email may already be in use, or your plan's user limit is reached. (E112)",
        (error as ApiError).status,
        code,
      )
    // the role isn't in this organization (deleted since the list loaded)
    if (error instanceof ApiError && error.message.startsWith('Failed to create user'))
      throw new ApiError('That role no longer exists. Refresh and pick another one.', error.status, code)
    throw error
  }
}

/** JSON-encoded string body, as the API's `web::Json<String>` endpoints expect. */
const jsonString = (value: string) => [JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }] as const

/** `PUT /user/admin/change-username/{id}`. The API applies the same username rules as sign-up. */
export const changeUserName = async (userId: number, userName: string): Promise<void> => {
  await apiClient.put(`/user/admin/change-username/${userId}`, ...jsonString(userName))
}

/** `PUT /user/admin/reset/password/{id}` — sets a new password for the user (sent base64-encoded). */
export const resetUserPassword = async (userId: number, password: string): Promise<void> => {
  await apiClient.put(`/user/admin/reset/password/${userId}`, ...jsonString(toBase64(password)))
}

/** `PATCH /user/admin/verify-email/{id}` — marks the user's email as verified without a code. */
export const verifyUserEmail = async (userId: number): Promise<void> => {
  await apiClient.patch(`/user/admin/verify-email/${userId}`)
}

/** `PATCH /user/admin/deactivate/{id}` — the user can no longer sign in. The API has no way to reactivate yet. */
export const deactivateUser = async (userId: number): Promise<void> => {
  await apiClient.patch(`/user/admin/deactivate/${userId}`)
}

/**
 * `DELETE /user/admin/delete/{id}` — permanently deletes the user and their data (their notes too).
 * A user who is already gone answers 226, which counts as done.
 */
export const deleteUser = async (userId: number): Promise<void> => {
  await apiClient.delete(`/user/admin/delete/${userId}`)
}
