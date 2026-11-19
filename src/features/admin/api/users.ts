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
 * Users in the organization (`/user/admin/*`). Listing and fetching one user are live (both need
 * `user:view`). Creating, editing and removing users are still commented out in the API, so those
 * calls fail with a clear message until they exist.
 */

import { apiClient } from '@/lib/axios'
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

const notYet = (what: string): never => {
  throw new Error(`${what} isn't available yet: the API has no endpoint for it.`)
}

/** Not in the API yet (`users::create_user` is commented out). */
export const createUser = async (_input: AdminUserInput): Promise<AdminUser> => notYet('Adding users')

/** Not in the API yet (`users::update_user` is commented out). */
export const updateUser = async (_userId: number, _input: AdminUserInput): Promise<void> => notYet('Editing users')

/** Not in the API yet (`users::delete_user` is commented out). */
export const deleteUser = async (_userId: number): Promise<void> => notYet('Removing users')
