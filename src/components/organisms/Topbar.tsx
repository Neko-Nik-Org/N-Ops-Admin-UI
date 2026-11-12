import { Bell, Menu, Plus, Search } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ThemeToggle } from '@/components/molecules/ThemeToggle'
import { currentUserAtom } from '@/features/auth/store/session'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/admin': 'Admin',
  '/servers': 'Servers',
  '/tools': 'Tools',
  '/service-management': 'Service management',
  '/vault': 'Vault',
  '/approvals': 'Approvals',
  '/metrics': 'Metrics',
  '/workflows': 'Workflows',
  '/service-logs': 'Service logs',
}

export const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { pathname } = useLocation()
  const currentUser = useAtomValue(currentUserAtom)
  const pageTitle = PAGE_TITLES[pathname] ?? 'N-Ops'

  return (
    <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3.5 sm:gap-4 sm:px-6">
      <button type="button" aria-label="Open menu" onClick={onMenuClick} className="text-text-muted hover:text-text lg:hidden">
        <Menu size={20} />
      </button>

      <p className="hidden text-sm sm:block">
        <span className="text-text-muted">{currentUser?.organizationName ?? 'N-Ops'}</span>
        <span className="mx-2 text-text-muted">/</span>
        <span className="font-medium text-text">{pageTitle}</span>
      </p>

      <div className="relative ml-0 hidden max-w-md flex-1 md:block lg:ml-2">
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

      <div className="flex-1 md:hidden" />

      <button
        type="button"
        onClick={() => toast.info('Adding servers from here is coming soon.')}
        className="flex items-center gap-1.5 rounded-md bg-signal px-2.5 py-2 text-sm font-semibold text-ink hover:bg-signal-strong sm:px-3.5"
      >
        <Plus size={15} />
        <span className="hidden sm:inline">Add server</span>
      </button>

      <ThemeToggle />

      <button
        type="button"
        aria-label="Notifications"
        onClick={() => toast.info('Notifications are coming soon.')}
        className="relative text-text-muted hover:text-text"
      >
        <Bell size={19} />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-signal" />
      </button>
    </header>
  )
}
