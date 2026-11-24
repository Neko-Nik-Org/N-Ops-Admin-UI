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
 * API calls for the signed-in user's own account (`/user/self/*`): UI preferences, profile details,
 * organization quotas, email verification, username/password changes and deactivation.
 */

import { profileToCurrentUser, type CurrentUser, type RawUserProfile } from '@/types/auth'
import { apiClient } from '@/api/client'
import { ApiError } from '@/types/api'
import { toBase64 } from '@/utils/base64'
import type { JsonObject, OrgInfo } from '@/types/account'

/** `/user/self/org-info` response as sent by the API (`ss_*` fields are the Vault / secure-storage quotas). */
interface RawOrgInfo {
  organization_id: string
  organization_name: string
  organization_info: unknown
  allocated_ai_credit: number
  utilized_ai_credit: number
  allocated_storage_bytes: number
  utilized_storage_bytes: number
  user_limit: number
  current_user_count: number
  server_limit: number
  workflow_limit: number
  ss_project_limit: number
  current_ss_project_count: number
  ss_keys_limit: number
  ss_notes_limit: number
  created_at: string
}

/** True for a plain JSON object (not null and not an array). */
export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Coerces an API value to a JSON object, falling back to {} for anything else. */
const asObject = (value: unknown): JsonObject => (isJsonObject(value) ? value : {})

/** `GET /user/self/ui-info` — the user's saved UI preferences. */
/** Why getProfile refused to return a profile. */
export class InactiveAccountError extends Error {
  readonly reason: 'user' | 'organization'

  constructor(reason: 'user' | 'organization') {
    super(
      reason === 'user'
        ? 'Your account has been deactivated. Contact an admin to reactivate it.'
        : 'Your organization has been deactivated. Contact N-Ops support.',
    )
    this.name = 'InactiveAccountError'
    this.reason = reason
  }
}

/**
 * `GET /user/self/profile` — the signed-in user's identity and full access scope (permissions,
 * tags, Linux users, approval flags), read fresh from the database. The session itself keeps the
 * copy made at sign-in, so this is how the app notices a role change without signing in again.
 * Rejects with InactiveAccountError if the user or their organization has been deactivated.
 */
export const getProfile = async (): Promise<CurrentUser> => {
  const { data } = await apiClient.get<RawUserProfile | null>('/user/self/profile')
  if (!data) throw new ApiError('Your account could not be found.', 404)
  // only an explicit false signs the user out
  if (data.is_user_active === false) throw new InactiveAccountError('user')
  if (data.is_organization_active === false) throw new InactiveAccountError('organization')
  if (!Array.isArray(data.permissions) || !Array.isArray(data.tags) || typeof data.user_id !== 'number') {
    throw new Error('The API sent an unexpected profile.')
  }
  return profileToCurrentUser(data)
}

/** Fields of the signed-in user's profile that they can change themselves. */
export interface ProfileUpdate {
  displayName: string
  /** Only pass a changed address: sending one, even the current one, marks the email unverified. */
  primaryEmail?: string
}

/**
 * `PUT /user/self/profile` — renames the user and, if `primaryEmail` is given, changes their email
 * (which the API then marks unverified). The display name must be unique in the organization and
 * the email unique overall; the API reports a clash only as a generic 417 database error. The two
 * fields are saved one after the other, so a failed email change can still leave a new name saved.
 */
export const updateProfile = async ({ displayName, primaryEmail }: ProfileUpdate): Promise<void> => {
  await apiClient.put('/user/self/profile', {
    display_name: displayName,
    ...(primaryEmail !== undefined && { primary_email: primaryEmail }),
  })
}

export const getUiInfo = async (): Promise<JsonObject> => {
  const { data } = await apiClient.get<unknown>('/user/self/ui-info')
  return asObject(data)
}

/** `POST /user/self/ui-info` — replaces the whole object, so merge before sending. */
export const saveUiInfo = async (uiInfo: JsonObject): Promise<void> => {
  await apiClient.post('/user/self/ui-info', uiInfo)
}

/** `GET /user/self/details` — free-form extra profile info. */
export const getUserDetails = async (): Promise<JsonObject> => {
  const { data } = await apiClient.get<unknown>('/user/self/details')
  return asObject(data)
}

/** `POST /user/self/details` — replaces the whole object. */
export const saveUserDetails = async (details: JsonObject): Promise<void> => {
  await apiClient.post('/user/self/details', details)
}

/** `GET /user/self/org-info` — the signed-in user's organization, quotas and usage. */
export const getOrgInfo = async (): Promise<OrgInfo> => {
  const { data: o } = await apiClient.get<RawOrgInfo>('/user/self/org-info')
  return {
    organizationId: o.organization_id,
    organizationName: o.organization_name,
    organizationInfo: asObject(o.organization_info),
    createdAt: o.created_at,
    aiCredit: { used: o.utilized_ai_credit, allocated: o.allocated_ai_credit },
    storageBytes: { used: o.utilized_storage_bytes, allocated: o.allocated_storage_bytes },
    users: { current: o.current_user_count, limit: o.user_limit },
    vaultProjects: { current: o.current_ss_project_count, limit: o.ss_project_limit },
    serverLimit: o.server_limit,
    workflowLimit: o.workflow_limit,
    vaultKeysPerProjectLimit: o.ss_keys_limit,
    vaultNotesPerProjectLimit: o.ss_notes_limit,
  }
}

/**
 * Several `/user/self/*` routes take a bare JSON string as the body (`web::Json<String>`).
 * Axios would send a plain string as form data, so serialize it and set the JSON content type explicitly.
 */
const postJsonString = (url: string, value: string) =>
  apiClient.post(url, JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
/** The same, for routes that use PUT. */
const putJsonString = (url: string, value: string) =>
  apiClient.put(url, JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })

/**
 * Length of the email verification code the API generates. Its characters come from the API's
 * OTP_CHARSET setting, so they may include letters as well as digits.
 */
export const EMAIL_CODE_LENGTH = 7

/**
 * `POST /user/self/verify-email/send` — emails a new verification code to the primary email.
 * Calling it again replaces the previous code. Codes expire after 5 minutes.
 * Rejects with status 409 when the session already shows the email as verified.
 */
export const sendEmailVerification = async (): Promise<void> => {
  await apiClient.post('/user/self/verify-email/send')
}

/**
 * `POST /user/self/verify-email/validate` — checks the emailed code and marks the email verified.
 * Rejects with 400 for a wrong code (the API then discards it, so a new one must be sent),
 * 410 when it expired, and 409 when already verified.
 */
export const verifyEmailCode = async (code: string): Promise<void> => {
  await postJsonString('/user/self/verify-email/validate', code)
}

/**
 * `GET /user/self/user-name/check/:username` — true when nobody has the username yet.
 * The API answers 200 for available and 409 for taken; both are normal answers here, not errors.
 */
export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  const { status } = await apiClient.get(`/user/self/user-name/check/${encodeURIComponent(username)}`, {
    validateStatus: (code) => code === 200 || code === 409,
  })
  return status === 200
}

/** `POST /user/self/change-username` — renames the signed-in user. The API re-checks policy and availability. */
export const changeUsername = async (username: string): Promise<void> => {
  await postJsonString('/user/self/change-username', username)
}

/** `POST /user/self/change-password` — sets a new password (sent base64-encoded, like at sign-in). */
export const changePassword = async (newPassword: string): Promise<void> => {
  await postJsonString('/user/self/change-password', toBase64(newPassword))
}

/**
 * `DELETE /user/self/deactivate` — deactivates the signed-in user's account and ends this session.
 * Only an admin can reactivate it.
 */
export const deactivateAccount = async (): Promise<void> => {
  await apiClient.delete('/user/self/deactivate')
}

/**
 * `GET /user/self/anti-phishing-secret` — the user's anti-phishing secret: a word N-Ops puts in every
 * email it sends them, so they can tell a real N-Ops email from a fake one. Set when the account is
 * created; the API stores it encrypted.
 */
export const getAntiPhishingSecret = async (): Promise<string> => {
  const { data } = await apiClient.get<unknown>('/user/self/anti-phishing-secret')
  return typeof data === 'string' ? data : ''
}

/**
 * `PUT /user/self/anti-phishing-secret` — replaces it (bare JSON string). The API takes 4–16 letters,
 * digits, `-` and `_`, and answers 400 with a plain-text reason otherwise.
 */
export const updateAntiPhishingSecret = async (secret: string): Promise<void> => {
  await putJsonString('/user/self/anti-phishing-secret', secret)
}
