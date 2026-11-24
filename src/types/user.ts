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
/** Types for the organization's users (`/user/admin/*`). */

/** A person in the organization (`app_user`). */
export interface AdminUser {
  userId: number
  userName: string
  displayName: string
  primaryEmail: string
  roleId: number
  isActive: boolean
  isEmailVerified: boolean
  hasTotp2fa: boolean
  hasEmail2fa: boolean
  /** The access policy whose 2FA and sign-in limits apply to them; null for none. */
  accessPolicyId: number | null
  /** Free-form JSON the API keeps with the user. */
  userDetails: Record<string, unknown>
  createdAt: string
  updatedAt: string
  /** The API sets this to the creation time until the first sign-in. */
  lastLoginAt: string | null
}

/** Fields set when creating or editing a user. */
export interface AdminUserInput {
  userName: string
  displayName: string
  primaryEmail: string
  roleId: number
  /** Sent base64-encoded, like at sign-in. */
  password: string
  isActive: boolean
  accessPolicyId: number | null
  /** Profile details (work, contact, availability…) in the structure of utils/profileDetails. */
  userDetails?: Record<string, unknown>
}

/** What an admin can change on someone's profile (`PUT /user/admin/update/{id}`). */
export interface AdminUserProfileInput {
  displayName: string
  /** Only sent when it changed, because the API marks any email it's sent as unverified. */
  primaryEmail: string
  /** Replaces the whole object. */
  userDetails: Record<string, unknown>
}
