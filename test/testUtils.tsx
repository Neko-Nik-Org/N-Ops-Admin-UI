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
  permissions: ['tag:create', 'tag:edit', 'tag:delete'],
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

/** Tags as `GET /tag/list` returns them: production (1), staging (2), development (3), internal (4). */
export const RAW_TAGS = ['production', 'staging', 'development', 'internal'].map((tagName, i) => ({
  tag_id: i + 1,
  organization_id: 'org-1',
  tag_name: tagName,
  tag_description: '',
}))

/** A role as `GET /user/roles/list` returns it. */
export const rawRole = (roleId: number, roleName: string, permissions: string[] = ['tag:create']) => ({
  role_id: roleId,
  role_name: roleName,
  role_description: `${roleName} role`,
  permissions,
  allowed_linux_users: [],
  allowed_tags: [],
  can_bypass_approvals: false,
  can_approve_approvals: false,
  created_at: '2026-11-17T08:00:00Z',
  updated_at: '2026-11-17T08:00:00Z',
})

/** Roles whose ids match the mock users and API keys (1 Owner … 6 CI deploy). */
export const RAW_ROLES = ['Owner', 'Admin', 'Operator', 'Developer', 'Auditor', 'CI deploy'].map((name, i) =>
  rawRole(i + 1, name, name === 'CI deploy' ? ['vault:keys:view', 'vault:config:view'] : ['tag:create']),
)

/** `GET /user/self/org-info` as the API returns it. */
export const RAW_ORG_INFO = {
  organization_id: 'org-123',
  organization_name: 'Acme',
  organization_info: { region: 'eu-west', support_tier: 'gold' },
  allocated_ai_credit: 100,
  utilized_ai_credit: 40,
  allocated_storage_bytes: 1024 ** 3,
  utilized_storage_bytes: 512 * 1024 ** 2,
  user_limit: 25,
  current_user_count: 10,
  server_limit: 50,
  workflow_limit: 20,
  ss_project_limit: 10,
  current_ss_project_count: 4,
  ss_keys_limit: 200,
  ss_notes_limit: 100,
  created_at: '2026-01-02T00:00:00Z',
}

/** A vault project as `GET /vault/project/list` returns it. */
export const rawProject = (projectId: number, projectName: string, description = '') => ({
  project_id: projectId,
  project_name: projectName,
  details: (description ? { description } : {}) as Record<string, unknown>,
  created_at: '2026-11-01T08:00:00Z',
  updated_at: '2026-11-10T08:00:00Z',
})

/** Projects whose ids match the mock vault contents (1 payments-api … 4 internal-tools). */
export const RAW_PROJECTS = [
  rawProject(1, 'payments-api', 'Card payments and payouts.'),
  rawProject(2, 'web', 'Customer site and dashboard.'),
  rawProject(3, 'billing', 'Invoices and subscriptions.'),
  rawProject(4, 'internal-tools', 'Grafana, status page and other in-house tools.'),
]

/**
 * Answers the live read endpoints the admin and vault pages use (tags, roles, org-info, vault
 * projects, with the list's `project_name` search); anything else gets [].
 */
export const serveLiveReads = ({ tags = RAW_TAGS, roles = RAW_ROLES, orgInfo = RAW_ORG_INFO, projects = RAW_PROJECTS } = {}) =>
  api.get.mockImplementation(async (url: string, config?: { params?: unknown }) => {
    if (url === '/tag/list') return { data: tags }
    if (url === '/user/roles/list') return { data: roles }
    if (url === '/user/self/org-info') return { data: orgInfo }
    if (url === '/vault/project/list') {
      const q = String((config?.params as { project_name?: string } | undefined)?.project_name ?? '').toLowerCase()
      return { data: projects.filter((p) => p.project_name.toLowerCase().includes(q)) }
    }
    return { data: [] }
  })
