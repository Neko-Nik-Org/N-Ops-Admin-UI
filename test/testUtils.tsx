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
import { currentUserAtom, sessionStatusAtom } from '@/store/session'
import type { CurrentUser } from '@/types/auth'
import { apiClient } from '@/api/client'

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
  /** Initial URL, default "/"; may include a ?query. */
  route?: string
  /** History state for the initial URL (e.g. the 2FA context). */
  state?: unknown
  /** Route pattern the element is mounted on, default: the initial URL. */
  path?: string
  /** Signed-in user; omit for a signed-out session. */
  user?: CurrentUser | null
  /** Pages visited before `route` in this session (oldest first), so "back" has somewhere to go. */
  history?: string[]
}

/**
 * Renders `ui` inside the app's providers (React Query, jotai, router, toasts).
 * Any other URL renders a LocationProbe, so `screen.getByTestId('location')` reveals where the app navigated.
 */
export const renderWithProviders = (ui: ReactElement, { route = '/', state, path, user, history = [] }: RenderOptions = {}) => {
  const { queryClient, store } = createTestState(user)
  const [pathname, search = ''] = route.split('?')
  const result = render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter
          initialEntries={[...history, { pathname, search: search && `?${search}`, state }]}
          initialIndex={history.length}
        >
          <Routes>
            <Route path={path ?? pathname} element={ui} />
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
export const renderHookWithProviders = <T,>(
  hook: () => T,
  { user, route = '/' }: { user?: CurrentUser | null; route?: string } = {},
) => {
  const { queryClient, store } = createTestState(user)
  // the probe shows where the hook navigated (screen.getByTestId('location'))
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>
          {children}
          <LocationProbe />
        </MemoryRouter>
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

/** A user as `/user/admin/list` returns it. */
export const rawAdminUser = (
  userId: number,
  userName: string,
  displayName: string,
  roleId: number,
  extra: Record<string, unknown> = {},
) => ({
  user_id: userId,
  user_name: userName,
  display_name: displayName,
  user_details: {},
  primary_email: `${userName}@acme.dev`,
  is_email_verified: true,
  is_active: true,
  role_id: roleId,
  access_restriction_policy_id: null as number | null,
  has_totp_2fa: true,
  has_email_2fa: false,
  created_at: '2026-06-01T08:00:00Z',
  updated_at: '2026-11-01T08:00:00Z',
  last_login_at: '2026-11-18T08:00:00Z',
  ...extra,
})

/** Users with the same ids and names as the Admin mock's (1 Neko Nik … 10 Sara Lindqvist). */
export const RAW_USERS = [
  rawAdminUser(1, 'neko', 'Neko Nik', 1),
  rawAdminUser(2, 'priya', 'Priya Rao', 2, { has_email_2fa: true }),
  rawAdminUser(3, 'marcus', 'Marcus Chen', 3, { access_restriction_policy_id: 1 }),
  rawAdminUser(4, 'aisha', 'Aisha Bello', 3, { has_totp_2fa: false, has_email_2fa: true }),
  rawAdminUser(5, 'tomas', 'Tomás Ruiz', 4, { has_totp_2fa: false }),
  rawAdminUser(6, 'lena', 'Lena Fischer', 4),
  rawAdminUser(7, 'kenji', 'Kenji Watanabe', 4, {
    is_email_verified: false,
    has_totp_2fa: false,
    last_login_at: '2026-06-01T08:00:00Z', // never signed in: same as created_at
  }),
  rawAdminUser(8, 'olivia', 'Olivia Hart', 5),
  rawAdminUser(9, 'dev', 'Dev Malhotra', 3, { is_active: false, has_totp_2fa: false }),
  rawAdminUser(10, 'sara', 'Sara Lindqvist', 4, {
    access_restriction_policy_id: 2,
    user_details: { team: 'Platform', on_call: true },
  }),
]

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

/** Access policies as `/policy/access-restriction/list` returns them (ids match RAW_USERS' policies). */
export const RAW_POLICIES = [
  {
    policy_id: 1,
    policy_name: 'Office only',
    policy_description: 'HQ network',
    enforce_totp_2fa: true,
    enforce_email_2fa: false,
    has_ip_restriction: true,
    has_geo_restriction: false,
    allowed_ips: ['203.0.113.0/24'],
    allowed_geo_locations: [],
  },
  {
    policy_id: 2,
    policy_name: 'Nordics',
    policy_description: '',
    enforce_totp_2fa: false,
    enforce_email_2fa: true,
    has_ip_restriction: false,
    has_geo_restriction: true,
    allowed_ips: [],
    allowed_geo_locations: ['SE', 'NO'],
  },
]

/**
 * Answers the live read endpoints the admin and vault pages use (tags, roles, org-info, users, vault
 * projects, with the lists' name searches); anything else gets [].
 */
export const serveLiveReads = ({
  tags = RAW_TAGS,
  roles = RAW_ROLES,
  orgInfo = RAW_ORG_INFO,
  projects = RAW_PROJECTS,
  users = RAW_USERS,
  policies = RAW_POLICIES,
} = {}) =>
  api.get.mockImplementation(async (url: string, config?: { params?: unknown }) => {
    if (url === '/tag/list') return { data: tags }
    if (url === '/user/roles/list') return { data: roles }
    if (url === '/policy/access-restriction/list') return { data: policies }
    if (url === '/user/self/org-info') return { data: orgInfo }
    if (url === '/user/admin/list') {
      const q = String((config?.params as { user_name?: string } | undefined)?.user_name ?? '').toLowerCase()
      return { data: users.filter((u) => u.user_name.toLowerCase().includes(q)) }
    }
    if (url.startsWith('/user/admin/fetch/'))
      return { data: users.find((u) => u.user_id === Number(url.split('/').pop())) ?? null }
    if (url === '/vault/project/list') {
      const q = String((config?.params as { project_name?: string } | undefined)?.project_name ?? '').toLowerCase()
      return { data: projects.filter((p) => p.project_name.toLowerCase().includes(q)) }
    }
    return { data: [] }
  })
