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
 * Permission helpers for hiding or disabling UI the signed-in user can't use.
 * These are only hints: the API enforces every permission itself.
 */

import { useAtomValue } from 'jotai'
import { currentUserAtom } from './store/session'
import type { CurrentUser } from './types'

/**
 * Whether the signed-in user holds every listed permission (see N-Ops-Main-API docs/Permissions.md).
 * If the profile is unknown (e.g. storage was blocked, so it didn't survive a reload) this returns
 * true and the API's own 403 is the final word.
 */
export const useHasPermissions = (...permissions: string[]): boolean => {
  const user = useAtomValue(currentUserAtom)
  if (!user) return true
  return permissions.every((p) => user.permissions.includes(p))
}

/** Mirrors `SessionUser::has_tag_permission`: an empty tag list means access to every tag. */
/** Returns a checker that tells whether the signed-in user may manage a given tag. */
export const useHasTagAccess = (): ((tagId: number) => boolean) => {
  const user = useAtomValue(currentUserAtom)
  return (tagId) => !user || user.tags.length === 0 || user.tags.includes(tagId)
}

/** The parts of a role the API compares against the signed-in user. */
interface RoleScope {
  permissions: readonly string[]
  tagIds: readonly number[]
  allowedLinuxUsers?: readonly string[]
  canApproveApprovals?: boolean
  canBypassApprovals?: boolean
}

/**
 * An empty limit means "no limit". A limited user may only grant a non-empty subset of their own.
 * Mirrors the tag and Linux-user rules of `validate_role_restrictions` in the Main API.
 */
export const isWithinLimit = <T>(own: readonly T[], granted: readonly T[]): boolean =>
  own.length === 0 || (granted.length > 0 && granted.every((x) => own.includes(x)))

/**
 * Mirrors `validate_role_restrictions` in the Main API: a user may only create, edit or delete a
 * role whose permissions they all hold, whose tags and Linux users fit within their own limits,
 * and whose approval flags they have themselves. The Linux-user and approval checks need the full
 * profile (`/user/self/profile`); until it has loaded they are skipped and the API decides.
 */
export const isRoleWithinScope = (user: CurrentUser | null, role: RoleScope): boolean => {
  if (!user) return true
  if (!role.permissions.every((p) => user.permissions.includes(p))) return false
  if (!isWithinLimit(user.tags, role.tagIds)) return false
  if (user.allowedLinuxUsers && role.allowedLinuxUsers && !isWithinLimit(user.allowedLinuxUsers, role.allowedLinuxUsers)) {
    return false
  }
  if (role.canApproveApprovals && user.canApproveApprovals === false) return false
  if (role.canBypassApprovals && user.canBypassApprovals === false) return false
  return true
}
