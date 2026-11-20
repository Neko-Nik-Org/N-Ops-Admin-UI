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
 * The super-admin key. Kept in the app's encrypted storage (lib/secureStorage: AES-GCM with a key the
 * browser won't hand out), so a reload doesn't ask for it again. It grants every organization, so
 * it's removed whenever the address isn't a super-admin page, however the user got there (a link,
 * the back button, typing a URL, a new tab: see useForgetSuperAdminKeyElsewhere), or on "Forget key".
 */

import { useSetAtom } from 'jotai'
import { atomWithStorage, RESET } from 'jotai/utils'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { secureJSONStorage } from '@/lib/secureStorage'

export const SUPER_ADMIN_KEY_STORAGE = 'nops-super-admin-key'

export const superAdminKeyAtom = atomWithStorage<string | null>(
  SUPER_ADMIN_KEY_STORAGE,
  null,
  secureJSONStorage<string | null>(),
  {
    getOnInit: true,
  },
)

/** True for `/super-admin` and the pages under it. */
export const isSuperAdminPath = (pathname: string) =>
  pathname === ROUTES.superAdmin || pathname.startsWith(`${ROUTES.superAdmin}/`)

/**
 * Removes the stored key on any address outside the super-admin pages. Mounted once at the router's
 * root, so it runs on every navigation and on every page load (a typed URL, a new tab, a reload
 * elsewhere), not only when the super-admin layout closes.
 */
export const useForgetSuperAdminKeyElsewhere = () => {
  const { pathname } = useLocation()
  const setAdminKey = useSetAtom(superAdminKeyAtom)
  useEffect(() => {
    if (!isSuperAdminPath(pathname)) setAdminKey(RESET)
  }, [pathname, setAdminKey])
}
