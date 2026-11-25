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
/** Tests for src/api/session.ts. */

import { describe, expect, it } from 'vitest'
import { getSessionInfo, logout, refreshSession, verifySession } from '@/api/session'
import { api } from '../testUtils'

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

  it('reads what the session may do with GET /auth/session', async () => {
    api.get.mockResolvedValue({
      data: {
        allow_refresh: true,
        allow_device_logins: false,
        allowed_linux_users: ['deploy'],
        permissions: ['tag:view'],
        tags: [2],
        can_approve_approvals: true,
        can_bypass_approvals: false,
      },
    })
    await expect(getSessionInfo()).resolves.toEqual({
      allowRefresh: true,
      allowDeviceLogins: false,
      allowedLinuxUsers: ['deploy'],
      permissions: ['tag:view'],
      tags: [2],
      canApproveApprovals: true,
      canBypassApprovals: false,
    })
    expect(api.get).toHaveBeenCalledWith('/auth/session')
  })

  it('treats missing session fields as not allowed, except the mobile app (allowed unless false)', async () => {
    api.get.mockResolvedValue({ data: {} })
    await expect(getSessionInfo()).resolves.toMatchObject({ allowRefresh: false, allowDeviceLogins: true, permissions: [] })
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
