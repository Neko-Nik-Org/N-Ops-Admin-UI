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
/** Tests for src/components/PageToolbar.tsx: path on the left, buttons and Back together on the right. */

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageToolbar } from '@/components/PageToolbar'
import { renderWithProviders } from '../testUtils'

describe('PageToolbar', () => {
  it('shows the path, then the page buttons and Back in one group', () => {
    renderWithProviders(
      <PageToolbar
        crumbs={[{ label: 'Access policies', to: '/admin/access-policies' }, { label: 'Office only' }]}
        actions={<button type="button">Edit</button>}
        back="/admin/access-policies"
      />,
      { route: '/admin/access-policies/1' },
    )
    expect(screen.getByRole('link', { name: 'Access policies' })).toHaveAttribute('href', '/admin/access-policies')
    expect(screen.getByText('Office only')).toHaveAttribute('aria-current', 'page')
    const edit = screen.getByRole('button', { name: 'Edit' })
    const back = screen.getByRole('link', { name: 'Back' })
    expect(edit.parentElement).toBe(back.parentElement)
    expect(edit.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy() // Back last
  })

  it('has no Back button unless asked', () => {
    renderWithProviders(<PageToolbar crumbs={[{ label: 'Here' }]} />)
    expect(screen.queryByRole('link', { name: 'Back' })).not.toBeInTheDocument()
  })
})
