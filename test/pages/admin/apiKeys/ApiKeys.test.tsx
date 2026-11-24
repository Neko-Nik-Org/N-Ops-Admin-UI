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
/** Tests for Admin › API keys (list, view, create and edit pages), on the mock backend. */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ROUTES } from '@/constants/routes'
import { resetAdminMock } from '@/data/mockAdmin'
import { ApiKeyDetailPage } from '@/pages/admin/apiKeys/details'
import { ApiKeyFormPage } from '@/pages/admin/apiKeys/form'
import { AdminApiKeysPage } from '@/pages/admin/apiKeys/list'
import { makeUser, renderWithProviders, serveLiveReads } from '../../../testUtils'

const as = { user: makeUser({ permissions: ['tag:create', 'user:role:view'] }) }
const renderList = () => renderWithProviders(<AdminApiKeysPage />, { route: ROUTES.adminApiKeys, ...as })
const renderView = (id: number) =>
  renderWithProviders(<ApiKeyDetailPage />, { route: `/admin/api-keys/${id}`, path: ROUTES.adminApiKey, ...as })
const renderNew = () =>
  renderWithProviders(<ApiKeyFormPage />, { route: ROUTES.adminApiKeyNew, path: ROUTES.adminApiKeyNew, ...as })
const renderEdit = (id: number) =>
  renderWithProviders(<ApiKeyFormPage />, { route: `/admin/api-keys/${id}/edit`, path: ROUTES.adminApiKeyEdit, ...as })
const location = () => screen.findByTestId('location', {}, { timeout: 2000 })

beforeEach(() => {
  resetAdminMock()
  serveLiveReads()
})

describe('API keys list', () => {
  it('shows key status, including keys about to expire', async () => {
    renderList()
    expect(await screen.findByText('github-actions-prod')).toBeInTheDocument()
    const syncRow = screen.getByText('staging-config-sync').closest('tr') as HTMLElement
    expect(await within(syncRow).findByText('payments-api')).toBeInTheDocument()
    expect(within(syncRow).getByText('web')).toBeInTheDocument()
    expect(screen.getByText('nk-1_Qm7v…')).toBeInTheDocument()
    expect(screen.getByText(/Expires in 6 days/)).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('links each key to its page, and Edit and New to theirs', async () => {
    renderList()
    const link = await screen.findByRole('link', { name: 'github-actions-prod' })
    expect(link.getAttribute('href')).toMatch(/^\/admin\/api-keys\/\d+$/)
    fireEvent.click(screen.getByRole('button', { name: 'New API key' }))
    expect(await location()).toHaveTextContent('/admin/api-keys/new')
  })

  it('deletes a key', async () => {
    renderList()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete github-actions-prod' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete key' }))
    expect(await screen.findByText('Deleted github-actions-prod.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('link', { name: 'github-actions-prod' })).not.toBeInTheDocument())
  })
})

describe('API key page', () => {
  it('shows the key, and says so when it does not exist', async () => {
    const { unmount } = renderView(1)
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Key starts with')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(await location()).toHaveTextContent('/admin/api-keys/1/edit')
    unmount()
    renderView(999)
    expect(await screen.findByText(/There's no API key here/)).toBeInTheDocument()
  })
})

describe('New API key page', () => {
  it('creates a key with a role and tag, shows the secret once, then opens the key', async () => {
    renderNew()
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'deploy-bot' } })
    fireEvent.change(screen.getByLabelText('What is it for?'), { target: { value: 'Deploys' } })
    await waitFor(() => expect(within(screen.getByLabelText('Role')).getAllByRole('option').length).toBeGreaterThan(1))
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: '6' } })
    expect(screen.getByText(/Acts with the CI deploy role's 2 permissions/)).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByLabelText('Tag')).getAllByRole('option').length).toBeGreaterThan(1))
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Never' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }))
    expect(await screen.findByText('Pick at least one vault project.')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('checkbox', { name: 'web' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'billing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }))

    expect(await screen.findByRole('heading', { name: 'deploy-bot is ready' })).toBeInTheDocument()
    expect(screen.getByTestId('api-key-secret').textContent).toMatch(/^nk-5_[A-Za-z0-9]{40}$/)

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(await location()).toHaveTextContent('/admin/api-keys/5')
  })
})

describe('Edit API key page', () => {
  it('saves changes and turns a key off', async () => {
    renderEdit(1)
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('github-actions-prod'))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'gha-prod' } })
    fireEvent.click(screen.getByRole('switch', { name: /Active/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Saved gha-prod.')).toBeInTheDocument()
    expect(await location()).toHaveTextContent('/admin/api-keys/1')
  })
})
