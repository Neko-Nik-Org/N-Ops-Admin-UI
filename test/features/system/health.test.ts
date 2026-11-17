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
/** Tests for src/features/system/api/health.ts. */

import { describe, expect, it } from 'vitest'
import { getServiceHealth } from '@/features/system/api/health'
import { ApiError } from '@/types/api'
import { api } from '../../testUtils'

describe('getServiceHealth', () => {
  it('reports up with the API message', async () => {
    api.get.mockResolvedValue({ data: 'All services are running!' })
    await expect(getServiceHealth()).resolves.toMatchObject({ status: 'up', message: 'All services are running!' })
    expect(api.get).toHaveBeenCalledWith('/health/service')
  })

  it("reports down with the failing dependency from the API's 412", async () => {
    api.get.mockRejectedValue(new ApiError('Database is not healthy!', 412))
    await expect(getServiceHealth()).resolves.toMatchObject({ status: 'down', message: 'Database is not healthy!' })
  })

  it('reports down when the API cannot be reached', async () => {
    api.get.mockRejectedValue(new ApiError('Network Error'))
    await expect(getServiceHealth()).resolves.toMatchObject({ status: 'down', message: 'Can’t reach the N-Ops API.' })
  })
})
