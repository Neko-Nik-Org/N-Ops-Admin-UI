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

/** Signed-in user's dropdown in the Topbar: who you are, links to the account pages (Profile, Security, Organization) and sign out. */

import { useAtomValue } from 'jotai'
import { Building2, LogOut, ShieldCheck, UserCircle, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DropdownMenu, menuItemClass } from '@/components/DropdownMenu'
import { ROUTES } from '@/constants/routes'
import { useLogout } from '@/hooks/useLogout'
import { currentUserAtom } from '@/store/session'

/** The account pages, in menu order. */
const ACCOUNT_LINKS: ReadonlyArray<[string, string, LucideIcon]> = [
  [ROUTES.accountProfile, 'Profile', UserCircle],
  [ROUTES.accountSecurity, 'Security', ShieldCheck],
  [ROUTES.accountOrganization, 'Organization', Building2],
]

/** A user icon (the name is only in its accessible label and the menu) opening a menu with the account pages and Sign out (which asks for confirmation first). */
export const ProfileMenu = () => {
  const currentUser = useAtomValue(currentUserAtom)
  const [, logout] = useLogout()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const name = currentUser?.displayName ?? 'Account'

  /** Signs out (after the confirm dialog), then returns to the login page. */
  const signOut = () => logout().then(() => navigate(ROUTES.login, { replace: true }))

  return (
    <>
      <DropdownMenu
        label={`Profile: ${name}`}
        menuLabel="Profile"
        widthClassName="w-56"
        flush
        triggerClassName="gap-2 border-transparent bg-transparent text-sm"
        trigger={
          <>
            <UserCircle size={18} className="shrink-0" />
          </>
        }
      >
        {currentUser && (
          <div className="mb-1 border-b border-border px-3 pt-1 pb-2">
            <p className="truncate text-sm font-medium text-text">{currentUser.displayName}</p>
            <p className="truncate text-xs text-text-muted">
              @{currentUser.userName} · {currentUser.organizationName}
            </p>
          </div>
        )}
        {ACCOUNT_LINKS.map(([to, label, Icon]) => (
          <Link key={to} to={to} role="menuitem" className={menuItemClass}>
            <Icon size={14} />
            {label}
          </Link>
        ))}
        <div className="my-1 border-t border-border" role="separator" />
        <button type="button" role="menuitem" onClick={() => setConfirmOpen(true)} className={menuItemClass}>
          <LogOut size={14} />
          Sign out
        </button>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out?"
        confirmLabel="Sign out"
        successMessage="Signed out."
        onConfirm={signOut}
        onClose={() => setConfirmOpen(false)}
      >
        You'll need to sign in again to get back to N-Ops.
      </ConfirmDialog>
    </>
  )
}
