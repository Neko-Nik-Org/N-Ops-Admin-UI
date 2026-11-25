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
/** Tests for src/api/devices.ts. */

import { describe, expect, it } from 'vitest'
import {
  fetchDevice,
  generateDeviceToken,
  hasPendingDeviceToken,
  listDevices,
  removeDevice,
  revokeDeviceToken,
} from '@/api/devices'
import { api } from '../testUtils'

const raw = (id: number, lastAccessedAt: string) => ({
  session_id: id,
  device_name: `Phone ${id}`,
  device_type: 'smartphone',
  device_identifier: `uuid-${id}`,
  device_details: { os_version: 'Android 16' },
  created_at: '2026-11-20T10:00:00Z',
  last_accessed_at: lastAccessedAt,
})

describe('devices api', () => {
  it('lists devices, most recently used first', async () => {
    api.get.mockResolvedValue({ data: [raw(1, '2026-11-21T10:00:00Z'), raw(2, '2026-11-24T10:00:00Z')] })
    const devices = await listDevices()
    expect(api.get).toHaveBeenCalledWith('/user/devices/list')
    expect(devices.map((d) => d.sessionId)).toEqual([2, 1])
    expect(devices[0]).toEqual({
      sessionId: 2,
      deviceName: 'Phone 2',
      deviceType: 'smartphone',
      deviceIdentifier: 'uuid-2',
      deviceDetails: { os_version: 'Android 16' },
      createdAt: '2026-11-20T10:00:00Z',
      lastAccessedAt: '2026-11-24T10:00:00Z',
    })
  })

  it('fetches one device, and null for one that is not linked', async () => {
    api.get.mockResolvedValueOnce({ data: { ...raw(3, '2026-11-24T10:00:00Z'), device_details: 'junk' } })
    await expect(fetchDevice(3)).resolves.toMatchObject({ sessionId: 3, deviceDetails: {} })
    expect(api.get).toHaveBeenCalledWith('/user/devices/get/3')
    api.get.mockResolvedValueOnce({ data: null })
    await expect(fetchDevice(4)).resolves.toBeNull()
  })

  it('removes a device', async () => {
    api.delete.mockResolvedValue({ data: '' })
    await removeDevice(5)
    expect(api.delete).toHaveBeenCalledWith('/user/devices/delete/5')
  })

  it('makes, checks and revokes a device code', async () => {
    api.post.mockResolvedValue({ data: 'K7Q2-9XPM' })
    await expect(generateDeviceToken()).resolves.toBe('K7Q2-9XPM')
    expect(api.post).toHaveBeenCalledWith('/user/devices/generate')

    api.get.mockResolvedValue({ data: true })
    await expect(hasPendingDeviceToken()).resolves.toBe(true)
    expect(api.get).toHaveBeenCalledWith('/user/devices/check/device-token')

    api.delete.mockResolvedValue({ data: '' })
    await revokeDeviceToken()
    expect(api.delete).toHaveBeenCalledWith('/user/devices/revoke')
  })

  it('rejects an empty device code', async () => {
    api.post.mockResolvedValue({ data: '' })
    await expect(generateDeviceToken()).rejects.toThrow('The API sent no device code.')
  })
})
