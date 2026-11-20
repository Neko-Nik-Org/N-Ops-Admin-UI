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

/** App-wide providers: React Query, toast notifications and the active theme. */

import { QueryClientProvider } from '@tanstack/react-query'
import { useAtomValue } from 'jotai'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { toast, ToastContainer } from 'react-toastify'
import { queryClient } from '@/lib/queryClient'
import { raiseToasts, setToastLayer } from '@/lib/toastLayer'
import { sessionStatusAtom } from '@/features/auth/store/session'
import { resolvedThemeAtom } from './theme'

/**
 * Drops everything cached for the signed-in user once the session ends (sign-out, expiry, or a
 * failed check of a saved session), so the next account on this browser never sees it. The API
 * health check isn't per-user, so it stays.
 */
const useClearUserCacheOnSignOut = () => {
  const status = useAtomValue(sessionStatusAtom)
  useEffect(() => {
    if (status === 'unauthenticated') queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'system' })
  }, [status])
}

/**
 * Wraps the app in the React Query client and the toast container, and keeps
 * `<html data-theme>` in sync with the selected theme so the CSS variables switch.
 */
export const AppProviders = ({ children }: { children: ReactNode }) => {
  const resolvedTheme = useAtomValue(resolvedThemeAtom)
  useClearUserCacheOnSignOut()

  // a new toast comes to the front, even over a dialog opened since the last one
  useEffect(() => toast.onChange(({ status }) => status === 'added' && raiseToasts()), [])

  /** Every color token in index.css is keyed off this attribute. */
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* a popover, so toasts can sit above open dialogs (see lib/toastLayer) */}
      <div ref={setToastLayer} popover="manual" className="toast-layer">
        <ToastContainer theme={resolvedTheme} position="top-right" autoClose={4000} hideProgressBar />
      </div>
    </QueryClientProvider>
  )
}
