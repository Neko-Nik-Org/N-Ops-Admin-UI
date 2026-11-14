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
/** Tests for the Admin pages (Organization, Users, Roles, API keys, Audit logs) on the mock backend. */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAdminMock } from '@/features/admin/mock/db'
import { AdminApiKeysPage } from '@/pages/admin/AdminApiKeysPage'
import { AdminAuditLogsPage } from '@/pages/admin/AdminAuditLogsPage'
import { AdminOrganizationPage } from '@/pages/admin/AdminOrganizationPage'
import { AdminRolesPage } from '@/pages/admin/AdminRolesPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { api, makeUser, renderWithProviders } from '../../testUtils'

const render = (ui: React.ReactElement, route: string) => renderWithProviders(ui, { route, user: makeUser() })

/** The open <dialog>. */
const dialog = () => screen.getByRole('dialog')

beforeEach(() => {
  resetAdminMock()
  // the real tag list is empty, so the forms fall back to the sample tags
  api.get.mockResolvedValue({ data: [] })
})

describe('AdminOrganizationPage', () => {
  it('shows the profile and plan, and saves an edit', async () => {
    render(<AdminOrganizationPage />, '/admin/organization')
    expect(await screen.findByText('Payments platform for independent retailers.')).toBeInTheDocument()
    expect(screen.getByText('Mock data')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Users' })).toHaveAttribute('aria-valuenow', '40')

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Acme Inc' } })
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'not a url' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Enter a full URL, like https://example.com.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'https://acme.inc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Organization updated.')).toBeInTheDocument()
    expect(await screen.findByText('acme.inc', {}, { timeout: 2000 })).toBeInTheDocument()
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

  it('shows why the last Owner cannot be removed', async () => {
    render(<AdminUsersPage />, '/admin/users')
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Neko Nik' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Remove user' }))
    expect(await screen.findByText(/You can't delete the last Owner/)).toBeInTheDocument()
  })
})

describe('AdminRolesPage', () => {
  it('lists roles with their scope and who uses them', async () => {
    render(<AdminRolesPage />, '/admin/roles')
    const row = (await screen.findByText('Operator')).closest('tr') as HTMLElement
    expect(within(row).getByText('8 of 33')).toBeInTheDocument()
    expect(within(row).getByText('production')).toBeInTheDocument()
    expect(within(row).getByText('3 users')).toBeInTheDocument()
  })

  it('creates a role from a permission group and tags', async () => {
    render(<AdminRolesPage />, '/admin/roles')
    fireEvent.click(await screen.findByRole('button', { name: 'New role' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))
    expect(await within(dialog()).findByText('Give the role at least one permission.')).toBeInTheDocument()

    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'On-call' } })
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'All Servers permissions' }))
    expect(within(dialog()).getByText('4 selected')).toBeInTheDocument()
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'production' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))

    expect(await screen.findByText('Created On-call.')).toBeInTheDocument()
    const row = (await screen.findByText('On-call')).closest('tr') as HTMLElement
    expect(within(row).getByText('4 of 33')).toBeInTheDocument()
    expect(within(row).getByText('production')).toBeInTheDocument()
  })

  it('duplicates a role as a new one', async () => {
    render(<AdminRolesPage />, '/admin/roles')
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate Auditor' }))
    expect(within(dialog()).getByRole('heading', { name: 'New role' })).toBeInTheDocument()
    expect(within(dialog()).getByLabelText('Name')).toHaveValue('Auditor (copy)')
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create role' }))
    expect(await screen.findByText('Auditor (copy)')).toBeInTheDocument()
    expect(screen.getByText('Auditor')).toBeInTheDocument()
  })

  it('explains why a role in use cannot be deleted', async () => {
    render(<AdminRolesPage />, '/admin/roles')
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Developer' }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete role' }))
    expect(await screen.findByText(/still use "Developer". Move them to another role first./)).toBeInTheDocument()
  })
})

describe('AdminApiKeysPage', () => {
  it('shows key status, including keys about to expire', async () => {
    render(<AdminApiKeysPage />, '/admin/api-keys')
    expect(await screen.findByText('github-actions-prod')).toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { name: 'deploy-bot is ready' })).toBeInTheDocument()
    expect(screen.getByTestId('api-key-secret').textContent).toMatch(/^nk-5_[A-Za-z0-9]{40}$/)

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByTestId('api-key-secret')).not.toBeInTheDocument())
    const row = screen.getByText('deploy-bot').closest('tr') as HTMLElement
    expect(within(row).getByText('staging')).toBeInTheDocument()
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
