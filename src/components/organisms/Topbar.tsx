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

/** Top bar of the dashboard: tag selector, breadcrumb, centered search, quick actions and notifications. */

import { Bell, Menu, Plus, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { TagSelect } from '@/components/molecules/TagSelect'
import { PAGE_TITLES } from '@/constants/routes'

/** Sticky header above every authenticated page. `onMenuClick` opens the mobile nav drawer. */
export const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { pathname } = useLocation()
  const trail = PAGE_TITLES[pathname] ?? ['N-Ops']

  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3.5 sm:gap-4 sm:px-6">
      {/* Left and right groups are both flex-1, so they split the free space equally and the search sits dead center */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button type="button" aria-label="Open menu" onClick={onMenuClick} className="text-text-muted hover:text-text lg:hidden">
          <Menu size={20} />
        </button>

        {/* Every page is scoped to this tag */}
        <TagSelect />

        <nav aria-label="Breadcrumb" className="hidden min-w-0 truncate text-sm sm:block">
          {trail.map((crumb, i) => (
            <span key={crumb}>
              {i > 0 && <span className="mx-2 text-text-muted">/</span>}
              <span className={i === trail.length - 1 ? 'font-medium text-text' : 'text-text-muted'}>{crumb}</span>
            </span>
          ))}
        </nav>
      </div>

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

      <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => toast.info('Adding servers from here is coming soon.')}
          className="flex items-center gap-1.5 rounded-md bg-signal px-2.5 py-2 text-sm font-semibold text-ink hover:bg-signal-strong sm:px-3.5"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Add server</span>
        </button>

        <button
          type="button"
          aria-label="Notifications"
          onClick={() => toast.info('Notifications are coming soon.')}
          className="relative text-text-muted hover:text-text"
        >
          <Bell size={19} />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-signal" />
        </button>
      </div>
    </header>
  )
}
