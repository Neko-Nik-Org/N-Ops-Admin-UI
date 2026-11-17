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
/**
 * Tests for the Admin pages. Roles and Organization run on the (mocked) live API; Users, API keys and
 * Audit logs on the mock backend, with real tags and roles for their pickers.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAdminMock } from '@/mocks/adminDb'
import { AdminApiKeysPage } from '@/pages/admin/AdminApiKeysPage'
import { AdminAuditLogsPage } from '@/pages/admin/AdminAuditLogsPage'
import { AdminOrganizationPage } from '@/pages/admin/AdminOrganizationPage'
import { AdminRolesPage } from '@/pages/admin/AdminRolesPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { api, makeUser, RAW_ORG_INFO, rawRole, renderWithProviders, serveLiveReads } from '../../testUtils'

const render = (ui: React.ReactElement, route: string) =>
  renderWithProviders(ui, { route, user: makeUser({ permissions: ['tag:create', 'user:role:view'] }) })

/** The open <dialog>. */
const dialog = () => screen.getByRole('dialog')

beforeEach(() => {
  resetAdminMock()
  serveLiveReads()
})

describe('AdminOrganizationPage', () => {
  it('shows the real org-info: profile, usage and limits, read-only', async () => {
    render(<AdminOrganizationPage />, '/admin/organization')
    expect(await screen.findByText('Acme')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/self/org-info')
    expect(screen.queryByText('Mock data')).not.toBeInTheDocument()
    expect(screen.getByText('org-123')).toBeInTheDocument()
    // free-form organization_info keys, made readable
    expect(screen.getByText('Support tier')).toBeInTheDocument()
    expect(screen.getByText('gold')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Users' })).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByRole('meter', { name: 'Vault projects' })).toHaveAttribute('aria-valuenow', '40')
    expect(screen.getByText('Secret keys per vault project')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('explains when org-info fails', async () => {
    api.get.mockRejectedValue(new Error('SQL Database error'))
    render(<AdminOrganizationPage />, '/admin/organization')
    expect(await screen.findByText("Couldn't load the organization: SQL Database error")).toBeInTheDocument()
  })
})

describe('AdminUsersPage', () => {
  it('lists users and filters them by search, role and status', async () => {
    render(<AdminUsersPage />, '/admin/users')
    expect(await screen.findByText('Priya Rao')).toBeInTheDocument()
    expect(screen.getByText('10 of 25 seats used. Each person signs in with one role.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search name, username or email'), { target: { value: 'marcus' } })
    expect(screen.getByText('Marcus Chen')).toBeInTheDocument()
    expect(screen.queryByText('Priya Rao')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search name, username or email'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'inactive' } })
    expect(screen.getAllByRole('row')).toHaveLength(2) // header + Dev Malhotra
    expect(screen.getByText('Dev Malhotra')).toBeInTheDocument()
  })

  it('adds a user after validating the form', async () => {
    render(<AdminUsersPage />, '/admin/users')
    fireEvent.click(await screen.findByRole('button', { name: 'Add user' }))

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Add user' }))
    expect(await within(dialog()).findByText('Enter a username.')).toBeInTheDocument()
    expect(within(dialog()).getByText('Pick a role.')).toBeInTheDocument()

    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'Zoe Park' } })
    fireEvent.change(within(dialog()).getByLabelText('Username'), { target: { value: 'zoe' } })
    fireEvent.change(within(dialog()).getByLabelText('Email'), { target: { value: 'zoe@acme.dev' } })
    fireEvent.change(within(dialog()).getByLabelText('Role'), { target: { value: '4' } })
    fireEvent.click(within(dialog()).getByRole('switch', { name: /Restrict by IP address/ }))
    fireEvent.change(within(dialog()).getByLabelText('Allowed IP addresses'), { target: { value: '300.1.1.1' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Add user' }))
    expect(await within(dialog()).findByText('Use IPv4 addresses or ranges, like 203.0.113.0/24.')).toBeInTheDocument()

    fireEvent.change(within(dialog()).getByLabelText('Allowed IP addresses'), { target: { value: '203.0.113.0/24' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Add user' }))
    expect(await screen.findByText("Added Zoe Park. They'll get an email to set a password.")).toBeInTheDocument()
    expect(await screen.findByText('@zoe · zoe@acme.dev')).toBeInTheDocument()
  })

  it('takes seats from the real org-info and role names from the real roles', async () => {
    serveLiveReads({ orgInfo: { ...RAW_ORG_INFO, current_user_count: 25 }, roles: [rawRole(4, 'Engineer')] })
    render(<AdminUsersPage />, '/admin/users')
    expect(await screen.findByText('25 of 25 seats used. Each person signs in with one role.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add user' })).toBeDisabled()
    const tomas = screen.getByText('Tomás Ruiz').closest('tr') as HTMLElement
    expect(await within(tomas).findByText('Engineer')).toBeInTheDocument() // real role 4
    const marcus = screen.getByText('Marcus Chen').closest('tr') as HTMLElement
    expect(within(marcus).getByText('Role #3')).toBeInTheDocument() // no real role with that id
  })

  it('explains an empty role picker without user:role:view', async () => {
    renderWithProviders(<AdminUsersPage />, { route: '/admin/users', user: makeUser({ permissions: [] }) })
    fireEvent.click(await screen.findByRole('button', { name: 'Add user' }))
    expect(within(dialog()).getByText(/You need the “View roles” permission/)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/user/roles/list', expect.anything())
  })
})

describe('AdminRolesPage', () => {
  const ROLE_PERMS = ['user:role:view', 'user:role:create', 'user:role:update', 'user:role:delete']
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
      if (url.startsWith('/user/roles/fetch/')) return { data: roles.find((r) => r.role_id === Number(url.split('/').pop())) }
      return { data: [] }
    })

  const renderRoles = (user = admin()) => renderWithProviders(<AdminRolesPage />, { route: '/admin/roles', user })

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

  it('lists live roles with their permissions, tags and approval flags', async () => {
    renderRoles()
    const row = (await screen.findByText('Operator')).closest('tr') as HTMLElement
    expect(within(row).getByText('2 of 36')).toBeInTheDocument()
    expect(within(row).getByText('production')).toBeInTheDocument()
    expect(within(row).getByText('Approver')).toBeInTheDocument()
    expect(screen.queryByText('Mock data')).not.toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/user/roles/list', { params: { limit: 100, offset: 0 } })
  })

  it('asks for user:role:view instead of loading roles without it', async () => {
    renderRoles(admin({ permissions: ['tag:create'] }))
    expect(await screen.findByText(/user:role:view/)).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/user/roles/list', expect.anything())
    expect(screen.queryByRole('button', { name: 'New role' })).not.toBeInTheDocument()
  })

  it('hides actions the user has no permission for', async () => {
    renderRoles(admin({ permissions: ['tag:create', 'user:role:view'] }))
    await screen.findByText('Operator')
    expect(screen.queryByRole('button', { name: 'New role' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Duplicate / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
  })

  it('disables edit and delete on roles wider than your own', async () => {
    roles.push(rawRole(3, 'Superuser', { permissions: ['tag:create', 'server:exec'] }))
    renderRoles()
    await screen.findByText('Superuser')
    expect(screen.getByRole('button', { name: 'Edit Superuser' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete Superuser' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit Auditor' })).toBeEnabled()
  })

  it('creates a role, offering only permissions the user holds', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderRoles()
    fireEvent.click(await screen.findByRole('button', { name: 'New role' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))
    expect(await within(dialog()).findByText('Give the role at least one permission.')).toBeInTheDocument()

    expect(within(dialog()).getByRole('checkbox', { name: /Run remote commands/ })).toBeDisabled()
    expect(within(dialog()).getByRole('checkbox', { name: 'All Servers permissions' })).toBeDisabled()

    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'Tagger' } })
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'All Tags permissions' }))
    expect(within(dialog()).getByText('3 selected')).toBeInTheDocument()
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'staging' }))
    fireEvent.change(within(dialog()).getByLabelText('Allowed Linux users'), { target: { value: 'deploy, ubuntu' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))

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
  })

  it('catches a duplicate name before the API (which only says "SQL Database error")', async () => {
    renderRoles()
    fireEvent.click(await screen.findByRole('button', { name: 'New role' }))
    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'Auditor ' } })
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: /Create tags/ }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))
    expect(await within(dialog()).findByText('A role called "Auditor" already exists.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('disables the approval switches the user cannot give', async () => {
    renderRoles(admin({ allowedLinuxUsers: [], canApproveApprovals: true, canBypassApprovals: false }))
    fireEvent.click(await screen.findByRole('button', { name: 'New role' }))
    expect(within(dialog()).getByRole('switch', { name: /Can approve requests/ })).toBeEnabled()
    expect(within(dialog()).getByRole('switch', { name: /Skips approvals/ })).toBeDisabled()
    expect(within(dialog()).getByText(/Only someone who skips approvals can give this/)).toBeInTheDocument()
  })

  it("keeps Linux users within the user's own", async () => {
    renderRoles(admin({ allowedLinuxUsers: ['deploy', 'ubuntu'], canApproveApprovals: false, canBypassApprovals: false }))
    fireEvent.click(await screen.findByRole('button', { name: 'New role' }))
    expect(within(dialog()).getByText(/You can give: deploy, ubuntu/)).toBeInTheDocument()
    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'Shell' } })
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: /Create tags/ }))

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))
    expect(await within(dialog()).findByText('Pick from the Linux users you have yourself: deploy, ubuntu.')).toBeInTheDocument()

    fireEvent.change(within(dialog()).getByLabelText('Allowed Linux users'), { target: { value: 'deploy, root' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))
    expect(await within(dialog()).findByText(/Pick from the Linux users/)).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()

    api.post.mockResolvedValue({ data: undefined })
    fireEvent.change(within(dialog()).getByLabelText('Allowed Linux users'), { target: { value: 'deploy' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))
    expect(await screen.findByText('Created Shell.')).toBeInTheDocument()
  })

  it('disables edit on a role with an approval flag the user lacks', async () => {
    renderRoles(admin({ allowedLinuxUsers: [], canApproveApprovals: false, canBypassApprovals: false }))
    await screen.findByText('Operator') // Operator can approve requests
    expect(screen.getByRole('button', { name: 'Edit Operator' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit Auditor' })).toBeEnabled()
  })

  it('makes a tag-limited user pick at least one tag', async () => {
    renderRoles(admin({ tags: [1] }))
    fireEvent.click(await screen.findByRole('button', { name: 'New role' }))
    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'Scoped' } })
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: /Create tags/ }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))
    expect(await within(dialog()).findByText("You're limited to some tags, so pick at least one.")).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('edits a role from its latest saved copy, sending only what changed', async () => {
    api.put.mockResolvedValue({ data: undefined })
    api.patch.mockResolvedValue({ data: undefined })
    renderRoles()
    await screen.findByText('Operator')
    // someone else renamed it since the list loaded
    roles[0] = { ...roles[0], role_description: 'Updated elsewhere' }
    fireEvent.click(screen.getByRole('button', { name: 'Edit Operator' }))
    await waitFor(() => expect(within(dialog()).getByLabelText('Description')).toHaveValue('Updated elsewhere'))
    expect(api.get).toHaveBeenCalledWith('/user/roles/fetch/1')

    fireEvent.click(within(dialog()).getByRole('checkbox', { name: /Delete tags/ }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Operator.')).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/user/roles/update/permissions/1', {
      permissions: ['tag:create', 'tag:edit', 'tag:delete'],
      allowed_linux_users: ['deploy'],
      allowed_tags: [1],
      can_approve_approvals: true,
      can_bypass_approvals: false,
    })
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('renames a role through the info endpoint only', async () => {
    api.patch.mockResolvedValue({ data: undefined })
    renderRoles()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Auditor' }))
    await waitFor(() => expect(within(dialog()).getByLabelText('Name')).toHaveValue('Auditor'))
    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'Read-only' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved Read-only.')).toBeInTheDocument()
    expect(api.patch).toHaveBeenCalledWith('/user/roles/update/info/2', {
      role_name: 'Read-only',
      role_description: 'Auditor role',
    })
    expect(api.put).not.toHaveBeenCalled()
  })

  it('duplicates a role as a new one', async () => {
    api.post.mockResolvedValue({ data: undefined })
    renderRoles()
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate Operator' }))
    expect(within(dialog()).getByRole('heading', { name: 'New role' })).toBeInTheDocument()
    expect(within(dialog()).getByLabelText('Name')).toHaveValue('Operator (copy)')
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))
    expect(await screen.findByText('Created Operator (copy).')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith(
      '/user/roles/create',
      expect.objectContaining({ role_name: 'Operator (copy)', allowed_tags: [1] }),
    )
  })

  it("shows the API's reason when a role in use cannot be deleted", async () => {
    api.delete.mockRejectedValue(
      new Error('Role cannot be deleted because there are users associated with it, delete those users first'),
    )
    renderRoles()
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
    renderRoles()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Auditor' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete role' }))
    expect(await screen.findByText('Deleted Auditor.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('cell', { name: /Auditor role/ })).not.toBeInTheDocument())
  })
})

describe('AdminApiKeysPage', () => {
  it('shows key status, including keys about to expire', async () => {
    render(<AdminApiKeysPage />, '/admin/api-keys')
    expect(await screen.findByText('github-actions-prod')).toBeInTheDocument()
    const syncRow = screen.getByText('staging-config-sync').closest('tr') as HTMLElement
    expect(await within(syncRow).findByText('payments-api')).toBeInTheDocument()
    expect(within(syncRow).getByText('web')).toBeInTheDocument()
    expect(screen.getByText('nk-1_Qm7v…')).toBeInTheDocument()
    expect(screen.getByText(/Expires in 6 days/)).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('creates a key with a role and tag, and shows the secret once', async () => {
    render(<AdminApiKeysPage />, '/admin/api-keys')
    fireEvent.click(await screen.findByRole('button', { name: 'New API key' }))
    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'deploy-bot' } })
    fireEvent.change(within(dialog()).getByLabelText('What is it for?'), { target: { value: 'Deploys' } })
    fireEvent.change(within(dialog()).getByLabelText('Role'), { target: { value: '6' } })
    expect(within(dialog()).getByText(/Acts with the CI deploy role's 2 permissions/)).toBeInTheDocument()
    fireEvent.change(within(dialog()).getByLabelText('Tag'), { target: { value: '2' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Never' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create key' }))
    expect(await within(dialog()).findByText('Pick at least one vault project.')).toBeInTheDocument()

    fireEvent.click(await within(dialog()).findByRole('checkbox', { name: 'web' }))
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'billing' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create key' }))

    expect(await screen.findByRole('heading', { name: 'deploy-bot is ready' })).toBeInTheDocument()
    expect(screen.getByTestId('api-key-secret').textContent).toMatch(/^nk-5_[A-Za-z0-9]{40}$/)

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByTestId('api-key-secret')).not.toBeInTheDocument())
    const row = screen.getByText('deploy-bot').closest('tr') as HTMLElement
    expect(within(row).getByText('staging')).toBeInTheDocument()
    expect(within(row).getByText('web')).toBeInTheDocument()
    expect(within(row).getByText('billing')).toBeInTheDocument()
    // never used, never expires
    expect(within(row).getAllByText('Never')).toHaveLength(2)
  })
})

describe('AdminAuditLogsPage', () => {
  it('pages through the last 30 days and narrows by action and outcome', async () => {
    render(<AdminAuditLogsPage />, '/admin/audit-logs')
    const range = await screen.findByText(/^1–25 of \d+$/)
    const total = Number(range.textContent!.split(' of ')[1])
    expect(total).toBeGreaterThan(25)

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText(new RegExp(`^26–50 of ${total}$`))).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'auth.login_failed' } })
    fireEvent.change(screen.getByLabelText('Outcome'), { target: { value: 'failed' } })
    // the filtered page has only failed sign-ins (the filter's own <option>s are outside the table)
    await waitFor(() => expect(within(screen.getByRole('table')).queryByText('Signed in')).not.toBeInTheDocument())
    expect(within(screen.getByRole('table')).getAllByText('Failed sign-in').length).toBeGreaterThan(0)
    expect(screen.getByText(/^1–\d+ of \d+$/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText(`1–25 of ${total}`)).toBeInTheDocument()
  })

  it('downloads the filtered entries as CSV', async () => {
    const createObjectURL = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    render(<AdminAuditLogsPage />, '/admin/audit-logs')
    await screen.findByText(/^1–25 of \d+$/)

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
    expect(await screen.findByText(/^Exported \d+ entries as CSV\.$/)).toBeInTheDocument()
    expect(createObjectURL).toHaveBeenCalledOnce()
  })

  it('lists the scheduled export workflow and adds another', async () => {
    render(<AdminAuditLogsPage />, '/admin/audit-logs')
    const schedules = (await screen.findByRole('heading', { name: 'Scheduled exports' })).closest('section') as HTMLElement
    expect(await within(schedules).findByText('Weekly audit export')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Schedule export' }))
    fireEvent.change(within(dialog()).getByLabelText('How often'), { target: { value: 'daily' } })
    fireEvent.change(within(dialog()).getByLabelText('Email it to'), { target: { value: 'audit@acme.dev, nope' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create schedule' }))
    expect(await within(dialog()).findByText(/isn’t a valid email address/)).toBeInTheDocument()

    fireEvent.change(within(dialog()).getByLabelText('Email it to'), { target: { value: 'audit@acme.dev' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create schedule' }))
    expect(await within(schedules).findByText('Daily audit export')).toBeInTheDocument()
    // creating it is itself recorded in the log
    expect(await within(screen.getByRole('table')).findByText('Created a workflow')).toBeInTheDocument()
  })
})
