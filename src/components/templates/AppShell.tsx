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

/** Layout for every signed-in page: sidebar, top bar and the routed page content. */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/organisms/Sidebar'
import { Topbar } from '@/components/organisms/Topbar'
import { useUiInfoSync } from '@/features/account/hooks/useUiInfoSync'
import { useSessionRefresh } from '@/features/auth/hooks/useSessionRefresh'

/**
 * Dashboard layout. Also runs the background session refresh and the theme sync
 * while the user is signed in.
 */
export const AppShell = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  useSessionRefresh()
  useUiInfoSync()

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      {/* Mobile nav: the sidebar as a slide-over drawer above a dimmed backdrop */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-ink/70" onClick={() => setMobileNavOpen(false)} />
          <div className="relative">
            <Sidebar variant="mobile" onNavigate={() => setMobileNavOpen(false)} onClose={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
          {/* The current route's page */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
