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
/** Tests for the super-admin pages (/super-admin): the key prompt, the organization list and one organization. */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { AxiosRequestConfig } from 'axios'
import { createStore, Provider } from 'jotai'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ROUTES } from '@/constants/routes'
import { isSuperAdminPath, SUPER_ADMIN_KEY_STORAGE, useForgetSuperAdminKeyElsewhere } from '@/features/superAdmin/store/adminKey'
import { superAdminClient } from '@/lib/axios'
import { secureStorage } from '@/lib/secureStorage'
import { OrganizationDetailPage } from '@/pages/superAdmin/OrganizationDetailPage'
import { OrganizationsPage } from '@/pages/superAdmin/OrganizationsPage'
import { SuperAdminShell } from '@/pages/superAdmin/SuperAdminShell'
import { ApiError } from '@/types/api'
import { api } from '../../testUtils'
import { rawOrg } from './fixtures'

const client = vi.mocked(superAdminClient)
const ORGS = [rawOrg('a-1', 'Acme'), rawOrg('b-2', 'Globex', { is_active: false })]

/** Answers like the API: 401 unless the key is "good". */
const serve = () =>
  client.get.mockImplementation(async (url: string, config?: AxiosRequestConfig) => {
    if ((config?.headers as Record<string, string> | undefined)?.['x-nops-admin-key'] !== 'good')
      throw new ApiError('Unauthorized: Missing or Invalid Admin Key', 401)
    if (url === '/super-admin/organization/list') return { data: ORGS }
    return { data: ORGS.find((o) => url.endsWith(`/${o.organization_id}`)) ?? null }
  })

/** Mounts the app's router-level key guard, as AppRouter does. */
const KeyGuard = () => {
  useForgetSuperAdminKeyElsewhere()
  return null
}

const renderAt = (route: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Provider store={createStore()}>
        <MemoryRouter initialEntries={[route]}>
          <KeyGuard />
          <Link to="/admin/users">Go to users</Link>
          <Routes>
            <Route path="/admin/users" element={<p>Users page</p>} />
            <Route path={ROUTES.superAdmin} element={<SuperAdminShell />}>
              <Route index element={<OrganizationsPage />} />
              <Route path={ROUTES.superAdminOrganization} element={<OrganizationDetailPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  )

const enterKey = (key: string) => {
  fireEvent.change(screen.getByLabelText('Admin key'), { target: { value: key } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
}

describe('Super admin', () => {
  it('asks for the admin key, refuses a wrong one, then lists every organization', async () => {
    serve()
    renderAt('/super-admin')
    enterKey('bad')
    expect(await screen.findByText("That admin key isn't right.")).toBeInTheDocument()

    enterKey('good')
    const acme = (await screen.findByText('Acme')).closest('tr')!
    expect(within(acme).getByText('Active')).toBeInTheDocument()
    expect(acme).toHaveTextContent('1.0 GB / 10 GB')
    expect(screen.getByText('Globex').closest('tr')).toHaveTextContent('Disabled')
    // checking the key loaded the list: no second request for the page
    const goodCalls = client.get.mock.calls.filter(
      ([, config]) => (config?.headers as Record<string, string> | undefined)?.['x-nops-admin-key'] === 'good',
    )
    expect(goodCalls).toHaveLength(1)
    // super-admin calls never use (or end) a user's session
    expect(api.get).not.toHaveBeenCalled()
  })

  it('filters by status and opens an organization with its limits and profile', async () => {
    serve()
    renderAt('/super-admin')
    enterKey('good')
    await screen.findByText('Acme')
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'inactive' } })
    expect(screen.queryByText('Acme')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Globex'))
    expect(await screen.findByRole('heading', { name: 'Globex' })).toBeInTheDocument()
    expect(screen.getByText('Vault keys per project').nextSibling).toHaveTextContent('200')
    expect(screen.getByText('Contact email').nextSibling).toHaveTextContent('ops@acme.dev')
    expect(client.get).toHaveBeenCalledWith('/super-admin/organization/get/b-2', { headers: { 'x-nops-admin-key': 'good' } })
  })

  it('forgets the key on request', async () => {
    serve()
    renderAt('/super-admin')
    enterKey('good')
    await screen.findByText('Acme')
    fireEvent.click(screen.getByRole('button', { name: 'Forget key' }))
    expect(screen.getByLabelText('Admin key')).toBeInTheDocument()
    expect(screen.queryByText('Acme')).not.toBeInTheDocument()
  })

  it('keeps the key, encrypted, across a reload', async () => {
    serve()
    renderAt('/super-admin')
    enterKey('good')
    await screen.findByText('Acme')
    expect(secureStorage.getItem(SUPER_ADMIN_KEY_STORAGE)).toBe('"good"')
    await vi.waitFor(() => expect(localStorage.getItem(SUPER_ADMIN_KEY_STORAGE)).toMatch(/^enc:v1:/)) // never in plain text

    // a reload: a fresh app reads the saved key and skips the prompt
    renderAt('/super-admin')
    expect(await screen.findAllByText('Acme')).not.toHaveLength(0)
    expect(screen.getAllByRole('button', { name: 'Forget key' })).toHaveLength(2)
  })

  it('forgets the key when the user moves to another page', async () => {
    serve()
    renderAt('/super-admin')
    enterKey('good')
    await screen.findByText('Acme')
    expect(secureStorage.getItem(SUPER_ADMIN_KEY_STORAGE)).toBe('"good"')
    fireEvent.click(screen.getByRole('link', { name: 'Go to users' }))
    expect(await screen.findByText('Users page')).toBeInTheDocument()
    expect(secureStorage.getItem(SUPER_ADMIN_KEY_STORAGE)).toBeNull()
  })

  it('forgets a saved key when the app opens on another page (typed URL, new tab)', () => {
    secureStorage.setItem(SUPER_ADMIN_KEY_STORAGE, '"good"')
    renderAt('/admin/users')
    expect(screen.getByText('Users page')).toBeInTheDocument()
    expect(secureStorage.getItem(SUPER_ADMIN_KEY_STORAGE)).toBeNull()
  })

  it('treats only /super-admin and its pages as super-admin pages', () => {
    expect(isSuperAdminPath('/super-admin')).toBe(true)
    expect(isSuperAdminPath('/super-admin/organizations/a-1')).toBe(true)
    expect(isSuperAdminPath('/super-administrators')).toBe(false)
    expect(isSuperAdminPath('/admin/users')).toBe(false)
  })
})
