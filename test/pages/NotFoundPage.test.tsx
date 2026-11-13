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
/** Tests for src/pages/NotFoundPage.tsx. */

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { renderWithProviders } from '../testUtils'

describe('NotFoundPage', () => {
  it('shows a 404 with a link back to the dashboard', () => {
    renderWithProviders(<NotFoundPage />, { route: '/nope' })
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to N-Ops' })).toHaveAttribute('href', '/')
  })
})
