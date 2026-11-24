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
 * Tests for the Admin pages. Organization runs on the (mocked) live API; Audit logs on the mock
 * backend. Users, Invitations, API keys, Roles, Access policies and Tags have their own test files.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAdminMock } from '@/data/mockAdmin'
import { AdminAuditLogsPage } from '@/pages/admin/auditLogs'
import { AdminOrganizationPage } from '@/pages/admin/organization'
import { api, makeUser, renderWithProviders, serveLiveReads } from '../../testUtils'

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
