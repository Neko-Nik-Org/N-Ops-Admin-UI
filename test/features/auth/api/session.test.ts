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
/** Tests for src/features/auth/api/session.ts. */

import { describe, expect, it } from 'vitest'
import { logout, refreshSession, verifySession } from '@/features/auth/api/session'
import { api } from '../../../testUtils'

describe('session api', () => {
  it('verifies the session with GET /auth/verify', async () => {
    api.get.mockResolvedValue({ data: {} })
    await verifySession()
    expect(api.get).toHaveBeenCalledWith('/auth/verify')
  })

  it('rejects when the session is invalid', async () => {
    api.get.mockRejectedValue(new Error('Unauthorized'))
    await expect(verifySession()).rejects.toThrow('Unauthorized')
  })

  it('signs out with DELETE /auth/logout', async () => {
    api.delete.mockResolvedValue({ data: {} })
    await logout()
    expect(api.delete).toHaveBeenCalledWith('/auth/logout')
  })

  it('refreshes with POST /auth/refresh and returns the new session id', async () => {
    api.post.mockResolvedValue({ data: { message: 'ok', session_id: 'new-id' } })
    await expect(refreshSession()).resolves.toBe('new-id')
    expect(api.post).toHaveBeenCalledWith('/auth/refresh')
  })
})
