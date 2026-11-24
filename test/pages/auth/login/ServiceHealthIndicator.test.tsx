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
/** Tests for src/pages/auth/login/ServiceHealthIndicator.tsx. */

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ServiceHealthIndicator } from '@/pages/auth/login/ServiceHealthIndicator'
import { ApiError } from '@/types/api'
import { api, renderWithProviders } from '../../../testUtils'

describe('ServiceHealthIndicator', () => {
  it('shows healthy services', async () => {
    api.get.mockResolvedValue({ data: 'All services are running!' })
    renderWithProviders(<ServiceHealthIndicator />)
    expect(await screen.findByText('All systems normal')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'API status: All systems normal' })).toHaveAttribute(
      'title',
      expect.stringContaining('All services are running!'),
    )
  })

  it('names the failing dependency', async () => {
    api.get.mockRejectedValue(new ApiError('Redis cache is not healthy!', 412))
    renderWithProviders(<ServiceHealthIndicator />)
    expect(await screen.findByText('Service problem')).toBeInTheDocument()
    expect(screen.getByText(/Redis cache is not healthy!/)).toBeInTheDocument()
  })

  it('shows only the dot when compact, keeping the status for screen readers', async () => {
    api.get.mockResolvedValue({ data: 'All services are running!' })
    renderWithProviders(<ServiceHealthIndicator compact />)
    expect(await screen.findByRole('status', { name: 'API status: All systems normal' })).toBeInTheDocument()
    expect(screen.queryByText('All systems normal')).not.toBeInTheDocument()
  })
})
