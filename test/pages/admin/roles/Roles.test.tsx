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
/** Tests for Admin › Roles (list, view, create and edit pages), on the (mocked) live API. */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ROUTES } from '@/constants/routes'
import { RoleDetailPage } from '@/pages/admin/roles/details'
import { RoleFormPage } from '@/pages/admin/roles/form'
import { AdminRolesPage } from '@/pages/admin/roles/list'
import { ApiError } from '@/types/api'
import { api, makeUser, renderWithProviders } from '../../../testUtils'

const ROLE_PERMS = ['user:role:view', 'user:role:create', 'user:role:edit', 'user:role:delete']
const admin = (overrides: Parameters<typeof makeUser>[0] = {}) =>
  makeUser({ permissions: ['tag:create', 'tag:edit', 'tag:delete', ...ROLE_PERMS], ...overrides })

const rawRole = (id: number, name: string, extra: Record<string, unknown> = {}) => ({
  role_id: id,
  role_name: name,
  role_description: `${name} role`,
  permissions: ['tag:create'],
  allowed_linux_users: [],
  allowed_tags: [],
  can_bypass_approvals: false,
  can_approve_approvals: false,
  created_at: '2026-11-17T08:00:00Z',
  updated_at: '2026-11-17T08:00:00Z',
  ...extra,
})

const tagsRaw = [
  { tag_id: 1, organization_id: 'o', tag_name: 'production', tag_description: '' },
  { tag_id: 2, organization_id: 'o', tag_name: 'staging', tag_description: '' },
]

let roles: ReturnType<typeof rawRole>[] = []

/** Serves /tag/list, /user/roles/list and /user/roles/fetch/{id} from `roles`. */
const serve = () =>
  api.get.mockImplementation(async (url: string) => {
    if (url === '/tag/list') return { data: tagsRaw }
    if (url === '/user/roles/list') return { data: roles }
    if (url.startsWith('/user/roles/fetch/')) {
      const found = roles.find((r) => r.role_id === Number(url.split('/').pop()))
      if (!found) throw new ApiError('Not found', 404)
      return { data: found }
    }
    return { data: [] }
  })

const renderList = (user = admin()) => renderWithProviders(<AdminRolesPage />, { route: ROUTES.adminRoles, user })
const renderView = (id: number, user = admin()) =>
  renderWithProviders(<RoleDetailPage />, { route: `/admin/roles/${id}`, path: ROUTES.adminRole, user })
const renderNew = (query = '', user = admin()) =>
  renderWithProviders(<RoleFormPage />, { route: `${ROUTES.adminRoleNew}${query}`, path: ROUTES.adminRoleNew, user })
const renderEdit = (id: number, user = admin()) =>
  renderWithProviders(<RoleFormPage />, { route: `/admin/roles/${id}/edit`, path: ROUTES.adminRoleEdit, user })
const location = () => screen.findByTestId('location', {}, { timeout: 2000 })
/** The open <dialog>. */
const dialog = () => screen.getByRole('dialog')
/** Waits for the form to be filled from the loaded role. */
const formReady = () => screen.findByLabelText('Name')

beforeEach(() => {
  roles = [
    rawRole(1, 'Operator', {
      permissions: ['tag:create', 'tag:edit'],
      allowed_tags: [1],
      can_approve_approvals: true,
      allowed_linux_users: ['deploy'],
    }),
    rawRole(2, 'Auditor'),
  ]
  serve()
})

describe('Roles list', () => {
  it('lists live roles with their permissions, tags and approval flags', async () => {
    renderList()
    const row = (await screen.findByText('Operator')).closest('tr') as HTMLElement
    expect(within(row).getByText('2 of 43')).toBeInTheDocument()
    expect(within(row).getByText('production')).toBeInTheDocument()
    expect(within(row).getByText('Approver')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/roles/list', { params: { limit: 100, offset: 0 } })
  })

  it('asks for user:role:view instead of loading roles without it', async () => {
    renderList(admin({ permissions: ['tag:create'] }))
    expect(await screen.findByText(/user:role:view/)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/user/roles/list', expect.anything())
    expect(screen.queryByRole('button', { name: 'New role' })).not.toBeInTheDocument()
  })

  it('hides actions the user has no permission for', async () => {
    renderList(admin({ permissions: ['tag:create', 'user:role:view'] }))
    await screen.findByText('Operator')
    expect(screen.queryByRole('button', { name: 'New role' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Duplicate / })).not.toBeInTheDocument()
    // Edit stays visible but disabled, naming the permission the API checks
    const edit = screen.getAllByRole('button', { name: /^Edit / })[0]!
    expect(edit).toBeDisabled()
    expect(edit).toHaveAttribute('title', expect.stringContaining('user:role:edit'))
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
  })

  it('disables edit and delete on roles wider than your own', async () => {
    roles.push(rawRole(3, 'Superuser', { permissions: ['tag:create', 'server:exec'] }))
    renderList()
    await screen.findByText('Superuser')
    expect(screen.getByRole('button', { name: 'Edit Superuser' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete Superuser' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit Auditor' })).toBeEnabled()
  })

  it('disables edit on a role with an approval flag the user lacks', async () => {
    renderList(admin({ allowedLinuxUsers: [], canApproveApprovals: false, canBypassApprovals: false }))
    await screen.findByText('Operator') // Operator can approve requests
    expect(screen.getByRole('button', { name: 'Edit Operator' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit Auditor' })).toBeEnabled()
  })

  it('links each role to its own view, edit and duplicate pages', async () => {
    renderList()
    expect(await screen.findByRole('link', { name: 'Operator' })).toHaveAttribute('href', '/admin/roles/1')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Operator' }))
    expect(await location()).toHaveTextContent('/admin/roles/1/edit')
  })

  it('opens the new-role page', async () => {
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: 'New role' }))
    expect(await location()).toHaveTextContent('/admin/roles/new')
  })

  it("shows the API's reason when a role in use cannot be deleted", async () => {
    api.delete.mockRejectedValue(
      new Error('Role cannot be deleted because there are users associated with it, delete those users first'),
    )
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Auditor' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete role' }))
    expect(await screen.findByText(/there are users associated with it/)).toBeInTheDocument()
    expect(api.delete).toHaveBeenCalledWith('/user/roles/delete/2')
  })

  it('deletes an unused role', async () => {
    api.delete.mockImplementation(async () => {
      roles = roles.filter((r) => r.role_id !== 2)
      return { data: undefined }
    })
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Auditor' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete role' }))
    expect(await screen.findByText('Deleted Auditor.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('cell', { name: /Auditor role/ })).not.toBeInTheDocument())
  })
})

describe('Role page', () => {
  it('shows a read-only view of the latest saved role', async () => {
    renderView(1)
    expect(await screen.findByRole('heading', { name: 'Operator' })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/roles/fetch/1')
    expect(await screen.findByText('production')).toBeInTheDocument()
    expect(screen.getByText('deploy')).toBeInTheDocument()
    const infra = screen.getByRole('table', { name: 'Infrastructure permissions' })
    expect(within(infra).getByRole('checkbox', { name: 'Create tags' })).toBeChecked()
    expect(within(infra).getByRole('checkbox', { name: 'Delete tags' })).not.toBeChecked()
    expect(within(infra).getByRole('checkbox', { name: 'Create tags' })).toBeDisabled()
    expect(screen.queryByRole('table', { name: 'Vault permissions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Select all/ })).not.toBeInTheDocument()
  })

  it('leads to the edit and duplicate pages', async () => {
    renderView(1)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    expect(await location()).toHaveTextContent('/admin/roles/1/edit')
  })

  it('disables Edit and Delete on a role wider than your own', async () => {
    roles.push(rawRole(3, 'Superuser', { permissions: ['tag:create', 'server:exec'] }))
    renderView(3)
    await screen.findByRole('heading', { name: 'Superuser' })
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })

  it('says so when the role does not exist', async () => {
    renderView(99)
    expect(await screen.findByText(/There's no role here/)).toBeInTheDocument()
  })

  it('deletes the role and returns to the list', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    renderView(2)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete role' }))
    expect(await screen.findByText('Deleted Auditor.')).toBeInTheDocument()
    expect(await location()).toHaveTextContent(/^\/admin\/roles$/)
  })
})

describe('New role page', () => {
  it('creates a role, offering only permissions the user holds', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderNew()
    await formReady()
    fireEvent.click(screen.getByRole('button', { name: 'Create role' }))
    expect(await screen.findByText('Give the role at least one permission.')).toBeInTheDocument()

    // only modules the user can grant in: Roles (Admin management) and Tags (Infrastructure)
    const adminTable = screen.getByRole('table', { name: 'Admin management permissions' })
    expect(
      within(adminTable)
        .getAllByRole('rowheader')
        .map((h) => h.textContent),
    ).toEqual(['Roles'])
    expect(screen.queryByRole('table', { name: 'Vault permissions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Run remote commands/ })).not.toBeInTheDocument()
    expect(screen.getByText('0/3')).toBeInTheDocument() // Infrastructure: the three tag permissions

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Tagger' } })
    fireEvent.click(screen.getByRole('button', { name: 'Select all Infrastructure permissions' }))
    expect(screen.getByText('3 selected')).toBeInTheDocument()
    expect(screen.getByText('3/3')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'staging' }))
    fireEvent.change(screen.getByLabelText('Allowed Linux users'), { target: { value: 'deploy, ubuntu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create role' }))

    expect(await screen.findByText('Created Tagger.')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/user/roles/create', {
      role_name: 'Tagger',
      role_description: '',
      permissions: ['tag:create', 'tag:edit', 'tag:delete'],
      allowed_linux_users: ['deploy', 'ubuntu'],
      allowed_tags: [2],
      can_approve_approvals: false,
      can_bypass_approvals: false,
    })
    expect(await location()).toHaveTextContent(/^\/admin\/roles$/)
  })

  it('catches a duplicate name before the API (which only says "SQL Database error")', async () => {
    renderNew()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/user/roles/list', expect.anything()))
    fireEvent.change(await formReady(), { target: { value: 'Auditor ' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Create tags/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create role' }))
    expect(await screen.findByText('A role called "Auditor" already exists.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('disables the approval switches the user cannot give', async () => {
    renderNew('', admin({ allowedLinuxUsers: [], canApproveApprovals: true, canBypassApprovals: false }))
    await formReady()
    expect(screen.getByRole('switch', { name: /Can approve requests/ })).toBeEnabled()
    expect(screen.getByRole('switch', { name: /Skips approvals/ })).toBeDisabled()
    expect(screen.getByText(/Only someone who skips approvals can give this/)).toBeInTheDocument()
  })

  it("keeps Linux users within the user's own", async () => {
    renderNew('', admin({ allowedLinuxUsers: ['deploy', 'ubuntu'], canApproveApprovals: false, canBypassApprovals: false }))
    fireEvent.change(await formReady(), { target: { value: 'Shell' } })
    expect(screen.getByText(/You can give: deploy, ubuntu/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Create tags/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Create role' }))
    expect(await screen.findByText('Pick from the Linux users you have yourself: deploy, ubuntu.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Allowed Linux users'), { target: { value: 'deploy, root' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create role' }))
    expect(await screen.findByText(/Pick from the Linux users/)).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()

    api.post.mockResolvedValue({ data: undefined })
    fireEvent.change(screen.getByLabelText('Allowed Linux users'), { target: { value: 'deploy' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create role' }))
    expect(await screen.findByText('Created Shell.')).toBeInTheDocument()
  })

  it('makes a tag-limited user pick at least one tag', async () => {
    renderNew('', admin({ tags: [1] }))
    fireEvent.change(await formReady(), { target: { value: 'Scoped' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Create tags/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Create role' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("You're limited to some tags, so pick at least one.")
    expect(api.post).not.toHaveBeenCalled()
  })

  it('duplicates a role as a new one', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderNew('?from=1')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Operator (copy)'))
    expect(screen.getByRole('heading', { name: 'New role' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create role' }))
    expect(await screen.findByText('Created Operator (copy).')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith(
      '/user/roles/create',
      expect.objectContaining({ role_name: 'Operator (copy)', allowed_tags: [1] }),
    )
  })

  it('asks for user:role:create without it', async () => {
    renderNew('', admin({ permissions: ['tag:create', 'user:role:view'] }))
    expect(await screen.findByText(/user:role:create/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })
})

describe('Edit role page', () => {
  it('edits a role from its latest saved copy, sending only what changed', async () => {
    api.put.mockResolvedValue({ data: undefined })
    api.patch.mockResolvedValue({ data: undefined })
    roles[0] = { ...roles[0]!, role_description: 'Updated elsewhere' }
    renderEdit(1)
    await waitFor(() => expect(screen.getByLabelText('Description')).toHaveValue('Updated elsewhere'))
    expect(screen.getByRole('heading', { name: 'Edit Operator' })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/roles/fetch/1')

    fireEvent.click(screen.getByRole('checkbox', { name: /Delete tags/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Operator.')).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/user/roles/update/permissions/1', {
      permissions: ['tag:create', 'tag:edit', 'tag:delete'],
      allowed_linux_users: ['deploy'],
      allowed_tags: [1],
      can_approve_approvals: true,
      can_bypass_approvals: false,
    })
    expect(api.patch).not.toHaveBeenCalled()
    // opened directly: a save leads to the role's page
    expect(await location()).toHaveTextContent('/admin/roles/1')
  })

  it('renames a role through the info endpoint only', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    renderEdit(2)
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Auditor'))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Read-only' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved Read-only.')).toBeInTheDocument()
    expect(api.patch).toHaveBeenCalledWith('/user/roles/update/info/2', {
      role_name: 'Read-only',
      role_description: 'Auditor role',
    })
    expect(api.put).not.toHaveBeenCalled()
  })

  it('refuses to edit a role wider than your own', async () => {
    roles.push(rawRole(3, 'Superuser', { permissions: ['tag:create', 'server:exec'] }))
    renderEdit(3)
    expect(await screen.findByText(/your own role lacks/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })

  it('says so when the role does not exist', async () => {
    renderEdit(99)
    expect(await screen.findByText(/There's no role here/)).toBeInTheDocument()
  })
})
