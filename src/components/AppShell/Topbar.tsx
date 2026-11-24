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

/** Top bar of the dashboard: tag selector, theme, notifications and the profile menu (breadcrumb and global search are commented out for now). */

import { useAtom } from 'jotai'
import { Bell, Menu, PanelLeftOpen } from 'lucide-react' // add Search back with the global search
// import { useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ProfileMenu } from '@/components/AppShell/ProfileMenu'
import { TagSelect } from '@/components/AppShell/TagSelect'
import { ThemeMenu } from '@/components/ThemeMenu'
// import { pageTrail } from '@/constants/routes'
import { sidebarCollapsedAtom } from '@/store/sidebar'
import { cn } from '@/utils/cn'

/** Sticky header above every authenticated page. `onMenuClick` opens the mobile nav drawer. */
export const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom)
  // Breadcrumb trail, hidden for now:
  // const { pathname } = useLocation()
  // const found = pageTrail(pathname)
  // const trail = found.length ? found : ['N-Ops']

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-surface px-4 py-3.5 sm:gap-4 sm:px-6">
      {/* Left and right groups are both flex-1, so they split the free space equally and the search sits dead center */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button type="button" aria-label="Open menu" onClick={onMenuClick} className="text-text-muted hover:text-text lg:hidden">
          <Menu size={20} />
        </button>

        {/* Desktop sidebar collapsed to its icon rail: its expand button and the product name slide in here */}
        <div
          aria-hidden={!sidebarCollapsed || undefined}
          inert={!sidebarCollapsed}
          className={cn(
            'hidden items-center gap-2 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out lg:flex',
            sidebarCollapsed ? 'max-w-40 opacity-100' : 'max-w-0 opacity-0',
          )}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="shrink-0 rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <PanelLeftOpen size={17} />
          </button>
          <span className="text-lg font-semibold text-text">N-Ops</span>
        </div>

        {/* Breadcrumb: hidden for now
        <nav aria-label="Breadcrumb" className="hidden min-w-0 truncate text-sm sm:block">
          {trail.map((crumb, i) => (
            <span key={crumb}>
              {i > 0 && <span className="mx-2 text-text-muted">/</span>}
              <span className={i === trail.length - 1 ? 'font-medium text-text' : 'text-text-muted'}>{crumb}</span>
            </span>
          ))}
        </nav>
        */}
      </div>

      {/* Global search: hidden for now
      <div className="hidden w-full max-w-sm shrink md:block">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            placeholder="Search servers, secrets, workflows"
            className="w-full rounded-md border border-border bg-surface-raised py-1.5 pr-10 pl-9 text-sm text-text placeholder:text-text-muted focus-visible:border-signal"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-xs text-text-muted">
            /
          </kbd>
        </div>
      </div>
      */}

      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-4">
        {/* Every page is scoped to this tag */}
        <TagSelect className="min-w-0 shrink" />
        <ThemeMenu />

        <button
          type="button"
          aria-label="Notifications"
          onClick={() => toast.info('Notifications are coming soon.')}
          className="relative text-text-muted hover:text-text"
        >
          <Bell size={19} />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-signal" />
        </button>

        <div className="border-l border-border pl-2 sm:pl-3">
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
