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
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AxiosRequestConfig } from 'axios'
import { createStore, Provider } from 'jotai'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { describe, expect, it, vi } from 'vitest'
import { ROUTES } from '@/constants/routes'
import { isSuperAdminPath, SUPER_ADMIN_KEY_STORAGE, useForgetSuperAdminKeyElsewhere } from '@/store/adminKey'
import { superAdminClient } from '@/api/client'
import { secureStorage } from '@/utils/secureStorage'
import { OrganizationDetailPage } from '@/pages/superAdmin/organizations/details'
import { OrganizationsPage } from '@/pages/superAdmin/organizations/list'
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
    if (url.startsWith('/super-admin/organization/check-name/'))
      return { data: { is_available: !ORGS.some((o) => o.organization_name === decodeURIComponent(url.split('/').pop()!)) } }
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
        <ToastContainer />
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

describe('Super admin: managing organizations', () => {
  const key = { 'x-nops-admin-key': 'good' }
  /** Opens a page with the key already saved, as after a reload. */
  const openWithKey = (route: string) => {
    secureStorage.setItem(SUPER_ADMIN_KEY_STORAGE, '"good"')
    serve()
    return renderAt(route)
  }
  const dialog = (name: string | RegExp) => within(screen.getByRole('dialog', { name }))

  it('creates an organization after checking its name, with its limits, profile and billing', async () => {
    client.post.mockResolvedValue({ data: '' })
    openWithKey('/super-admin')
    fireEvent.click(await screen.findByRole('button', { name: 'New organization' }))
    const form = dialog('New organization')
    fireEvent.change(form.getByLabelText('Name'), { target: { value: 'Acme' } })
    fireEvent.click(form.getByRole('button', { name: 'Create organization' }))
    expect(await form.findByText('That name is already taken.')).toBeInTheDocument()
    expect(client.post).not.toHaveBeenCalled()

    fireEvent.change(form.getByLabelText('Name'), { target: { value: 'Initech' } })
    fireEvent.change(form.getByLabelText('Users'), { target: { value: '0' } })
    fireEvent.click(form.getByRole('button', { name: 'Create organization' }))
    expect(await form.findByText('At least 1.')).toBeInTheDocument()

    fireEvent.change(form.getByLabelText('Users'), { target: { value: '40' } })
    fireEvent.change(form.getByLabelText('Storage (GB)'), { target: { value: '2.5' } })
    fireEvent.change(form.getByLabelText('Website'), { target: { value: 'https://initech.example' } })
    fireEvent.change(form.getByLabelText('Country'), { target: { value: 'IN' } })
    fireEvent.click(within(form.getByRole('group', { name: 'Billing' })).getByRole('button', { name: 'Add field' }))
    fireEvent.change(form.getByLabelText('billing label 1'), { target: { value: 'gst' } })
    fireEvent.change(form.getByLabelText('billing value 1'), { target: { value: '29ABCDE1234F1Z5' } })
    fireEvent.click(form.getByRole('button', { name: 'Create organization' }))

    expect(await screen.findByText('Created Initech.')).toBeInTheDocument()
    expect(client.post).toHaveBeenCalledWith(
      '/super-admin/organization/create',
      {
        organization_name: 'Initech',
        organization_info: { website: 'https://initech.example', country: 'IN' }, // empty fields are left out
        billing_info: { gst: '29ABCDE1234F1Z5' },
        is_active: true,
        allocated_ai_credit: 1000,
        allocated_storage_bytes: Math.round(2.5 * 1024 ** 3),
        user_limit: 40,
        server_limit: 50,
        workflow_limit: 20,
        ss_project_limit: 10,
        ss_keys_limit: 200,
        ss_notes_limit: 100,
      },
      { headers: key },
    )
  })

  it('acts on an organization from its row without opening it', async () => {
    client.post.mockResolvedValue({ data: '' })
    client.delete.mockResolvedValue({ data: '' })
    openWithKey('/super-admin')
    const row = (await screen.findByText('Globex')).closest('tr') as HTMLElement

    // Edit: a menu of the organization page's edit dialogs
    fireEvent.click(within(row).getByRole('button', { name: 'Edit Globex' }))
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Rename',
      'Plan limits',
      'Profile',
      'Billing details',
    ])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Plan limits' }))
    expect(screen.getByRole('dialog', { name: /Globex/ })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('dialog', { name: /Globex/ })).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByTestId('location')).not.toBeInTheDocument() // still on the list

    fireEvent.click(within(row).getByRole('button', { name: 'Invite an admin to Globex' }))
    const invite = dialog('Invite an admin to Globex')
    fireEvent.change(invite.getByLabelText('Email'), { target: { value: 'boss@globex.dev' } })
    fireEvent.click(invite.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText('Invitation sent to boss@globex.dev.')).toBeInTheDocument()
    expect(client.post).toHaveBeenCalledWith('/super-admin/organization/invite/b-2/admin', '"boss@globex.dev"', expect.anything())

    fireEvent.click(within(row).getByRole('button', { name: 'Delete Globex' }))
    const del = dialog('Delete organization')
    fireEvent.change(del.getByLabelText('Type Globex to confirm'), { target: { value: 'Globex' } })
    fireEvent.click(del.getByRole('button', { name: 'Delete organization' }))
    await waitFor(() => expect(client.delete).toHaveBeenCalledWith('/super-admin/organization/delete/b-2', { headers: key }))
  })

  it('renames an organization, refusing a name another one has', async () => {
    client.put.mockResolvedValue({ data: '' })
    openWithKey('/super-admin/organizations/a-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Rename' }))
    const form = dialog('Rename Acme')
    fireEvent.change(form.getByLabelText('New name'), { target: { value: 'Globex' } })
    fireEvent.click(form.getByRole('button', { name: 'Rename' }))
    expect(await form.findByText('That name is already taken.')).toBeInTheDocument()
    fireEvent.change(form.getByLabelText('New name'), { target: { value: 'Acme Corp' } })
    fireEvent.click(form.getByRole('button', { name: 'Rename' }))
    expect(await screen.findByText('Renamed to Acme Corp.')).toBeInTheDocument()
    expect(client.put).toHaveBeenCalledWith('/super-admin/organization/update/name/a-1', '"Acme Corp"', {
      headers: { ...key, 'Content-Type': 'application/json' },
    })
  })

  it('invites an admin to an organization with a lowercase email', async () => {
    client.post.mockResolvedValue({ data: '' })
    openWithKey('/super-admin/organizations/a-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Invite admin' }))
    const form = dialog('Invite an admin to Acme')
    fireEvent.change(form.getByLabelText('Email'), { target: { value: 'Boss@Acme.dev' } })
    fireEvent.click(form.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText('Invitation sent to boss@acme.dev.')).toBeInTheDocument()
    expect(client.post).toHaveBeenCalledWith('/super-admin/organization/invite/a-1/admin', '"boss@acme.dev"', {
      headers: { ...key, 'Content-Type': 'application/json' },
    })
  })

  it('disables an active organization after confirming', async () => {
    client.put.mockResolvedValue({ data: '' })
    openWithKey('/super-admin/organizations/a-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Disable' }))
    fireEvent.click(dialog('Disable organization').getByRole('button', { name: 'Disable' }))
    expect(await screen.findByText('Disabled Acme.')).toBeInTheDocument()
    expect(client.put).toHaveBeenCalledWith('/super-admin/organization/state/a-1/false', null, { headers: key })
  })

  it("won't lower AI credit or storage below what's used, and saves valid limits", async () => {
    client.put.mockResolvedValue({ data: '' })
    openWithKey('/super-admin/organizations/a-1') // 250 AI credit and 1 GB used
    fireEvent.click(await screen.findByRole('button', { name: 'Edit plan limits' }))
    const form = dialog('Plan limits for Acme')
    expect(form.getByLabelText('Storage (GB)')).toHaveValue(10)
    fireEvent.change(form.getByLabelText('AI credit'), { target: { value: '100' } })
    fireEvent.change(form.getByLabelText('Storage (GB)'), { target: { value: '0.5' } })
    fireEvent.click(form.getByRole('button', { name: 'Save limits' }))
    expect(await form.findByText(/At least 250: that much is already used/)).toBeInTheDocument()
    expect(form.getByText(/At least 1.0 GB: that much is already used/)).toBeInTheDocument()
    expect(client.put).not.toHaveBeenCalled()

    fireEvent.change(form.getByLabelText('AI credit'), { target: { value: '5000' } })
    fireEvent.change(form.getByLabelText('Storage (GB)'), { target: { value: '20' } })
    fireEvent.click(form.getByRole('button', { name: 'Save limits' }))
    expect(await screen.findByText('Updated the limits for Acme.')).toBeInTheDocument()
    expect(client.put).toHaveBeenCalledWith(
      '/super-admin/organization/update/quota/a-1',
      expect.objectContaining({ allocated_ai_credit: 5000, allocated_storage_bytes: 20 * 1024 ** 3, user_limit: 25 }),
      { headers: key },
    )
  })

  it('edits the profile in its fields, keeping older values', async () => {
    client.put.mockResolvedValue({ data: '' })
    ORGS[0] = rawOrg('a-1', 'Acme', {
      organization_info: { description: 'Rockets', country: 'IN', metadata: 'abc', tier: 3 },
    })
    try {
      openWithKey('/super-admin/organizations/a-1')
      expect(await screen.findByText('India (IN)')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }))
      const form = dialog('Profile for Acme')
      expect(form.getByLabelText('Description')).toHaveValue('Rockets')
      expect(form.getByLabelText('extras value 1')).toHaveValue('abc') // an older free-form field
      expect(form.getByText('1 other saved value is kept as they are.')).toBeInTheDocument()

      fireEvent.change(form.getByLabelText('Support email'), { target: { value: 'not-an-email' } })
      fireEvent.change(form.getByLabelText('Website'), { target: { value: 'acme.example' } })
      fireEvent.click(form.getByRole('button', { name: 'Save profile' }))
      expect(await form.findByText('Enter a valid email address.')).toBeInTheDocument()
      expect(form.getByText('Enter a full address, like https://example.com.')).toBeInTheDocument()
      expect(client.put).not.toHaveBeenCalled()

      fireEvent.change(form.getByLabelText('Support email'), { target: { value: 'help@acme.example' } })
      fireEvent.change(form.getByLabelText('Website'), { target: { value: 'https://acme.example' } })
      fireEvent.change(form.getByLabelText('Industry'), { target: { value: 'Healthcare' } })
      fireEvent.change(form.getByLabelText('Description'), { target: { value: '' } })
      fireEvent.click(form.getByRole('button', { name: 'Save profile' }))
      expect(await screen.findByText('Saved the profile for Acme.')).toBeInTheDocument()
      expect(client.put).toHaveBeenCalledWith(
        '/super-admin/organization/update/basic/a-1',
        {
          tier: 3,
          metadata: 'abc',
          website: 'https://acme.example',
          industry: 'Healthcare',
          support_email: 'help@acme.example',
          country: 'IN',
        },
        { headers: key },
      )
    } finally {
      ORGS[0] = rawOrg('a-1', 'Acme')
    }
  })

  it('edits billing details, keeping non-text values', async () => {
    client.put.mockResolvedValue({ data: '' })
    ORGS[0] = rawOrg('a-1', 'Acme', { billing_info: { plan: 'pro', seats: 25 } })
    try {
      openWithKey('/super-admin/organizations/a-1')
      expect(await screen.findByText('pro')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Edit billing' }))
      const form = dialog('Billing details for Acme')
      expect(form.getByText('1 other saved value is kept as they are.')).toBeInTheDocument()
      fireEvent.change(form.getByLabelText('rows value 1'), { target: { value: 'enterprise' } })
      fireEvent.click(form.getByRole('button', { name: 'Save details' }))
      expect(await screen.findByText('Saved the billing details for Acme.')).toBeInTheDocument()
      expect(client.put).toHaveBeenCalledWith(
        '/super-admin/organization/update/billing/a-1',
        { seats: 25, plan: 'enterprise' },
        { headers: key },
      )
    } finally {
      ORGS[0] = rawOrg('a-1', 'Acme')
    }
  })

  it('deletes only after the name is typed, then goes back to the list', async () => {
    client.delete.mockResolvedValue({ data: '' })
    openWithKey('/super-admin/organizations/a-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    const form = dialog('Delete organization')
    const confirm = form.getByRole('button', { name: 'Delete organization' })
    expect(confirm).toBeDisabled()
    fireEvent.change(form.getByLabelText('Type Acme to confirm'), { target: { value: 'acme' } })
    expect(confirm).toBeDisabled() // exact name only
    fireEvent.change(form.getByLabelText('Type Acme to confirm'), { target: { value: 'Acme' } })
    fireEvent.click(confirm)
    expect(await screen.findByText('Deleted Acme.')).toBeInTheDocument()
    expect(client.delete).toHaveBeenCalledWith('/super-admin/organization/delete/a-1', { headers: key })
    expect(await screen.findByRole('heading', { name: 'Organizations' })).toBeInTheDocument()
  })
})
