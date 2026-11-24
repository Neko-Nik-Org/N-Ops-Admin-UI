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
/** Tests for src/components/PageHeader.tsx: the title is for screen readers unless asked for. */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from '@/components/PageHeader'

describe('PageHeader', () => {
  it('keeps the title only for screen readers, and takes no space with nothing else to show', () => {
    const { container } = render(<PageHeader title="Access policies" />)
    const heading = screen.getByRole('heading', { level: 1, name: 'Access policies' })
    expect(heading).toHaveClass('sr-only')
    expect(container.firstElementChild).toBe(heading)
  })

  it('still shows the actions, badges and description', () => {
    render(
      <PageHeader title="Users" description="People" badge={<span>3</span>} actions={<button type="button">Add user</button>} />,
    )
    expect(screen.getByRole('heading', { name: 'Users' })).toHaveClass('sr-only')
    expect(screen.getByRole('button', { name: 'Add user' })).toBeVisible()
    expect(screen.getByText('People')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows the title on pages about one item', () => {
    render(<PageHeader title="Neko Nik" showTitle />)
    expect(screen.getByRole('heading', { name: 'Neko Nik' })).not.toHaveClass('sr-only')
  })
})
