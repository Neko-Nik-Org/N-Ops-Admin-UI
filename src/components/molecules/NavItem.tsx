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
/** Sidebar navigation link. */

import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import type { LucideIcon } from 'lucide-react'

/** Props for NavItem. */
interface NavItemProps {
  to: string
  label: string
  /** Leading icon. Sub-items inside a NavGroup leave it out. */
  icon?: LucideIcon
  /** Shown right-aligned — e.g. a live count. Pass a number for a muted count, a string for an accented badge. */
  badge?: number | string
  /** Only highlight on an exact path match (needed for "/"). */
  end?: boolean
  /** Icon-only rail: the label moves to a tooltip and the badge becomes a dot. */
  collapsed?: boolean
}

/** Router link with an icon that highlights itself while its route is active. */
export const NavItem = ({ to, icon: Icon, label, badge, end, collapsed = false }: NavItemProps) => (
  <NavLink
    to={to}
    end={end}
    title={collapsed ? label : undefined}
    aria-label={collapsed ? label : undefined}
    className={({ isActive }) =>
      cn(
        'relative flex items-center gap-3 rounded-md py-2 text-sm transition-colors duration-150',
        collapsed ? 'justify-center px-0' : 'px-3',
        isActive ? 'bg-signal/15 font-medium text-signal' : 'text-text-muted hover:bg-surface-raised hover:text-text',
      )
    }
  >
    {Icon && <Icon size={17} className="shrink-0" />}
    {collapsed ? (
      typeof badge === 'string' && <span className="absolute top-1.5 right-2.5 size-1.5 rounded-full bg-warning" />
    ) : (
      <>
        <span className="flex-1 truncate">{label}</span>
        {badge !== undefined &&
          (typeof badge === 'number' ? (
            <span className="text-xs text-text-muted">{badge}</span>
          ) : (
            <span className="rounded-full bg-warning/15 px-1.5 py-0.5 font-mono text-xs text-warning">{badge}</span>
          ))}
      </>
    )}
  </NavLink>
)
