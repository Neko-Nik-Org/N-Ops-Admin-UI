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
 * Keeps the signed-in user's profile across page reloads.
 *
 * The profile arrives with the sign-in response (`/auth/verify` answers 204 with no body), so
 * without this a reload would forget the username, email and permissions until the startup screen
 * reloads them from `/user/self/profile`. It holds nothing secret
 * (no token); permission data in it only hides UI, and the API enforces every permission itself.
 * It is removed together with the session token (see clearSessionToken).
 */

import type { CurrentUser } from '../types'

const PROFILE_KEY = 'nops_profile'

/** True when `value` has every CurrentUser field with the right type (guards against old or edited data). */
const isCurrentUser = (value: unknown): value is CurrentUser => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.userId === 'number' &&
    typeof v.organizationId === 'string' &&
    Array.isArray(v.permissions) &&
    v.permissions.every((p) => typeof p === 'string') &&
    Array.isArray(v.tags) &&
    v.tags.every((t) => typeof t === 'number') &&
    typeof v.userName === 'string' &&
    typeof v.displayName === 'string' &&
    typeof v.organizationName === 'string' &&
    typeof v.primaryEmail === 'string' &&
    typeof v.isEmailVerified === 'boolean' &&
    // optional, filled in once the full profile has loaded
    (v.allowedLinuxUsers === undefined ||
      (Array.isArray(v.allowedLinuxUsers) && v.allowedLinuxUsers.every((u) => typeof u === 'string'))) &&
    (v.canApproveApprovals === undefined || typeof v.canApproveApprovals === 'boolean') &&
    (v.canBypassApprovals === undefined || typeof v.canBypassApprovals === 'boolean')
  )
}

/** The saved profile, or null when there is none (or storage is unavailable or holds bad data). */
export const loadStoredProfile = (): CurrentUser | null => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return isCurrentUser(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Saves the profile, or removes it when `user` is null. Storage failures are ignored. */
export const storeProfile = (user: CurrentUser | null): void => {
  try {
    if (user) localStorage.setItem(PROFILE_KEY, JSON.stringify(user))
    else localStorage.removeItem(PROFILE_KEY)
  } catch {
    // Private mode or blocked storage: the profile simply won't survive a reload.
  }
}
