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
/** Tests for src/pages/TagsPage.tsx (with TagFormDialog and the delete confirmation). */

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TagsPage } from '@/pages/TagsPage'
import { api, makeUser, renderWithProviders } from '../testUtils'

const rawTags = [
  { tag_id: 1, organization_id: 'o', tag_name: 'production', tag_description: 'Live servers' },
  { tag_id: 2, organization_id: 'o', tag_name: 'staging', tag_description: '' },
]

/** GET /tag/list returns the tags; GET /tag/get/{id} returns that tag. */
const mockTags = () =>
  api.get.mockImplementation(async (url: string) => {
    if (url === '/tag/list') return { data: rawTags }
    const id = Number(url.split('/').pop())
    return { data: rawTags.find((t) => t.tag_id === id) }
  })

const renderTags = (user = makeUser()) => renderWithProviders(<TagsPage />, { route: '/tags', user })

describe('TagsPage', () => {
  it('lists the tags', async () => {
    mockTags()
    renderTags()
    const row = (await screen.findByText('production')).closest('tr') as HTMLElement
    expect(within(row).getByText('Live servers')).toBeInTheDocument()
    expect(within(row).getByText('1')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument() // staging has no description
  })

  it('shows an empty state', async () => {
    api.get.mockResolvedValue({ data: [] })
    renderTags()
    expect(await screen.findByText('No tags yet.')).toBeInTheDocument()
  })

  it("shows the API's error", async () => {
    api.get.mockRejectedValue(new Error('Missing permission tag:view'))
    renderTags()
    expect(await screen.findByText("Couldn't load tags")).toBeInTheDocument()
    expect(screen.getByText('Missing permission tag:view')).toBeInTheDocument()
  })

  it('hides actions the user has no permission for', async () => {
    mockTags()
    renderTags(makeUser({ permissions: ['tag:view'] }))
    await screen.findByText('production')
    expect(screen.queryByRole('button', { name: 'New tag' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
  })

  it('only offers edit and delete on tags the user has access to', async () => {
    mockTags()
    renderTags(makeUser({ tags: [1] }))
    await screen.findByText('production')
    expect(screen.getByRole('button', { name: 'Edit production' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit staging' })).not.toBeInTheDocument()
  })

  it('creates a tag', async () => {
    mockTags()
    api.post.mockResolvedValue({ data: undefined })
    renderTags()
    fireEvent.click(await screen.findByRole('button', { name: 'New tag' }))

    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create tag' }))
    expect(await within(dialog).findByText('Enter a tag name.')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: ' backups ' } })
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Backup hosts' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create tag' }))

    expect(await screen.findByText('Tag created.')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/tag/create', { tag_name: 'backups', tag_description: 'Backup hosts' })
    await waitFor(() => expect(api.get.mock.calls.filter(([url]) => url === '/tag/list')).toHaveLength(2))
  })

  it('edits a tag, prefilled from the latest record', async () => {
    mockTags()
    api.put.mockResolvedValue({ data: undefined })
    renderTags()
    fireEvent.click(await screen.findByRole('button', { name: 'Edit production' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Edit tag' })).toBeInTheDocument()
    await waitFor(() => expect(within(dialog).getByLabelText('Name')).toHaveValue('production'))
    expect(api.get).toHaveBeenCalledWith('/tag/get/1')

    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'prod' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Tag updated.')).toBeInTheDocument()
    expect(api.put).toHaveBeenCalledWith('/tag/update', { tag_id: 1, tag_name: 'prod', tag_description: 'Live servers' })
  })

  it('deletes a tag after confirmation', async () => {
    mockTags()
    api.delete.mockResolvedValue({ data: undefined })
    renderTags()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete staging' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/can't be undone/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete tag' }))

    expect(await screen.findByText('Deleted "staging".')).toBeInTheDocument()
    expect(api.delete).toHaveBeenCalledWith('/tag/delete/2')
  })

  it('cancelling the delete changes nothing', async () => {
    mockTags()
    renderTags()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete staging' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.delete).not.toHaveBeenCalled()
  })
})
