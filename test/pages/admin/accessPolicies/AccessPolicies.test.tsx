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
/** Tests for Admin › Access policies (list, view, create and edit pages), on the (mocked) live API. */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ROUTES } from '@/constants/routes'
import { AccessPolicyDetailPage } from '@/pages/admin/accessPolicies/details'
import { AccessPolicyFormPage } from '@/pages/admin/accessPolicies/form'
import { AdminAccessPoliciesPage } from '@/pages/admin/accessPolicies/list'
import { ApiError } from '@/types/api'
import { api, makeUser, renderWithProviders } from '../../../testUtils'

const ALL = ['policy:ar:view', 'policy:ar:create', 'policy:ar:edit', 'policy:ar:delete']

const rawPolicy = (id: number, name: string, extra: Record<string, unknown> = {}) => ({
  policy_id: id,
  policy_name: name,
  policy_description: `${name} policy`,
  enforce_totp_2fa: false,
  enforce_email_2fa: false,
  allow_device_logins: true,
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
    if (url.startsWith('/policy/access-restriction/get/')) {
      const found = policies.find((p) => p.policy_id === id)
      if (!found) throw new ApiError('Not found', 404)
      return { data: found }
    }
    if (url.startsWith('/policy/access-restriction/check/')) return { data: userCounts[id] ?? 0 }
    return { data: [] }
  })

const as = (permissions = ALL) => ({ user: makeUser({ permissions }) })
const renderList = (permissions = ALL) =>
  renderWithProviders(<AdminAccessPoliciesPage />, { route: ROUTES.adminAccessPolicies, ...as(permissions) })
const renderView = (id: number, permissions = ALL) =>
  renderWithProviders(<AccessPolicyDetailPage />, {
    route: `/admin/access-policies/${id}`,
    path: ROUTES.adminAccessPolicy,
    ...as(permissions),
  })
const renderNew = (query = '', permissions = ALL) =>
  renderWithProviders(<AccessPolicyFormPage />, {
    route: `${ROUTES.adminAccessPolicyNew}${query}`,
    path: ROUTES.adminAccessPolicyNew,
    ...as(permissions),
  })
const renderEdit = (id: number, permissions = ALL) =>
  renderWithProviders(<AccessPolicyFormPage />, {
    route: `/admin/access-policies/${id}/edit`,
    path: ROUTES.adminAccessPolicyEdit,
    ...as(permissions),
  })
const location = () => screen.findByTestId('location', {}, { timeout: 2000 })

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

describe('Access policies list', () => {
  it('lists policies with their 2FA and sign-in limits', async () => {
    renderList()
    const row = (await screen.findByText('Office only')).closest('tr') as HTMLElement
    expect(within(row).getByText('Authenticator app')).toBeInTheDocument()
    expect(within(row).getByText('IP 203.0.113.0/24 +1')).toBeInTheDocument()
    const open = screen.getByText('Open').closest('tr') as HTMLElement
    expect(within(open).getByText('Anywhere')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/policy/access-restriction/list', { params: { limit: 100, offset: 0 } })
  })

  it('asks for policy:ar:view instead of loading without it', async () => {
    renderList([])
    expect(await screen.findByText(/policy:ar:view/)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/policy/access-restriction/list', expect.anything())
    expect(screen.queryByRole('button', { name: 'New policy' })).not.toBeInTheDocument()
  })

  it('hides or disables actions the user has no permission for', async () => {
    renderList(['policy:ar:view'])
    await screen.findByText('Office only')
    expect(screen.queryByRole('button', { name: 'New policy' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Duplicate / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
    const edit = screen.getByRole('button', { name: 'Edit Office only' })
    expect(edit).toBeDisabled()
    expect(edit).toHaveAttribute('title', expect.stringContaining('policy:ar:edit'))
  })

  it('opens each policy page instead of a popup', async () => {
    renderList()
    expect(await screen.findByRole('link', { name: 'Office only' })).toHaveAttribute('href', '/admin/access-policies/1')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Office only' }))
    expect(await location()).toHaveTextContent('/admin/access-policies/1/edit')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('goes to the new-policy page, and to a copy for Duplicate', async () => {
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate Open' }))
    expect(await location()).toHaveTextContent('/admin/access-policies/new')
  })

  it('warns how many users a delete affects, then deletes', async () => {
    api.delete.mockImplementation(async () => {
      policies = policies.filter((p) => p.policy_id !== 1)
      return { data: undefined }
    })
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Office only' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(await dialog.findByText(/3 users have this policy/)).toBeInTheDocument()
    fireEvent.click(dialog.getByRole('button', { name: 'Delete policy' }))
    expect(await screen.findByText('Deleted Office only.')).toBeInTheDocument()
    expect(api.delete).toHaveBeenCalledWith('/policy/access-restriction/delete/1')
    await waitFor(() => expect(screen.queryByText('Office only policy')).not.toBeInTheDocument())
  })
})

describe('Access policy page', () => {
  it('shows a policy with its rules and how many users have it', async () => {
    renderView(1)
    expect(await screen.findByRole('heading', { name: 'Office only' })).toBeInTheDocument()
    expect(screen.getByText('Office only policy')).toBeInTheDocument()
    expect(await screen.findByText('3 users')).toBeInTheDocument()
    expect(screen.getByText('198.51.100.7')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Access policies' })).toHaveAttribute('href', '/admin/access-policies')
  })

  it('sums the policy up in tiles, with Edit and Back on the same row as the path', async () => {
    renderView(1)
    expect(await screen.findByText('1 required')).toBeInTheDocument() // two-factor
    expect(screen.getByText('2 allowed')).toBeInTheDocument() // IPs
    expect(screen.getByText('203.0.113.0 – 203.0.113.255 · 256 addresses')).toBeInTheDocument()
    expect(screen.getByText('Any country')).toBeInTheDocument()
    const edit = screen.getByRole('button', { name: 'Edit' })
    expect(edit.parentElement).toBe(screen.getByRole('link', { name: 'Back' }).parentElement)
  })

  it('shows country names for a saved policy', async () => {
    policies[1] = rawPolicy(2, 'Open', { has_geo_restriction: true, allowed_geo_locations: ['IN', 'DE'] })
    renderView(2)
    expect(await screen.findByText('India (IN)')).toBeInTheDocument()
    expect(screen.getByText('Germany (DE)')).toBeInTheDocument()
  })

  it('says so when the policy is gone', async () => {
    renderView(99)
    expect(await screen.findByText(/no access policy here/)).toBeInTheDocument()
  })

  it('goes to the edit and duplicate pages, and deletes back to the list', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    renderView(1)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete policy' }))
    expect(await screen.findByText('Deleted Office only.')).toBeInTheDocument()
    expect(await location()).toHaveTextContent(/^\/admin\/access-policies$/)
  })

  it('disables Edit without policy:ar:edit', async () => {
    renderView(1, ['policy:ar:view'])
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Duplicate' })).not.toBeInTheDocument()
  })
})

describe('New / edit access policy page', () => {
  it('creates a policy, picking countries from the list, then goes back to the list', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderNew()
    expect(screen.getByRole('heading', { name: 'New access policy' })).toBeInTheDocument()
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'India' } })
    fireEvent.click(screen.getByRole('switch', { name: /Require email codes/ }))
    fireEvent.click(screen.getByRole('switch', { name: /Restrict by country/ }))
    const countries = screen.getByRole('combobox', { name: 'Allowed countries' })
    fireEvent.change(countries, { target: { value: 'ind' } })
    fireEvent.click(screen.getByRole('option', { name: /^India/ }))
    fireEvent.change(countries, { target: { value: 'united states' } })
    fireEvent.keyDown(countries, { key: 'Enter' })
    expect(screen.getByText('India (IN)')).toBeInTheDocument()
    expect(screen.getByText('United States (US)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    expect(await screen.findByText('Created India.')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/policy/access-restriction/create', {
      policy_name: 'India',
      description: '',
      enforce_totp_2fa: false,
      enforce_email_2fa: true,
      allow_device_logins: true,
      set_ip_restriction: false,
      set_geo_restriction: true,
      allowed_ips: [],
      allowed_geo_locations: ['IN', 'US'],
    })
    expect(await location()).toHaveTextContent(/^\/admin\/access-policies$/)
  })

  it('sums up the policy as the form changes', async () => {
    renderNew()
    const summary = within((await screen.findByText('Summary')).closest('aside') as HTMLElement)
    expect(summary.getByText(/need no second factor, and can sign in from anywhere/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Office' } })
    fireEvent.click(screen.getByRole('switch', { name: /Require an authenticator app/ }))
    fireEvent.click(screen.getByRole('switch', { name: /Restrict by IP address/ }))
    expect(summary.getByText(/needs at least one entry/)).toBeInTheDocument()
    const ip = screen.getByLabelText('Allowed IP addresses and ranges')
    fireEvent.change(ip, { target: { value: '10.0.0.0/8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add IP or range' }))
    fireEvent.change(ip, { target: { value: '10.1.1.1' } })
    fireEvent.keyDown(ip, { key: 'Enter' })
    expect(summary.getByText('Office')).toBeInTheDocument()
    expect(
      summary.getByText(/must sign in with an authenticator app, and can sign in only from 2 IP addresses or ranges/),
    ).toBeInTheDocument()
    expect(summary.getByText('10.0.0.0/8')).toBeInTheDocument()
    expect(summary.queryByText(/needs at least one entry/)).not.toBeInTheDocument()
  })

  it('needs at least one country when the country limit is on', async () => {
    renderNew()
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Geo' } })
    fireEvent.click(screen.getByRole('switch', { name: /Restrict by country/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    expect(await screen.findByText('Pick at least one country.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('rejects a bad IP and a duplicate name before calling the API', async () => {
    renderNew()
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Open' } })
    fireEvent.click(screen.getByRole('switch', { name: /Restrict by IP address/ }))
    const ip = screen.getByLabelText('Allowed IP addresses and ranges')
    fireEvent.change(ip, { target: { value: '300.1.1.1' } })
    fireEvent.keyDown(ip, { key: 'Enter' })
    expect(await screen.findByText(/Enter an IP address like/)).toBeInTheDocument()
    expect(ip).toHaveValue('300.1.1.1') // kept, so it can be fixed
    fireEvent.change(ip, { target: { value: '10.0.0.1' } })
    fireEvent.keyDown(ip, { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    expect(await screen.findByText('A policy called "Open" already exists.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('adds IPs and CIDR ranges from one input and lists them below', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderNew()
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Ranges' } })
    fireEvent.click(screen.getByRole('switch', { name: /Restrict by IP address/ }))
    const ip = screen.getByLabelText('Allowed IP addresses and ranges')
    expect(screen.getByText('No addresses added yet.')).toBeInTheDocument()

    // a range with host bits set isn't added (the API would refuse it), with a one-click fix
    fireEvent.change(ip, { target: { value: '203.0.113.5/24' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add IP or range' }))
    expect(await screen.findByText(/isn't the start of a \/24 range/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add 203.0.113.0/24 instead' }))
    const list = within(screen.getByRole('list', { name: 'Allowed IP addresses' }))
    expect(list.getByText('203.0.113.0/24')).toBeInTheDocument()
    expect(list.getByText('203.0.113.0 – 203.0.113.255 · 256 addresses')).toBeInTheDocument()
    expect(ip).toHaveValue('')

    // pasting a list adds each valid entry, normalized; a repeat stays in the input with the reason
    fireEvent.paste(ip, { clipboardData: { getData: () => '198.51.100.7, 2001:0db8::0001\n203.0.113.0/24' } })
    expect(list.getByText('198.51.100.7')).toBeInTheDocument()
    expect(list.getByText('2001:db8::1')).toBeInTheDocument()
    expect(ip).toHaveValue('203.0.113.0/24')
    expect(screen.getByText('203.0.113.0/24 is already in the list.')).toBeInTheDocument()

    // saving with something typed but not added asks to add or clear it
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    expect(await screen.findByText('Press + to add this to the list, or clear it.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
    fireEvent.change(ip, { target: { value: '' } })
    fireEvent.click(list.getByRole('button', { name: 'Remove 198.51.100.7' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    expect(await screen.findByText('Created Ranges.')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith(
      '/policy/access-restriction/create',
      expect.objectContaining({ set_ip_restriction: true, allowed_ips: ['203.0.113.0/24', '2001:db8::1'] }),
    )
  })

  it('edits an added IP in place, checking it like a new one', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    renderEdit(1)
    const list = within(await screen.findByRole('list', { name: 'Allowed IP addresses' }))
    fireEvent.click(list.getByRole('button', { name: 'Edit 198.51.100.7' }))
    const input = list.getByRole('textbox', { name: 'Edit 198.51.100.7' })
    expect(input).toHaveValue('198.51.100.7')

    // a duplicate and a range with host bits set aren't saved
    fireEvent.change(input, { target: { value: '203.0.113.0/24' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(list.getByText('203.0.113.0/24 is already in the list.')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '198.51.100.9/30' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.click(list.getByRole('button', { name: 'Use 198.51.100.8/30' }))
    expect(list.getByText('198.51.100.8/30')).toBeInTheDocument()
    expect(list.queryByText('198.51.100.7')).not.toBeInTheDocument()

    // Escape leaves an entry as it was
    fireEvent.click(list.getByRole('button', { name: 'Edit 203.0.113.0/24' }))
    fireEvent.change(list.getByRole('textbox', { name: 'Edit 203.0.113.0/24' }), { target: { value: '10.0.0.1' } })
    fireEvent.keyDown(list.getByRole('textbox', { name: 'Edit 203.0.113.0/24' }), { key: 'Escape' })
    expect(list.getByText('203.0.113.0/24')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved Office only.')).toBeInTheDocument()
    expect(api.patch).toHaveBeenCalledWith(
      '/policy/access-restriction/update/1',
      expect.objectContaining({ allowed_ips: ['203.0.113.0/24', '198.51.100.8/30'] }),
    )
  })

  it('lists the saved IPs of a policy being edited', async () => {
    renderEdit(1)
    const list = within(await screen.findByRole('list', { name: 'Allowed IP addresses' }))
    expect(list.getByText('203.0.113.0/24')).toBeInTheDocument()
    expect(list.getByText('198.51.100.7')).toBeInTheDocument()
  })

  it('duplicates a policy as a new one from ?from=', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderNew('?from=1')
    expect(await screen.findByLabelText('Name')).toHaveValue('Office only (copy)')
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    expect(await screen.findByText('Created Office only (copy).')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith(
      '/policy/access-restriction/create',
      expect.objectContaining({ policy_name: 'Office only (copy)', allowed_ips: ['203.0.113.0/24', '198.51.100.7'] }),
    )
  })

  it('edits only the rules through PATCH, then returns to the policy', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    renderEdit(1)
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Office only'))
    expect(screen.getByRole('heading', { name: 'Edit Office only' })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/policy/access-restriction/get/1')
    fireEvent.click(screen.getByRole('switch', { name: /Require an authenticator app/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved Office only.')).toBeInTheDocument()
    expect(api.patch).toHaveBeenCalledWith('/policy/access-restriction/update/1', {
      enforce_totp_2fa: false,
      enforce_email_2fa: false,
      allow_device_logins: true,
      set_ip_restriction: true,
      set_geo_restriction: false,
      allowed_ips: ['203.0.113.0/24', '198.51.100.7'],
      allowed_geo_locations: [],
    })
    expect(api.put).not.toHaveBeenCalled()
    expect(await location()).toHaveTextContent('/admin/access-policies/1')
  })

  it('turns the mobile app off for a policy', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    renderEdit(1)
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Office only'))
    const toggle = screen.getByRole('switch', { name: /Allow the mobile app/ })
    expect(toggle).toBeChecked()
    fireEvent.click(toggle)
    const summary = within(screen.getByText('Summary').closest('aside') as HTMLElement)
    expect(summary.getByText('Not allowed')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        '/policy/access-restriction/update/1',
        expect.objectContaining({ allow_device_logins: false }),
      ),
    )
  })

  it('shows in the action bar whether there are unsaved changes', async () => {
    renderEdit(1)
    expect(await screen.findByText('No changes yet')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Office' } })
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()
  })

  it('has a Back button to where it came from', async () => {
    renderEdit(1)
    expect(await screen.findByRole('link', { name: 'Back' })).toHaveAttribute('href', '/admin/access-policies/1')
  })

  it('goes Back to the list from a new policy and from a policy page', async () => {
    const { unmount } = renderNew()
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/admin/access-policies')
    unmount()
    renderView(1)
    expect(await screen.findByRole('link', { name: 'Back' })).toHaveAttribute('href', '/admin/access-policies')
  })

  it('returns to the list it was opened from, with Back, Cancel and after saving', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    const fromList = { history: [ROUTES.adminAccessPolicies] }
    const edit = (permissions = ALL) =>
      renderWithProviders(<AccessPolicyFormPage />, {
        route: '/admin/access-policies/1/edit',
        path: ROUTES.adminAccessPolicyEdit,
        ...as(permissions),
        ...fromList,
      })

    let view = edit()
    fireEvent.click(await screen.findByRole('link', { name: 'Back' }))
    expect(await location()).toHaveTextContent(/^\/admin\/access-policies$/)
    view.unmount()

    view = edit()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(await location()).toHaveTextContent(/^\/admin\/access-policies$/)
    view.unmount()

    edit()
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Office only'))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Office' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved Office.')).toBeInTheDocument()
    expect(await location()).toHaveTextContent(/^\/admin\/access-policies$/)
  })

  it('returns to the policy page when the edit was opened from there', async () => {
    renderWithProviders(<AccessPolicyFormPage />, {
      route: '/admin/access-policies/1/edit',
      path: ROUTES.adminAccessPolicyEdit,
      ...as(),
      history: [ROUTES.adminAccessPolicies, '/admin/access-policies/1'],
    })
    fireEvent.click(await screen.findByRole('link', { name: 'Back' }))
    expect(await location()).toHaveTextContent(/^\/admin\/access-policies\/1$/)
  })

  it('Cancel goes back without saving', async () => {
    renderEdit(1)
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(await location()).toHaveTextContent('/admin/access-policies/1')
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('explains a missing permission instead of showing the form', async () => {
    renderNew('', ['policy:ar:view'])
    expect(await screen.findByText(/policy:ar:create/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })
})
