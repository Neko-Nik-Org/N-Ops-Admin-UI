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
/** Shared helpers for component and page tests. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook } from '@testing-library/react'
import { createStore, Provider } from 'jotai'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { vi } from 'vitest'
import { currentUserAtom, sessionStatusAtom } from '@/features/auth/store/session'
import type { CurrentUser } from '@/features/auth/types'
import { apiClient } from '@/lib/axios'

/** The mocked API client from test/setup.ts, typed for `mockResolvedValue` & co. */
export const api = vi.mocked(apiClient)

/** A signed-in user with every tag permission; override fields per test. */
export const makeUser = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
  userId: 1,
  organizationId: 'org-1',
  permissions: ['tag:view', 'tag:create', 'tag:edit', 'tag:delete'],
  tags: [],
  userName: 'priya',
  displayName: 'Priya Rao',
  organizationName: 'Acme',
  primaryEmail: 'priya@acme.dev',
  isEmailVerified: true,
  ...overrides,
})

/** Fresh query client and jotai store, optionally signed in. */
const createTestState = (user?: CurrentUser | null) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const store = createStore()
  if (user) {
    store.set(currentUserAtom, user)
    store.set(sessionStatusAtom, 'authenticated')
  }
  return { queryClient, store }
}

/** Shows the router's current path (and state) so tests can assert on navigation. */
const LocationProbe = () => {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

interface RenderOptions {
  /** Initial URL, default "/". */
  route?: string
  /** History state for the initial URL (e.g. the 2FA context). */
  state?: unknown
  /** Route pattern the element is mounted on, default: the initial URL. */
  path?: string
  /** Signed-in user; omit for a signed-out session. */
  user?: CurrentUser | null
}

/**
 * Renders `ui` inside the app's providers (React Query, jotai, router, toasts).
 * Any other URL renders a LocationProbe, so `screen.getByTestId('location')` reveals where the app navigated.
 */
export const renderWithProviders = (ui: ReactElement, { route = '/', state, path, user }: RenderOptions = {}) => {
  const { queryClient, store } = createTestState(user)
  const result = render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter initialEntries={[{ pathname: route, state }]}>
          <Routes>
            <Route path={path ?? route} element={ui} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
        <ToastContainer />
      </Provider>
    </QueryClientProvider>,
  )
  return { ...result, queryClient, store }
}

/** renderHook with the same providers; returns the store and query client for assertions. */
export const renderHookWithProviders = <T,>(hook: () => T, { user }: { user?: CurrentUser | null } = {}) => {
  const { queryClient, store } = createTestState(user)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter>{children}</MemoryRouter>
      </Provider>
    </QueryClientProvider>
  )
  return { ...renderHook(hook, { wrapper }), queryClient, store }
}

/** Fake Cloudflare Turnstile that passes immediately with `token`. */
export const passTurnstile = (token = 'turnstile-token') => {
  window.turnstile = {
    render: (_el, options) => {
      options.callback(token)
      return 'widget-1'
    },
    remove: vi.fn(),
    reset: vi.fn(),
  }
  return window.turnstile
}
