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
import { ToastContainer } from 'react-toastify'
import { queryClient } from '@/lib/queryClient'
import { resolvedThemeAtom } from './theme'

/**
 * Wraps the app in the React Query client and the toast container, and keeps
 * `<html data-theme>` in sync with the selected theme so the CSS variables switch.
 */
export const AppProviders = ({ children }: { children: ReactNode }) => {
  const resolvedTheme = useAtomValue(resolvedThemeAtom)

  /** Every color token in index.css is keyed off this attribute. */
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
  }, [resolvedTheme])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer theme={resolvedTheme} position="top-right" autoClose={4000} />
    </QueryClientProvider>
  )
}
