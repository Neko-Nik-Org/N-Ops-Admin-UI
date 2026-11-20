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

/** Main navigation sidebar with the section links. */

import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useAtom } from 'jotai'
import { sidebarCollapsedAtom } from '@/app/sidebar'
import { NLogo } from '@/components/atoms/NLogo'
import { Logo } from '@/components/atoms/Logo'
import { NavGroup } from '@/components/molecules/NavGroup'
import { NavItem } from '@/components/molecules/NavItem'
import { APP_SECTIONS, ROUTES } from '@/constants/routes'
import { useOverview } from '@/features/dashboard/hooks/useOverview'
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
 * Section links.
 * Used as a fixed rail on desktop (collapsible to icons, remembered per browser) and inside the
 * slide-over drawer on mobile (always expanded).
 */
export const Sidebar = ({ variant = 'desktop', onNavigate, onClose }: SidebarProps) => {
  const [collapsedPref, setCollapsed] = useAtom(sidebarCollapsedAtom)
  const collapsed = variant === 'desktop' && collapsedPref
  // Shares the Overview page's cached query — no extra request, just the counts once they land.
  const { data: overview } = useOverview()
  /** Live counts shown next to some links: a number is a muted count, a string an accented badge. */
  const badges: Partial<Record<string, number | string>> = {
    [ROUTES.servers]: overview?.serversTotal,
    [ROUTES.approvals]: overview?.pendingApprovalsCount ? String(overview.pendingApprovalsCount) : undefined,
  }

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        'shrink-0 flex-col gap-6 bg-surface py-4 transition-[width] duration-200',
        collapsed ? 'w-16 px-2' : 'w-60 px-4',
        // Header stays put; only the <nav> below it scrolls
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
    </aside>
  )
}
