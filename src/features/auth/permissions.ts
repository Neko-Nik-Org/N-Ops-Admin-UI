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

/**
 * Whether the signed-in user holds every listed permission (see N-Ops-Main-API docs/Permissions.md).
 * The user profile is only known after a fresh sign-in, not after a page reload — in that case this returns
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
