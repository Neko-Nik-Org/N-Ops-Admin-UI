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

/** Main navigation sidebar with section links and the signed-in profile section (theme, account, sign out). */

import { ChevronsUpDown, LogOut, UserCircle } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { Link, useNavigate } from 'react-router-dom'
import { LoadingButton } from '@/components/loading'
import { Logo } from '@/components/atoms/Logo'
import { NavItem } from '@/components/molecules/NavItem'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'
import { APP_SECTIONS, ROUTES } from '@/constants/routes'
import { currentUserAtom } from '@/features/auth/store/session'
import { useOverview } from '@/features/dashboard/hooks/useOverview'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { cn } from '@/utils/cn'

interface SidebarProps {
  /** Renders as a fixed overlay drawer (mobile nav) instead of the permanent desktop rail. */
  variant?: 'desktop' | 'mobile'
  /** Called after a link is clicked, so the mobile drawer can close itself. */
  onNavigate?: () => void
}

/**
 * Section links, organization name and the sign-out control.
 * Used as a fixed rail on desktop and inside the slide-over drawer on mobile.
 */
export const Sidebar = ({ variant = 'desktop', onNavigate }: SidebarProps) => {
  const currentUser = useAtomValue(currentUserAtom)
  const orgName = currentUser?.organizationName ?? 'Your organization'
  // Shares the Overview page's cached query — no extra request, just the counts once they land.
  const { data: overview } = useOverview()
  /** Live counts shown next to some links: a number is a muted count, a string an accented badge. */
  const badges: Partial<Record<string, number | string>> = {
    [ROUTES.servers]: overview?.serversTotal,
    [ROUTES.approvals]: overview?.pendingApprovalsCount ? String(overview.pendingApprovalsCount) : undefined,
  }
  const [logoutState, logout] = useLogout()
  const navigate = useNavigate()

  /** Signs out, then returns to the login page once the button has shown success. */
  const handleLogout = () => {
    logout().then(() => navigate(ROUTES.login, { replace: true }))
  }

  return (
    <aside
      className={cn(
        'w-60 shrink-0 flex-col gap-6 bg-surface p-4',
        variant === 'desktop' ? 'hidden border-r border-border lg:flex' : 'flex h-full',
      )}
      onClick={onNavigate}
    >
      <Logo iconSize={26} className="px-1" />

      <button
        type="button"
        className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-left hover:border-border-strong"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-secondary/20 text-sm font-semibold text-accent-secondary">
          {orgName.charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 overflow-hidden">
          <span className="block truncate text-sm font-semibold text-text">{orgName}</span>
          <span className="block text-xs text-text-muted">Self-hosted</span>
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-text-muted" />
      </button>

      <nav className="flex flex-1 flex-col gap-0.5">
        {APP_SECTIONS.map(({ path, title, icon }) => (
          <NavItem key={path} to={path} end={path === ROUTES.overview} icon={icon} label={title} badge={badges[path]} />
        ))}
      </nav>

      <div className="flex flex-col gap-3 border-t border-border px-1 pt-4">
        {/* stopPropagation: picking a theme shouldn't close the mobile drawer (the <aside> closes it on click) */}
        <div className="flex items-center justify-between gap-2 text-sm text-text-muted" onClick={(e) => e.stopPropagation()}>
          <span>Theme</span>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={ROUTES.account}
            className="flex flex-1 items-center gap-2 truncate text-sm text-text-muted hover:text-text"
            title="Account"
          >
            <UserCircle size={16} className="shrink-0" />
            <span className="truncate">{currentUser?.displayName ?? 'Account'}</span>
          </Link>
          <LoadingButton
            variant="ghost"
            size="sm"
            state={logoutState}
            icon={<LogOut size={15} />}
            aria-label="Sign out"
            onClick={handleLogout}
          />
        </div>
      </div>
    </aside>
  )
}
