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

import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { PageSkeleton } from '@/components/Skeleton'
import { Sidebar } from '@/components/AppShell/Sidebar'
import { Topbar } from '@/components/AppShell/Topbar'
import { useUiInfoSync } from '@/hooks/useUiInfoSync'
import { useSessionRefresh } from '@/hooks/useSessionRefresh'

/**
 * Dashboard layout. Also runs the background session refresh and the theme sync
 * while the user is signed in.
 */
export const AppShell = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  useSessionRefresh()
  useUiInfoSync()

  return (
    <div className="flex min-h-screen flex-col">
      {/* Full-width top bar; the sidebar and the page sit below it */}
      <Topbar onMenuClick={() => setMobileNavOpen(true)} />

      <div className="flex flex-1">
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
          {/* overflow-x-clip, not hidden: hidden would make this a scroll container and break sticky bars inside pages */}
          <main className="relative flex-1 overflow-x-clip p-4 sm:p-6">
            {/* The current route's page */}
            {/* While a page's code downloads: a page-shaped skeleton in the content area; sidebar and top bar stay */}
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
