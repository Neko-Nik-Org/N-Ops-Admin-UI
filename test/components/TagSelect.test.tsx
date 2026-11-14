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
/** Tests for src/components/molecules/TagSelect.tsx: the top bar's tag scope dropdown. */

import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TagSelect } from '@/components/molecules/TagSelect'
import { selectedTagIdAtom } from '@/features/tags/store/selectedTag'
import { api, makeUser, renderWithProviders } from '../testUtils'

const tags = [
  { tag_id: 1, organization_id: 'o', tag_name: 'production', tag_description: '' },
  { tag_id: 2, organization_id: 'o', tag_name: 'staging', tag_description: '' },
]

const renderSelect = (list = tags) => {
  api.get.mockResolvedValue({ data: list })
  return renderWithProviders(<TagSelect />, { user: makeUser() })
}

describe('TagSelect', () => {
  it('starts on "All tags" and lists the user\'s tags', async () => {
    renderSelect()
    const select = await screen.findByRole('combobox', { name: 'Tag' })
    expect(select).toHaveDisplayValue('All tags')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['All tags', 'production', 'staging'])
  })

  it('stores the chosen tag for the whole app and remembers it', async () => {
    const { store } = renderSelect()
    fireEvent.change(await screen.findByRole('combobox', { name: 'Tag' }), { target: { value: '2' } })
    expect(store.get(selectedTagIdAtom)).toBe(2)
    expect(localStorage.getItem('nops-selected-tag')).toBe('2')

    fireEvent.change(screen.getByRole('combobox', { name: 'Tag' }), { target: { value: 'all' } })
    expect(store.get(selectedTagIdAtom)).toBeNull()
  })

  it('falls back to "All tags" when the saved tag no longer exists', async () => {
    localStorage.setItem('nops-selected-tag', '99')
    renderSelect()
    expect(await screen.findByRole('combobox', { name: 'Tag' })).toHaveDisplayValue('All tags')
  })

  it('is disabled when there are no tags', async () => {
    renderSelect([])
    const select = await screen.findByRole('combobox', { name: 'Tag' })
    expect(select).toBeDisabled()
    expect(select).toHaveDisplayValue('No tags')
  })
})
