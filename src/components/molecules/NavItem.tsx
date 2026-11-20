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
/**
 * Icons sit at the same spot whether the rail is collapsed or not (centred in the 4 rem rail), and
 * the label and badge fade instead of disappearing, so collapsing and expanding animate smoothly.
 */
export const NavItem = ({ to, icon: Icon, label, badge, end, collapsed = false }: NavItemProps) => (
  <NavLink
    to={to}
    end={end}
    title={collapsed ? label : undefined}
    aria-label={collapsed ? label : undefined}
    className={({ isActive }) =>
      cn(
        'relative flex items-center gap-3 rounded-md py-2 pr-3 text-sm whitespace-nowrap transition-colors duration-150',
        Icon ? 'pl-[15px]' : 'pl-3',
        isActive ? 'bg-signal/15 font-medium text-signal' : 'text-text-muted hover:bg-surface-raised hover:text-text',
      )
    }
  >
    {Icon && <Icon size={17} className="shrink-0" />}
    <span
      aria-hidden={collapsed || undefined}
      className={cn('flex flex-1 items-center gap-3 overflow-hidden transition-opacity duration-200', collapsed && 'opacity-0')}
    >
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined &&
        (typeof badge === 'number' ? (
          <span className="text-xs text-text-muted">{badge}</span>
        ) : (
          <span className="rounded-full bg-warning/15 px-1.5 py-0.5 font-mono text-xs text-warning">{badge}</span>
        ))}
    </span>
    {/* on the rail an accented badge becomes a dot */}
    {typeof badge === 'string' && (
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1.5 left-[30px] size-1.5 rounded-full bg-warning transition-opacity duration-200',
          collapsed ? 'opacity-100' : 'opacity-0',
        )}
      />
    )}
  </NavLink>
)
