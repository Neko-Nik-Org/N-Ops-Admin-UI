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
/** Tests for Admin › Users (list, view, add and edit pages), on the (mocked) live API. */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ROUTES } from '@/constants/routes'
import { resetAdminMock } from '@/data/mockAdmin'
import { UserDetailPage } from '@/pages/admin/users/details'
import { UserFormPage } from '@/pages/admin/users/form'
import { AdminUsersPage } from '@/pages/admin/users/list'
import { api, makeUser, RAW_ORG_INFO, RAW_USERS, rawRole, renderWithProviders, serveLiveReads } from '../../../testUtils'

const VIEWER = ['user:view', 'user:role:view', 'policy:ar:view']
const EDITOR = ['user:view', 'user:role:view', 'user:create', 'user:edit', 'user:delete']

const as = (permissions: string[]) => ({ user: makeUser({ permissions }) })
const renderList = (permissions = VIEWER) =>
  renderWithProviders(<AdminUsersPage />, { route: ROUTES.adminUsers, ...as(permissions) })
const renderView = (id: number, permissions = EDITOR) =>
  renderWithProviders(<UserDetailPage />, { route: `/admin/users/${id}`, path: ROUTES.adminUser, ...as(permissions) })
const renderNew = (permissions = EDITOR) =>
  renderWithProviders(<UserFormPage />, { route: ROUTES.adminUserNew, path: ROUTES.adminUserNew, ...as(permissions) })
const renderEdit = (id: number, permissions = EDITOR) =>
  renderWithProviders(<UserFormPage />, { route: `/admin/users/${id}/edit`, path: ROUTES.adminUserEdit, ...as(permissions) })
const location = () => screen.findByTestId('location', {}, { timeout: 2000 })
/** The open <dialog> with this name. */
const dialog = (name: string | RegExp) => within(screen.getByRole('dialog', { name }))

/** Also answers the username availability check (200 = free, 409 = taken). */
const serveWithUsernames = (taken: string[] = []) => {
  const reads = api.get.getMockImplementation()!
  api.get.mockImplementation(async (url: string, config?: unknown) =>
    url.startsWith('/user/self/user-name/check/')
      ? { data: null, status: taken.includes(url.split('/').pop()!) ? 409 : 200 }
      : reads(url, config as never),
  )
}

/** Fills the add-user form's required fields (waits for the roles to load). */
const fillNewUser = async ({ userName = 'zoe_park', email = 'zoe@acme.dev', roleId = '4', password = 'Start#Pass1' } = {}) => {
  fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Zoe Park' } })
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: userName } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  await waitFor(() => expect(within(screen.getByLabelText('Role')).getAllByRole('option').length).toBeGreaterThan(1))
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: roleId } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: password } })
}

beforeEach(() => {
  resetAdminMock()
  serveLiveReads()
})

describe('Users list', () => {
  it('lists the real users and filters them by search, role and status', async () => {
    renderList()
    expect(await screen.findByText('Priya Rao')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/admin/list', { params: { limit: 100, offset: 0 } })
    expect(screen.queryByRole('button', { name: 'Add user' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search name, username or email'), { target: { value: 'marcus' } })
    expect(screen.getByText('Marcus Chen')).toBeInTheDocument()
    expect(screen.queryByText('Priya Rao')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search name, username or email'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'inactive' } })
    expect(screen.getAllByRole('row')).toHaveLength(2) // header + Dev Malhotra
    expect(screen.getByText('Dev Malhotra')).toBeInTheDocument()
  })

  it('shows Never for someone who has not signed in yet', async () => {
    renderList()
    const kenji = (await screen.findByText('Kenji Watanabe')).closest('tr') as HTMLElement
    expect(within(kenji).getByText('Never')).toBeInTheDocument()
    expect(within(kenji).getByText('Email unverified')).toBeInTheDocument()
  })

  it('takes role names from the real roles', async () => {
    serveLiveReads({ roles: [rawRole(4, 'Engineer')] })
    renderList()
    const tomas = (await screen.findByText('Tomás Ruiz')).closest('tr') as HTMLElement
    expect(await within(tomas).findByText('Engineer')).toBeInTheDocument() // real role 4
    const marcus = screen.getByText('Marcus Chen').closest('tr') as HTMLElement
    expect(within(marcus).getByText('Role #3')).toBeInTheDocument() // no real role with that id
  })

  it('links each user to their page, and Edit to the edit page', async () => {
    renderList(EDITOR)
    expect(await screen.findByRole('link', { name: 'Marcus Chen' })).toHaveAttribute('href', '/admin/users/3')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Marcus Chen' }))
    expect(await location()).toHaveTextContent('/admin/users/3/edit')
  })

  it('opens the add-user page, and disables it when every seat is taken', async () => {
    const { unmount } = renderList(EDITOR)
    fireEvent.click(await screen.findByRole('button', { name: 'Add user' }))
    expect(await location()).toHaveTextContent('/admin/users/new')
    unmount()
    serveLiveReads({ orgInfo: { ...RAW_ORG_INFO, current_user_count: 25 } })
    renderList(EDITOR)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add user' })).toBeDisabled())
  })

  it('deletes from a row', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    renderList(EDITOR)
    const row = (await screen.findByText('Marcus Chen')).closest('tr') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: 'Delete Marcus Chen' }))
    fireEvent.click(dialog('Delete user').getByRole('button', { name: 'Delete user' }))
    expect(await screen.findByText('Deleted Marcus Chen.')).toBeInTheDocument()
    expect(api.delete).toHaveBeenCalledWith('/user/admin/delete/3')
  })

  it('disables Edit and Delete on your own row, and hides them without user:edit', async () => {
    const { unmount } = renderList(EDITOR)
    const me = (await screen.findByText('Neko Nik')).closest('tr') as HTMLElement
    expect(within(me).getByRole('button', { name: 'Edit Neko Nik' })).toBeDisabled()
    expect(within(me).getByRole('button', { name: 'Delete Neko Nik' })).toBeDisabled()
    unmount()
    renderList()
    await screen.findByText('Marcus Chen')
    expect(screen.queryByRole('button', { name: 'Edit Marcus Chen' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View Marcus Chen' })).toBeInTheDocument()
  })

  it('needs user:delete, not user:edit, to delete', async () => {
    renderList(EDITOR.filter((p) => p !== 'user:delete'))
    await screen.findByText('Marcus Chen')
    expect(screen.getByRole('button', { name: 'Edit Marcus Chen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Marcus Chen' })).not.toBeInTheDocument()
  })

  it('asks for user:view instead of loading users without it', async () => {
    renderList([])
    expect(await screen.findByText(/You need the “View users” permission \(user:view\)/)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/user/admin/list', expect.anything())
  })
})

describe('User page', () => {
  it("shows a user's details, fetched by id", async () => {
    renderView(10, VIEWER)
    expect(await screen.findByRole('heading', { name: 'Sara Lindqvist' })).toBeInTheDocument()
    expect(await screen.findByText('sara@acme.dev')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/admin/fetch/10')
    expect(await screen.findByText('Sweden (SE)')).toBeInTheDocument()
    expect(screen.getAllByText('Email code')).toHaveLength(2) // the policy requires it; her own 2FA row
    expect(screen.getByText('Platform')).toBeInTheDocument() // from user_details
    // no actions without user:edit
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('leads to the edit page', async () => {
    renderView(3)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    expect(await location()).toHaveTextContent('/admin/users/3/edit')
  })

  it('deactivates a user, then deletes them and returns to the list', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    api.delete.mockResolvedValue({ data: undefined })
    renderView(3)
    fireEvent.click(await screen.findByRole('button', { name: 'Deactivate' }))
    fireEvent.click(dialog('Deactivate user').getByRole('button', { name: 'Deactivate' }))
    expect(await screen.findByText('Deactivated Marcus Chen.')).toBeInTheDocument()
    expect(api.patch).toHaveBeenCalledWith('/user/admin/deactivate/3')

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(dialog('Delete user').getByRole('button', { name: 'Delete user' }))
    expect(await screen.findByText('Deleted Marcus Chen.')).toBeInTheDocument()
    expect(api.delete).toHaveBeenCalledWith('/user/admin/delete/3')
    expect(await location()).toHaveTextContent(/^\/admin\/users$/)
  })

  it("changes a user's username and password, and marks their email verified", async () => {
    serveWithUsernames()
    api.put.mockResolvedValue({ data: undefined })
    api.patch.mockResolvedValue({ data: undefined })
    renderView(7)
    fireEvent.click(await screen.findByRole('button', { name: 'Mark email verified' }))
    expect(await screen.findByText(/^Marked .* as verified\.$/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Change username' }))
    const rename = within(await screen.findByRole('dialog', { name: /username$/ }))
    fireEvent.change(rename.getByLabelText('New username'), { target: { value: 'kenji_w' } })
    fireEvent.click(rename.getByRole('button', { name: 'Change username' }))
    expect(await screen.findByText('Kenji Watanabe now signs in as @kenji_w.')).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/user/admin/change-username/7', '"kenji_w"', expect.anything())

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }))
    const reset = within(await screen.findByRole('dialog', { name: /password$/ }))
    fireEvent.change(reset.getByLabelText('New password'), { target: { value: 'New#Pass12' } })
    fireEvent.change(reset.getByLabelText('Confirm password'), { target: { value: 'New#Pass12' } })
    fireEvent.click(reset.getByRole('button', { name: 'Set password' }))
    expect(await screen.findByText('Set a new password for Kenji Watanabe.')).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/user/admin/reset/password/7', JSON.stringify(btoa('New#Pass12')), expect.anything())
  })

  it("doesn't let you change yourself", async () => {
    renderView(1)
    await screen.findByRole('heading', { name: 'Neko Nik' })
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeDisabled()
  })

  it('says so when the user does not exist', async () => {
    renderView(99)
    expect(await screen.findByText(/There's no user here|Couldn't load this user/)).toBeInTheDocument()
  })
})

describe('Add user page', () => {
  it('adds a user after checking the username, with the API rules and a matching password', async () => {
    serveWithUsernames(['zoe'])
    api.post.mockResolvedValue({ data: 'User created successfully and a welcome email sent' })
    renderNew()
    await fillNewUser({ userName: '1zoe', password: 'weak' })
    fireEvent.click(screen.getByRole('button', { name: 'Add user' }))
    expect(await screen.findByText("Don't start with a digit.")).toBeInTheDocument()
    expect(screen.getByText('Use between 8 and 64 characters.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'zoe' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Start#Pass1' } })
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Start#Pass1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add user' }))
    expect(await screen.findByText('That username is taken.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'zoe_park' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add user' }))
    expect(await screen.findByText("Added Zoe Park. They've been sent a welcome email.")).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith(
      '/user/admin/create',
      expect.objectContaining({ user_name: 'zoe_park', role_id: 4, password: btoa('Start#Pass1'), is_active: true }),
    )
    expect(await location()).toHaveTextContent(/^\/admin\/users$/)
  })

  it('adds a user with profile details', async () => {
    serveWithUsernames()
    api.post.mockResolvedValue({ data: 'User created successfully and a welcome email sent' })
    renderNew()
    await fillNewUser()
    fireEvent.change(screen.getByLabelText('Job title'), { target: { value: 'SRE' } })
    fireEvent.change(screen.getByLabelText('GitHub username'), { target: { value: 'not valid!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add user' }))
    expect(await screen.findByText('GitHub usernames use letters, digits and single hyphens.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('GitHub username'), { target: { value: 'zoepark' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add user' }))
    expect(await screen.findByText("Added Zoe Park. They've been sent a welcome email.")).toBeInTheDocument()
    const body = api.post.mock.calls[0][1] as { user_details: Record<string, Record<string, unknown>> }
    expect(body.user_details.work).toEqual({ job_title: 'SRE' })
    expect(body.user_details.engineering).toMatchObject({ github_username: 'zoepark' })
  })

  it("won't add a user whose email someone already has", async () => {
    serveWithUsernames()
    renderNew()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/user/admin/list', expect.anything()))
    await fillNewUser({ email: 'MARCUS@acme.dev', roleId: '2' })
    fireEvent.click(screen.getByRole('button', { name: 'Add user' }))
    expect(await screen.findByText('Someone in your organization already uses this email.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('asks for the permissions without them, and refuses when every seat is taken', async () => {
    const { unmount } = renderNew(['user:view', 'user:role:view'])
    expect(await screen.findByText(/user:create, user:role:view/)).toBeInTheDocument()
    unmount()
    serveLiveReads({ orgInfo: { ...RAW_ORG_INFO, current_user_count: 25 } })
    renderNew()
    expect(await screen.findByText(/seats are all in use/)).toBeInTheDocument()
  })
})

describe('Edit user page', () => {
  it("edits a user's name, keeping their profile details and email", async () => {
    api.put.mockResolvedValue({ data: undefined })
    renderEdit(10)
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Sara Lindqvist'))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sara L' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved Sara L.')).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/user/admin/update/10', {
      display_name: 'Sara L',
      primary_email: null,
      user_details: { team: 'Platform', on_call: true },
    })
    // only the profile changed: the role and policy endpoints aren't called
    expect(api.put).toHaveBeenCalledTimes(1)
    expect(await location()).toHaveTextContent('/admin/users/10')
  })

  it("changes a user's role and access policy, and checks the API applied it", async () => {
    const users = RAW_USERS.map((u) => ({ ...u }))
    serveLiveReads({ users })
    api.put.mockImplementation(async (url: string, _body?: unknown, config?: unknown) => {
      const marcus = users.find((u) => u.user_id === 3)!
      if (url === '/user/admin/role/3/assign/4') marcus.role_id = 4
      if (url === '/user/admin/ar-policy/3/assign')
        marcus.access_restriction_policy_id =
          (config as { params: { access_restriction_policy_id?: number } }).params.access_restriction_policy_id ?? null
      return { data: undefined }
    })
    renderEdit(3, [...EDITOR, 'policy:ar:view'])
    await waitFor(() => expect(screen.getByLabelText('Access policy')).toHaveValue('1'))
    await screen.findByRole('option', { name: 'Developer' })
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Access policy'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved Marcus Chen.')).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/user/admin/role/3/assign/4')
    expect(api.put).toHaveBeenCalledWith('/user/admin/ar-policy/3/assign', null, { params: { access_restriction_policy_id: 2 } })
    expect(api.put).not.toHaveBeenCalledWith('/user/admin/update/3', expect.anything())
  })

  it("edits a user's profile details", async () => {
    api.put.mockResolvedValue({ data: undefined })
    renderEdit(3)
    fireEvent.change(await screen.findByLabelText('Job title'), { target: { value: 'Platform lead' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved Marcus Chen.')).toBeInTheDocument()
    const body = api.put.mock.calls[0][1] as { user_details: Record<string, Record<string, unknown>> }
    expect(body.user_details.work).toEqual({ job_title: 'Platform lead' })
  })

  it("won't edit yourself", async () => {
    renderEdit(1)
    expect(await screen.findByText(/Use your Profile and Security pages/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })

  it('asks for user:edit without it', async () => {
    renderEdit(3, VIEWER)
    expect(await screen.findByText(/user:edit/)).toBeInTheDocument()
  })
})
