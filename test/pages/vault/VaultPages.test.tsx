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
/** Tests for the Vault explorer (src/pages/vault/index.tsx and explorer/*) on the mock backend. */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CurrentUser } from '@/types/auth'
import { resetAdminMock } from '@/data/mockAdmin'
import { resetVaultMock } from '@/data/mockVault'
import { VaultPage } from '@/pages/vault'
import { ApiError } from '@/types/api'
import { api, makeUser, RAW_ORG_INFO, RAW_PROJECTS, rawProject, renderWithProviders, serveLiveReads } from '../../testUtils'

const PROJECT_PERMS = ['vault:project:view', 'vault:project:create', 'vault:project:edit', 'vault:project:delete', 'user:view']

/** Opens the explorer at `route` (/vault, /vault/1 or /vault/1/env). Other URLs show the location probe. */
const openAt = (route: string, user: CurrentUser = makeUser({ permissions: PROJECT_PERMS })) => {
  const depth = route.split('/').filter(Boolean).length
  const path = ['/vault', '/vault', '/vault/:projectId', '/vault/:projectId/:section'][depth]
  return renderWithProviders(<VaultPage />, { route, path, user })
}

const dialog = () => screen.getByRole('dialog')
/** Switches to the Details view (a table with columns), like Explorer's View › Details. */
const showDetails = () => fireEvent.click(screen.getByRole('button', { name: 'Details' }))
const preview = () => screen.getByRole('complementary', { name: 'Preview' })
/** True when the preview pane is hidden (nothing selected). */
const noPreview = () => screen.queryByRole('complementary', { name: 'Preview' }) === null
/** A list card's heading, e.g. "Keys 11". */
const heading = (name: string) => screen.getByRole('heading', { name })
/** A folder's contents: the icon grid (default) or, in Details view, the table. */
const list = (name: string) =>
  waitFor(() => {
    const found = screen.queryByRole('listbox', { name }) ?? screen.queryByRole('grid', { name })
    if (!found) throw new Error(`No list called ${name}`)
    return found
  })

/** An item (tile or table row) by its visible text, e.g. row('DATABASE_URL', 'production'). */
const row = (...texts: string[]) =>
  [...screen.queryAllByRole('option'), ...screen.queryAllByRole('row')].find((r) =>
    texts.every((t) => within(r).queryByText(t)),
  ) as HTMLElement

beforeEach(() => {
  resetAdminMock()
  resetVaultMock()
  serveLiveReads() // real tags 1–4, matching the mock vault data
})

describe('Vault explorer: the root and project folders', () => {
  it('lists projects as folders, previews the selected one, and opens it on double-click', async () => {
    openAt('/vault')
    const grid = await list('Projects')
    expect(within(grid).getAllByRole('option')).toHaveLength(4)
    expect(noPreview()).toBe(true) // the details pane only appears once something is selected
    expect(heading('Projects 4')).toBeInTheDocument()

    fireEvent.click(row('payments-api'))
    expect(row('payments-api')).toHaveAttribute('aria-selected', 'true')
    expect(await within(preview()).findByText('11 keys, 4 files, 2 notes')).toBeInTheDocument() // Priya's private note isn't counted

    fireEvent.doubleClick(row('payments-api'))
    expect(screen.getByTestId('location')).toHaveTextContent('/vault/1')
  })

  it('opens a project with Enter and asks before deleting with the Delete key', async () => {
    openAt('/vault')
    await list('Projects')
    const web = row('web')
    fireEvent.click(web)
    fireEvent.keyDown(web, { key: 'Delete' })
    expect(within(dialog()).getByRole('heading', { name: 'Delete project' })).toBeInTheDocument()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(row('web'), { key: 'Enter' })
    expect(screen.getByTestId('location')).toHaveTextContent('/vault/2')
  })

  it('moves the selection with the arrow keys', async () => {
    openAt('/vault')
    await list('Projects')
    fireEvent.click(row('payments-api'))
    fireEvent.keyDown(row('payments-api'), { key: 'ArrowRight' })
    expect(row('web')).toHaveAttribute('aria-selected', 'true')
    expect(row('web')).toHaveFocus()
    fireEvent.keyDown(row('web'), { key: 'End' })
    expect(row('internal-tools')).toHaveAttribute('aria-selected', 'true')
  })

  it('shows Large icons by default and switches to Details, remembering the choice', async () => {
    const { unmount } = openAt('/vault/1/env')
    expect(await screen.findByRole('listbox', { name: 'Contents of Env' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Large icons' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(row('DATABASE_URL', 'staging')).getByText('staging')).toBeInTheDocument() // tag under the name

    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    const table = screen.getByRole('grid', { name: 'Contents of Env' })
    expect(within(table).getByRole('columnheader', { name: 'Version' })).toBeInTheDocument()
    unmount()

    openAt('/vault')
    expect(await screen.findByRole('grid', { name: 'Projects' })).toBeInTheDocument() // still Details
  })

  it('shows the selected item in the details pane, which can be closed', async () => {
    openAt('/vault/1/env')
    await list('Contents of Env')
    expect(noPreview()).toBe(true)

    fireEvent.click(row('DATABASE_URL', 'staging'))
    expect(within(preview()).getByRole('heading', { name: 'DATABASE_URL' })).toBeInTheDocument()
    fireEvent.click(within(preview()).getByRole('button', { name: 'Close details' }))
    expect(noPreview()).toBe(true)
    expect(row('DATABASE_URL', 'staging')).toHaveAttribute('aria-selected', 'false')
  })

  it('shows project descriptions under the names in Details view', async () => {
    openAt('/vault')
    await list('Projects')
    showDetails()
    expect(within(row('payments-api')).getByText('Card payments and payouts.')).toBeInTheDocument()
  })

  it('marks Env, Conf and Notes as not saved to the server yet', async () => {
    openAt('/vault/1/conf')
    await list('Contents of Conf')
    expect(screen.getByText('Not saved to the server yet')).toBeInTheDocument()
    expect(screen.queryByText('Mock data')).not.toBeInTheDocument()
  })

  it('filters the open folder with the search box', async () => {
    openAt('/vault')
    await list('Projects')
    fireEvent.change(screen.getByPlaceholderText('Search projects'), { target: { value: 'bill' } })
    expect(within(screen.getByRole('listbox', { name: 'Projects' })).getAllByRole('option')).toHaveLength(1)
    expect(heading('Projects 1')).toBeInTheDocument()
  })

  it('shows New project and Rename only with the vault:project permissions', async () => {
    openAt('/vault', makeUser({ permissions: ['vault:project:view'] }))
    await list('Projects')
    expect(screen.queryByRole('button', { name: 'New project' })).not.toBeInTheDocument()
    fireEvent.click(row('web'))
    expect(within(preview()).getByRole('button', { name: 'Open' })).toBeInTheDocument()
    expect(within(preview()).queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument()
  })

  it('creates a project through the API and selects it', async () => {
    // a small stateful fake: the list includes what was created
    const projects = [...RAW_PROJECTS]
    serveLiveReads({ projects })
    api.post.mockImplementation(async (url: string, data?: unknown) => {
      const body = data as { project_name: string; details: Record<string, unknown> }
      if (url === '/vault/project/create') projects.unshift({ ...rawProject(5, body.project_name), details: body.details })
      return { data: undefined }
    })
    openAt('/vault')
    await list('Projects')
    fireEvent.click(screen.getByRole('button', { name: 'New project' }))
    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'Data Platform' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create project' }))
    expect(await screen.findByText('Created Data Platform.')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/vault/project/create', {
      project_name: 'Data Platform',
      details: { description: '' },
    })
    await waitFor(() => expect(row('Data Platform')).toHaveAttribute('aria-selected', 'true'))
  })

  it('shows a friendly message for a duplicate project name', async () => {
    api.post.mockRejectedValue(new ApiError('SQL Database error', 417))
    openAt('/vault')
    await list('Projects')
    fireEvent.click(screen.getByRole('button', { name: 'New project' }))
    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'web' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create project' }))
    expect(await within(dialog()).findByText('A project called "web" already exists.')).toBeInTheDocument()
  })

  it('renames a project, keeping other details keys', async () => {
    serveLiveReads({ projects: [{ ...rawProject(2, 'web'), details: { description: 'Site', owner_team: 'frontend' } }] })
    api.put.mockResolvedValue({ data: undefined })
    openAt('/vault')
    await list('Projects')
    fireEvent.click(row('web'))
    fireEvent.click(within(preview()).getByRole('button', { name: 'Rename' }))
    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'website' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved website.')).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/vault/project/update/2', {
      project_name: 'website',
      details: { description: 'Site', owner_team: 'frontend' },
    })
  })

  it('deletes a project through the API after warning that everything goes', async () => {
    api.delete.mockResolvedValue({ data: undefined })
    openAt('/vault')
    await list('Projects')
    fireEvent.click(row('billing'))
    fireEvent.click(within(preview()).getByRole('button', { name: 'Delete' }))
    expect(within(dialog()).getByText(/removed permanently/)).toBeInTheDocument()
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Delete project' }))
    expect(await screen.findByText('Deleted billing.')).toBeInTheDocument()
    expect(api.delete).toHaveBeenCalledWith('/vault/project/delete/3')
  })

  it('hides Delete without vault:project:delete, and disables New project at the plan quota', async () => {
    serveLiveReads({ orgInfo: { ...RAW_ORG_INFO, current_ss_project_count: 10, ss_project_limit: 10 } })
    openAt('/vault', makeUser({ permissions: ['vault:project:view', 'vault:project:create'] }))
    await list('Projects')
    await waitFor(() => expect(screen.getByRole('button', { name: 'New project' })).toBeDisabled())
    fireEvent.click(row('web'))
    expect(within(preview()).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('explains a missing vault:project:view permission', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url === '/vault/project/list') throw new ApiError('Insufficient permissions', 403)
      return { data: [] }
    })
    openAt('/vault', makeUser({ permissions: [] }))
    expect(await screen.findByText(/You need the “View vault projects” permission/)).toBeInTheDocument()
  })

  it('opens a project on its Env tab', async () => {
    openAt('/vault/1')
    expect(await screen.findByTestId('location')).toHaveTextContent('/vault/1/env')
  })

  it('shows Env, Conf and Notes as tabs with their item counts, under the folder path', async () => {
    openAt('/vault/1/env')
    await list('Contents of Env')
    expect(screen.getByRole('heading', { level: 1, name: 'payments-api' })).toBeInTheDocument()
    const path = screen.getByRole('navigation', { name: 'Folder path' })
    expect(within(path).getByRole('link', { name: 'Vault' })).toHaveAttribute('href', '/vault')
    // no title row: renaming and deleting a project happen in the project list
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete project' })).not.toBeInTheDocument()

    const tabs = screen.getByRole('navigation', { name: 'payments-api folders' })
    const env = await within(tabs).findByRole('link', { name: 'Env, 11 keys' })
    expect(env).toHaveAttribute('aria-current', 'page')
    expect(await within(tabs).findByRole('link', { name: 'Conf, 4 files' })).toHaveAttribute('href', '/vault/1/conf')
    expect(within(tabs).getByRole('link', { name: 'Notes, 2 notes' })).not.toHaveAttribute('aria-current')
    // the tab's own buttons stay
    expect(screen.getByRole('button', { name: 'New key' })).toBeInTheDocument()
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()

    fireEvent.click(within(tabs).getByRole('link', { name: /Conf/ }))
    expect(await list('Contents of Conf')).toBeInTheDocument()
    expect(within(tabs).getByRole('link', { name: /Conf/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'New file' })).toBeInTheDocument()
  })

  it('goes back to the Vault with Backspace', async () => {
    openAt('/vault/1/env')
    await list('Contents of Env')
    fireEvent.click(row('CONCURRENCY'))
    fireEvent.keyDown(row('CONCURRENCY'), { key: 'Backspace' })
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/vault$/)
  })

  it('says when a folder does not exist', async () => {
    openAt('/vault/99/env')
    expect(await screen.findByText(/This folder doesn't exist/)).toBeInTheDocument()
  })
})

describe('Vault explorer: Env', () => {
  it('lists keys with tag and version, and reveals a value in the preview pane', async () => {
    openAt('/vault/1/env')
    await list('Contents of Env')
    showDetails()
    expect(within(row('JWT_SIGNING_KEY', 'production')).getByText('rolled back from v2')).toBeInTheDocument()
    expect(heading('Keys 11')).toBeInTheDocument()

    fireEvent.click(row('DATABASE_URL', 'production'))
    expect(within(preview()).getByText('••••••••••••')).toBeInTheDocument()
    fireEvent.click(within(preview()).getByRole('button', { name: 'Reveal DATABASE_URL' }))
    expect(await within(preview()).findByText(/sslmode=require/)).toBeInTheDocument()
  })

  it('shows a hidden key without reveal or copy, and its history per version', async () => {
    openAt('/vault/1/env')
    await list('Contents of Env')
    fireEvent.click(row('STRIPE_SECRET_KEY', 'production'))
    expect(within(preview()).getByText(/Hidden: it can be used/)).toBeInTheDocument()
    expect(within(preview()).queryByRole('button', { name: /Reveal/ })).not.toBeInTheDocument()

    fireEvent.click(within(preview()).getByRole('button', { name: 'History' }))
    await within(dialog()).findByText('v1')
    expect(within(dialog()).getAllByText('Hidden')).toHaveLength(2) // v3 and v2
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Reveal v1' }))
    expect(await within(dialog()).findByText('example_stripe_key_51Hc2f…old1')).toBeInTheDocument()
  })

  it('opens a key’s history on double-click', async () => {
    openAt('/vault/1/env')
    await list('Contents of Env')
    fireEvent.doubleClick(row('LOG_LEVEL', 'staging'))
    expect(within(dialog()).getByRole('heading', { name: 'History of LOG_LEVEL' })).toBeInTheDocument()
  })

  it('adds a hidden key', async () => {
    openAt('/vault/1/env')
    await list('Contents of Env')
    fireEvent.click(screen.getByRole('button', { name: 'New key' }))
    fireEvent.change(within(dialog()).getByLabelText('Name'), { target: { value: 'WEBHOOK_SECRET' } })
    fireEvent.change(within(dialog()).getByLabelText('Tag'), { target: { value: '1' } })
    fireEvent.change(within(dialog()).getByLabelText('Value'), { target: { value: 'whsec_123' } })
    fireEvent.click(within(dialog()).getByRole('switch', { name: /Hide value/ }))
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Add key' }))
    expect(await screen.findByText('Added WEBHOOK_SECRET.')).toBeInTheDocument()
    await waitFor(() => expect(row('WEBHOOK_SECRET', 'production')).toBeTruthy())
  })

  it('saves a new version of the selected key and rolls it back from the history', async () => {
    openAt('/vault/1/env')
    await list('Contents of Env')
    showDetails()
    expect(noPreview()).toBe(true) // nothing selected
    fireEvent.click(row('LOG_LEVEL', 'production'))
    fireEvent.click(within(preview()).getByRole('button', { name: 'New version' }))
    fireEvent.change(within(dialog()).getByLabelText('New value'), { target: { value: 'error' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save new version' }))
    expect(await screen.findByText('LOG_LEVEL is now on v2.')).toBeInTheDocument()
    await waitFor(() => expect(within(row('LOG_LEVEL', 'production')).getByText('v2')).toBeInTheDocument())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.click(within(preview()).getByRole('button', { name: 'History' }))
    fireEvent.click(await within(dialog()).findByRole('button', { name: 'Use this version' }))
    expect(await screen.findByText('LOG_LEVEL now uses v1.')).toBeInTheDocument()
  })

  it('imports a .env file into a tag', async () => {
    openAt('/vault/1/env')
    await list('Contents of Env')
    fireEvent.click(screen.getByRole('button', { name: 'Import .env' }))
    fireEvent.change(within(dialog()).getByLabelText('Tag'), { target: { value: '3' } })
    fireEvent.change(within(dialog()).getByLabelText('.env contents'), {
      target: { value: 'DATABASE_URL=postgres://dev2\nCACHE_TTL=60' },
    })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Import' }))
    expect(await screen.findByText('Imported: 1 new, 1 changed, 0 unchanged.')).toBeInTheDocument()
    expect(await screen.findByText('CACHE_TTL')).toBeInTheDocument()
  })
})

describe('Vault explorer: Conf', () => {
  it('opens the selected file in the preview pane, saves an edit and shows the diff', async () => {
    openAt('/vault/1/conf')
    await list('Contents of Conf')
    expect(noPreview()).toBe(true)
    fireEvent.click(row('app.yaml', 'production'))
    const editor = await screen.findByLabelText('Contents of app.yaml')
    expect((editor as HTMLTextAreaElement).value).toContain('replicas: 4')

    fireEvent.change(editor, { target: { value: (editor as HTMLTextAreaElement).value.replace('replicas: 4', 'replicas: 6') } })
    fireEvent.change(screen.getByLabelText('Reason for the change'), { target: { value: 'Scale up' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save as v3' }))
    expect(await screen.findByText('Saved app.yaml as v3.')).toBeInTheDocument()

    fireEvent.click(await within(preview()).findByRole('button', { name: 'History' }))
    fireEvent.click(await screen.findByRole('button', { name: /^v2/ }))
    expect(await screen.findByText('v2 → v3 (in use)')).toBeInTheDocument()
  })

  it('creates a file from the New file dialog and opens it', async () => {
    openAt('/vault/1/conf')
    await list('Contents of Conf')
    fireEvent.click(screen.getByRole('button', { name: 'New file' }))
    const form = within(await screen.findByRole('dialog'))
    fireEvent.change(form.getByLabelText('File name'), { target: { value: 'redis.conf' } })
    fireEvent.change(await form.findByLabelText('Tag'), { target: { value: '1' } })
    fireEvent.change(form.getByLabelText('Contents'), { target: { value: 'maxmemory 2gb' } })
    fireEvent.click(form.getByRole('button', { name: 'Create file' }))
    expect(await screen.findByText('Created redis.conf.')).toBeInTheDocument()
    expect(await screen.findByLabelText('Contents of redis.conf')).toHaveValue('maxmemory 2gb')
  })

  it('rolls a file back to an older version from its history', async () => {
    openAt('/vault/1/conf')
    await list('Contents of Conf')
    fireEvent.click(row('app.yaml', 'production'))
    fireEvent.click(await within(preview()).findByRole('button', { name: 'History' }))
    fireEvent.click(await screen.findByRole('button', { name: /^v1/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Use v1' }))
    expect(await screen.findByText('app.yaml now uses v1.')).toBeInTheDocument()
  })

  it('deletes a file after confirming', async () => {
    openAt('/vault/1/conf')
    await list('Contents of Conf')
    fireEvent.click(row('worker.toml'))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete worker.toml' }))
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: 'Delete config file' })).getByRole('button', { name: 'Delete file' }),
    )
    expect(await screen.findByText('Deleted worker.toml.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('worker.toml', { selector: 'span' })).not.toBeInTheDocument())
  })
})

describe('Vault explorer: Notes', () => {
  it('lists only notes you own or that are shared with you', async () => {
    openAt('/vault/1/notes')
    await list('Contents of Notes')
    showDetails()
    expect(row('On-call runbook', 'Shared with you · can edit')).toBeTruthy()
    expect(row('Break-glass DB access', 'You')).toBeTruthy()
    expect(screen.queryByText("Priya's interview notes")).not.toBeInTheDocument()
    expect(screen.getByText("Yours and those shared with you. Notes aren't tagged.")).toBeInTheDocument()
  })

  it('lets you edit a note shared to edit, but not share or delete it', async () => {
    openAt('/vault/1/notes')
    await list('Contents of Notes')
    fireEvent.click(row('On-call runbook'))
    expect(await within(preview()).findByText(/Post-incident: write it up/)).toBeInTheDocument()
    expect(within(preview()).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(within(preview()).queryByRole('button', { name: 'Share' })).not.toBeInTheDocument()
    expect(within(preview()).queryByRole('button', { name: 'Delete On-call runbook' })).not.toBeInTheDocument()
  })

  it('shows a read-only shared note without Edit', async () => {
    openAt('/vault/2/notes')
    await list('Contents of Notes')
    fireEvent.click(row('CDN cutover checklist'))
    expect(await within(preview()).findByText('Lena Fischer shared this with you · read only')).toBeInTheDocument()
    expect(within(preview()).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('creates a private note in the preview pane', async () => {
    openAt('/vault/1/notes')
    await list('Contents of Notes')
    fireEvent.click(screen.getByRole('button', { name: 'New note' }))
    expect(within(preview()).getByText(/Private: only you can see it/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Wi-Fi' } })
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'guest / hunter2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }))
    expect(await screen.findByText('Note created. Only you can see it until you share it.')).toBeInTheDocument()
    await waitFor(() => expect(row('Wi-Fi', 'Private')).toHaveAttribute('aria-selected', 'true'))
  })

  it('shares your own note with someone and makes a public link', async () => {
    openAt('/vault/1/notes')
    await list('Contents of Notes')
    fireEvent.click(row('Break-glass DB access'))
    fireEvent.click(await within(preview()).findByRole('button', { name: 'Share' }))
    expect(await within(dialog()).findByLabelText('Access for Priya Rao')).toHaveValue('read')
    fireEvent.change(within(dialog()).getByLabelText('Access for Marcus Chen'), { target: { value: 'edit' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Save access' }))
    expect(await screen.findByText('Sharing updated.')).toBeInTheDocument()
    fireEvent.change(within(dialog()).getByLabelText('Expires after'), { target: { value: 'never' } })
    fireEvent.click(within(dialog()).getByRole('button', { name: 'Create link' }))
    expect(await screen.findByText('Link created.')).toBeInTheDocument()
    expect(within(dialog()).getByText('No expiry')).toBeInTheDocument()
  })
})
