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
/** Tests for the Vault pages (Keys store, Config files, Secure notes) on the mock backend. */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetAdminMock } from '@/features/admin/mock/db'
import { resetVaultMock } from '@/features/vault/mock/db'
import { VaultConfigFilesPage } from '@/pages/vault/VaultConfigFilesPage'
import { VaultKeysPage } from '@/pages/vault/VaultKeysPage'
import { VaultNotesPage } from '@/pages/vault/VaultNotesPage'
import { api, makeUser, renderWithProviders } from '../../testUtils'

const render = (ui: React.ReactElement, route: string) => renderWithProviders(ui, { route, user: makeUser() })
const dialog = () => screen.getByRole('dialog')

/** The table row of a key, e.g. ('DATABASE_URL', 'production'). */
const keyRow = (name: string, tag: string) =>
  screen.getAllByRole('row').find((r) => within(r).queryByText(name) && within(r).queryByText(tag)) as HTMLElement

beforeEach(() => {
  resetAdminMock()
  resetVaultMock()
  api.get.mockResolvedValue({ data: [] }) // no real tags: the forms use the sample ones
})

describe('VaultKeysPage', () => {
  it('lists the first service’s keys masked, and reveals one on request', async () => {
    render(<VaultKeysPage />, '/vault/keys')
    await screen.findByText('JWT_SIGNING_KEY')
    expect(screen.getByRole('tab', { name: 'api', selected: true })).toBeInTheDocument()
    expect(within(keyRow('JWT_SIGNING_KEY', 'production')).getByText('rolled back from v2')).toBeInTheDocument()

    const row = keyRow('DATABASE_URL', 'production')
    expect(within(row).getByText('••••••••••••')).toBeInTheDocument()
    fireEvent.click(within(row).getByRole('button', { name: 'Reveal DATABASE_URL' }))
    expect(await within(row).findByText(/sslmode=require/)).toBeInTheDocument()
  })

  it('switches service', async () => {
    render(<VaultKeysPage />, '/vault/keys')
    fireEvent.click(await screen.findByRole('tab', { name: 'worker' }))
    expect(await screen.findByText('QUEUE_URL')).toBeInTheDocument()
    expect(screen.queryByText('JWT_SIGNING_KEY')).not.toBeInTheDocument()
  })

  it('adds a new version and rolls back from the history', async () => {
    render(<VaultKeysPage />, '/vault/keys')
    await screen.findAllByText('LOG_LEVEL') // production and staging
    fireEvent.click(within(keyRow('LOG_LEVEL', 'production')).getByRole('button', { name: 'New version of LOG_LEVEL' }))
    fireEvent.change(within(dialog()).getByLabelText('New value'), { target: { value: 'error' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save new version' }))
    expect(await screen.findByText('LOG_LEVEL is now on v2.')).toBeInTheDocument()
    await waitFor(() => expect(within(keyRow('LOG_LEVEL', 'production')).getByText('v2')).toBeInTheDocument())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.click(within(keyRow('LOG_LEVEL', 'production')).getByRole('button', { name: 'History of LOG_LEVEL' }))
    // v2 (just saved) is in use; v1 can be picked again
    expect(await within(dialog()).findByText('In use')).toBeInTheDocument()
    fireEvent.click(await within(dialog()).findByRole('button', { name: 'Use this version' }))
    expect(await screen.findByText('LOG_LEVEL now uses v1.')).toBeInTheDocument()
    await waitFor(() => expect(within(keyRow('LOG_LEVEL', 'production')).getByText('rolled back from v2')).toBeInTheDocument())
  })

  it('imports a .env file into a tag', async () => {
    render(<VaultKeysPage />, '/vault/keys')
    fireEvent.click(await screen.findByRole('button', { name: 'Import .env' }))
    fireEvent.change(within(dialog()).getByLabelText('Tag'), { target: { value: '3' } })
    fireEvent.change(within(dialog()).getByLabelText('.env contents'), { target: { value: 'DATABASE_URL=postgres://dev2\nCACHE_TTL=60' } })
    expect(within(dialog()).getByText('2 keys: 1 new, 1 already here (they get a new version if the value changed).')).toBeInTheDocument()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Import' }))
    expect(await screen.findByText('Imported: 1 new, 1 changed, 0 unchanged.')).toBeInTheDocument()
    expect(await screen.findByText('CACHE_TTL')).toBeInTheDocument()
  })

  it('rejects a duplicate key for the same tag', async () => {
    render(<VaultKeysPage />, '/vault/keys')
    fireEvent.click(await screen.findByRole('button', { name: 'New key' }))
    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'log_level' } })
    expect(within(dialog()).getByLabelText('Name')).toHaveValue('LOG_LEVEL')
    fireEvent.change(within(dialog()).getByLabelText('Tag'), { target: { value: '1' } })
    fireEvent.change(within(dialog()).getByLabelText('Value'), { target: { value: 'x' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Add key' }))
    expect(await screen.findByText('LOG_LEVEL already exists for this tag. Add a new version to it instead.')).toBeInTheDocument()
  })
})

describe('VaultConfigFilesPage', () => {
  it('opens a file, saves an edit as a new version and shows the diff in history', async () => {
    render(<VaultConfigFilesPage />, '/vault/config-files')
    const editor = await screen.findByLabelText('Contents of app.yaml')
    expect((editor as HTMLTextAreaElement).value).toContain('replicas: 4')

    fireEvent.change(editor, { target: { value: (editor as HTMLTextAreaElement).value.replace('replicas: 4', 'replicas: 6') } })
    fireEvent.change(screen.getByLabelText('Reason for the change'), { target: { value: 'Scale up' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save as v3' }))
    expect(await screen.findByText('Saved app.yaml as v3.')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: 'History' }))
    fireEvent.click(await screen.findByRole('button', { name: /^v2/ }))
    expect(await screen.findByText('v2 → v3 (in use)')).toBeInTheDocument()
    expect(screen.getByText('replicas: 4')).toBeInTheDocument()
    expect(screen.getByText('replicas: 6')).toBeInTheDocument()
  })
})

describe('VaultNotesPage', () => {
  it('shows the newest note and unlocks a locked one with its password', async () => {
    render(<VaultNotesPage />, '/vault/notes')
    expect(await screen.findByText(/Post-incident: write it up/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Break-glass DB access/ }))
    fireEvent.change(await screen.findByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText("That password isn't right.")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'open-sesame' } })
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText(/password: 9#tQ!x2Lr7\$wPz/)).toBeInTheDocument()
  })

  it('creates a note and edits it into a second version', async () => {
    render(<VaultNotesPage />, '/vault/notes')
    fireEvent.click(await screen.findByRole('button', { name: 'New note' }))
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Wi-Fi' } })
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'guest / hunter2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }))
    expect(await screen.findByText('Note created.')).toBeInTheDocument()
    // the form closes and the new note opens in the read view
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }, { timeout: 2000 }))
    expect(screen.getByLabelText('Note')).toHaveValue('guest / hunter2')
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'guest / changed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save as v2' }))
    expect(await screen.findByText(/^v2 · edited/, {}, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.getByText('guest / changed')).toBeInTheDocument()
  })

  it('shares a note with someone and creates a public link', async () => {
    render(<VaultNotesPage />, '/vault/notes')
    await screen.findByText(/Post-incident/)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(await within(dialog()).findByLabelText('Access for Marcus Chen')).toHaveValue('edit')

    fireEvent.change(within(dialog()).getByLabelText('Access for Lena Fischer'), { target: { value: 'read' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save access' }))
    expect(await screen.findByText('Sharing updated.')).toBeInTheDocument()

    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create link' }))
    expect(await screen.findByText('Link created.')).toBeInTheDocument()
    expect(await within(dialog()).findByText(/\/s\/[A-Za-z0-9]{8}$/)).toBeInTheDocument()
  })
})
