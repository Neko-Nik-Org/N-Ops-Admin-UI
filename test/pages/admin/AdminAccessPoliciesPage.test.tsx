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
/** Tests for Admin › Access policies, on the (mocked) live API. */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AdminAccessPoliciesPage } from '@/pages/admin/AdminAccessPoliciesPage'
import { api, makeUser, renderWithProviders } from '../../testUtils'

const dialog = () => screen.getByRole('dialog')

const ALL = ['policy:ar:view', 'policy:ar:create', 'policy:ar:edit', 'policy:ar:delete']

const rawPolicy = (id: number, name: string, extra: Record<string, unknown> = {}) => ({
  policy_id: id,
  policy_name: name,
  policy_description: `${name} policy`,
  enforce_totp_2fa: false,
  enforce_email_2fa: false,
  has_ip_restriction: false,
  has_geo_restriction: false,
  allowed_ips: [],
  allowed_geo_locations: [],
  ...extra,
})

let policies: ReturnType<typeof rawPolicy>[] = []
let userCounts: Record<number, number> = {}

const serve = () =>
  api.get.mockImplementation(async (url: string) => {
    if (url === '/policy/access-restriction/list') return { data: policies }
    const id = Number(url.split('/').pop())
    if (url.startsWith('/policy/access-restriction/get/')) return { data: policies.find((p) => p.policy_id === id) }
    if (url.startsWith('/policy/access-restriction/check/')) return { data: userCounts[id] ?? 0 }
    return { data: [] }
  })

const renderPage = (permissions = ALL) =>
  renderWithProviders(<AdminAccessPoliciesPage />, { route: '/admin/access-policies', user: makeUser({ permissions }) })

describe('AdminAccessPoliciesPage', () => {
  beforeEach(() => {
    policies = [
      rawPolicy(1, 'Office only', {
        enforce_totp_2fa: true,
        has_ip_restriction: true,
        allowed_ips: ['203.0.113.0/24', '198.51.100.7'],
      }),
      rawPolicy(2, 'Open'),
    ]
    userCounts = { 1: 3 }
    serve()
  })

  it('lists policies with their 2FA and sign-in limits', async () => {
    renderPage()
    const row = (await screen.findByText('Office only')).closest('tr') as HTMLElement
    expect(within(row).getByText('Authenticator app')).toBeInTheDocument()
    expect(within(row).getByText('IP 203.0.113.0/24 +1')).toBeInTheDocument()
    const open = screen.getByText('Open').closest('tr') as HTMLElement
    expect(within(open).getByText('Anywhere')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/policy/access-restriction/list', { params: { limit: 100, offset: 0 } })
  })

  it('asks for policy:ar:view instead of loading without it', async () => {
    renderPage([])
    expect(await screen.findByText(/policy:ar:view/)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/policy/access-restriction/list', expect.anything())
    expect(screen.queryByRole('button', { name: 'New policy' })).not.toBeInTheDocument()
  })

  it('hides or disables actions the user has no permission for', async () => {
    renderPage(['policy:ar:view'])
    await screen.findByText('Office only')
    expect(screen.queryByRole('button', { name: 'New policy' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Duplicate / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
    const edit = screen.getByRole('button', { name: 'Edit Office only' })
    expect(edit).toBeDisabled()
    expect(edit).toHaveAttribute('title', expect.stringContaining('policy:ar:edit'))
  })

  it('shows a policy with how many users have it', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Office only' }))
    expect(await within(dialog()).findByText('3 users')).toBeInTheDocument()
    expect(within(dialog()).getByText('198.51.100.7')).toBeInTheDocument()
  })

  it('creates a policy, picking countries from the list', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'New policy' }))
    fireEvent.change(await within(await screen.findByRole('dialog')).findByLabelText('Name'), { target: { value: 'India' } })
    fireEvent.click(within(dialog()).getByRole('switch', { name: /Require email codes/ }))
    fireEvent.click(within(dialog()).getByRole('switch', { name: /Restrict by country/ }))
    const countries = within(dialog()).getByRole('combobox', { name: 'Allowed countries' })
    fireEvent.change(countries, { target: { value: 'ind' } })
    fireEvent.click(within(dialog()).getByRole('option', { name: /^India/ }))
    fireEvent.change(countries, { target: { value: 'united states' } })
    fireEvent.keyDown(countries, { key: 'Enter' })
    expect(within(dialog()).getByText('India (IN)')).toBeInTheDocument()
    expect(within(dialog()).getByText('United States (US)')).toBeInTheDocument()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create policy' }))
    expect(await screen.findByText('Created India.')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/policy/access-restriction/create', {
      policy_name: 'India',
      description: '',
      enforce_totp_2fa: false,
      enforce_email_2fa: true,
      set_ip_restriction: false,
      set_geo_restriction: true,
      allowed_ips: [],
      allowed_geo_locations: ['IN', 'US'],
    })
  })

  it('needs at least one country when the country limit is on', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'New policy' }))
    fireEvent.change(await within(await screen.findByRole('dialog')).findByLabelText('Name'), { target: { value: 'Geo' } })
    fireEvent.click(within(dialog()).getByRole('switch', { name: /Restrict by country/ }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create policy' }))
    expect(await within(dialog()).findByText('Pick at least one country.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows country names for a saved policy', async () => {
    policies[1] = rawPolicy(2, 'Open', { has_geo_restriction: true, allowed_geo_locations: ['IN', 'DE'] })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Open' }))
    expect(await within(dialog()).findByText('India (IN)')).toBeInTheDocument()
    expect(within(dialog()).getByText('Germany (DE)')).toBeInTheDocument()
  })

  it('rejects a bad IP and a duplicate name before calling the API', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'New policy' }))
    fireEvent.change(await within(await screen.findByRole('dialog')).findByLabelText('Name'), { target: { value: 'Open' } })
    fireEvent.click(within(dialog()).getByRole('switch', { name: /Restrict by IP address/ }))
    fireEvent.change(within(dialog()).getByLabelText('Allowed IP addresses'), { target: { value: '300.1.1.1' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create policy' }))
    expect(await within(dialog()).findByText(/Use IPv4 addresses/)).toBeInTheDocument()
    fireEvent.change(within(dialog()).getByLabelText('Allowed IP addresses'), { target: { value: '10.0.0.1' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create policy' }))
    expect(await within(dialog()).findByText('A policy called "Open" already exists.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('edits only the rules through PATCH', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Office only' }))
    await waitFor(() => expect(within(dialog()).getByLabelText('Name')).toHaveValue('Office only'))
    expect(api.get).toHaveBeenCalledWith('/policy/access-restriction/get/1')
    fireEvent.click(within(dialog()).getByRole('switch', { name: /Require an authenticator app/ }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved Office only.')).toBeInTheDocument()
    expect(api.patch).toHaveBeenCalledWith('/policy/access-restriction/update/1', {
      enforce_totp_2fa: false,
      enforce_email_2fa: false,
      set_ip_restriction: true,
      set_geo_restriction: false,
      allowed_ips: ['203.0.113.0/24', '198.51.100.7'],
      allowed_geo_locations: [],
    })
    expect(api.put).not.toHaveBeenCalled()
  })

  it('duplicates a policy as a new one', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate Office only' }))
    expect(await within(dialog()).findByLabelText('Name')).toHaveValue('Office only (copy)')
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create policy' }))
    expect(await screen.findByText('Created Office only (copy).')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith(
      '/policy/access-restriction/create',
      expect.objectContaining({ policy_name: 'Office only (copy)', allowed_ips: ['203.0.113.0/24', '198.51.100.7'] }),
    )
  })

  it('warns how many users a delete affects, then deletes', async () => {
    api.delete.mockImplementation(async () => {
      policies = policies.filter((p) => p.policy_id !== 1)
      return { data: undefined }
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Office only' }))
    expect(await within(dialog()).findByText(/3 users have this policy/)).toBeInTheDocument()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete policy' }))
    expect(await screen.findByText('Deleted Office only.')).toBeInTheDocument()
    expect(api.delete).toHaveBeenCalledWith('/policy/access-restriction/delete/1')
    await waitFor(() => expect(screen.queryByText('Office only policy')).not.toBeInTheDocument())
  })
})
