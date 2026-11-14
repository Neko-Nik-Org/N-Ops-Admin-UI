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

import { LogOut, PanelLeftClose, PanelLeftOpen, UserCircle, X } from 'lucide-react'
import { useAtom, useAtomValue } from 'jotai'
import { Link, useNavigate } from 'react-router-dom'
import { sidebarCollapsedAtom } from '@/app/sidebar'
import { LoadingButton, NLogo } from '@/components/loading'
import { Logo } from '@/components/atoms/Logo'
import { NavGroup } from '@/components/molecules/NavGroup'
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
  /** Mobile drawer only: shows a close button in the header. */
  onClose?: () => void
}

/**
 * Section links and the sign-out control.
 * Used as a fixed rail on desktop (collapsible to icons, remembered per browser) and inside the
 * slide-over drawer on mobile (always expanded).
 */
export const Sidebar = ({ variant = 'desktop', onNavigate, onClose }: SidebarProps) => {
  const currentUser = useAtomValue(currentUserAtom)
  const [collapsedPref, setCollapsed] = useAtom(sidebarCollapsedAtom)
  const collapsed = variant === 'desktop' && collapsedPref
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
      aria-label="Main navigation"
      className={cn(
        'shrink-0 flex-col gap-6 bg-surface py-4 transition-[width] duration-200',
        collapsed ? 'w-16 px-2' : 'w-60 px-4',
        // Header and footer stay put; only the <nav> between them scrolls
        variant === 'desktop' ? 'sticky top-0 hidden h-screen border-r border-border lg:flex' : 'flex h-full',
      )}
      // Close the mobile drawer once a link is followed (not when a group is toggled)
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) onNavigate?.()
      }}
    >
      <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'justify-between')}>
        {collapsed ? <NLogo size={26} /> : <Logo iconSize={26} className="px-1" />}
        {variant === 'desktop' && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text"
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        )}
        {variant === 'mobile' && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="-mx-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-2 [scrollbar-width:thin]">
        {APP_SECTIONS.map(({ path, title, icon, children }) =>
          children ? (
            <NavGroup
              key={path}
              label={title}
              icon={icon}
              items={children}
              collapsed={collapsed}
              onExpandRail={() => setCollapsed(false)}
            />
          ) : (
            <NavItem
              key={path}
              to={path}
              end={path === ROUTES.overview}
              icon={icon}
              label={title}
              badge={badges[path]}
              collapsed={collapsed}
            />
          ),
        )}
      </nav>

      <div className={cn('flex shrink-0 flex-col gap-3 border-t border-border pt-4', collapsed ? 'items-center' : 'px-1')}>
        {!collapsed && (
          <div className="flex items-center justify-between gap-2 text-sm text-text-muted">
            <span>Theme</span>
            <ThemeToggle />
          </div>
        )}

        <div className={cn('flex items-center gap-2.5', collapsed && 'flex-col')}>
          <Link
            to={ROUTES.account}
            className="flex flex-1 items-center gap-2 truncate text-sm text-text-muted hover:text-text"
            title="Account"
            aria-label={collapsed ? 'Account' : undefined}
          >
            <UserCircle size={16} className="shrink-0" />
            {!collapsed && <span className="truncate">{currentUser?.displayName ?? 'Account'}</span>}
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
