import {
  Boxes,
  CheckCircle2,
  ChevronsUpDown,
  LayoutGrid,
  LineChart,
  Lock,
  LogOut,
  ScrollText,
  Server,
  Users,
  Workflow,
  Wrench,
} from 'lucide-react'
import { useAtomValue } from 'jotai'
import { useNavigate } from 'react-router-dom'
import { LoadingButton } from '@/components/loading'
import { Logo } from '@/components/atoms/Logo'
import { NavItem } from '@/components/molecules/NavItem'
import { currentUserAtom } from '@/features/auth/store/session'
import { useOverview } from '@/features/dashboard/hooks/useOverview'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { cn } from '@/utils/cn'

interface SidebarProps {
  /** Renders as a fixed overlay drawer (mobile nav) instead of the permanent desktop rail. */
  variant?: 'desktop' | 'mobile'
  onNavigate?: () => void
}

export const Sidebar = ({ variant = 'desktop', onNavigate }: SidebarProps) => {
  const currentUser = useAtomValue(currentUserAtom)
  const orgName = currentUser?.organizationName ?? 'Your organization'
  // Shares the Overview page's cached query — no extra request, just the counts once they land.
  const { data: overview } = useOverview()
  const [logoutState, logout] = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout().then(() => navigate('/login', { replace: true }))
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
        <NavItem to="/" end icon={LayoutGrid} label="Overview" />
        <NavItem to="/admin" icon={Users} label="Admin" />
        <NavItem to="/servers" icon={Server} label="Servers" badge={overview?.serversTotal} />
        <NavItem to="/tools" icon={Wrench} label="Tools" />
        <NavItem to="/service-management" icon={Boxes} label="Service management" />
        <NavItem to="/vault" icon={Lock} label="Vault" />
        <NavItem
          to="/approvals"
          icon={CheckCircle2}
          label="Approvals"
          badge={overview?.pendingApprovalsCount ? String(overview.pendingApprovalsCount) : undefined}
        />
        <NavItem to="/metrics" icon={LineChart} label="Metrics" />
        <NavItem to="/workflows" icon={Workflow} label="Workflows" />
        <NavItem to="/service-logs" icon={ScrollText} label="Service logs" />
      </nav>

      <div className="flex items-center gap-2.5 border-t border-border px-1 pt-4">
        <span className="flex-1 truncate text-sm text-text-muted">{currentUser?.displayName ?? 'Signed in'}</span>
        <LoadingButton
          variant="ghost"
          size="sm"
          state={logoutState}
          icon={<LogOut size={15} />}
          aria-label="Sign out"
          onClick={handleLogout}
        />
      </div>
    </aside>
  )
}
