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
/** Collapsible sidebar group: a section heading that expands to show its pages. */

import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import { NavItem } from '@/components/molecules/NavItem'
import type { AppPage } from '@/constants/routes'
import { cn } from '@/utils/cn'

/** Props for NavGroup. */
interface NavGroupProps {
  label: string
  icon: LucideIcon
  items: readonly AppPage[]
  /** Icon-only rail: only the group icon shows; clicking it calls `onExpandRail`. */
  collapsed?: boolean
  /** Asks the sidebar to leave icon-only mode, so the group's pages can be shown. */
  onExpandRail?: () => void
}

/**
 * Heading button plus an indented list of NavItems. Starts open, and re-opens on navigation,
 * whenever the current route is one of its pages.
 */
export const NavGroup = ({ label, icon: Icon, items, collapsed = false, onExpandRail }: NavGroupProps) => {
  const { pathname } = useLocation()
  const containsActive = items.some((item) => matchPath({ path: item.path, end: false }, pathname))
  const [open, setOpen] = useState(containsActive)
  const [seenPath, setSeenPath] = useState(pathname)
  const listId = useId()

  // Navigating into the group (e.g. from search or a link elsewhere) opens it
  if (seenPath !== pathname) {
    setSeenPath(pathname)
    if (containsActive) setOpen(true)
  }

  const handleClick = () => {
    if (collapsed) {
      setOpen(true)
      onExpandRail?.()
    } else {
      setOpen((o) => !o)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        title={collapsed ? label : undefined}
        aria-label={collapsed ? label : undefined}
        aria-expanded={collapsed ? undefined : open}
        aria-controls={collapsed ? undefined : listId}
        className={cn(
          'flex w-full items-center gap-3 rounded-md py-2 text-sm transition-colors duration-150',
          collapsed ? 'justify-center px-0' : 'px-3',
          containsActive ? 'text-text' : 'text-text-muted hover:text-text',
          collapsed && containsActive ? 'bg-signal/15 text-signal' : 'hover:bg-surface-raised',
        )}
      >
        <Icon size={17} className="shrink-0" />
        {!collapsed && (
          <>
            <span className={cn('flex-1 truncate text-left', containsActive && 'font-medium')}>{label}</span>
            <ChevronRight
              size={15}
              aria-hidden="true"
              className={cn('shrink-0 transition-transform duration-150', open && 'rotate-90')}
            />
          </>
        )}
      </button>

      {!collapsed && open && (
        <ul id={listId} className="mt-0.5 ml-5 flex flex-col gap-0.5 border-l border-border pl-2">
          {items.map((item) => (
            <li key={item.path}>
              <NavItem to={item.path} label={item.title} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
