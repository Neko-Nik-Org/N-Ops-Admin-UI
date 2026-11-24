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
 * included: the API checks `user:edit`, not `user:delete`). A user's sign-in rules come from the
 * access policy they're given, not from fields on the user.
 */

import { apiClient } from '@/lib/axios'
import { ApiError, errorCode } from '@/types/api'
import { toBase64 } from '@/utils/base64'
import type { AdminUser, AdminUserInput, AdminUserProfileInput } from '../types'

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
  access_restriction_policy_id: number | null
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
  accessPolicyId: u.access_restriction_policy_id ?? null,
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
      user_details: input.userDetails ?? {},
      is_active: input.isActive,
      role_id: input.roleId,
      password: toBase64(input.password),
      access_restriction_policy_id: input.accessPolicyId,
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
    // the role or policy isn't in this organization (deleted since the list loaded)
    if (error instanceof ApiError && /^Failed to create user|does not belong to the organization/.test(error.message))
      throw new ApiError('That role or access policy no longer exists. Refresh and pick another one.', error.status, code)
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

/**
 * `PUT /user/admin/update/{id}` — sets the user's display name and profile details (the whole
 * object), and their email when `previousEmail` differs. A new email is marked unverified.
 */
export const updateUserProfile = async (userId: number, input: AdminUserProfileInput, previousEmail: string): Promise<void> => {
  const email = input.primaryEmail.trim()
  try {
    await apiClient.put(`/user/admin/update/${userId}`, {
      display_name: input.displayName.trim(),
      primary_email: email && email !== previousEmail ? email : null,
      user_details: input.userDetails,
    })
  } catch (error) {
    // a taken email comes back as a bare database error
    if (errorCode(error) === 'E112')
      throw new ApiError('Someone else already uses that email. (E112)', (error as ApiError).status, 'E112')
    throw error
  }
}

/**
 * `PUT /user/admin/role/{id}/assign/{roleId}` — gives the user another role. Needs `user:view` +
 * `user:edit` + `user:role:view`, and can't be used on yourself. The API answers 204 even when the
 * role isn't in the organization, so callers should check the user afterwards.
 */
export const assignUserRole = async (userId: number, roleId: number): Promise<void> => {
  await apiClient.put(`/user/admin/role/${userId}/assign/${roleId}`)
}

/**
 * `PUT /user/admin/ar-policy/{id}/assign?access_restriction_policy_id=` — gives the user an access
 * policy (`null` for none). Needs `user:view` + `user:edit` + `policy:ar:view`, and can't be used on
 * yourself. Like the role endpoint it answers 204 whether or not anything changed.
 */
export const assignUserAccessPolicy = async (userId: number, policyId: number | null): Promise<void> => {
  await apiClient.put(`/user/admin/ar-policy/${userId}/assign`, null, {
    params: policyId === null ? {} : { access_restriction_policy_id: policyId },
  })
}

/**
 * Changes the user's role and/or access policy (only what differs from `user`), then reads the user
 * back: the API answers 204 even when it changed nothing, so that's the only way to know it worked.
 */
export const updateUserAccess = async (
  user: AdminUser,
  { roleId, accessPolicyId }: { roleId: number; accessPolicyId: number | null },
): Promise<AdminUser> => {
  if (roleId !== user.roleId) await assignUserRole(user.userId, roleId)
  if (accessPolicyId !== user.accessPolicyId) await assignUserAccessPolicy(user.userId, accessPolicyId)
  const saved = await getUser(user.userId)
  if (saved.roleId !== roleId) throw new Error("The role didn't change. It may have been deleted. Refresh and try again.")
  if (saved.accessPolicyId !== accessPolicyId)
    throw new Error(
      accessPolicyId === null
        ? "The API didn't remove the access policy. Removing a policy from a user doesn't work on this server yet; pick another policy instead."
        : "The access policy didn't change. It may have been deleted. Refresh and try again.",
    )
  return saved
}
