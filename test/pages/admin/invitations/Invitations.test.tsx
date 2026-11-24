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
/** Tests for Admin › Invitations (list, view and send pages), on the (mocked) live API. */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ROUTES } from '@/constants/routes'
import { InvitationDetailPage } from '@/pages/admin/invitations/details'
import { InvitationFormPage } from '@/pages/admin/invitations/form'
import { AdminInvitationsPage } from '@/pages/admin/invitations/list'
import { api, makeUser, RAW_ROLES, RAW_USERS, renderWithProviders } from '../../../testUtils'

const dialog = () => screen.getByRole('dialog')

const ALL = ['user:invite:view', 'user:invite:create', 'user:invite:delete', 'user:create', 'user:role:view', 'policy:ar:view']

const DAY = 86_400_000
const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()

const rawInvitation = (id: number, email: string, extra: Record<string, unknown> = {}) => ({
  invitation_id: id,
  email,
  invitation_notes: '',
  role_id: 2,
  access_restriction_policy_id: null,
  invited_at: iso(-DAY),
  expires_at: iso(6 * DAY),
  ...extra,
})

const RAW_POLICIES = [
  {
    policy_id: 4,
    policy_name: 'Office only',
    policy_description: '',
    enforce_totp_2fa: true,
    enforce_email_2fa: false,
    has_ip_restriction: false,
    has_geo_restriction: false,
    allowed_ips: [],
    allowed_geo_locations: [],
  },
]

let invitations: ReturnType<typeof rawInvitation>[] = []

const serve = () =>
  api.get.mockImplementation(async (url: string) => {
    if (url === '/invite/list') return { data: invitations }
    if (url === '/user/roles/list') return { data: RAW_ROLES }
    if (url === '/policy/access-restriction/list') return { data: RAW_POLICIES }
    if (url === '/user/admin/list') return { data: RAW_USERS }
    return { data: [] }
  })

const renderPage = (permissions = ALL) =>
  renderWithProviders(<AdminInvitationsPage />, { route: ROUTES.adminInvitations, user: makeUser({ permissions }) })
const renderView = (id: number, permissions = ALL) =>
  renderWithProviders(<InvitationDetailPage />, {
    route: `/admin/invitations/${id}`,
    path: ROUTES.adminInvitation,
    user: makeUser({ permissions }),
  })
const renderNew = (permissions = ALL) =>
  renderWithProviders(<InvitationFormPage />, {
    route: ROUTES.adminInvitationNew,
    path: ROUTES.adminInvitationNew,
    user: makeUser({ permissions }),
  })
const location = () => screen.findByTestId('location', {}, { timeout: 2000 })

beforeEach(() => {
  invitations = [
    rawInvitation(1, 'priya@company.com', { invitation_notes: 'Joining the SRE team', access_restriction_policy_id: 4 }),
    rawInvitation(2, 'old@company.com', { invited_at: iso(-10 * DAY), expires_at: iso(-DAY) }),
  ]
  serve()
})

describe('Invitations list', () => {
  it('lists invitations with their role, policy and expiry', async () => {
    renderPage()
    const row = (await screen.findByText('priya@company.com')).closest('tr') as HTMLElement
    expect(within(row).getByText('Admin')).toBeInTheDocument()
    expect(within(row).getByText('Office only')).toBeInTheDocument()
    expect(within(row).getByText('Joining the SRE team')).toBeInTheDocument()
    expect(within(row).getByText('in 6 days')).toBeInTheDocument()
    const old = screen.getByText('old@company.com').closest('tr') as HTMLElement
    expect(within(old).getByText('None')).toBeInTheDocument()
    expect(within(old).getByText('Expired')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/invite/list', { params: { limit: 100, offset: 0 } })
  })

  it('asks for user:invite:view instead of loading without it', async () => {
    renderPage([])
    expect(await screen.findByText(/user:invite:view/)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/invite/list', expect.anything())
    expect(screen.queryByRole('button', { name: 'Invite someone' })).not.toBeInTheDocument()
  })

  it('needs user:create as well as user:invite:create to send, and user:invite:delete to revoke', async () => {
    renderPage(['user:invite:view', 'user:invite:create'])
    await screen.findByText('priya@company.com')
    expect(screen.queryByRole('button', { name: 'Invite someone' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Revoke / })).not.toBeInTheDocument()
  })

  it("links to the send page and each invitation's own page", async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: 'priya@company.com' })).toHaveAttribute('href', '/admin/invitations/1')
    fireEvent.click(screen.getByRole('button', { name: 'Invite someone' }))
    expect(await location()).toHaveTextContent('/admin/invitations/new')
  })

  it('revokes an invitation', async () => {
    api.delete.mockImplementation(async () => {
      invitations = invitations.filter((i) => i.invitation_id !== 1)
      return { data: undefined }
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke invitation for priya@company.com' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Revoke invitation' }))
    expect(await screen.findByText('Revoked the invitation for priya@company.com.')).toBeInTheDocument()
    expect(api.delete).toHaveBeenCalledWith('/invite/delete/1')
    await waitFor(() => expect(screen.queryByText('Joining the SRE team')).not.toBeInTheDocument())
  })

  it('shows the API error when the list fails', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url === '/invite/list') throw new Error('Internal server error')
      return { data: [] }
    })
    renderPage()
    expect(await screen.findByText(/Couldn't load invitations: Internal server error/)).toBeInTheDocument()
  })
})

describe('Invitation page', () => {
  it('shows who it is for, the role, policy and note', async () => {
    renderView(1)
    expect(await screen.findByRole('heading', { name: 'priya@company.com' })).toBeInTheDocument()
    expect(await screen.findByText('Admin')).toBeInTheDocument()
    expect(await screen.findByText('Office only')).toBeInTheDocument()
    expect(screen.getByText('Joining the SRE team')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument() // the API can't edit invitations
  })

  it('marks an expired invitation', async () => {
    renderView(2)
    expect(await screen.findByText('Expired')).toBeInTheDocument()
  })

  it('says so when the invitation is gone', async () => {
    renderView(99)
    expect(await screen.findByText(/There's no invitation here/)).toBeInTheDocument()
  })

  it('revokes it and returns to the list', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    renderView(1)
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Revoke invitation' }))
    expect(await screen.findByText('Revoked the invitation for priya@company.com.')).toBeInTheDocument()
    expect(api.delete).toHaveBeenCalledWith('/invite/delete/1')
    expect(await location()).toHaveTextContent(/^\/admin\/invitations$/)
  })

  it('hides Revoke without user:invite:delete', async () => {
    renderView(1, ['user:invite:view'])
    await screen.findByRole('heading', { name: 'priya@company.com' })
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument()
  })
})

describe('Send invitation page', () => {
  it('sends an invitation with the picked role, policy and expiry, then returns to the list', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderNew()
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'New.Person@Company.com' } })
    await screen.findByRole('option', { name: 'Operator' })
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: '3' } })
    await screen.findByRole('option', { name: 'Office only' })
    fireEvent.change(screen.getByLabelText('Access policy'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Expires after'), { target: { value: '24' } })
    fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'See you Monday' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText('Invitation sent to new.person@company.com.')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/invite/new', {
      invite_to_email: 'new.person@company.com',
      invitation_notes: 'See you Monday',
      role_id: 3,
      access_restriction_policy_id: 4,
      expiration_datetime: expect.any(String),
    })
    const sent = Date.parse((api.post.mock.calls[0][1] as { expiration_datetime: string }).expiration_datetime)
    expect(Math.abs(sent - (Date.now() + DAY))).toBeLessThan(60_000)
    expect(await location()).toHaveTextContent(/^\/admin\/invitations$/)
  })

  it('sends no policy by default', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderNew()
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'a@b.co' } })
    await screen.findByRole('option', { name: 'Operator' })
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/invite/new', expect.objectContaining({ access_restriction_policy_id: null })),
    )
  })

  it('catches an email that is already invited, and a missing role, before calling the API', async () => {
    renderNew()
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'Priya@company.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText('Pick a role.')).toBeInTheDocument()
    await screen.findByRole('option', { name: 'Operator' })
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/invite/list', expect.anything()))
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText(/already has an invitation/)).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('asks for the send permissions without them', async () => {
    renderNew(['user:invite:view', 'user:invite:create'])
    expect(await screen.findByText(/user:invite:create, user:create/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })
})
