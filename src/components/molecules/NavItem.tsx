import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface NavItemProps {
  to: string
  icon: LucideIcon
  label: string
  /** Shown right-aligned — e.g. a live count. Pass a number for a muted count, a string for an accented badge. */
  badge?: number | string
  end?: boolean
}

export const NavItem = ({ to, icon: Icon, label, badge, end }: NavItemProps) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
        isActive ? 'bg-signal/15 font-medium text-signal' : 'text-text-muted hover:bg-surface-raised hover:text-text',
      )
    }
  >
    <Icon size={17} />
    <span className="flex-1">{label}</span>
    {badge !== undefined &&
      (typeof badge === 'number' ? (
        <span className="text-xs text-text-muted">{badge}</span>
      ) : (
        <span className="rounded-full bg-warning/15 px-1.5 py-0.5 font-mono text-xs text-warning">{badge}</span>
      ))}
  </NavLink>
)
