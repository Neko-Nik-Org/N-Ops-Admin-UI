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
/** Whether an organization name is free, for the create and edit forms. */

import { useCheckOrganizationName } from '@/hooks/useOrganizations'

/** Resolves false when the API says the name is taken (the check is exact, as is the database). */
export const useOrganizationNameFree = () => {
  const isAvailable = useCheckOrganizationName()
  return async (name: string): Promise<boolean> => {
    try {
      return await isAvailable(name)
    } catch {
      return true // only a courtesy check; the API still refuses a taken name
    }
  }
}
